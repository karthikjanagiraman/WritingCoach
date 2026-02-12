import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

function computeTier(age: number): number {
  if (age <= 9) return 1;
  if (age <= 12) return 2;
  return 3;
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const child = await prisma.childProfile.findUnique({
      where: { id },
    });

    if (!child || child.parentId !== session.user.userId) {
      return NextResponse.json({ error: "Child not found" }, { status: 404 });
    }

    return NextResponse.json({ child });
  } catch (error) {
    console.error("GET /api/children/[id] error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const existing = await prisma.childProfile.findUnique({
      where: { id },
    });

    if (!existing || existing.parentId !== session.user.userId) {
      return NextResponse.json({ error: "Child not found" }, { status: 404 });
    }

    const body = await request.json();
    const { name, age, gradeLevel, interests, avatarEmoji } = body;

    const updateData: Record<string, unknown> = {};

    if (name !== undefined) {
      if (typeof name !== "string" || name.trim().length === 0) {
        return NextResponse.json(
          { error: "Name cannot be empty" },
          { status: 400 }
        );
      }
      updateData.name = name.trim();
    }

    if (age !== undefined) {
      if (typeof age !== "number" || age < 7 || age > 15) {
        return NextResponse.json(
          { error: "Age must be between 7 and 15" },
          { status: 400 }
        );
      }
      updateData.age = age;
      updateData.tier = computeTier(age);
    }

    if (gradeLevel !== undefined) {
      updateData.gradeLevel = gradeLevel || null;
    }

    if (interests !== undefined) {
      updateData.interests = interests || null;
    }

    if (avatarEmoji !== undefined) {
      updateData.avatarEmoji = avatarEmoji;
    }

    const child = await prisma.childProfile.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({ child });
  } catch (error) {
    console.error("PATCH /api/children/[id] error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const existing = await prisma.childProfile.findUnique({
      where: { id },
    });

    if (!existing || existing.parentId !== session.user.userId) {
      return NextResponse.json({ error: "Child not found" }, { status: 404 });
    }

    await prisma.childProfile.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/children/[id] error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
