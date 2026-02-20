import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { getLessonById } from "@/lib/curriculum";
import { getRubricById } from "@/lib/rubrics";
import { evaluateWriting, evaluateWritingGeneral } from "@/lib/llm";
import { validateSubmissionQuality } from "@/lib/submission-validator";
import { logLessonEvent, logLLMInteraction } from "@/lib/event-logger";
import type { Message, PhaseState, Tier } from "@/types";

const MAX_REVISIONS = 2;

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

    // Only allow revisions in the feedback phase
    if (session.phase !== "feedback") {
      return NextResponse.json(
        { error: "Revisions are only allowed after initial submission (feedback phase)" },
        { status: 400 }
      );
    }

    // Check revision limit — count existing assessments for this session
    const assessmentCount = await prisma.assessment.count({
      where: { sessionId },
    });

    // First assessment is the original submission, so revisions = count - 1
    // We allow up to MAX_REVISIONS additional submissions
    if (assessmentCount > MAX_REVISIONS) {
      return NextResponse.json(
        { error: `Maximum of ${MAX_REVISIONS} revisions allowed` },
        { status: 400 }
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

    // Quality gate — reject gibberish or too-short submissions before calling Claude
    const rubricForValidation = lesson.rubricId ? getRubricById(lesson.rubricId) : null;
    const validation = validateSubmissionQuality(text.trim(), rubricForValidation ?? null);
    if (!validation.valid) {
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

    // Get previous assessment scores for comparison
    const previousAssessment = await prisma.assessment.findFirst({
      where: { sessionId },
      orderBy: { createdAt: "desc" },
    });

    const previousScores = previousAssessment
      ? JSON.parse(previousAssessment.scores)
      : null;

    const wordCount = text.trim().split(/\s+/).length;

    logLessonEvent({
      childId: session.childId, sessionId: session.id, lessonId: session.lessonId,
      eventType: "revision_submit", phase: "feedback",
      eventData: { wordCount, revisionNumber: assessmentCount, timeSpentSec: timeSpentSec ?? null },
    });

    // Evaluate the revised writing — with rubric if available, general otherwise
    let result;
    let rubricId: string | undefined;

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

    logLLMInteraction({
      sessionId: session.id,
      childId: session.childId,
      lessonId: session.lessonId,
      requestType: "revision_eval",
      systemPrompt: result.systemPromptUsed,
      userMessage: text.trim(),
      rawResponse: JSON.stringify({ scores: result.scores, overallScore: result.overallScore, feedback: result.feedback }),
      llmResult: { text: "", ...result.llmMeta },
    });

    logLessonEvent({
      childId: session.childId, sessionId: session.id, lessonId: session.lessonId,
      eventType: "revision_score", phase: "feedback",
      eventData: { overallScore: result.overallScore, scores: result.scores, previousOverallScore: previousAssessment?.overallScore },
    });

    // Store the new assessment
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

    // Also create WritingSubmission + AIFeedback records for the revision
    const originalSubmission = await prisma.writingSubmission.findFirst({
      where: { sessionId, revisionNumber: 0 },
    });

    const existingRevisions = await prisma.writingSubmission.count({
      where: { sessionId, revisionNumber: { gt: 0 } },
    });
    const wsRevisionNumber = existingRevisions + 1;

    const writingSubmission = await prisma.writingSubmission.create({
      data: {
        sessionId,
        childId: session.childId,
        lessonId: session.lessonId,
        rubricId: rubricId ?? "general",
        submissionText: text.trim(),
        wordCount,
        timeSpentSec: timeSpentSec ?? null,
        revisionOf: originalSubmission?.id ?? null,
        revisionNumber: wsRevisionNumber,
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

    // Upgrade lesson status if revision improved the score above threshold
    if (result.overallScore >= 1.5) {
      await prisma.lessonProgress.updateMany({
        where: {
          childId: session.childId,
          lessonId: session.lessonId,
          status: "needs_improvement",
        },
        data: { status: "completed" },
      });
    }

    // Add revision feedback to conversation history
    const conversationHistory: Message[] = JSON.parse(
      session.conversationHistory
    );
    const revisionNumber = assessmentCount; // assessmentCount is the count before this new one
    const feedbackMessage: Message = {
      id: crypto.randomUUID(),
      role: "coach",
      content: `Revision ${revisionNumber} feedback: ${result.feedback.strength} ${result.feedback.growth} ${result.feedback.encouragement}`,
      timestamp: new Date().toISOString(),
    };
    conversationHistory.push(feedbackMessage);

    // Track revision count in phaseState
    const phaseState: PhaseState = JSON.parse(session.phaseState);
    phaseState.revisionsUsed = revisionNumber;

    await prisma.session.update({
      where: { id: sessionId },
      data: {
        conversationHistory: JSON.stringify(conversationHistory),
        phaseState: JSON.stringify(phaseState),
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
      previousScores,
      revisionsRemaining: MAX_REVISIONS - revisionNumber,
      rubric: rubricInfo,
    });
  } catch (error) {
    console.error("POST /api/lessons/revise error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
