import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

function computeTier(age: number): number {
  if (age <= 9) return 1;
  if (age <= 12) return 2;
  return 3;
}

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const children = await prisma.childProfile.findMany({
      where: { parentId: session.user.userId },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json({ children });
  } catch (error) {
    console.error("GET /api/children error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { name, age, gradeLevel, interests, avatarEmoji } = body;

    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json(
        { error: "Name is required" },
        { status: 400 }
      );
    }

    if (!age || typeof age !== "number" || age < 7 || age > 15) {
      return NextResponse.json(
        { error: "Age must be between 7 and 15" },
        { status: 400 }
      );
    }

    const tier = computeTier(age);

    const child = await prisma.childProfile.create({
      data: {
        parentId: session.user.userId,
        name: name.trim(),
        age,
        tier,
        gradeLevel: gradeLevel || null,
        interests: interests || null,
        avatarEmoji: avatarEmoji || undefined,
      },
    });

    return NextResponse.json({ child }, { status: 201 });
  } catch (error) {
    console.error("POST /api/children error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
