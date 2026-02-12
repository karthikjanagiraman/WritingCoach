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
    writingSubmissions,
    skillRecords,
    streak,
    assessments,
  ] = await Promise.all([
    // All completed lesson progress records
    prisma.lessonProgress.findMany({
      where: { childId, status: "completed" },
      select: { lessonId: true, completedAt: true },
    }),

    // All writing submissions (for word count and revision checks)
    prisma.writingSubmission.findMany({
      where: { childId },
      select: { wordCount: true, revisionNumber: true },
    }),

    // All skill progress records
    prisma.skillProgress.findMany({
      where: { childId },
      select: { skillCategory: true, skillName: true, level: true, score: true },
    }),

    // Streak data (may be null)
    prisma.streak.findUnique({
      where: { childId },
    }),

    // All assessments (for score checks)
    prisma.assessment.findMany({
      where: { childId },
      select: { overallScore: true },
    }),
  ]);

  // Pre-compute derived data
  const completedCount = completedLessons.length;
  const maxWordCount = writingSubmissions.length > 0
    ? Math.max(...writingSubmissions.map((s) => s.wordCount))
    : 0;
  const hasRevision = writingSubmissions.some((s) => s.revisionNumber > 0);

  const completedLessonIds = completedLessons.map((lp) => lp.lessonId);
  const hasNarrative = completedLessonIds.some((id) => id.startsWith("N"));
  const hasPersuasive = completedLessonIds.some((id) => id.startsWith("P"));
  const hasExpository = completedLessonIds.some((id) => id.startsWith("E"));
  const hasDescriptive = completedLessonIds.some((id) => id.startsWith("D"));

  const highScoreCount = assessments.filter((a) => a.overallScore >= 3.5).length;
  const hasPerfectScore = assessments.some((a) => a.overallScore >= 4.0);

  const hasProficient = skillRecords.some((s) => s.level === "PROFICIENT" || s.level === "ADVANCED");
  const hasAdvanced = skillRecords.some((s) => s.level === "ADVANCED");

  // "Well rounded" — need at least one skill record in each of the 4 categories
  // with score >= 2.0
  const categoryScores: Record<string, number> = {};
  for (const s of skillRecords) {
    const existing = categoryScores[s.skillCategory];
    if (existing === undefined || s.score > existing) {
      categoryScores[s.skillCategory] = s.score;
    }
  }
  const allFourCategories = ["narrative", "persuasive", "expository", "descriptive"];
  const isWellRounded =
    allFourCategories.every((cat) => (categoryScores[cat] ?? 0) >= 2.0);

  // Streak values
  const currentStreak = streak?.currentStreak ?? 0;
  const longestStreak = streak?.longestStreak ?? 0;
  const bestStreak = Math.max(currentStreak, longestStreak);
  const weeklyMet =
    streak != null && streak.weeklyCompleted >= streak.weeklyGoal;

  // Time-based: check completion times
  const completionHours = completedLessons
    .filter((lp) => lp.completedAt != null)
    .map((lp) => new Date(lp.completedAt!).getHours());
  const hasEarlyBird = completionHours.some((h) => h < 9);
  const hasNightOwl = completionHours.some((h) => h >= 20);

  // 3. Evaluate each badge condition
  const conditionMap: Record<string, () => boolean> = {
    // Writing
    first_lesson: () => completedCount >= 1,
    five_lessons: () => completedCount >= 5,
    ten_lessons: () => completedCount >= 10,
    twenty_lessons: () => completedCount >= 20,
    first_revision: () => hasRevision,
    wordsmith_100: () => maxWordCount >= 100,
    wordsmith_250: () => maxWordCount >= 250,
    wordsmith_500: () => maxWordCount >= 500,

    // Progress
    perfect_score: () => hasPerfectScore,
    high_achiever: () => highScoreCount >= 3,
    all_narrative: () => hasNarrative,
    all_persuasive: () => hasPersuasive,
    all_expository: () => hasExpository,
    all_descriptive: () => hasDescriptive,

    // Streak
    streak_3: () => bestStreak >= 3,
    streak_7: () => bestStreak >= 7,
    streak_14: () => bestStreak >= 14,
    weekly_goal: () => weeklyMet,

    // Skill
    first_proficient: () => hasProficient,
    first_advanced: () => hasAdvanced,
    well_rounded: () => isWellRounded,

    // Special
    early_bird: () => hasEarlyBird,
    night_owl: () => hasNightOwl,
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
