import { prisma } from "@/lib/db";
import { getLessonById, getLessonsByTier } from "@/lib/curriculum";
import type { Tier, WritingType } from "@/types";

/**
 * Check whether a child's curriculum should be auto-adapted based on
 * recent assessment performance. Called after each lesson submission.
 *
 * Three triggers:
 * 1. Struggling: last 3 assessments all below 2.0
 * 2. Excelling: last 5 assessments all above 3.5
 * 3. Type Weakness: average score for a specific writing type below 2.0 across 3+ assessments
 *
 * Only modifies PENDING curriculum weeks (not completed or in_progress).
 */
export async function checkCurriculumAdaptation(
  childId: string,
  lessonId: string,
  overallScore: number
): Promise<void> {
  try {
    // Get the child's active curriculum
    const curriculum = await prisma.curriculum.findFirst({
      where: { childId, status: "ACTIVE" },
      include: { weeks: { orderBy: { weekNumber: "asc" } } },
    });

    if (!curriculum) {
      return; // No active curriculum — nothing to adapt
    }

    // Get recent assessments (last 10 for analysis)
    const recentAssessments = await prisma.assessment.findMany({
      where: { childId },
      orderBy: { createdAt: "desc" },
      take: 10,
    });

    if (recentAssessments.length < 3) {
      return; // Not enough data to trigger adaptation
    }

    // Get the child's tier for lesson lookups
    const child = await prisma.childProfile.findUnique({
      where: { id: childId },
      select: { tier: true },
    });
    if (!child) return;

    const tier = child.tier as Tier;

    // Check trigger 1: Struggling — last 3 all below 2.0
    const last3 = recentAssessments.slice(0, 3);
    const isStruggling = last3.every((a) => a.overallScore < 2.0);

    if (isStruggling) {
      await adaptForStruggling(curriculum, tier);
      return; // Only apply one adaptation at a time
    }

    // Check trigger 2: Excelling — last 5 all above 3.5
    if (recentAssessments.length >= 5) {
      const last5 = recentAssessments.slice(0, 5);
      const isExcelling = last5.every((a) => a.overallScore > 3.5);

      if (isExcelling) {
        await adaptForExcelling(curriculum, tier);
        return;
      }
    }

    // Check trigger 3: Type weakness — avg below 2.0 for a type across 3+ assessments
    const typeScores: Record<string, { total: number; count: number }> = {};
    for (const a of recentAssessments) {
      const lesson = getLessonById(a.lessonId);
      if (!lesson) continue;
      const type = lesson.type;
      if (!typeScores[type]) {
        typeScores[type] = { total: 0, count: 0 };
      }
      typeScores[type].total += a.overallScore;
      typeScores[type].count += 1;
    }

    for (const [type, { total, count }] of Object.entries(typeScores)) {
      if (count >= 3 && total / count < 2.0) {
        await adaptForTypeWeakness(
          curriculum,
          tier,
          type as WritingType
        );
        return;
      }
    }
  } catch (error) {
    // Resilient: log but don't throw
    console.error("Curriculum adaptation check failed:", error);
  }
}

// ---- Internal adaptation functions ----

interface CurriculumWithWeeks {
  id: string;
  childId: string;
  weeks: Array<{
    id: string;
    curriculumId: string;
    weekNumber: number;
    theme: string;
    lessonIds: string;
    status: string;
  }>;
}

/**
 * When a student is struggling, swap some upcoming lessons for
 * more foundational (lower unit number) lessons of the same type.
 */
async function adaptForStruggling(
  curriculum: CurriculumWithWeeks,
  tier: Tier
): Promise<void> {
  const pendingWeeks = curriculum.weeks.filter((w) => w.status === "pending");
  if (pendingWeeks.length === 0) return;

  const allTierLessons = getLessonsByTier(tier);

  // Get foundational lessons (unit 1 lessons across all types)
  const foundationalLessons = allTierLessons.filter((l) => {
    const parts = l.id.split(".");
    const unitNum = parseInt(parts[1]) || 0;
    return unitNum === 1;
  });

  if (foundationalLessons.length === 0) return;

  // Modify the first 2 pending weeks (or fewer if not enough)
  const weeksToModify = pendingWeeks.slice(0, 2);

  for (const week of weeksToModify) {
    const currentLessonIds: string[] = JSON.parse(week.lessonIds);
    const previousPlan = { weekNumber: week.weekNumber, lessonIds: currentLessonIds };

    // Replace up to half the lessons with foundational ones
    const replaceCount = Math.max(1, Math.floor(currentLessonIds.length / 2));
    const newLessonIds = [...currentLessonIds];

    let foundIdx = 0;
    for (let i = 0; i < replaceCount && foundIdx < foundationalLessons.length; i++) {
      // Find a foundational lesson not already in the week
      while (
        foundIdx < foundationalLessons.length &&
        newLessonIds.includes(foundationalLessons[foundIdx].id)
      ) {
        foundIdx++;
      }
      if (foundIdx < foundationalLessons.length) {
        newLessonIds[i] = foundationalLessons[foundIdx].id;
        foundIdx++;
      }
    }

    const newPlan = { weekNumber: week.weekNumber, lessonIds: newLessonIds };

    // Save revision record
    await prisma.curriculumRevision.create({
      data: {
        curriculumId: curriculum.id,
        reason: "auto_struggling",
        description:
          "Automatically added more foundational lessons due to low scores on recent assessments.",
        previousPlan: JSON.stringify(previousPlan),
        newPlan: JSON.stringify(newPlan),
      },
    });

    // Update the week
    await prisma.curriculumWeek.update({
      where: { id: week.id },
      data: { lessonIds: JSON.stringify(newLessonIds) },
    });
  }
}

