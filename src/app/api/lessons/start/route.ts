import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { getLessonById } from "@/lib/curriculum";
import { getInitialPrompt } from "@/lib/llm";
import type { Message, Phase } from "@/types";

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { childId, lessonId } = body;

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

    // ── Check for an existing active session ──────────────────────────
    const existingSession = await prisma.session.findFirst({
      where: {
        childId,
        lessonId,
        // Only resume sessions that aren't in "feedback" (completed)
        NOT: { phase: "feedback" },
      },
      orderBy: { updatedAt: "desc" },
    });

    if (existingSession) {
      // Resume the existing session
      const conversationHistory: Message[] = JSON.parse(
        existingSession.conversationHistory
      );

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
          learningObjectives: lesson.learningObjectives,
        },
      });
    }

    // ── No active session — create a new one ──────────────────────────
    const initialPrompt = await getInitialPrompt(
      lesson,
      child.name,
      child.tier
    );

    const initialMessage: Message = {
      id: crypto.randomUUID(),
      role: "coach",
      content: initialPrompt,
      timestamp: new Date().toISOString(),
    };

    const newSession = await prisma.session.create({
      data: {
        childId,
        lessonId,
        phase: "instruction" satisfies Phase,
        phaseState: JSON.stringify({}),
        conversationHistory: JSON.stringify([initialMessage]),
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
