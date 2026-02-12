import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getLessonById } from "@/lib/curriculum";
import { SKILL_DEFINITIONS } from "@/lib/skill-map";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: childId } = await params;

    // Verify child exists and belongs to this parent
    const child = await prisma.childProfile.findFirst({
      where: { id: childId, parentId: session.user.userId },
    });
    if (!child) {
      return NextResponse.json(
        { error: "Child not found or access denied" },
        { status: 403 }
      );
    }

    // --- Summary aggregations ---

    const lessonProgressRecords = await prisma.lessonProgress.findMany({
      where: { childId },
    });
    const totalLessons = lessonProgressRecords.length;
    const completedLessons = lessonProgressRecords.filter(
      (p) => p.status === "completed"
    ).length;

    const assessments = await prisma.assessment.findMany({
      where: { childId },
      orderBy: { createdAt: "desc" },
    });

    const averageScore =
      assessments.length > 0
        ? Math.round(
            (assessments.reduce((sum, a) => sum + a.overallScore, 0) /
              assessments.length) *
              10
          ) / 10
        : null;

    const submissions = await prisma.writingSubmission.findMany({
      where: { childId },
      include: { feedback: true },
    });

    const totalWords = submissions.reduce((sum, s) => sum + s.wordCount, 0);
    const totalSubmissions = submissions.length;

    const badgeCount = await prisma.achievement.count({
      where: { childId },
    });

    const summary = {
      totalLessons,
      completedLessons,
      averageScore,
      totalWords,
      totalSubmissions,
      badgeCount,
    };

    // --- Skills ---

    const skillRecords = await prisma.skillProgress.findMany({
      where: { childId },
    });

    const skills = skillRecords.map((s) => {
      const categoryDef = SKILL_DEFINITIONS[s.skillCategory];
      const displayName =
        categoryDef?.skills?.[s.skillName] ??
        s.skillName.replace(/_/g, " ");
      return {
        category: s.skillCategory,
        displayName,
        avgScore: Math.round(s.score * 10) / 10,
      };
    });

    // --- Streak ---

    const streakRecord = await prisma.streak.findUnique({
      where: { childId },
    });

    const streak = streakRecord
      ? {
          currentStreak: streakRecord.currentStreak,
          longestStreak: streakRecord.longestStreak,
          weeklyGoal: streakRecord.weeklyGoal,
          weeklyCompleted: streakRecord.weeklyCompleted,
        }
      : {
          currentStreak: 0,
          longestStreak: 0,
          weeklyGoal: 3,
          weeklyCompleted: 0,
        };

    // --- Recent assessments (last 10) ---

    const recentAssessments = assessments.slice(0, 10).map((a) => {
      const lesson = getLessonById(a.lessonId);
      return {
        lessonId: a.lessonId,
        lessonTitle: lesson?.title ?? "Unknown Lesson",
        lessonType: lesson?.type ?? "unknown",
        overallScore: a.overallScore,
        createdAt: a.createdAt,
      };
    });

    // --- Scores by writing type ---

    const typeGroups: Record<
      string,
      { totalScore: number; count: number }
    > = {};
    for (const a of assessments) {
      const lesson = getLessonById(a.lessonId);
      const type = lesson?.type ?? "unknown";
      if (!typeGroups[type]) {
        typeGroups[type] = { totalScore: 0, count: 0 };
      }
      typeGroups[type].totalScore += a.overallScore;
      typeGroups[type].count += 1;
    }

    const scoresByType = Object.entries(typeGroups).map(
      ([type, { totalScore, count }]) => ({
        type,
        avgScore: Math.round((totalScore / count) * 10) / 10,
        count,
      })
    );

    // --- Activity timeline (last 90 days) ---

    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    // Collect dates from completed lessons
    const completedWithDates = lessonProgressRecords.filter(
      (p) => p.status === "completed" && p.completedAt
    );

    // Collect dates from writing submissions
    const recentSubmissions = submissions.filter(
      (s) => s.createdAt >= ninetyDaysAgo
    );

    // Build date -> count map
    const dateCounts: Record<string, number> = {};

    for (const p of completedWithDates) {
      if (p.completedAt && p.completedAt >= ninetyDaysAgo) {
        const dateStr = p.completedAt.toISOString().split("T")[0];
        dateCounts[dateStr] = (dateCounts[dateStr] || 0) + 1;
      }
    }

    for (const s of recentSubmissions) {
      const dateStr = s.createdAt.toISOString().split("T")[0];
      dateCounts[dateStr] = (dateCounts[dateStr] || 0) + 1;
    }

    const activityTimeline = Object.entries(dateCounts)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return NextResponse.json({
      child: {
        id: child.id,
        name: child.name,
        age: child.age,
        tier: child.tier,
      },
      summary,
      skills,
      streak,
      recentAssessments,
      scoresByType,
      activityTimeline,
    });
  } catch (error) {
    console.error("GET /api/children/[id]/report error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
