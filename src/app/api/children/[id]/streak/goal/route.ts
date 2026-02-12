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
    const { weeklyGoal } = body;

    if (
      typeof weeklyGoal !== "number" ||
      !Number.isInteger(weeklyGoal) ||
      weeklyGoal < 1 ||
      weeklyGoal > 7
    ) {
      return NextResponse.json(
        { error: "weeklyGoal must be an integer between 1 and 7" },
        { status: 400 }
      );
    }

    const streak = await prisma.streak.upsert({
      where: { childId },
      update: { weeklyGoal },
      create: {
        childId,
        weeklyGoal,
        currentStreak: 0,
        longestStreak: 0,
        weeklyCompleted: 0,
      },
    });

    return NextResponse.json({
      weeklyGoal: streak.weeklyGoal,
    });
  } catch (error) {
    console.error("POST /api/children/[id]/streak/goal error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
