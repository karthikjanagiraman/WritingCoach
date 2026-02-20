import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { getLessonById } from "@/lib/curriculum";
import { getRubricById } from "@/lib/rubrics";
import { evaluateWriting, evaluateWritingGeneral } from "@/lib/llm";
import { validateSubmissionQuality } from "@/lib/submission-validator";
import { updateSkillProgress } from "@/lib/progress-tracker";
import { updateStreak } from "@/lib/streak-tracker";
import { checkAndUnlockBadges } from "@/lib/badge-checker";
import { checkCurriculumAdaptation } from "@/lib/curriculum-adapter";
import { buildLearnerProfile } from "@/lib/learner-profile";
import { logLessonEvent, logLLMInteraction } from "@/lib/event-logger";
import type { Message, Tier, PhaseState } from "@/types";

export async function POST(request: NextRequest) {
  try {
    const authSession = await auth();
    if (!authSession?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { sessionId, text, timeSpentSec } = body;

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
    // (guided allowed because client-side escape hatch can transition
    //  to assessment before server phase is updated)
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

    // Quality gate — reject gibberish or too-short submissions before calling Claude
    const rubricForValidation = lesson.rubricId ? getRubricById(lesson.rubricId) : null;
    const validation = validateSubmissionQuality(text.trim(), rubricForValidation ?? null);
    if (!validation.valid) {
      logLessonEvent({
        childId: session.childId, sessionId: session.id, lessonId: session.lessonId,
        eventType: "validation_rejected", phase: "assessment",
        eventData: { error: validation.error, wordCount: validation.wordCount, minWords: validation.minWords },
      });
      return NextResponse.json(
        { error: validation.error, message: validation.message, wordCount: validation.wordCount, minWords: validation.minWords },
        { status: 422 }
      );
    }

    // Build lesson context for the evaluator
    const lessonContext = {
      title: lesson.title,
      learningObjectives: lesson.learningObjectives ?? [],
    };

    const wordCount = text.trim().split(/\s+/).length;

    logLessonEvent({
      childId: session.childId, sessionId: session.id, lessonId: session.lessonId,
      eventType: "assessment_submit", phase: "assessment",
      eventData: { wordCount, timeSpentSec: timeSpentSec ?? null },
    });

    // Evaluate the writing submission — with rubric if available, general otherwise
    let result;
    let rubricId: string | undefined;
    let evalRequestType = "assessment_eval_general";

    if (lesson.rubricId) {
      const rubric = getRubricById(lesson.rubricId);
      if (rubric) {
        result = await evaluateWriting(
          text.trim(),
          rubric,
          session.child.name,
          session.child.tier,
          lessonContext
        );
        rubricId = lesson.rubricId;
        evalRequestType = "assessment_eval";
      }
    }

    if (!result) {
      // No rubric — use general evaluation
      result = await evaluateWritingGeneral(
        text.trim(),
        session.child.tier as Tier,
        lesson.title,
        lessonContext
      );
    }

    // Log the evaluation LLM interaction
    logLLMInteraction({
      sessionId: session.id,
      childId: session.childId,
      lessonId: session.lessonId,
      requestType: evalRequestType,
      systemPrompt: result.systemPromptUsed,
      userMessage: text.trim(),
      rawResponse: JSON.stringify({ scores: result.scores, overallScore: result.overallScore, feedback: result.feedback }),
      llmResult: {
        text: "",
        ...result.llmMeta,
      },
    });

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

    // Also create WritingSubmission + AIFeedback records
    const writingSubmission = await prisma.writingSubmission.create({
      data: {
        sessionId,
        childId: session.childId,
        lessonId: session.lessonId,
        rubricId: rubricId ?? "general",
        submissionText: text.trim(),
        wordCount,
        timeSpentSec: timeSpentSec ?? null,
        revisionNumber: 0,
        feedback: {
          create: {
            scores: JSON.stringify(result.scores),
            overallScore: result.overallScore,
            strength: result.feedback.strength,
            growthArea: result.feedback.growth,
            encouragement: result.feedback.encouragement,
            model: "claude-sonnet-4-5-20250929",
          },
        },
      },
    });

    // Update session phase to feedback
    await prisma.session.update({
      where: { id: sessionId },
      data: {
        phase: "feedback",
      },
    });

    logLessonEvent({
      childId: session.childId, sessionId: session.id, lessonId: session.lessonId,
      eventType: "assessment_score", phase: "assessment",
      eventData: { overallScore: result.overallScore, scores: result.scores, rubricId: rubricId ?? "general" },
    });

    // Mark lesson status based on score — soft completion gate
    const lessonStatus = result.overallScore < 1.5 ? "needs_improvement" : "completed";
    await prisma.lessonProgress.updateMany({
      where: {
        childId: session.childId,
        lessonId: session.lessonId,
      },
      data: {
        status: lessonStatus,
        currentPhase: "feedback",
        completedAt: new Date(),
      },
    });

    // Update skill progress and streak (non-blocking — don't fail the submission)
    try {
      await updateSkillProgress(session.childId, session.lessonId, result.overallScore);
      await updateStreak(session.childId);
    } catch (err) {
      console.error("Failed to update skills/streak:", err);
    }

    // Check and unlock any newly earned badges
    let newBadges: string[] = [];
    try {
      newBadges = await checkAndUnlockBadges(session.childId);
    } catch (err) {
      console.error("Failed to check badges:", err);
    }

    logLessonEvent({
      childId: session.childId, sessionId: session.id, lessonId: session.lessonId,
      eventType: "lesson_complete", phase: "feedback",
      eventData: { status: lessonStatus, overallScore: result.overallScore, badgesUnlocked: newBadges },
    });

    // Check curriculum adaptation
    try {
      await checkCurriculumAdaptation(session.childId, session.lessonId, result.overallScore);
    } catch (err) {
      console.error("Failed to check curriculum adaptation:", err);
    }

    // Create LessonCompletion + LessonScore records for learner profile (non-blocking)
    try {
      const phaseState: PhaseState = JSON.parse(session.phaseState);
      const lessonCompletion = await prisma.lessonCompletion.create({
        data: {
          childId: session.childId,
          lessonId: session.lessonId,
          sessionId: session.id,
          template: lesson.template,
          overallScore: result.overallScore,
          timeSpentSec: timeSpentSec ?? null,
          hintsUsed: phaseState.hintsGiven ?? 0,
          guidedStages: phaseState.guidedStage ?? 0,
        },
      });

      // Create per-criterion scores
      const scoreEntries = Object.entries(result.scores);
      if (scoreEntries.length > 0) {
        await prisma.lessonScore.createMany({
          data: scoreEntries.map(([criterion, score]) => ({
            lessonCompletionId: lessonCompletion.id,
            criterion,
            score,
          })),
        });
      }

      // Rebuild learner profile snapshot after new completion
      await buildLearnerProfile(session.childId);
    } catch (err) {
      console.error("Failed to create lesson completion records:", err);
    }

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
      submissionId: writingSubmission.id,
      wordCount,
      newBadges,
      lessonStatus,
    });
  } catch (error) {
    console.error("POST /api/lessons/submit error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
