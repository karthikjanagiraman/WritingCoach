import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getLessonById } from "@/lib/curriculum";
import { SKILL_DEFINITIONS } from "@/lib/skill-map";
import { sendMessage } from "@/lib/llm";

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
    const url = new URL(request.url);
    const generateSummary = url.searchParams.get("generateSummary") === "true";

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
    const needsImprovementLessons = lessonProgressRecords.filter(
      (p) => p.status === "needs_improvement"
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
      needsImprovementLessons,
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

    // --- Build lesson progress lookup ---
    const progressByLesson = new Map(
      lessonProgressRecords.map((p) => [p.lessonId, p])
    );

    // --- Recent assessments (last 10) — enriched ---

    // Deduplicate: keep only the latest assessment per lesson
    const seenLessons = new Set<string>();
    const uniqueAssessments = assessments.filter((a) => {
      if (seenLessons.has(a.lessonId)) return false;
      seenLessons.add(a.lessonId);
      return true;
    });

    const recentAssessments = uniqueAssessments.slice(0, 10).map((a) => {
      const lesson = getLessonById(a.lessonId);
      const progress = progressByLesson.get(a.lessonId);

      // Find the writing submission + feedback for this assessment
      const submission = submissions.find(
        (s) => s.sessionId === a.sessionId && s.revisionNumber === 0
      );
      const revisionCount = submissions.filter(
        (s) => s.sessionId === a.sessionId && s.revisionNumber > 0
      ).length;

      let parsedScores: Record<string, number> = {};
      try {
        parsedScores = JSON.parse(a.scores);
      } catch { /* ignore */ }

      let parsedFeedback: { strength: string; growth: string; encouragement: string } | null = null;
      try {
        parsedFeedback = JSON.parse(a.feedback);
      } catch { /* ignore */ }

      return {
        lessonId: a.lessonId,
        lessonTitle: lesson?.title ?? "Unknown Lesson",
        lessonType: lesson?.type ?? "unknown",
        learningObjectives: lesson?.learningObjectives ?? [],
        overallScore: a.overallScore,
        scores: parsedScores,
        feedback: parsedFeedback,
        submittedText: submission?.submissionText ?? null,
        wordCount: submission?.wordCount ?? null,
        revisionCount,
        status: progress?.status ?? "unknown",
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
      (p) => (p.status === "completed" || p.status === "needs_improvement") && p.completedAt
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

    // --- AI Summary (optional) ---

    let aiSummary: string | null = null;
    if (generateSummary && recentAssessments.length > 0) {
      try {
        const assessmentContext = recentAssessments.slice(0, 5).map((a) => ({
          lesson: a.lessonTitle,
          type: a.lessonType,
          score: a.overallScore,
          strength: a.feedback?.strength ?? "",
          growth: a.feedback?.growth ?? "",
        }));

        const prompt = `You are an educational consultant writing a brief report for a parent about their child's creative writing progress. The child's name is ${child.name}, age ${child.age}.

Here are their recent lesson assessments (scored 0-4):
${assessmentContext.map((a, i) => `${i + 1}. "${a.lesson}" (${a.type}) — Score: ${a.score}/4
   Strength: ${a.strength}
   Growth area: ${a.growth}`).join("\n")}

Overall stats: ${completedLessons} lessons completed, average score ${averageScore ?? "N/A"}/4, ${totalWords} total words written.

Write a parent-friendly summary (3-4 paragraphs) covering:
1. What the child has been learning and their overall trajectory
2. Patterns in their strengths
3. Areas where they can grow
4. 2-3 specific, actionable suggestions for parents to support learning at home

Use a warm, encouraging tone. Address the parent directly ("Your child..."). Keep it concise.`;

        aiSummary = await sendMessage(prompt, [
          { role: "user", content: "Please generate the parent summary report." },
        ]);
      } catch (err) {
        console.error("Failed to generate AI summary:", err);
        aiSummary = null;
      }
    }

    const response: Record<string, unknown> = {
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
    };

    if (generateSummary) {
      response.aiSummary = aiSummary;
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error("GET /api/children/[id]/report error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
