import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { SKILL_DEFINITIONS } from "@/lib/skill-map";

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

    const skillRecords = await prisma.skillProgress.findMany({
      where: { childId },
      orderBy: { skillCategory: "asc" },
    });

    // Group by category with display names from SKILL_DEFINITIONS
    const categoryMap: Record<
      string,
      {
        name: string;
        displayName: string;
        avgScore: number;
        skills: {
          name: string;
          displayName: string;
          score: number;
          level: string;
          totalAttempts: number;
        }[];
      }
    > = {};

    for (const record of skillRecords) {
      if (!categoryMap[record.skillCategory]) {
        const def = SKILL_DEFINITIONS[record.skillCategory];
        categoryMap[record.skillCategory] = {
          name: record.skillCategory,
          displayName: def?.displayName ?? record.skillCategory,
          avgScore: 0,
          skills: [],
        };
      }

      const def = SKILL_DEFINITIONS[record.skillCategory];
      categoryMap[record.skillCategory].skills.push({
        name: record.skillName,
        displayName: def?.skills[record.skillName] ?? record.skillName,
        score: Math.round(record.score * 10) / 10,
        level: record.level,
        totalAttempts: record.totalAttempts,
      });
    }

    // Compute average score per category
    const categories = Object.values(categoryMap).map((cat) => ({
      ...cat,
      avgScore:
        cat.skills.length > 0
          ? Math.round(
              (cat.skills.reduce((sum, s) => sum + s.score, 0) /
                cat.skills.length) *
                10
            ) / 10
          : 0,
    }));

    return NextResponse.json({ categories });
  } catch (error) {
    console.error("GET /api/children/[id]/skills error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
