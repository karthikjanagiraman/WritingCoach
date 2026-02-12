import { prisma } from "@/lib/db";
import { getLessonSkills, scoreToLevel } from "./skill-map";

/**
 * Update skill progress records after a lesson assessment.
 * Uses a rolling average (70% new score + 30% old score) to smooth out
 * individual assessment variance while still rewarding recent improvement.
 */
export async function updateSkillProgress(
  childId: string,
  lessonId: string,
  overallScore: number
): Promise<void> {
  const { category, skills } = getLessonSkills(lessonId);

  for (const skillName of skills) {
    const existing = await prisma.skillProgress.findUnique({
      where: {
        childId_skillCategory_skillName: {
          childId,
          skillCategory: category,
          skillName,
        },
      },
    });

    let newScore: number;
    let totalAttempts: number;

    if (existing) {
      // Rolling average: weight recent performance more heavily
      newScore = overallScore * 0.7 + existing.score * 0.3;
      totalAttempts = existing.totalAttempts + 1;
    } else {
      newScore = overallScore;
      totalAttempts = 1;
    }

    const level = scoreToLevel(newScore);

    await prisma.skillProgress.upsert({
      where: {
        childId_skillCategory_skillName: {
          childId,
          skillCategory: category,
          skillName,
        },
      },
      update: {
        score: newScore,
        level,
        totalAttempts,
        lastAssessedAt: new Date(),
      },
      create: {
        childId,
        skillCategory: category,
        skillName,
        score: newScore,
        level,
        totalAttempts,
        lastAssessedAt: new Date(),
      },
    });
  }
}
