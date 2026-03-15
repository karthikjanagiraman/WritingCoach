import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/monitor-auth";
import { getMonitorClient } from "@/lib/monitor-db";

export async function GET(req: NextRequest) {
  const { error } = await requireAdmin();
  if (error) return error;

  const env = (req.nextUrl.searchParams.get("env") === "prod" ? "prod" : "dev") as "dev" | "prod";
  const db = getMonitorClient(env);

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfWeek = new Date(startOfToday);
  startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  try {
    // Core KPIs — run in parallel
    const [
      totalUsers,
      totalChildren,
      activeChildren7dResult,
      lessonsCompletedToday,
      lessonsCompletedThisWeek,
      lessonsCompletedThisMonth,
      avgScore30d,
    ] = await Promise.all([
      db.user.count(),
      db.childProfile.count(),
      // Active children: distinct childIds from LessonEvent in last 7 days
      safeQuery(
        () =>
          db.lessonEvent
            .findMany({
              where: { createdAt: { gte: sevenDaysAgo } },
              distinct: ["childId"],
              select: { childId: true },
            })
            .then((rows) => rows.length),
        0
      ),
      db.lessonProgress.count({
        where: { status: "completed", completedAt: { gte: startOfToday } },
      }),
      db.lessonProgress.count({
        where: { status: "completed", completedAt: { gte: startOfWeek } },
      }),
      db.lessonProgress.count({
        where: { status: "completed", completedAt: { gte: startOfMonth } },
      }),
      db.assessment.aggregate({
        _avg: { overallScore: true },
        where: { createdAt: { gte: thirtyDaysAgo } },
      }),
    ]);

    // AI metrics — may not exist if LLMInteraction table is empty/missing
    const [aiCallsToday, avgLatency24h, tokensToday, aiErrorRate24h] =
      await Promise.all([
        safeQuery(
          () =>
            db.lLMInteraction.count({
              where: { createdAt: { gte: startOfToday } },
            }),
          0
        ),
        safeQuery(
          () =>
            db.lLMInteraction
              .aggregate({
                _avg: { latencyMs: true },
                where: { createdAt: { gte: twentyFourHoursAgo } },
              })
              .then((r) => r._avg.latencyMs ?? 0),
          0
        ),
        safeQuery(
          () =>
            db.lLMInteraction
              .aggregate({
                _sum: { inputTokens: true, outputTokens: true },
                where: { createdAt: { gte: startOfToday } },
              })
              .then(
                (r) => (r._sum.inputTokens ?? 0) + (r._sum.outputTokens ?? 0)
              ),
          0
        ),
        safeQuery(async () => {
          const total = await db.lLMInteraction.count({
            where: { createdAt: { gte: twentyFourHoursAgo } },
          });
          if (total === 0) return 0;
          const errors = await db.lLMInteraction.count({
            where: {
              createdAt: { gte: twentyFourHoursAgo },
              error: { not: null },
            },
          });
          return Math.round((errors / total) * 10000) / 100; // percentage with 2 decimals
        }, 0),
      ]);

    // Time-series: daily lessons completed + daily active children (last 30 days)
    const [lessonsTimeSeries, activeChildrenTimeSeries] = await Promise.all([
      buildDailyLessonsSeries(db, thirtyDaysAgo),
      buildDailyActiveChildrenSeries(db, thirtyDaysAgo),
    ]);

    return NextResponse.json({
      kpis: {
        totalUsers,
        totalChildren,
        activeChildren7d: activeChildren7dResult,
        lessonsCompletedToday,
        lessonsCompletedThisWeek,
        lessonsCompletedThisMonth,
        avgScore30d: round2(avgScore30d._avg.overallScore ?? 0),
        aiCallsToday,
        avgLatency24h: Math.round(avgLatency24h as number),
        tokensToday,
        aiErrorRate24h,
      },
      timeSeries: {
        lessonsPerDay: lessonsTimeSeries,
        activeChildrenPerDay: activeChildrenTimeSeries,
      },
    });
  } catch (err) {
    console.error("[monitor/overview] Error:", err);
    return NextResponse.json(
      { error: "Failed to fetch overview data" },
      { status: 500 }
    );
  }
}

// Safely run a query, returning fallback on error (e.g. table doesn't exist)
async function safeQuery<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await fn();
  } catch {
    return fallback;
  }
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

async function buildDailyLessonsSeries(
  db: ReturnType<typeof getMonitorClient>,
  since: Date
) {
  const completed = await db.lessonProgress.findMany({
    where: { status: "completed", completedAt: { gte: since } },
    select: { completedAt: true },
  });

  return aggregateByDay(
    completed.map((r) => r.completedAt).filter(Boolean) as Date[],
    since
  );
}

async function buildDailyActiveChildrenSeries(
  db: ReturnType<typeof getMonitorClient>,
  since: Date
) {
  const events = await safeQuery(
    () =>
      db.lessonEvent.findMany({
        where: { createdAt: { gte: since } },
        select: { childId: true, createdAt: true },
      }),
    [] as { childId: string; createdAt: Date }[]
  );

  // Group by day, count distinct children per day
  const byDay: Record<string, Set<string>> = {};
  for (const e of events) {
    const dayKey = e.createdAt.toISOString().slice(0, 10);
    if (!byDay[dayKey]) byDay[dayKey] = new Set();
    byDay[dayKey].add(e.childId);
  }

  const result: { date: string; value: number }[] = [];
  const now = new Date();
  const cursor = new Date(since);
  while (cursor <= now) {
    const dayKey = cursor.toISOString().slice(0, 10);
    result.push({ date: dayKey, value: byDay[dayKey]?.size ?? 0 });
    cursor.setDate(cursor.getDate() + 1);
  }
  return result;
}

function aggregateByDay(
  dates: Date[],
  since: Date
): { date: string; value: number }[] {
  const counts: Record<string, number> = {};
  for (const d of dates) {
    const key = d.toISOString().slice(0, 10);
    counts[key] = (counts[key] ?? 0) + 1;
  }

  const result: { date: string; value: number }[] = [];
  const now = new Date();
  const cursor = new Date(since);
  while (cursor <= now) {
    const key = cursor.toISOString().slice(0, 10);
    result.push({ date: key, value: counts[key] ?? 0 });
    cursor.setDate(cursor.getDate() + 1);
  }
  return result;
}
