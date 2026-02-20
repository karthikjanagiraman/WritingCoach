import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { getLessonById } from "@/lib/curriculum";
import { getInitialPrompt } from "@/lib/llm";
import {
  buildLearnerProfile,
  buildLearnerContext,
  formatLearnerContextForPrompt,
} from "@/lib/learner-profile";
import { logLessonEvent, logLLMInteraction } from "@/lib/event-logger";
import type { Message, Phase, AnswerMeta } from "@/types";

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { childId, lessonId, forceNew } = body;

    if (!childId || !lessonId) {
      return NextResponse.json(
        { error: "childId and lessonId are required" },
        { status: 400 }
      );
    }

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

    // Verify lesson exists in curriculum
    const lesson = getLessonById(lessonId);
    if (!lesson) {
      return NextResponse.json(
        { error: "Lesson not found" },
        { status: 404 }
      );
    }

    // ── Check for an existing session (active or completed) ──────────
    // Skip this check when forceNew is requested (retake)
    if (!forceNew) {
      const existingSession = await prisma.session.findFirst({
        where: { childId, lessonId },
        orderBy: { updatedAt: "desc" },
      });

      if (existingSession) {
        const conversationHistory: Message[] = JSON.parse(
          existingSession.conversationHistory
        );

        // If lesson is already completed (feedback phase), return it
        // with assessment data so the frontend can show the summary.
        if (existingSession.phase === "feedback") {
          // Fetch the latest assessment + submission for this session
          const assessment = await prisma.assessment.findFirst({
            where: { sessionId: existingSession.id },
            orderBy: { createdAt: "desc" },
          });
          const submission = await prisma.writingSubmission.findFirst({
            where: { sessionId: existingSession.id },
            orderBy: { createdAt: "desc" },
          });

          return NextResponse.json({
            sessionId: existingSession.id,
            resumed: true,
            phase: existingSession.phase as Phase,
            conversationHistory,
            initialPrompt: conversationHistory[0] ?? null,
            completed: true,
            assessment: assessment
              ? {
                  scores: JSON.parse(assessment.scores),
                  overallScore: assessment.overallScore,
                  feedback: JSON.parse(assessment.feedback),
                }
              : null,
            submittedText: submission?.submissionText ?? "",
            lesson: {
              id: lesson.id,
              title: lesson.title,
              unit: lesson.unit,
              type: lesson.type,
              template: lesson.template,
              learningObjectives: lesson.learningObjectives,
            },
          });
        }

        // Resume an in-progress session
        logLessonEvent({
          childId, sessionId: existingSession.id, lessonId,
          eventType: "lesson_resume", phase: existingSession.phase,
          eventData: { messageCount: conversationHistory.length },
        });

        return NextResponse.json({
          sessionId: existingSession.id,
          resumed: true,
          phase: existingSession.phase as Phase,
          conversationHistory,
          initialPrompt: conversationHistory[0] ?? null,
          lesson: {
            id: lesson.id,
            title: lesson.title,
            unit: lesson.unit,
            type: lesson.type,
            template: lesson.template,
            learningObjectives: lesson.learningObjectives,
          },
        });
      }
    }

    // ── No existing session — create a new one ──────────────────────

    // Build learner context for personalization (non-blocking on failure)
    let learnerContextStr: string | undefined;
    try {
      const profile = await buildLearnerProfile(childId);
      if (profile) {
        const context = buildLearnerContext(profile, child.name);
        learnerContextStr = formatLearnerContextForPrompt(context);
      }
    } catch (err) {
      console.error("Failed to build learner profile:", err);
    }

    const initialResult = await getInitialPrompt(
      lesson,
      child.name,
      child.tier,
      learnerContextStr
    );

    // Build answerMeta from parsed markers (same as message route)
    let answerMeta: AnswerMeta | undefined;
    if (initialResult.answerType) {
      answerMeta = {
        answerType: initialResult.answerType,
        options: initialResult.answerOptions,
        passage: initialResult.highlightPassage,
        prompt: initialResult.answerPrompt,
      };
    }

    const initialMessage: Message = {
      id: crypto.randomUUID(),
      role: "coach",
      content: initialResult.message,
      timestamp: new Date().toISOString(),
      ...(answerMeta && { answerMeta }),
    };

    const newSession = await prisma.session.create({
      data: {
        childId,
        lessonId,
        phase: "instruction" satisfies Phase,
        phaseState: JSON.stringify({ phase1Step: 1 }),
        conversationHistory: JSON.stringify([initialMessage]),
      },
    });

    logLessonEvent({
      childId, sessionId: newSession.id, lessonId,
      eventType: "lesson_start", phase: "instruction",
      eventData: { tier: child.tier, template: lesson.template },
    });

    logLLMInteraction({
      sessionId: newSession.id,
      childId,
      lessonId,
      requestType: "lesson_start",
      systemPrompt: initialResult.systemPromptUsed,
      conversationTurnNumber: 0,
      userMessage: `Hi! I'm ${child.name} and I'm ready for today's lesson.`,
      rawResponse: initialResult.rawResponse,
      strippedResponse: initialResult.message,
      llmResult: {
        text: initialResult.rawResponse,
        ...initialResult.llmMeta,
      },
    });

    // Upsert lesson progress to "in_progress"
    await prisma.lessonProgress.upsert({
      where: {
        childId_lessonId: { childId, lessonId },
      },
      update: {
        status: "in_progress",
        currentPhase: "instruction",
        startedAt: new Date(),
      },
      create: {
        childId,
        lessonId,
        status: "in_progress",
        currentPhase: "instruction",
        startedAt: new Date(),
      },
    });

    return NextResponse.json({
      sessionId: newSession.id,
      resumed: false,
      phase: "instruction" as Phase,
      conversationHistory: [initialMessage],
      initialPrompt: initialMessage,
      lesson: {
        id: lesson.id,
        title: lesson.title,
        unit: lesson.unit,
        type: lesson.type,
        template: lesson.template,
        learningObjectives: lesson.learningObjectives,
      },
    });
  } catch (error) {
    console.error("POST /api/lessons/start error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
