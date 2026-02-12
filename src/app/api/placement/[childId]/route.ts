import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

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

    // Verify parent owns the child
    const child = await prisma.childProfile.findFirst({
      where: { id: childId, parentId: session.user.userId },
    });

    if (!child) {
      return NextResponse.json(
        { error: "Child not found" },
        { status: 404 }
      );
    }

    const placementResult = await prisma.placementResult.findUnique({
      where: { childId },
    });

    if (!placementResult) {
      return NextResponse.json(
        { error: "No placement result found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      placement: {
        id: placementResult.id,
        childId: placementResult.childId,
        prompts: JSON.parse(placementResult.prompts),
        responses: JSON.parse(placementResult.responses),
        aiAnalysis: JSON.parse(placementResult.aiAnalysis),
        recommendedTier: placementResult.recommendedTier,
        assignedTier: placementResult.assignedTier,
        confidence: placementResult.confidence,
        createdAt: placementResult.createdAt,
        updatedAt: placementResult.updatedAt,
      },
    });
  } catch (error) {
    console.error("GET /api/placement/[childId] error:", error);
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

    // Verify parent owns the child
    const child = await prisma.childProfile.findFirst({
      where: { id: childId, parentId: session.user.userId },
    });

    if (!child) {
      return NextResponse.json(
        { error: "Child not found" },
        { status: 404 }
      );
    }

    const existingResult = await prisma.placementResult.findUnique({
      where: { childId },
    });

    if (!existingResult) {
      return NextResponse.json(
        { error: "No placement result found" },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { assignedTier } = body;

    if (
      typeof assignedTier !== "number" ||
      assignedTier < 1 ||
      assignedTier > 3
    ) {
      return NextResponse.json(
        { error: "assignedTier must be 1, 2, or 3" },
        { status: 400 }
      );
    }

    // Update both PlacementResult and ChildProfile in a transaction
    const [updatedResult] = await prisma.$transaction([
      prisma.placementResult.update({
        where: { childId },
        data: { assignedTier },
      }),
      prisma.childProfile.update({
        where: { id: childId },
        data: { tier: assignedTier },
      }),
    ]);

    return NextResponse.json({
      placement: {
        id: updatedResult.id,
        childId: updatedResult.childId,
        prompts: JSON.parse(updatedResult.prompts),
        responses: JSON.parse(updatedResult.responses),
        aiAnalysis: JSON.parse(updatedResult.aiAnalysis),
        recommendedTier: updatedResult.recommendedTier,
        assignedTier: updatedResult.assignedTier,
        confidence: updatedResult.confidence,
        createdAt: updatedResult.createdAt,
        updatedAt: updatedResult.updatedAt,
      },
    });
  } catch (error) {
    console.error("PATCH /api/placement/[childId] error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
