import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { requireAdmin } from "@/lib/monitor-auth";
import { getMonitorClient } from "@/lib/monitor-db";

export const dynamic = "force-dynamic";

function maskDatabaseUrl(env: "dev" | "prod"): string {
  const url =
    env === "prod"
      ? process.env.MONITOR_PROD_DATABASE_URL
      : process.env.MONITOR_DEV_DATABASE_URL || process.env.DATABASE_URL;
  if (!url) return "not configured";
  try {
    const parsed = new URL(url);
    return `${parsed.hostname}:${parsed.port || "5432"}${parsed.pathname}`;
  } catch {
    return "invalid url";
  }
}

export async function GET(request: NextRequest) {
  const { error } = await requireAdmin();
  if (error) return error;

  const env = (request.nextUrl.searchParams.get("env") || "dev") as
    | "dev"
    | "prod";

  let prisma;
  try {
    prisma = getMonitorClient(env);
  } catch (e) {
    return NextResponse.json(
      { error: `Database not configured for ${env}` },
      { status: 500 }
    );
  }

  // 1. Connection status
  let connectionStatus: { ok: boolean; responseTimeMs: number; error?: string };
  try {
    const start = Date.now();
    await prisma.$queryRaw(Prisma.sql`SELECT 1`);
    connectionStatus = { ok: true, responseTimeMs: Date.now() - start };
  } catch (e) {
    connectionStatus = {
      ok: false,
      responseTimeMs: 0,
      error: e instanceof Error ? e.message : "Unknown error",
    };
  }

  // 2. Masked database URL
  const connectedDatabase = maskDatabaseUrl(env);

  // 3. Table row counts — every model in the schema
  const tableNames = [
    "user",
    "childProfile",
    "lessonProgress",
    "session",
    "assessment",
    "placementDraft",
    "placementResult",
    "curriculum",
    "curriculumWeek",
    "curriculumRevision",
    "writingSubmission",
    "aIFeedback",
    "skillProgress",
    "streak",
    "achievement",
    "lessonCompletion",
    "lessonScore",
    "writingSample",
    "studentPreference",
    "learnerProfileSnapshot",
    "subscription",
    "accessCode",
    "systemPromptLog",
    "lLMInteraction",
    "lessonEvent",
  ] as const;

  const displayNames: Record<string, string> = {
    user: "User",
    childProfile: "ChildProfile",
    lessonProgress: "LessonProgress",
    session: "Session",
    assessment: "Assessment",
    placementDraft: "PlacementDraft",
    placementResult: "PlacementResult",
    curriculum: "Curriculum",
    curriculumWeek: "CurriculumWeek",
    curriculumRevision: "CurriculumRevision",
    writingSubmission: "WritingSubmission",
    aIFeedback: "AIFeedback",
    skillProgress: "SkillProgress",
    streak: "Streak",
    achievement: "Achievement",
    lessonCompletion: "LessonCompletion",
    lessonScore: "LessonScore",
    writingSample: "WritingSample",
    studentPreference: "StudentPreference",
    learnerProfileSnapshot: "LearnerProfileSnapshot",
    subscription: "Subscription",
    accessCode: "AccessCode",
    systemPromptLog: "SystemPromptLog",
    lLMInteraction: "LLMInteraction",
    lessonEvent: "LessonEvent",
  };

  const tableRowCounts: { table: string; count: number; error?: string }[] = [];

  for (const name of tableNames) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const count = await (prisma as any)[name].count();
      tableRowCounts.push({ table: displayNames[name] || name, count });
    } catch (e) {
      tableRowCounts.push({
        table: displayNames[name] || name,
        count: -1,
        error: e instanceof Error ? e.message : "count failed",
      });
    }
  }

  // Sort descending by count
  tableRowCounts.sort((a, b) => b.count - a.count);

  // 4. Recent timestamps for key tables
  const timestampTables = [
    { model: "user", display: "User" },
    { model: "childProfile", display: "ChildProfile" },
    { model: "session", display: "Session" },
    { model: "assessment", display: "Assessment" },
    { model: "lLMInteraction", display: "LLMInteraction" },
    { model: "lessonEvent", display: "LessonEvent" },
  ] as const;

  const recentTimestamps: {
    table: string;
    latestCreatedAt: string | null;
  }[] = [];

  for (const { model, display } of timestampTables) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const record = await (prisma as any)[model].findFirst({
        orderBy: { createdAt: "desc" },
        select: { createdAt: true },
      });
      recentTimestamps.push({
        table: display,
        latestCreatedAt: record?.createdAt
          ? (record.createdAt as Date).toISOString()
          : null,
      });
    } catch {
      recentTimestamps.push({ table: display, latestCreatedAt: null });
    }
  }

  return NextResponse.json({
    connectionStatus,
    connectedDatabase,
    tableRowCounts,
    recentTimestamps,
  });
}
