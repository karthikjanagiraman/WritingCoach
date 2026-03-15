import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/monitor-auth";
import { getMonitorClient } from "@/lib/monitor-db";

export async function GET(req: NextRequest) {
  const { error } = await requireAdmin();
  if (error) return error;

  const env = (
    req.nextUrl.searchParams.get("env") === "prod" ? "prod" : "dev"
  ) as "dev" | "prod";
  const period = req.nextUrl.searchParams.get("period") || "24h";
  const db = getMonitorClient(env);

  const now = new Date();
  let periodStart: Date;
  let groupByHour = false;

  switch (period) {
    case "7d":
      periodStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case "30d":
      periodStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      break;
    default: // 24h
      periodStart = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      groupByHour = true;
      break;
  }

  const startOfToday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate()
  );

  try {
    const [
      allInteractions,
      callsByRequestType,
      callsByProvider,
      tokenAggregates,
      latencyAgg,
      totalCalls,
      errorCalls,
      recentErrors,
      todayTokens,
    ] = await Promise.all([
      // All interactions in period for time-series building
      safeQuery(
        () =>
          db.lLMInteraction.findMany({
            where: { createdAt: { gte: periodStart } },
            select: {
              createdAt: true,
              inputTokens: true,
              outputTokens: true,
              cacheReadTokens: true,
              cacheWriteTokens: true,
              latencyMs: true,
              error: true,
              provider: true,
            },
            orderBy: { createdAt: "asc" },
          }),
        []
      ),
      // Calls by request type
      safeQuery(
        () =>
          db.lLMInteraction.groupBy({
            by: ["requestType"],
            _count: { _all: true },
            where: { createdAt: { gte: periodStart } },
          }),
        []
      ),
      // Calls by provider
      safeQuery(
        () =>
          db.lLMInteraction.groupBy({
            by: ["provider"],
            _count: { _all: true },
            where: { createdAt: { gte: periodStart } },
          }),
        []
      ),
      // Token sums for period (for cost estimation)
      safeQuery(
        () =>
          db.lLMInteraction.aggregate({
            _sum: {
              inputTokens: true,
              outputTokens: true,
              cacheReadTokens: true,
              cacheWriteTokens: true,
            },
            where: { createdAt: { gte: periodStart } },
          }),
        null
      ),
      // Latency stats
      safeQuery(
        () =>
          db.lLMInteraction.aggregate({
            _avg: { latencyMs: true },
            where: { createdAt: { gte: periodStart } },
          }),
        null
      ),
      // Total calls in period
      safeQuery(
        () =>
          db.lLMInteraction.count({
            where: { createdAt: { gte: periodStart } },
          }),
        0
      ),
      // Error calls in period
      safeQuery(
        () =>
          db.lLMInteraction.count({
            where: {
              createdAt: { gte: periodStart },
              error: { not: null },
            },
          }),
        0
      ),
      // Recent errors
      safeQuery(
        () =>
          db.lLMInteraction.findMany({
            where: { error: { not: null } },
            select: {
              id: true,
              requestType: true,
              model: true,
              error: true,
              latencyMs: true,
              createdAt: true,
            },
            orderBy: { createdAt: "desc" },
            take: 20,
          }),
        []
      ),
      // Today's tokens (for KPI)
      safeQuery(
        () =>
          db.lLMInteraction.aggregate({
            _sum: {
              inputTokens: true,
              outputTokens: true,
              cacheReadTokens: true,
              cacheWriteTokens: true,
            },
            where: { createdAt: { gte: startOfToday } },
          }),
        null
      ),
    ]);

    // --- Build time-series ---

    // Calls over time
    const callsOverTime = buildTimeSeries(
      allInteractions.map((i) => i.createdAt),
      periodStart,
      now,
      groupByHour
    );

    // Token usage by day
    const tokenByDay: Record<
      string,
      {
        input: number;
        output: number;
        cacheRead: number;
        cacheWrite: number;
      }
    > = {};
    for (const i of allInteractions) {
      const key = i.createdAt.toISOString().slice(0, 10);
      if (!tokenByDay[key]) {
        tokenByDay[key] = { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 };
      }
      tokenByDay[key].input += i.inputTokens ?? 0;
      tokenByDay[key].output += i.outputTokens ?? 0;
      tokenByDay[key].cacheRead += i.cacheReadTokens ?? 0;
      tokenByDay[key].cacheWrite += i.cacheWriteTokens ?? 0;
    }

    const tokenUsage = buildDayRange(periodStart, now).map((date) => ({
      date,
      input: tokenByDay[date]?.input ?? 0,
      output: tokenByDay[date]?.output ?? 0,
      cacheRead: tokenByDay[date]?.cacheRead ?? 0,
      cacheWrite: tokenByDay[date]?.cacheWrite ?? 0,
    }));

    // Error rate by day
    const errorByDay: Record<string, { total: number; errors: number }> = {};
    for (const i of allInteractions) {
      const key = i.createdAt.toISOString().slice(0, 10);
      if (!errorByDay[key]) errorByDay[key] = { total: 0, errors: 0 };
      errorByDay[key].total++;
      if (i.error) errorByDay[key].errors++;
    }

    const errorRate = buildDayRange(periodStart, now).map((date) => ({
      date,
      rate: errorByDay[date]
        ? round2((errorByDay[date].errors / errorByDay[date].total) * 100)
        : 0,
      total: errorByDay[date]?.total ?? 0,
      errors: errorByDay[date]?.errors ?? 0,
    }));

    // Latency distribution histogram
    const latencyBuckets = [
      { label: "0-500ms", min: 0, max: 500 },
      { label: "500ms-1s", min: 500, max: 1000 },
      { label: "1-2s", min: 1000, max: 2000 },
      { label: "2-5s", min: 2000, max: 5000 },
      { label: "5s+", min: 5000, max: Infinity },
    ];
    const latencyDistribution = latencyBuckets.map((bucket) => ({
      label: bucket.label,
      count: allInteractions.filter(
        (i) => i.latencyMs >= bucket.min && i.latencyMs < bucket.max
      ).length,
    }));

    // Compute p50 and p95 from latency values
    const latencies = allInteractions
      .map((i) => i.latencyMs)
      .sort((a, b) => a - b);
    const p50 = percentile(latencies, 0.5);
    const p95 = percentile(latencies, 0.95);

    // Cache hit rate (Anthropic only)
    const anthropicCalls = allInteractions.filter(
      (i) => i.provider === "anthropic"
    );
    let cacheHitRate = 0;
    if (anthropicCalls.length > 0) {
      const totalInput = anthropicCalls.reduce(
        (s, i) => s + (i.inputTokens ?? 0),
        0
      );
      const totalCacheRead = anthropicCalls.reduce(
        (s, i) => s + (i.cacheReadTokens ?? 0),
        0
      );
      if (totalInput + totalCacheRead > 0) {
        cacheHitRate = round2(
          (totalCacheRead / (totalInput + totalCacheRead)) * 100
        );
      }
    }

    // Cost estimation
    const sums = tokenAggregates?._sum;
    const inputTok = sums?.inputTokens ?? 0;
    const outputTok = sums?.outputTokens ?? 0;
    const cacheReadTok = sums?.cacheReadTokens ?? 0;
    const cacheWriteTok = sums?.cacheWriteTokens ?? 0;

    // Anthropic pricing: $3/$15 per MTok input/output, $0.30 cache read, $3.75 cache write
    const estimatedCost = round2(
      (inputTok / 1_000_000) * 3 +
        (outputTok / 1_000_000) * 15 +
        (cacheReadTok / 1_000_000) * 0.3 +
        (cacheWriteTok / 1_000_000) * 3.75
    );

    // Today's tokens for KPI
    const todaySums = todayTokens?._sum;
    const tokensTodayTotal =
      (todaySums?.inputTokens ?? 0) + (todaySums?.outputTokens ?? 0);

    return NextResponse.json({
      kpis: {
        totalCalls,
        tokensToday: tokensTodayTotal,
        estimatedCost,
        errorRate: totalCalls > 0 ? round2((errorCalls / totalCalls) * 100) : 0,
        avgLatency: Math.round(latencyAgg?._avg?.latencyMs ?? 0),
        p50,
        p95,
        cacheHitRate,
      },
      callsOverTime,
      callsByRequestType: callsByRequestType.map((r) => ({
        requestType: r.requestType,
        count: r._count._all,
      })),
      callsByProvider: callsByProvider.map((r) => ({
        provider: r.provider,
        count: r._count._all,
      })),
      tokenUsage,
      latencyDistribution,
      errorRate,
      recentErrors: recentErrors.map((e) => ({
        id: e.id,
        requestType: e.requestType,
        model: e.model,
        error: e.error,
        latencyMs: e.latencyMs,
        createdAt: e.createdAt,
      })),
    });
  } catch (err) {
    console.error("[monitor/ai] Error:", err);
    return NextResponse.json(
      { error: "Failed to fetch AI monitoring data" },
      { status: 500 }
    );
  }
}

