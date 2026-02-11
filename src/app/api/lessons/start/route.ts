import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getLessonById } from "@/lib/curriculum";
import { getInitialPrompt } from "@/lib/llm";
import type { Message, Phase } from "@/types";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { studentId, lessonId } = body;

    if (!studentId || !lessonId) {
      return NextResponse.json(
        { error: "studentId and lessonId are required" },
        { status: 400 }
      );
    }

    // Verify student exists
    const student = await prisma.student.findUnique({
      where: { id: studentId },
    });
    if (!student) {
      return NextResponse.json(
        { error: "Student not found" },
        { status: 404 }
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
        studentId,
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
      student.name,
      student.tier
    );

    const initialMessage: Message = {
      id: crypto.randomUUID(),
      role: "coach",
      content: initialPrompt,
      timestamp: new Date().toISOString(),
    };

    const session = await prisma.session.create({
      data: {
        studentId,
        lessonId,
        phase: "instruction" satisfies Phase,
        phaseState: JSON.stringify({}),
        conversationHistory: JSON.stringify([initialMessage]),
      },
    });

    // Upsert lesson progress to "in_progress"
    await prisma.lessonProgress.upsert({
      where: {
        studentId_lessonId: { studentId, lessonId },
      },
      update: {
        status: "in_progress",
        currentPhase: "instruction",
        startedAt: new Date(),
      },
      create: {
        studentId,
        lessonId,
        status: "in_progress",
        currentPhase: "instruction",
        startedAt: new Date(),
      },
    });

    return NextResponse.json({
      sessionId: session.id,
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
