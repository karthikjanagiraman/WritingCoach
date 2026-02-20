import { prisma } from "@/lib/db";
import type {
  LearnerProfile,
  LearnerContext,
  WritingSampleRecord,
  StudentPreferenceRecord,
} from "@/types";

// ---------------------------------------------------------------------------
// buildLearnerProfile — aggregate recent lesson data into a LearnerProfile
// ---------------------------------------------------------------------------

/**
 * Build a LearnerProfile for a child by analysing their last 20 lesson
 * completions, recent writing samples, and stored preferences.
 *
 * Returns null when the child has zero completions (nothing to profile yet).
 * On success the computed profile is persisted as a LearnerProfileSnapshot so
 * other parts of the system can read it cheaply without recomputing.
 */
export async function buildLearnerProfile(
  childId: string
): Promise<LearnerProfile | null> {
  // --- Fetch data in parallel ---------------------------------------------------

  const [completions, samples, preferences] = await Promise.all([
    prisma.lessonCompletion.findMany({
      where: { childId },
      orderBy: { completedAt: "desc" },
      take: 20,
      include: { scores: true },
    }),
    prisma.writingSample.findMany({
      where: { childId },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    prisma.studentPreference.findMany({
      where: { childId },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  if (completions.length === 0) {
    return null;
  }

  // --- Criterion averages -------------------------------------------------------

  const criterionTotals: Record<string, { sum: number; count: number }> = {};
  for (const comp of completions) {
    for (const s of comp.scores) {
      if (!criterionTotals[s.criterion]) {
        criterionTotals[s.criterion] = { sum: 0, count: 0 };
      }
      criterionTotals[s.criterion].sum += s.score;
      criterionTotals[s.criterion].count += 1;
    }
  }

  const criterionAvgs = Object.entries(criterionTotals).map(
    ([criterion, { sum, count }]) => ({
      criterion,
      avgScore: round2(sum / count),
    })
  );

  // Strengths: avg >= 3.0, take top 3 by score descending
  const strengths = criterionAvgs
    .filter((c) => c.avgScore >= 3.0)
    .sort((a, b) => b.avgScore - a.avgScore)
    .slice(0, 3);

  // Growth areas: avg < 2.5, take top 2 by score ascending (weakest first)
  const growthAreas = criterionAvgs
    .filter((c) => c.avgScore < 2.5)
    .sort((a, b) => a.avgScore - b.avgScore)
    .slice(0, 2);

  // --- Trends (compare last-3 vs previous-3 completions) ------------------------

  const last3 = completions.slice(0, 3);
  const prev3 = completions.slice(3, 6);

  const scoreTrajectory = computeTrend(
    avg(last3.map((c) => c.overallScore)),
    avg(prev3.map((c) => c.overallScore)),
    0.3
  ) as LearnerProfile["scoreTrajectory"];

  const scaffoldingTrend = computeScaffoldingTrend(
    avg(last3.map((c) => c.hintsUsed)),
    avg(prev3.map((c) => c.hintsUsed)),
    0.3
  );

  // Engagement: based on recent average scores
  const recentAvgScore = avg(last3.map((c) => c.overallScore));
  const engagementLevel: LearnerProfile["engagementLevel"] =
    recentAvgScore >= 3.0 ? "high" : recentAvgScore >= 2.0 ? "medium" : "low";

  // Writing length trend: use timeSpentSec as proxy
  const last3Time = last3
    .map((c) => c.timeSpentSec)
    .filter((t): t is number => t !== null);
  const prev3Time = prev3
    .map((c) => c.timeSpentSec)
    .filter((t): t is number => t !== null);

  const writingLengthTrend = computeTrend(
    avg(last3Time),
    avg(prev3Time),
    0.3
  ) as LearnerProfile["writingLengthTrend"];

  // --- Map DB records to interface shapes ---------------------------------------

  const recentSamples: WritingSampleRecord[] = samples.map((s) => ({
    type: s.type,
    criterion: s.criterion,
    excerpt: s.excerpt,
    lessonId: s.lessonId,
    createdAt: s.createdAt.toISOString(),
  }));

  const prefs: StudentPreferenceRecord[] = preferences.map((p) => ({
    category: p.category,
    value: p.value,
    source: p.source,
    createdAt: p.createdAt.toISOString(),
  }));

  // --- Assemble profile ---------------------------------------------------------

  const profile: LearnerProfile = {
    childId,
    totalLessons: completions.length,
    strengths,
    growthAreas,
    scoreTrajectory,
    scaffoldingTrend,
    engagementLevel,
    writingLengthTrend,
    recentSamples,
    preferences: prefs,
  };

  // --- Persist snapshot (upsert) ------------------------------------------------

  await prisma.learnerProfileSnapshot.upsert({
    where: { childId },
    update: {
      profileData: JSON.stringify(profile),
      totalLessons: profile.totalLessons,
      lastComputedAt: new Date(),
    },
    create: {
      childId,
      profileData: JSON.stringify(profile),
      totalLessons: profile.totalLessons,
    },
  });

  return profile;
}

// ---------------------------------------------------------------------------
// buildLearnerContext — pure transformation, no DB calls
// ---------------------------------------------------------------------------

/**
 * Transform a LearnerProfile into a LearnerContext ready for prompt injection.
 * This is a pure function — no side effects or database access.
 */
export function buildLearnerContext(
  profile: LearnerProfile,
  studentName: string
): LearnerContext {
  // Summary sentence
  const trajectoryLabel =
    profile.scoreTrajectory === "improving"
      ? "Scores are trending upward."
      : profile.scoreTrajectory === "declining"
        ? "Scores have been trending downward recently."
        : "Scores have been steady.";

  const summary = `${studentName} has completed ${profile.totalLessons} lesson${profile.totalLessons === 1 ? "" : "s"}. ${trajectoryLabel} Engagement level: ${profile.engagementLevel}.`;

  // Strengths & growth areas as readable strings
  const strengths = profile.strengths.map(
    (s) => `Strong in ${s.criterion} (avg ${s.avgScore.toFixed(1)})`
  );

  const growthAreas = profile.growthAreas.map(
    (g) => `Needs support in ${g.criterion} (avg ${g.avgScore.toFixed(1)})`
  );

  // Recent samples
  const recentSamples = profile.recentSamples.map((s) => ({
    type: s.type,
    excerpt: s.excerpt,
  }));

  // Preferences
  const preferences = profile.preferences.map((p) => ({
    category: p.category,
    value: p.value,
  }));

  // Connection points: 1-3 actionable teaching strategies
  const connectionPoints = buildConnectionPoints(profile);

  return {
    summary,
    strengths,
    growthAreas,
    recentSamples,
    preferences,
    connectionPoints,
  };
}

// ---------------------------------------------------------------------------
// formatLearnerContextForPrompt — render context as a markdown block
// ---------------------------------------------------------------------------

/**
 * Render a LearnerContext as a markdown block suitable for insertion into
 * a system prompt. Starts with a H2 heading and ends with usage guidance.
 */
export function formatLearnerContextForPrompt(
  context: LearnerContext
): string {
  const sections: string[] = [];

  sections.push("## What You Know About This Student");
  sections.push("");
  sections.push(context.summary);

  // Strengths
  if (context.strengths.length > 0) {
    sections.push("");
    sections.push("### Strengths");
    for (const s of context.strengths) {
      sections.push(`- ${s}`);
    }
  }

  // Growth areas
  if (context.growthAreas.length > 0) {
    sections.push("");
    sections.push("### Growth Areas");
    for (const g of context.growthAreas) {
      sections.push(`- ${g}`);
    }
  }

  // Recent writing samples
  if (context.recentSamples.length > 0) {
    sections.push("");
    sections.push("### Recent Writing Samples");
    for (const sample of context.recentSamples) {
      sections.push(`- **${sample.type}**: "${sample.excerpt}"`);
    }
  }

  // Preferences
  if (context.preferences.length > 0) {
    sections.push("");
    sections.push("### Student Preferences");
    for (const pref of context.preferences) {
      sections.push(`- ${pref.category}: ${pref.value}`);
    }
  }

  // Connection points
  if (context.connectionPoints.length > 0) {
    sections.push("");
    sections.push("### Teaching Connection Points");
    for (const point of context.connectionPoints) {
      sections.push(`- ${point}`);
    }
  }

  // Usage instructions
  sections.push("");
  sections.push(
    "Use this context to personalize your teaching. " +
      "Reference strengths as confidence anchors. " +
      "Address growth areas encouragingly."
  );

  return sections.join("\n");
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/** Round to 2 decimal places. */
function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/** Average of a number array. Returns 0 for empty arrays. */
function avg(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

/**
 * Compare two averages and return a directional trend.
 * If prev is 0 (no prior data) we default to "stable".
 * Uses the provided threshold to determine significance.
 */
function computeTrend(
  recent: number,
  previous: number,
  threshold: number
): "improving" | "stable" | "declining" | "increasing" | "decreasing" {
  if (previous === 0) return "stable";
  const diff = recent - previous;
  if (diff > threshold) return "improving";
  if (diff < -threshold) return "declining";
  return "stable";
}

/**
 * Scaffolding trend is inverted: fewer hints = "decreasing" (good),
 * more hints = "increasing" (needs more support).
 */
function computeScaffoldingTrend(
  recentHints: number,
  previousHints: number,
  threshold: number
): LearnerProfile["scaffoldingTrend"] {
  if (previousHints === 0) return "stable";
  const diff = recentHints - previousHints;
  if (diff > threshold) return "increasing";
  if (diff < -threshold) return "decreasing";
  return "stable";
}

/**
 * Generate 1-3 actionable teaching connection points based on the profile.
 * These help the AI coach find concrete strategies for this student.
 */
function buildConnectionPoints(profile: LearnerProfile): string[] {
  const points: string[] = [];

  // Connect strengths to strategies
  if (profile.strengths.length > 0) {
    const topStrength = profile.strengths[0].criterion;
    points.push(
      `Build on their strength in ${topStrength} to boost confidence when introducing new concepts.`
    );
  }

  // Address growth areas with scaffolding advice
  if (profile.growthAreas.length > 0) {
    const topGrowth = profile.growthAreas[0].criterion;
    if (profile.scaffoldingTrend === "increasing") {
      points.push(
        `They need extra scaffolding for ${topGrowth}. Break tasks into smaller steps and provide concrete examples before asking them to try.`
      );
    } else {
      points.push(
        `Gently encourage growth in ${topGrowth} with targeted examples and positive reinforcement.`
      );
    }
  }

  // Add trajectory-based advice
  if (profile.scoreTrajectory === "declining" && profile.engagementLevel !== "high") {
    points.push(
      "Scores have been dipping — prioritize encouragement and celebrate small wins to rebuild momentum."
    );
  } else if (profile.scoreTrajectory === "improving") {
    points.push(
      "They are on an upward trend — acknowledge their progress explicitly to reinforce the growth mindset."
    );
  }

  return points.slice(0, 3);
}