// --- Helpers ---

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

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = Math.ceil(sorted.length * p) - 1;
  return sorted[Math.max(0, idx)];
}

function buildTimeSeries(
  dates: Date[],
  start: Date,
  end: Date,
  byHour: boolean
): { label: string; count: number }[] {
  const counts: Record<string, number> = {};
  for (const d of dates) {
    const key = byHour
      ? d.toISOString().slice(0, 13) // "YYYY-MM-DDTHH"
      : d.toISOString().slice(0, 10); // "YYYY-MM-DD"
    counts[key] = (counts[key] ?? 0) + 1;
  }

  const result: { label: string; count: number }[] = [];
  const cursor = new Date(start);

  if (byHour) {
    cursor.setMinutes(0, 0, 0);
    while (cursor <= end) {
      const key = cursor.toISOString().slice(0, 13);
      const displayLabel = cursor.toISOString().slice(11, 16); // "HH:MM"
      result.push({ label: displayLabel, count: counts[key] ?? 0 });
      cursor.setHours(cursor.getHours() + 1);
    }
  } else {
    while (cursor <= end) {
      const key = cursor.toISOString().slice(0, 10);
      result.push({ label: key, count: counts[key] ?? 0 });
      cursor.setDate(cursor.getDate() + 1);
    }
  }

  return result;
}

function buildDayRange(start: Date, end: Date): string[] {
  const days: string[] = [];
  const cursor = new Date(start);
  while (cursor <= end) {
    days.push(cursor.toISOString().slice(0, 10));
    cursor.setDate(cursor.getDate() + 1);
  }
  return days;
}
