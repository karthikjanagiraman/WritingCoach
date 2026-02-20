import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { sendMessageWithMeta } from "@/lib/llm";
import { getLessonsByTier, getLessonById } from "@/lib/curriculum";
import { logLLMInteraction } from "@/lib/event-logger";
import type { Tier } from "@/types";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ childId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { childId } = await params;

    // Verify ownership
    const child = await prisma.childProfile.findFirst({
      where: { id: childId, parentId: session.user.userId },
    });
    if (!child) {
      return NextResponse.json({ error: "Child not found" }, { status: 404 });
    }

    const body = await request.json();
    const { reason, description } = body;

    if (!reason || typeof reason !== "string") {
      return NextResponse.json(
        { error: "reason is required" },
        { status: 400 }
      );
    }
    if (!description || typeof description !== "string") {
      return NextResponse.json(
        { error: "description is required" },
        { status: 400 }
      );
    }

    // Get current curriculum with weeks
    const curriculum = await prisma.curriculum.findUnique({
      where: { childId },
      include: { weeks: { orderBy: { weekNumber: "asc" } } },
    });
    if (!curriculum) {
      return NextResponse.json(
        { error: "No curriculum found" },
        { status: 404 }
      );
    }

    // Separate completed/in-progress weeks from future (pending) weeks
    const completedWeeks = curriculum.weeks.filter(
      (w) => w.status === "completed" || w.status === "in_progress"
    );
    const pendingWeeks = curriculum.weeks.filter(
      (w) => w.status === "pending"
    );

    if (pendingWeeks.length === 0) {
      return NextResponse.json(
        { error: "No pending weeks to revise — curriculum is already completed" },
        { status: 400 }
      );
    }

    // Save current plan as a revision snapshot
    const previousPlan = curriculum.weeks.map((w) => ({
      weekNumber: w.weekNumber,
      theme: w.theme,
      lessonIds: JSON.parse(w.lessonIds),
      status: w.status,
    }));

    // Get available lessons for this tier
    const lessons = getLessonsByTier(child.tier as Tier);
    const lessonSummary = lessons
      .map((l) => `${l.id}: "${l.title}" (${l.type}, ${l.unit})`)
      .join("\n");

    // Build context about completed weeks so Claude knows what's been done
    const completedContext = completedWeeks
      .map((w) => {
        const ids: string[] = JSON.parse(w.lessonIds);
        const titles = ids
          .map((id) => {
            const lesson = getLessonById(id);
            return lesson ? `"${lesson.title}" (${lesson.type})` : id;
          })
          .join(", ");
        return `Week ${w.weekNumber} (${w.status}): ${w.theme} — ${titles}`;
      })
      .join("\n");

    const focusAreas = curriculum.focusAreas
      ? JSON.parse(curriculum.focusAreas)
      : null;

    const systemPrompt = `You are a curriculum planning assistant for a children's writing program.
You need to revise the remaining weeks of an existing curriculum plan.

Rules:
- Only plan for weeks ${pendingWeeks[0].weekNumber} through ${pendingWeeks[pendingWeeks.length - 1].weekNumber}
- Each week needs a theme and ${curriculum.lessonsPerWeek} lessons
- Do NOT repeat lessons that were already assigned in completed weeks
- Only use lesson IDs from the provided list
- Keep lessons within the same unit in order
- ${focusAreas?.length ? `Focus on these writing types: ${focusAreas.join(", ")}` : "Balance all writing types"}

Already completed:
${completedContext || "No weeks completed yet."}

Reason for revision: ${reason}
Details: ${description}

Return ONLY valid JSON: an array of objects with { "weekNumber": number, "theme": "string", "lessonIds": ["id1", "id2", "id3"] }`;

    const userMsg = `Available lessons:\n${lessonSummary}\n\nRevise weeks ${pendingWeeks[0].weekNumber}-${pendingWeeks[pendingWeeks.length - 1].weekNumber}.`;
    const { text, llmMeta } = await sendMessageWithMeta(
      systemPrompt,
      [{ role: "user", content: userMsg }],
      2048
    );

    logLLMInteraction({
      childId,
      requestType: "curriculum_revise",
      systemPrompt,
      userMessage: userMsg,
      rawResponse: text,
      llmResult: { text, ...llmMeta },
    });

    interface RevisedWeek {
      weekNumber: number;
      theme: string;
      lessonIds: string[];
    }
    let revisedWeeks: RevisedWeek[];
    try {
      const cleaned = text
        .replace(/```json\n?/g, "")
        .replace(/```\n?/g, "")
        .trim();
      revisedWeeks = JSON.parse(cleaned);
    } catch {
      return NextResponse.json(
        { error: "Failed to generate revised curriculum. Please try again." },
        { status: 500 }
      );
    }

    // Validate lesson IDs
    const validIds = new Set(lessons.map((l) => l.id));
    revisedWeeks = revisedWeeks.map((w) => ({
      ...w,
      lessonIds: w.lessonIds.filter((id) => validIds.has(id)),
    }));

    // Update pending CurriculumWeek records
    for (const revised of revisedWeeks) {
      const existing = pendingWeeks.find(
        (w) => w.weekNumber === revised.weekNumber
      );
      if (existing) {
        await prisma.curriculumWeek.update({
          where: { id: existing.id },
          data: {
            theme: revised.theme,
            lessonIds: JSON.stringify(revised.lessonIds),
          },
        });
      }
    }

    // Build new plan snapshot
    const updatedCurriculum = await prisma.curriculum.findUnique({
      where: { childId },
      include: { weeks: { orderBy: { weekNumber: "asc" } } },
    });

    const newPlan = updatedCurriculum!.weeks.map((w) => ({
      weekNumber: w.weekNumber,
      theme: w.theme,
      lessonIds: JSON.parse(w.lessonIds),
      status: w.status,
    }));

    // Save revision record
    await prisma.curriculumRevision.create({
      data: {
        curriculumId: curriculum.id,
        reason,
        description,
        previousPlan: JSON.stringify(previousPlan),
        newPlan: JSON.stringify(newPlan),
      },
    });

    // Return updated curriculum
    const weeks = updatedCurriculum!.weeks.map((w) => {
      const lessonIds: string[] = JSON.parse(w.lessonIds);
      const enrichedLessons = lessonIds.map((id) => {
        const lesson = getLessonById(id);
        return lesson
          ? { id: lesson.id, title: lesson.title, type: lesson.type, unit: lesson.unit }
          : { id, title: "Unknown lesson", type: "unknown", unit: "unknown" };
      });
      return {
        weekNumber: w.weekNumber,
        theme: w.theme,
        status: w.status,
        lessons: enrichedLessons,
      };
    });

    return NextResponse.json({
      curriculum: {
        id: updatedCurriculum!.id,
        status: updatedCurriculum!.status,
        weekCount: updatedCurriculum!.weekCount,
        lessonsPerWeek: updatedCurriculum!.lessonsPerWeek,
        focusAreas: updatedCurriculum!.focusAreas
          ? JSON.parse(updatedCurriculum!.focusAreas)
          : null,
        startDate: updatedCurriculum!.startDate,
      },
      weeks,
      revision: {
        reason,
        description,
        previousPlan,
        newPlan,
      },
    });
  } catch (error) {
    console.error("POST /api/curriculum/[childId]/revise error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
