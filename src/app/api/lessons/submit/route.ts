import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { getLessonById } from "@/lib/curriculum";
import { getRubricById } from "@/lib/rubrics";
import { evaluateWriting, evaluateWritingGeneral } from "@/lib/llm";
import type { Message, Tier } from "@/types";

export async function POST(request: NextRequest) {
  try {
    const authSession = await auth();
    if (!authSession?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { sessionId, text } = body;

    if (!sessionId || !text) {
      return NextResponse.json(
        { error: "sessionId and text are required" },
        { status: 400 }
      );
    }

    if (typeof text !== "string" || text.trim().length === 0) {
      return NextResponse.json(
        { error: "text must be a non-empty string" },
        { status: 400 }
      );
    }

    // Load session
    const session = await prisma.session.findUnique({
      where: { id: sessionId },
      include: { child: true },
    });
    if (!session) {
      return NextResponse.json(
        { error: "Session not found" },
        { status: 404 }
      );
    }

    // Only allow submission during assessment or guided phase
    if (session.phase !== "assessment" && session.phase !== "guided") {
      return NextResponse.json(
        { error: "Submissions are only allowed during the assessment phase" },
        { status: 400 }
      );
    }

    // Load lesson and its rubric
    const lesson = getLessonById(session.lessonId);
    if (!lesson) {
      return NextResponse.json(
        { error: "Lesson data not found" },
        { status: 404 }
      );
    }

    // Evaluate the writing submission — with rubric if available, general otherwise
    let result;
    let rubricId: string | undefined;

    if (lesson.rubricId) {
      const rubric = getRubricById(lesson.rubricId);
      if (rubric) {
        result = await evaluateWriting(
          text.trim(),
          rubric,
          session.child.name,
          session.child.tier
        );
        rubricId = lesson.rubricId;
      }
    }

    if (!result) {
      // No rubric — use general evaluation
      result = await evaluateWritingGeneral(
        text.trim(),
        session.child.tier as Tier,
        lesson.title
      );
    }

    // Store the assessment
    const assessment = await prisma.assessment.create({
      data: {
        sessionId: session.id,
        childId: session.childId,
        lessonId: session.lessonId,
        rubricId: rubricId ?? "general",
        submissionText: text.trim(),
        scores: JSON.stringify(result.scores),
        overallScore: result.overallScore,
        feedback: JSON.stringify(result.feedback),
      },
    });

    // Update session phase to feedback
    await prisma.session.update({
      where: { id: sessionId },
      data: {
        phase: "feedback",
      },
    });

    // Mark lesson as completed
    await prisma.lessonProgress.updateMany({
      where: {
        childId: session.childId,
        lessonId: session.lessonId,
      },
      data: {
        status: "completed",
        currentPhase: "feedback",
        completedAt: new Date(),
      },
    });

    // Add feedback message to conversation history
    const conversationHistory: Message[] = JSON.parse(
      session.conversationHistory
    );
    const feedbackMessage: Message = {
      id: crypto.randomUUID(),
      role: "coach",
      content: `${result.feedback.strength} ${result.feedback.growth} ${result.feedback.encouragement}`,
      timestamp: new Date().toISOString(),
    };
    conversationHistory.push(feedbackMessage);

    await prisma.session.update({
      where: { id: sessionId },
      data: {
        conversationHistory: JSON.stringify(conversationHistory),
      },
    });

    // Build rubric info for the response (if available)
    let rubricInfo = null;
    if (rubricId && rubricId !== "general") {
      const rubric = getRubricById(rubricId);
      if (rubric) {
        rubricInfo = {
          id: rubric.id,
          description: rubric.description,
          criteria: rubric.criteria.map((c) => ({
            name: c.name,
            displayName: c.display_name,
            weight: c.weight,
          })),
        };
      }
    }

    return NextResponse.json({
      assessmentId: assessment.id,
      scores: result.scores,
      overallScore: result.overallScore,
      feedback: result.feedback,
      rubric: rubricInfo,
    });
  } catch (error) {
    console.error("POST /api/lessons/submit error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
