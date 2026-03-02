import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getLessonById } from "@/lib/curriculum";
import { gatherLessonReportData, generateParentReport } from "@/lib/email";
import type { ParentReportSections } from "@/lib/email";

export async function POST(
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

    // Check if report already exists
    const existing = await prisma.lessonCompletion.findFirst({
      where: { childId, lessonId },
      orderBy: { completedAt: "desc" },
    });
    if (existing?.parentReport) {
      try {
        const parsed: ParentReportSections = JSON.parse(existing.parentReport);
        return NextResponse.json({ parentReport: parsed });
      } catch {
        // Corrupted — regenerate
      }
    }

    // Load lesson metadata
    const lesson = getLessonById(lessonId);
    if (!lesson) {
      return NextResponse.json({ error: "Lesson not found" }, { status: 404 });
    }

    // Load session for this child + lesson (most recent)
    const lessonSession = await prisma.session.findFirst({
      where: { childId, lessonId },
      orderBy: { updatedAt: "desc" },
    });
    if (!lessonSession) {
      return NextResponse.json(
        { error: "No session found for this lesson" },
        { status: 404 }
      );
    }

    // Load the latest assessment
    const assessment = await prisma.assessment.findFirst({
      where: { childId, lessonId },
      orderBy: { createdAt: "desc" },
    });
    if (!assessment) {
      return NextResponse.json(
        { error: "No assessment found for this lesson" },
        { status: 404 }
      );
    }

    // Load latest submission
    const submission = await prisma.writingSubmission.findFirst({
      where: { childId, lessonId },
      orderBy: { createdAt: "desc" },
    });

    // Parse assessment data
    let scores: Record<string, number> = {};
    let feedback: { strength: string; growth: string; encouragement: string } = {
      strength: "",
      growth: "",
      encouragement: "",
    };
    try { scores = JSON.parse(assessment.scores); } catch { /* ignore */ }
    try { feedback = JSON.parse(assessment.feedback); } catch { /* ignore */ }

    // Gather full report data
    const reportData = await gatherLessonReportData(
      childId,
      lessonId,
      lesson,
      { scores, overallScore: assessment.overallScore, feedback },
      submission?.wordCount ?? 0,
      [], // no new badges for retroactive generation
      {
        conversationHistory: lessonSession.conversationHistory,
        phaseState: lessonSession.phaseState,
      },
      submission?.submissionText ?? assessment.submissionText
    );

    if (!reportData) {
      return NextResponse.json(
        { error: "Failed to gather report data" },
        { status: 500 }
      );
    }

    // Generate the LLM report (2 parallel calls)
    const reportSections = await generateParentReport(reportData);
    if (!reportSections) {
      return NextResponse.json(
        { error: "Report generation failed" },
        { status: 500 }
      );
    }

    // Store in LessonCompletion
    if (existing) {
      await prisma.lessonCompletion.update({
        where: { id: existing.id },
        data: { parentReport: JSON.stringify(reportSections) },
      });
    }

    return NextResponse.json({ parentReport: reportSections });
  } catch (error) {
    console.error("POST /api/children/[id]/report/[lessonId]/generate error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
