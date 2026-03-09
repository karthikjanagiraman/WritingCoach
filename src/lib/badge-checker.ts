import { prisma } from "@/lib/db";
import { BADGE_CATALOG } from "@/lib/badges";

/**
 * Check all badge conditions for a child and unlock any newly earned badges.
 * Returns an array of newly unlocked badge IDs.
 *
 * Design: batch all database queries upfront, then evaluate each badge condition
 * in memory. Each condition is wrapped in its own try/catch so a failure in one
 * badge check does not prevent the rest from running.
 */
export async function checkAndUnlockBadges(childId: string): Promise<string[]> {
  // 1. Get all existing achievements to skip already-earned badges
  const existingAchievements = await prisma.achievement.findMany({
    where: { childId },
    select: { badgeId: true },
  });
  const earnedSet = new Set(existingAchievements.map((a) => a.badgeId));

  // 2. Batch all needed queries upfront
  const [
    completedLessons,
    skillRecords,
    assessments,
    revisionSubmissions,
  ] = await Promise.all([
    // All completed lesson progress records
    prisma.lessonProgress.findMany({
      where: { childId, status: "completed" },
      select: { lessonId: true, completedAt: true },
    }),

    // All skill progress records
    prisma.skillProgress.findMany({
      where: { childId },
      select: { skillCategory: true, skillName: true, level: true, score: true },
    }),

    // All assessments with lesson IDs and dates (for comeback_kid + renaissance_writer)
    prisma.assessment.findMany({
      where: { childId },
      select: { overallScore: true, lessonId: true, createdAt: true },
      orderBy: { createdAt: "asc" },
    }),

    // Revision submissions with their feedback (for draft_doctor)
    prisma.writingSubmission.findMany({
      where: { childId, revisionNumber: { gt: 0 }, revisionOf: { not: null } },
      select: {
        revisionOf: true,
        feedback: { select: { overallScore: true } },
      },
    }),
  ]);

  // ── Pre-compute derived data ──────────────────────────────────────────

  const completedCount = completedLessons.length;
  const completedLessonIds = completedLessons.map((lp) => lp.lessonId);

  // ink_explorer: completed at least one lesson in each of 4 writing types
  const hasNarrative = completedLessonIds.some((id) => id.startsWith("N"));
  const hasPersuasive = completedLessonIds.some((id) => id.startsWith("P"));
  const hasExpository = completedLessonIds.some((id) => id.startsWith("E"));
  const hasDescriptive = completedLessonIds.some((id) => id.startsWith("D"));
  const allFourTypes = hasNarrative && hasPersuasive && hasExpository && hasDescriptive;

  // high_marks: 3+ assessments with score >= 3.5
  const highScoreCount = assessments.filter((a) => a.overallScore >= 3.5).length;

  // comeback_kid: scored < 2.0, then later scored 3.0+ (assessments are sorted by createdAt asc)
  const hasComeback = (() => {
    let sawLow = false;
    for (const a of assessments) {
      if (a.overallScore < 2.0) sawLow = true;
      if (sawLow && a.overallScore >= 3.0) return true;
    }
    return false;
  })();

  // draft_doctor: a revision that actually improved the overall score
  // We need to compare revision feedback scores against original feedback scores
  let hasImprovedRevision = false;
  if (revisionSubmissions.length > 0) {
    const originalIds = revisionSubmissions
      .map((r) => r.revisionOf)
      .filter((id): id is string => id !== null);

    if (originalIds.length > 0) {
      const originalFeedbacks = await prisma.aIFeedback.findMany({
        where: { submissionId: { in: originalIds } },
        select: { submissionId: true, overallScore: true },
      });
      const originalScoreMap = new Map(
        originalFeedbacks.map((o) => [o.submissionId, o.overallScore])
      );

      hasImprovedRevision = revisionSubmissions.some((r) => {
        const revisionScore = r.feedback?.overallScore;
        const originalScore = r.revisionOf ? originalScoreMap.get(r.revisionOf) : undefined;
        if (revisionScore == null || originalScore == null) return false;
        return revisionScore > originalScore;
      });
    }
  }

  // rhythm_writer: 3 lessons completed in a single Mon–Sun week
  const hasThreeInWeek = (() => {
    const weekCounts: Record<string, number> = {};
    for (const lp of completedLessons) {
      if (!lp.completedAt) continue;
      const d = new Date(lp.completedAt);
      // Compute ISO week start (Monday)
      const day = d.getDay();
      const mondayOffset = day === 0 ? -6 : 1 - day;
      const monday = new Date(d);
      monday.setDate(monday.getDate() + mondayOffset);
      const key = `${monday.getFullYear()}-${String(monday.getMonth() + 1).padStart(2, "0")}-${String(monday.getDate()).padStart(2, "0")}`;
      weekCounts[key] = (weekCounts[key] ?? 0) + 1;
    }
    return Object.values(weekCounts).some((c) => c >= 3);
  })();

  // Skill proficiency checks
  const hasProficient = skillRecords.some(
    (s) => s.level === "PROFICIENT" || s.level === "ADVANCED"
  );

  // Count categories with PROFICIENT or ADVANCED
  const proficientCategories = new Set<string>();
  for (const s of skillRecords) {
    if (s.level === "PROFICIENT" || s.level === "ADVANCED") {
      proficientCategories.add(s.skillCategory);
    }
  }

  // well_rounded: score >= 2.5 in all 4 categories
  const categoryScores: Record<string, number> = {};
  for (const s of skillRecords) {
    const existing = categoryScores[s.skillCategory];
    if (existing === undefined || s.score > existing) {
      categoryScores[s.skillCategory] = s.score;
    }
  }
  const allFourCategories = ["narrative", "persuasive", "expository", "descriptive"];
  const isWellRounded = allFourCategories.every(
    (cat) => (categoryScores[cat] ?? 0) >= 2.5
  );

  // renaissance_writer: score 3.5+ on assessments in all 4 writing types
  const typeHighScores: Record<string, boolean> = {
    N: false, P: false, E: false, D: false,
  };
  for (const a of assessments) {
    if (a.overallScore >= 3.5 && a.lessonId) {
      const prefix = a.lessonId.charAt(0);
      if (prefix in typeHighScores) {
        typeHighScores[prefix] = true;
      }
    }
  }
  const isRenaissance = Object.values(typeHighScores).every(Boolean);

  // ── Evaluate each badge condition ─────────────────────────────────────

  const conditionMap: Record<string, () => boolean> = {
    // First Steps (Common)
    brave_start: () => completedCount >= 1,
    ink_explorer: () => allFourTypes,
    draft_doctor: () => hasImprovedRevision,
    rhythm_writer: () => hasThreeInWeek,

    // Craft (Rare)
    ten_down: () => completedCount >= 10,
    high_marks: () => highScoreCount >= 3,
    comeback_kid: () => hasComeback,
    deep_diver: () => hasProficient,

    // Mastery (Epic)
    well_rounded: () => isWellRounded,
    renaissance_writer: () => isRenaissance,
    marathon_writer: () => completedCount >= 30,

    // Legendary
    writing_master: () => proficientCategories.size >= 3 && completedCount >= 40,
  };

  const newBadgeIds: string[] = [];

  for (const badge of BADGE_CATALOG) {
    // Skip already earned
    if (earnedSet.has(badge.id)) continue;

    try {
      const conditionFn = conditionMap[badge.id];
      if (conditionFn && conditionFn()) {
        newBadgeIds.push(badge.id);
      }
    } catch (err) {
      console.error(`Badge check failed for "${badge.id}":`, err);
      // Continue checking other badges
    }
  }

  // 4. Persist new achievements in bulk
  if (newBadgeIds.length > 0) {
    await prisma.achievement.createMany({
      data: newBadgeIds.map((badgeId) => ({
        childId,
        badgeId,
      })),
      skipDuplicates: true,
    });
  }

  return newBadgeIds;
}
