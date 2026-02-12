import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getLessonById } from "@/lib/curriculum";

export async function GET(
  _request: NextRequest,
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

    // Enrich weeks with lesson details from the catalog
    const weeks = curriculum.weeks.map((w) => {
      const lessonIds: string[] = JSON.parse(w.lessonIds);
      const lessons = lessonIds.map((id) => {
        const lesson = getLessonById(id);
        return lesson
          ? { id: lesson.id, title: lesson.title, type: lesson.type, unit: lesson.unit }
          : { id, title: "Unknown lesson", type: "unknown", unit: "unknown" };
      });
      return {
        weekNumber: w.weekNumber,
        theme: w.theme,
        status: w.status,
        lessons,
      };
    });

    return NextResponse.json({
      curriculum: {
        id: curriculum.id,
        status: curriculum.status,
        weekCount: curriculum.weekCount,
        lessonsPerWeek: curriculum.lessonsPerWeek,
        focusAreas: curriculum.focusAreas
          ? JSON.parse(curriculum.focusAreas)
          : null,
        startDate: curriculum.startDate,
      },
      weeks,
    });
  } catch (error) {
    console.error("GET /api/curriculum/[childId] error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PATCH(
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

    const curriculum = await prisma.curriculum.findUnique({
      where: { childId },
    });
    if (!curriculum) {
      return NextResponse.json(
        { error: "No curriculum found" },
        { status: 404 }
      );
    }

    const body = await request.json();
    const updateData: Record<string, unknown> = {};

    if (body.lessonsPerWeek !== undefined) {
      if (
        typeof body.lessonsPerWeek !== "number" ||
        body.lessonsPerWeek < 1 ||
        body.lessonsPerWeek > 7
      ) {
        return NextResponse.json(
          { error: "lessonsPerWeek must be between 1 and 7" },
          { status: 400 }
        );
      }
      updateData.lessonsPerWeek = body.lessonsPerWeek;
    }

    if (body.focusAreas !== undefined) {
      updateData.focusAreas = body.focusAreas
        ? JSON.stringify(body.focusAreas)
        : null;
    }

    if (body.status !== undefined) {
      const validStatuses = ["ACTIVE", "PAUSED", "COMPLETED"];
      if (!validStatuses.includes(body.status)) {
        return NextResponse.json(
          { error: `status must be one of: ${validStatuses.join(", ")}` },
          { status: 400 }
        );
      }
      updateData.status = body.status;
    }

    const updated = await prisma.curriculum.update({
      where: { id: curriculum.id },
      data: updateData,
    });

    return NextResponse.json({
      curriculum: {
        id: updated.id,
        status: updated.status,
        weekCount: updated.weekCount,
        lessonsPerWeek: updated.lessonsPerWeek,
        focusAreas: updated.focusAreas
          ? JSON.parse(updated.focusAreas)
          : null,
        startDate: updated.startDate,
      },
    });
  } catch (error) {
    console.error("PATCH /api/curriculum/[childId] error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
