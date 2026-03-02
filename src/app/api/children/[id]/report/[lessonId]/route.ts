import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getLessonById } from "@/lib/curriculum";
import type { ParentReportSections } from "@/lib/email";

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

    // Load stored parent report from LessonCompletion
    let parentReport: ParentReportSections | null = null;
    const lessonCompletion = await prisma.lessonCompletion.findFirst({
      where: { childId, lessonId },
      orderBy: { completedAt: "desc" },
    });
    if (lessonCompletion?.parentReport) {
      try {
        parentReport = JSON.parse(lessonCompletion.parentReport);
      } catch {
        // Corrupted JSON — treat as null
      }
    }

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
      parentReport,
      parentTips: null, // Deprecated — replaced by parentReport.growthPlan
    });
  } catch (error) {
    console.error("GET /api/children/[id]/report/[lessonId] error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