/**
 * When a student is excelling, advance difficulty by swapping
 * upcoming lessons for higher unit (more advanced) lessons.
 */
async function adaptForExcelling(
  curriculum: CurriculumWithWeeks,
  tier: Tier
): Promise<void> {
  const pendingWeeks = curriculum.weeks.filter((w) => w.status === "pending");
  if (pendingWeeks.length === 0) return;

  const allTierLessons = getLessonsByTier(tier);

  // Get advanced lessons (unit 3-4 lessons)
  const advancedLessons = allTierLessons.filter((l) => {
    const parts = l.id.split(".");
    const unitNum = parseInt(parts[1]) || 0;
    return unitNum >= 3;
  });

  if (advancedLessons.length === 0) return;

  // Modify the first 2 pending weeks
  const weeksToModify = pendingWeeks.slice(0, 2);

  for (const week of weeksToModify) {
    const currentLessonIds: string[] = JSON.parse(week.lessonIds);
    const previousPlan = { weekNumber: week.weekNumber, lessonIds: currentLessonIds };

    // Replace up to half the lessons with advanced ones
    const replaceCount = Math.max(1, Math.floor(currentLessonIds.length / 2));
    const newLessonIds = [...currentLessonIds];

    let advIdx = 0;
    for (let i = 0; i < replaceCount && advIdx < advancedLessons.length; i++) {
      while (
        advIdx < advancedLessons.length &&
        newLessonIds.includes(advancedLessons[advIdx].id)
      ) {
        advIdx++;
      }
      if (advIdx < advancedLessons.length) {
        // Replace from the end of the list (keep the first lessons, replace later ones)
        const replaceIdx = newLessonIds.length - 1 - i;
        if (replaceIdx >= 0) {
          newLessonIds[replaceIdx] = advancedLessons[advIdx].id;
        }
        advIdx++;
      }
    }

    const newPlan = { weekNumber: week.weekNumber, lessonIds: newLessonIds };

    await prisma.curriculumRevision.create({
      data: {
        curriculumId: curriculum.id,
        reason: "auto_excelling",
        description:
          "Automatically advanced to more challenging lessons due to consistently high scores.",
        previousPlan: JSON.stringify(previousPlan),
        newPlan: JSON.stringify(newPlan),
      },
    });

    await prisma.curriculumWeek.update({
      where: { id: week.id },
      data: { lessonIds: JSON.stringify(newLessonIds) },
    });
  }
}

/**
 * When a student has a weakness in a specific writing type,
 * add extra practice lessons for that type in upcoming weeks.
 */
async function adaptForTypeWeakness(
  curriculum: CurriculumWithWeeks,
  tier: Tier,
  weakType: WritingType
): Promise<void> {
  const pendingWeeks = curriculum.weeks.filter((w) => w.status === "pending");
  if (pendingWeeks.length === 0) return;

  const allTierLessons = getLessonsByTier(tier);

  // Get lessons of the weak type
  const typeLessons = allTierLessons.filter((l) => l.type === weakType);
  if (typeLessons.length === 0) return;

  // Modify the first 2 pending weeks — add extra lessons of the weak type
  const weeksToModify = pendingWeeks.slice(0, 2);

  for (const week of weeksToModify) {
    const currentLessonIds: string[] = JSON.parse(week.lessonIds);
    const previousPlan = { weekNumber: week.weekNumber, lessonIds: currentLessonIds };

    const newLessonIds = [...currentLessonIds];

    // Find lessons of the weak type that are NOT already in this week
    const availableTypeLessons = typeLessons.filter(
      (l) => !newLessonIds.includes(l.id)
    );

    if (availableTypeLessons.length === 0) continue;

    // Replace one non-weak-type lesson with a weak-type lesson
    // Find first lesson in the week that is NOT of the weak type
    let replaced = false;
    for (let i = 0; i < newLessonIds.length; i++) {
      const existingLesson = getLessonById(newLessonIds[i]);
      if (existingLesson && existingLesson.type !== weakType) {
        newLessonIds[i] = availableTypeLessons[0].id;
        replaced = true;
        break;
      }
    }

    if (!replaced) continue;

    const newPlan = { weekNumber: week.weekNumber, lessonIds: newLessonIds };

    await prisma.curriculumRevision.create({
      data: {
        curriculumId: curriculum.id,
        reason: "auto_struggling",
        description: `Automatically added extra ${weakType} writing practice due to low scores in that area.`,
        previousPlan: JSON.stringify(previousPlan),
        newPlan: JSON.stringify(newPlan),
      },
    });

    await prisma.curriculumWeek.update({
      where: { id: week.id },
      data: { lessonIds: JSON.stringify(newLessonIds) },
    });
  }
}
