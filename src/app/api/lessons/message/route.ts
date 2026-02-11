import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getLessonById } from "@/lib/curriculum";
import { getCoachResponse } from "@/lib/llm";
import type { Message, Phase, PhaseState, SessionState } from "@/types";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionId, message } = body;

    if (!sessionId || !message) {
      return NextResponse.json(
        { error: "sessionId and message are required" },
        { status: 400 }
      );
    }

    if (typeof message !== "string" || message.trim().length === 0) {
      return NextResponse.json(
        { error: "message must be a non-empty string" },
        { status: 400 }
      );
    }

    // Load session
    const session = await prisma.session.findUnique({
      where: { id: sessionId },
      include: { student: true },
    });
    if (!session) {
      return NextResponse.json(
        { error: "Session not found" },
        { status: 404 }
      );
    }

    // Load lesson
    const lesson = getLessonById(session.lessonId);
    if (!lesson) {
      return NextResponse.json(
        { error: "Lesson data not found" },
        { status: 404 }
      );
    }

    // Parse stored state
    const conversationHistory: Message[] = JSON.parse(
      session.conversationHistory
    );
    const phaseState: PhaseState = JSON.parse(session.phaseState);

    // Build session state for the LLM
    const sessionState: SessionState = {
      id: session.id,
      studentId: session.studentId,
      lessonId: session.lessonId,
      phase: session.phase as Phase,
      phaseState,
      conversationHistory,
    };

    // Add student message to history
    const studentMessage: Message = {
      id: crypto.randomUUID(),
      role: "student",
      content: message.trim(),
      timestamp: new Date().toISOString(),
    };
    conversationHistory.push(studentMessage);

    // Get coach response from LLM
    const coachResult = await getCoachResponse(
      sessionState,
      lesson,
      message.trim()
    );

    let phaseUpdate = coachResult.phaseUpdate;

    // --- Phase state tracking ---

    // Track comprehension check in instruction phase
    if (session.phase === "instruction" && coachResult.comprehensionPassed) {
      phaseState.comprehensionCheckPassed = true;
    }

    // Gate instruction->guided on comprehension check
    if (phaseUpdate === "guided" && !phaseState.comprehensionCheckPassed) {
      phaseUpdate = undefined; // Don't transition yet
    }

    // Track guided practice attempts and hints
    if (session.phase === "guided") {
      phaseState.guidedAttempts = (phaseState.guidedAttempts || 0) + 1;
      if (coachResult.hintGiven) {
        phaseState.hintsGiven = (phaseState.hintsGiven || 0) + 1;
      }
    }

    // Mark instruction complete on transition
    if (phaseUpdate === "guided") {
      phaseState.instructionCompleted = true;
    }

    // Mark guided complete on transition and record assessment start time
    if (phaseUpdate === "assessment") {
      phaseState.guidedComplete = true;
      phaseState.writingStartedAt = new Date().toISOString();
    }

    // Add coach response to history
    const coachMessage: Message = {
      id: crypto.randomUUID(),
      role: "coach",
      content: coachResult.message,
      timestamp: new Date().toISOString(),
    };
    conversationHistory.push(coachMessage);

    // Determine new phase
    const newPhase = phaseUpdate ?? (session.phase as Phase);

    // Update session in DB
    await prisma.session.update({
      where: { id: sessionId },
      data: {
        phase: newPhase,
        phaseState: JSON.stringify(phaseState),
        conversationHistory: JSON.stringify(conversationHistory),
      },
    });

    // If phase changed, update lesson progress
    if (phaseUpdate) {
      await prisma.lessonProgress.updateMany({
        where: {
          studentId: session.studentId,
          lessonId: session.lessonId,
        },
        data: {
          currentPhase: newPhase,
        },
      });
    }

    return NextResponse.json({
      response: coachMessage,
      phaseUpdate: phaseUpdate ?? null,
      assessmentReady: coachResult.assessmentReady ?? false,
    });
  } catch (error) {
    console.error("POST /api/lessons/message error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
