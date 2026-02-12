import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: childId } = await params;

    const child = await prisma.childProfile.findFirst({
      where: { id: childId, parentId: session.user.userId },
    });
    if (!child) {
      return NextResponse.json({ error: "Child not found" }, { status: 404 });
    }

    const body = await request.json();
    const { badgeIds } = body;

    if (!Array.isArray(badgeIds) || badgeIds.length === 0) {
      return NextResponse.json(
        { error: "badgeIds must be a non-empty array" },
        { status: 400 }
      );
    }

    const result = await prisma.achievement.updateMany({
      where: {
        childId,
        badgeId: { in: badgeIds },
        seen: false,
      },
      data: { seen: true },
    });

    return NextResponse.json({ updated: result.count });
  } catch (error) {
    console.error("POST /api/children/[id]/badges/seen error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
