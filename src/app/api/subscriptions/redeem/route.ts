import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { code } = await req.json();

    if (!code || typeof code !== "string" || code.trim().length === 0) {
      return NextResponse.json(
        { error: "Access code is required" },
        { status: 400 }
      );
    }

    // Find access code (case-insensitive)
    const accessCode = await prisma.accessCode.findFirst({
      where: { code: { equals: code.trim(), mode: "insensitive" } },
    });

    if (!accessCode) {
      return NextResponse.json(
        { error: "Invalid access code" },
        { status: 404 }
      );
    }

    if (!accessCode.isActive) {
      return NextResponse.json(
        { error: "This access code is no longer active" },
        { status: 410 }
      );
    }

    if (accessCode.expiresAt && new Date() > accessCode.expiresAt) {
      return NextResponse.json(
        { error: "This access code has expired" },
        { status: 410 }
      );
    }

    if (accessCode.usedCount >= accessCode.maxUses) {
      return NextResponse.json(
        { error: "This access code has reached its usage limit" },
        { status: 410 }
      );
    }

    // Check if user already has an active paid subscription
    const existing = await prisma.subscription.findUnique({
      where: { userId: session.user.userId },
    });

    if (
      existing &&
      existing.plan !== "TRIAL" &&
      existing.status === "ACTIVE"
    ) {
      return NextResponse.json(
        { error: "You already have an active subscription" },
        { status: 409 }
      );
    }

    // Upsert subscription to the code's plan
    await prisma.subscription.upsert({
      where: { userId: session.user.userId },
      update: {
        plan: accessCode.plan,
        status: "ACTIVE",
        accessCodeId: accessCode.id,
        trialEndsAt: null,
      },
      create: {
        userId: session.user.userId,
        plan: accessCode.plan,
        status: "ACTIVE",
        accessCodeId: accessCode.id,
        trialLessonsUsed: 0,
      },
    });

    // Increment usage count
    await prisma.accessCode.update({
      where: { id: accessCode.id },
      data: { usedCount: { increment: 1 } },
    });

    return NextResponse.json({ success: true, plan: accessCode.plan });
  } catch (error) {
    console.error("POST /api/subscriptions/redeem error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
