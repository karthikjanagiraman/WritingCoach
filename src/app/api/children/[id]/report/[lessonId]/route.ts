import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getLessonById } from "@/lib/curriculum";
import { sendMessage } from "@/lib/llm";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; lessonId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: childId, lessonId } = await params;

    // Verify child belongs to this parent
    const child = await prisma.childProfile.findFirst({
      where: { id: childId, parentId: session.user.userId },
    });
    if (!child) {
      return NextResponse.json(
        { error: "Child not found or access denied" },
        { status: 403 }
      );
    }

    // Get lesson metadata from catalog
    const lesson = getLessonById(lessonId);
    if (!lesson) {
      return NextResponse.json(
        { error: "Lesson not found" },
        { status: 404 }
      );
    }

    // Get lesson progress
    const progress = await prisma.lessonProgress.findUnique({
      where: {
        childId_lessonId: { childId, lessonId },
      },
    });

    // Get the latest assessment for this child + lesson
    const assessment = await prisma.assessment.findFirst({
      where: { childId, lessonId },
      orderBy: { createdAt: "desc" },
    });

    // Get all writing submissions for this child + lesson
    const submissions = await prisma.writingSubmission.findMany({
      where: { childId, lessonId },
      include: { feedback: true },
      orderBy: { revisionNumber: "asc" },
    });

    // Parse assessment data
    let assessmentData = null;
    if (assessment) {
      let parsedScores: Record<string, number> = {};
      let parsedFeedback: { strength: string; growth: string; encouragement: string } | null = null;
      try { parsedScores = JSON.parse(assessment.scores); } catch { /* ignore */ }
      try { parsedFeedback = JSON.parse(assessment.feedback); } catch { /* ignore */ }

      assessmentData = {
        overallScore: assessment.overallScore,
        scores: parsedScores,
        feedback: parsedFeedback,
        createdAt: assessment.createdAt,
      };
    }

    // Format submissions
    const formattedSubmissions = submissions.map((s) => ({
      id: s.id,
      submissionText: s.submissionText,
      wordCount: s.wordCount,
      revisionNumber: s.revisionNumber,
      createdAt: s.createdAt,
      feedback: s.feedback
        ? {
            overallScore: s.feedback.overallScore,
            scores: (() => { try { return JSON.parse(s.feedback.scores); } catch { return {}; } })(),
            strength: s.feedback.strength,
            growthArea: s.feedback.growthArea,
            encouragement: s.feedback.encouragement,
          }
        : null,
    }));

    // Generate parent tips based on the growth area
    let parentTips: string | null = null;
    if (assessment) {
      let parsedFeedback: { strength: string; growth: string; encouragement: string } | null = null;
      try { parsedFeedback = JSON.parse(assessment.feedback); } catch { /* ignore */ }

      if (parsedFeedback?.growth) {
        try {
          const prompt = `You are an educational consultant. A child (${child.name}, age ${child.age}) just completed a writing lesson called "${lesson.title}" (${lesson.type} writing).

Their growth area from the assessment: "${parsedFeedback.growth}"
Their strength: "${parsedFeedback.strength}"
Score: ${assessment.overallScore}/4

Provide 2-3 brief, specific suggestions for the parent to help reinforce this lesson at home. Be warm and practical. Each suggestion should be 1-2 sentences. Format as a numbered list.`;

          parentTips = await sendMessage(prompt, [
            { role: "user", content: "What can I do at home to help my child improve?" },
          ]);
        } catch (err) {
          console.error("Failed to generate parent tips:", err);
        }
      }
    }

    return NextResponse.json({
      lesson: {
        id: lesson.id,
        title: lesson.title,
        type: lesson.type,
        unit: lesson.unit,
        learningObjectives: lesson.learningObjectives ?? [],
      },
      status: progress?.status ?? "not_started",
      assessment: assessmentData,
      submissions: formattedSubmissions,
      parentTips,
    });
  } catch (error) {
    console.error("GET /api/children/[id]/report/[lessonId] error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
