import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { generateCurriculum } from "@/lib/curriculum-generator";

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = session.user.userId;

    const body = await request.json();
    const { childId, lessonsPerWeek, weekCount, focusAreas } = body;

    if (!childId || typeof childId !== "string") {
      return NextResponse.json(
        { error: "childId is required" },
        { status: 400 }
      );
    }

    // Verify ownership
    const child = await prisma.childProfile.findFirst({
      where: { id: childId, parentId: userId },
    });
    if (!child) {
      return NextResponse.json({ error: "Child not found" }, { status: 404 });
    }

    // Check child has completed placement
    const placement = await prisma.placementResult.findUnique({
      where: { childId },
    });
    if (!placement) {
      return NextResponse.json(
        { error: "Placement assessment must be completed before generating a curriculum" },
        { status: 400 }
      );
    }

    // Check no existing ACTIVE curriculum
    const existing = await prisma.curriculum.findUnique({
      where: { childId },
    });
    if (existing && existing.status === "ACTIVE") {
      return NextResponse.json(
        { error: "An active curriculum already exists. Use the revise endpoint to modify it." },
        { status: 409 }
      );
    }

    // If a non-active curriculum exists, delete it first so the unique constraint is satisfied
    if (existing) {
      await prisma.curriculumWeek.deleteMany({
        where: { curriculumId: existing.id },
      });
      await prisma.curriculumRevision.deleteMany({
        where: { curriculumId: existing.id },
      });
      await prisma.curriculum.delete({ where: { id: existing.id } });
    }

    const curriculum = await generateCurriculum({
      childId,
      tier: child.tier,
      focusAreas,
      lessonsPerWeek,
      weekCount,
    });

    return NextResponse.json({
      curriculumId: curriculum.id,
      status: curriculum.status,
      weekCount: curriculum.weekCount,
      lessonsPerWeek: curriculum.lessonsPerWeek,
      weeks: curriculum.weeks.map((w) => ({
        weekNumber: w.weekNumber,
        theme: w.theme,
        status: w.status,
        lessonIds: JSON.parse(w.lessonIds),
      })),
    });
  } catch (error) {
    console.error("POST /api/curriculum/generate error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
