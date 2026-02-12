import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { getBadgeById } from "@/lib/badges";

export async function GET(
  _request: NextRequest,
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

    const achievements = await prisma.achievement.findMany({
      where: { childId },
      orderBy: { unlockedAt: "desc" },
    });

    const badges = achievements
      .map((a) => {
        const def = getBadgeById(a.badgeId);
        if (!def) return null;
        return {
          id: def.id,
          name: def.name,
          emoji: def.emoji,
          description: def.description,
          category: def.category,
          unlockedAt: a.unlockedAt.toISOString(),
          seen: a.seen,
        };
      })
      .filter((b): b is NonNullable<typeof b> => b !== null);

    const unseen = badges.filter((b) => !b.seen).length;

    return NextResponse.json({
      badges,
      total: badges.length,
      unseen,
    });
  } catch (error) {
    console.error("GET /api/children/[id]/badges error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
