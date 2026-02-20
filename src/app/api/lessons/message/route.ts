import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { getLessonById } from "@/lib/curriculum";
import { getCoachResponse } from "@/lib/llm";
import {
  buildLearnerProfile,
  buildLearnerContext,
  formatLearnerContextForPrompt,
} from "@/lib/learner-profile";
import { logLessonEvent, logLLMInteraction } from "@/lib/event-logger";
import type { Message, Phase, PhaseState, SessionState, AnswerMeta } from "@/types";

export async function POST(request: NextRequest) {
  try {
    const authSession = await auth();
    if (!authSession?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

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
      include: { child: true },
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
      childId: session.childId,
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

    // Build learner context for personalization (non-blocking on failure)
    let learnerContextStr: string | undefined;
    try {
      const profile = await buildLearnerProfile(session.childId);
      if (profile) {
        const ctx = buildLearnerContext(profile, session.child.name);
        learnerContextStr = formatLearnerContextForPrompt(ctx);
      }
    } catch (err) {
      console.error("Failed to build learner profile:", err);
    }

    // Get coach response from LLM
    const coachResult = await getCoachResponse(
      sessionState,
      lesson,
      message.trim(),
      learnerContextStr
    );

    // --- Event logging (fire-and-forget) ---
    logLessonEvent({
      childId: session.childId,
      sessionId: session.id,
      lessonId: session.lessonId,
      eventType: "message_sent",
      phase: session.phase,
      eventData: { wordCount: message.trim().split(/\s+/).length, charCount: message.trim().length },
    });

    // Build markers detected object for logging
    const markersDetected: Record<string, unknown> = {};
    if (coachResult.phaseUpdate) markersDetected.phaseTransition = coachResult.phaseUpdate;
    if (coachResult.comprehensionPassed) markersDetected.comprehensionCheck = "passed";
    if (coachResult.hintGiven) markersDetected.hintGiven = true;
    if (coachResult.stepUpdate) markersDetected.step = coachResult.stepUpdate;
    if (coachResult.guidedStageUpdate) markersDetected.guidedStage = coachResult.guidedStageUpdate;
    if (coachResult.answerType) markersDetected.answerType = coachResult.answerType;
    if (coachResult.scores) markersDetected.scores = coachResult.scores;
    if (coachResult.preferences) markersDetected.preferences = coachResult.preferences;

    logLLMInteraction({
      sessionId: session.id,
      childId: session.childId,
      lessonId: session.lessonId,
      requestType: "lesson_message",
      systemPrompt: coachResult.systemPromptUsed,
      conversationTurnNumber: conversationHistory.length,
      userMessage: message.trim(),
      rawResponse: coachResult.rawResponse,
      strippedResponse: coachResult.message,
      markersDetected: Object.keys(markersDetected).length > 0 ? markersDetected : undefined,
      llmResult: {
        text: coachResult.rawResponse,
        ...coachResult.llmMeta,
      },
    });

    logLessonEvent({
      childId: session.childId,
      sessionId: session.id,
      lessonId: session.lessonId,
      eventType: "message_received",
      phase: session.phase,
      eventData: { wordCount: coachResult.message.split(/\s+/).length },
    });

    let phaseUpdate = coachResult.phaseUpdate;

    // --- Phase state tracking ---

    // Track comprehension check in instruction phase
    if (session.phase === "instruction" && coachResult.comprehensionPassed) {
      phaseState.comprehensionCheckPassed = true;
      logLessonEvent({
        childId: session.childId, sessionId: session.id, lessonId: session.lessonId,
        eventType: "comprehension_check", phase: "instruction",
        eventData: { result: "passed" },
      });
    }

    // Track Phase 1 step progress
    if (session.phase === "instruction" && coachResult.stepUpdate) {
      const fromStep = phaseState.phase1Step;
      phaseState.phase1Step = coachResult.stepUpdate;
      if (fromStep !== coachResult.stepUpdate) {
        logLessonEvent({
          childId: session.childId, sessionId: session.id, lessonId: session.lessonId,
          eventType: "step_change", phase: "instruction",
          eventData: { fromStep, toStep: coachResult.stepUpdate },
        });
      }
    }

    // Gate instruction->guided on comprehension check
    if (phaseUpdate === "guided" && !phaseState.comprehensionCheckPassed) {
      phaseUpdate = undefined; // Don't transition yet
    }

    // Track guided practice attempts, hints, and stage
    if (session.phase === "guided") {
      phaseState.guidedAttempts = (phaseState.guidedAttempts || 0) + 1;
      if (coachResult.hintGiven) {
        phaseState.hintsGiven = (phaseState.hintsGiven || 0) + 1;
        logLessonEvent({
          childId: session.childId, sessionId: session.id, lessonId: session.lessonId,
          eventType: "hint_given", phase: "guided",
          eventData: { hintNumber: phaseState.hintsGiven },
        });
      }
      if (coachResult.guidedStageUpdate) {
        const fromStage = phaseState.guidedStage;
        phaseState.guidedStage = coachResult.guidedStageUpdate;
        if (fromStage !== coachResult.guidedStageUpdate) {
          logLessonEvent({
            childId: session.childId, sessionId: session.id, lessonId: session.lessonId,
            eventType: "guided_stage_change", phase: "guided",
            eventData: { fromStage, toStage: coachResult.guidedStageUpdate },
          });
        }
      }
    }

    // Mark instruction complete on transition
    if (phaseUpdate === "guided") {
      phaseState.instructionCompleted = true;
      logLessonEvent({
        childId: session.childId, sessionId: session.id, lessonId: session.lessonId,
        eventType: "phase_transition", phase: session.phase,
        eventData: { fromPhase: "instruction", toPhase: "guided" },
      });
    }

    // Mark guided complete on transition and record assessment start time
    if (phaseUpdate === "assessment") {
      phaseState.guidedComplete = true;
      phaseState.writingStartedAt = new Date().toISOString();
      logLessonEvent({
        childId: session.childId, sessionId: session.id, lessonId: session.lessonId,
        eventType: "phase_transition", phase: session.phase,
        eventData: { fromPhase: "guided", toPhase: "assessment" },
      });
      logLessonEvent({
        childId: session.childId, sessionId: session.id, lessonId: session.lessonId,
        eventType: "assessment_start", phase: "assessment",
      });
    }

    // Build answer metadata if the LLM specified an answer type
    let answerMeta: AnswerMeta | undefined;
    if (coachResult.answerType) {
      answerMeta = {
        answerType: coachResult.answerType,
        options: coachResult.answerOptions,
        passage: coachResult.highlightPassage,
        prompt: coachResult.answerPrompt,
      };
    }

    // Add coach response to history
    const coachMessage: Message = {
      id: crypto.randomUUID(),
      role: "coach",
      content: coachResult.message,
      timestamp: new Date().toISOString(),
      ...(answerMeta && { answerMeta }),
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
          childId: session.childId,
          lessonId: session.lessonId,
        },
        data: {
          currentPhase: newPhase,
        },
      });
    }

    // Log detected preferences and answer types
    if (coachResult.preferences && coachResult.preferences.length > 0) {
      for (const pref of coachResult.preferences) {
        logLessonEvent({
          childId: session.childId, sessionId: session.id, lessonId: session.lessonId,
          eventType: "preference_detected", phase: newPhase,
          eventData: { category: pref.category, value: pref.value },
        });
      }
    }
    if (coachResult.answerType) {
      logLessonEvent({
        childId: session.childId, sessionId: session.id, lessonId: session.lessonId,
        eventType: "answer_type_used", phase: newPhase,
        eventData: { answerType: coachResult.answerType, optionCount: coachResult.answerOptions?.length },
      });
    }

    // Persist student preferences detected by the LLM (non-blocking)
    if (coachResult.preferences && coachResult.preferences.length > 0) {
      try {
        await prisma.studentPreference.createMany({
          data: coachResult.preferences.map((p) => ({
            childId: session.childId,
            category: p.category,
            value: p.value,
            source: session.lessonId,
          })),
        });
      } catch (err) {
        console.error("Failed to persist preferences:", err);
      }
    }

    return NextResponse.json({
      response: coachMessage,
      phaseUpdate: phaseUpdate ?? null,
      assessmentReady: coachResult.assessmentReady ?? false,
      stepUpdate: coachResult.stepUpdate ?? null,
    });
  } catch (error) {
    console.error("POST /api/lessons/message error:", error);
    // Attempt to log the error event (best-effort)
    try {
      const body = await request.clone().json().catch(() => ({}));
      if (body.sessionId) {
        logLessonEvent({
          childId: "unknown", sessionId: body.sessionId, lessonId: "unknown",
          eventType: "api_error", eventData: { route: "lessons/message", error: String(error) },
        });
      }
    } catch { /* ignore logging failures */ }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
