import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { childId, responses, step } = body;

    if (!childId || typeof childId !== "string") {
      return NextResponse.json(
        { error: "childId is required" },
        { status: 400 }
      );
    }

    if (!Array.isArray(responses) || responses.length !== 3) {
      return NextResponse.json(
        { error: "Exactly 3 responses are required" },
        { status: 400 }
      );
    }

    if (typeof step !== "number" || step < 0 || step > 2) {
      return NextResponse.json(
        { error: "step must be 0, 1, or 2" },
        { status: 400 }
      );
    }

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

    // Only update an existing draft (created by the start route with prompts).
    // If no draft exists yet, skip — start will create it with prompts.
    const existing = await prisma.placementDraft.findUnique({
      where: { childId },
    });

    if (!existing) {
      return NextResponse.json({ saved: false, reason: "no_draft" });
    }

    await prisma.placementDraft.update({
      where: { childId },
      data: {
        responses: JSON.stringify(responses),
        step,
      },
    });

    return NextResponse.json({ saved: true });
  } catch (error) {
    console.error("POST /api/placement/save-draft error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
