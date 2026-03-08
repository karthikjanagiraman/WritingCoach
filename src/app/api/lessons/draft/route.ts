import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import type { PhaseState } from "@/types";

export async function PATCH(request: NextRequest) {
  try {
    const authSession = await auth();
    if (!authSession?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { sessionId, draftText } = body;

    if (!sessionId || typeof draftText !== "string") {
      return NextResponse.json(
        { error: "sessionId and draftText are required" },
        { status: 400 }
      );
    }

    // Load session and verify ownership
    const session = await prisma.session.findUnique({
      where: { id: sessionId },
      include: { child: { select: { parentId: true } } },
    });

    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    if (session.child.parentId !== authSession.user.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    if (session.phase !== "assessment") {
      return NextResponse.json(
        { error: "Draft save only available during assessment phase" },
        { status: 400 }
      );
    }

    // Update phaseState.draftText
    const phaseState: PhaseState = JSON.parse(session.phaseState || "{}");
    phaseState.draftText = draftText;

    await prisma.session.update({
      where: { id: sessionId },
      data: { phaseState: JSON.stringify(phaseState) },
    });

    return NextResponse.json({ saved: true });
  } catch (error) {
    console.error("PATCH /api/lessons/draft error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
