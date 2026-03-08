import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getLessonById } from "@/lib/curriculum";
import { SKILL_DEFINITIONS } from "@/lib/skill-map";

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

    const subscription = await prisma.subscription.findUnique({
      where: { userId: session.user.userId },
      select: { plan: true, status: true },
    });

    const childCards = await Promise.all(
      children.map(async (child) => {
        // Placement check
        const placement = await prisma.placementResult.findUnique({
          where: { childId: child.id },
        });

        // Curriculum + current week
        const curriculum = await prisma.curriculum.findUnique({
          where: { childId: child.id },
          include: { weeks: { orderBy: { weekNumber: "asc" } } },
        });
        const activeWeek = curriculum?.weeks.find((w) => w.status !== "completed");
        const currentWeek = activeWeek?.weekNumber ?? null;
        const totalWeeks = curriculum?.weeks.length ?? null;

        // Get lesson IDs for current week
        let weekLessonIds: string[] = [];
        if (activeWeek) {
          try {
            weekLessonIds = JSON.parse(activeWeek.lessonIds);
          } catch { /* ignore */ }
        }

        // Weekly lessons completed
        const completedThisWeek = weekLessonIds.length > 0
          ? await prisma.lessonProgress.count({
              where: {
                childId: child.id,
                lessonId: { in: weekLessonIds },
                status: { in: ["completed", "needs_improvement"] },
              },
            })
          : 0;
        const weeklyTotal = weekLessonIds.length || (curriculum?.lessonsPerWeek ?? 3);

        // Streak
        const streak = await prisma.streak.findUnique({
          where: { childId: child.id },
        });

        // Total words written
        const totalWords = await prisma.writingSubmission.aggregate({
          where: { childId: child.id },
          _sum: { wordCount: true },
        });

        // Weekly activity (Mon-Sun booleans)
        const now = new Date();
        const dayOfWeek = now.getDay();
        const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
        const weekStart = new Date(now);
        weekStart.setHours(0, 0, 0, 0);
        weekStart.setDate(weekStart.getDate() + mondayOffset);

        const weekSessions = await prisma.session.findMany({
          where: { childId: child.id, updatedAt: { gte: weekStart } },
          select: { updatedAt: true },
        });

        const activeDays = new Array(7).fill(false);
        for (const s of weekSessions) {
          const d = s.updatedAt.getDay();
          activeDays[d === 0 ? 6 : d - 1] = true; // Mon=0...Sun=6
        }

        // Average score (recent 10 assessments)
        const recentAssessments = await prisma.assessment.findMany({
          where: { childId: child.id },
          orderBy: { createdAt: "desc" },
          take: 10,
        });
        const avgScore = recentAssessments.length > 0
          ? Math.round(
              (recentAssessments.reduce((s, a) => s + a.overallScore, 0) /
                recentAssessments.length) *
                10
            ) / 10
          : null;

        // Last active
        const lastSession = await prisma.session.findFirst({
          where: { childId: child.id },
          orderBy: { updatedAt: "desc" },
          select: { updatedAt: true },
        });

        // Skills - find strongest and weakest
        const skills = await prisma.skillProgress.findMany({
          where: { childId: child.id, totalAttempts: { gt: 0 } },
        });

        let strongest: { name: string; score: number } | null = null;
        let weakest: { name: string; score: number } | null = null;

        if (skills.length > 0) {
          // Group by category and average
          const catScores: Record<string, { total: number; count: number }> = {};
          for (const s of skills) {
            if (!catScores[s.skillCategory]) catScores[s.skillCategory] = { total: 0, count: 0 };
            catScores[s.skillCategory].total += s.score;
            catScores[s.skillCategory].count += 1;
          }

          const categoryNames: Record<string, string> = {
            narrative: "Storytelling",
            persuasive: "Opinion Writing",
            expository: "Informational Writing",
            descriptive: "Sensory & Detail",
          };

          const cats = Object.entries(catScores).map(([cat, { total, count }]) => ({
            category: cat,
            displayName: categoryNames[cat] || cat,
            avg: Math.round((total / count) * 10) / 10,
          }));

          cats.sort((a, b) => b.avg - a.avg);
          if (cats.length > 0) strongest = { name: cats[0].displayName, score: cats[0].avg };
          if (cats.length > 1) weakest = { name: cats[cats.length - 1].displayName, score: cats[cats.length - 1].avg };
        }

        // Recent lessons (last 2 with scores)
        const recentLessons = recentAssessments.slice(0, 2).map((a) => {
          const lesson = getLessonById(a.lessonId);
          return {
            lessonId: a.lessonId,
            title: lesson?.title ?? "Unknown",
            type: lesson?.type ?? "unknown",
            score: a.overallScore,
          };
        });

        // Recent badges (last 3)
        const recentBadges = await prisma.achievement.findMany({
          where: { childId: child.id },
          orderBy: { unlockedAt: "desc" },
          take: 3,
        });

        // Needs-improvement lessons
        const needsImprovementLessons = await prisma.lessonProgress.findMany({
          where: { childId: child.id, status: "needs_improvement" },
          take: 3,
        });

        // Determine status
        let status: "on_track" | "needs_attention" | "needs_setup" = "on_track";
        if (!placement) {
          status = "needs_setup";
        } else if (
          (streak?.currentStreak ?? 0) === 0 &&
          lastSession &&
          Date.now() - lastSession.updatedAt.getTime() > 3 * 24 * 60 * 60 * 1000
        ) {
          status = "needs_attention";
        } else if (
          avgScore !== null && avgScore < 2.0
        ) {
          status = "needs_attention";
        }

        return {
          id: child.id,
          name: child.name,
          age: child.age,
          tier: child.tier,
          avatarEmoji: child.avatarEmoji,
          status,
          hasPlacement: !!placement,
          hasCurriculum: !!curriculum,
          currentWeek,
          totalWeeks,
          weeklyCompleted: completedThisWeek,
          weeklyTotal,
          streakCount: streak?.currentStreak ?? 0,
          avgScore,
          lastActive: lastSession?.updatedAt ?? null,
          strongest,
          weakest,
          recentLessons,
          wordsWritten: totalWords._sum.wordCount ?? 0,
          weeklyActivity: activeDays,
          recentBadges: recentBadges.map((b) => b.badgeId),
          needsImprovementLessons: needsImprovementLessons.map((l) => {
            const lesson = getLessonById(l.lessonId);
            return {
              lessonId: l.lessonId,
              title: lesson?.title ?? "Unknown",
            };
          }),
        };
      })
    );

    // Build attention items
    const ALERT_ICONS: Record<string, string> = {
      red: "\uD83D\uDCDD", amber: "\u23F0", green: "\uD83C\uDFC5", blue: "\uD83E\uDDED",
    };
    const attentionItems: Array<{
      type: "red" | "amber" | "green" | "blue";
      childName: string;
      childId: string;
      message: string;
      actionLabel: string;
      actionUrl: string;
      icon: string;
    }> = [];

    for (const card of childCards) {
      // Needs setup
      if (card.status === "needs_setup") {
        attentionItems.push({
          type: "blue",
          childName: card.name,
          childId: card.id,
          message: `${card.name} needs a placement assessment to get started`,
          actionLabel: "Begin Assessment",
          actionUrl: `/placement/${card.id}`,
          icon: ALERT_ICONS.blue,
        });
      }

      // Needs-improvement lessons (red)
      for (const lesson of card.needsImprovementLessons) {
        attentionItems.push({
          type: "red",
          childName: card.name,
          childId: card.id,
          message: `${card.name}'s "${lesson.title}" needs revision`,
          actionLabel: "Encourage Revision",
          actionUrl: `/lesson/${lesson.lessonId}`,
          icon: ALERT_ICONS.red,
        });
      }

      // Inactive (amber) — more than 3 days
      if (
        card.hasPlacement &&
        card.lastActive &&
        Date.now() - new Date(card.lastActive).getTime() > 3 * 24 * 60 * 60 * 1000
      ) {
        const days = Math.floor(
          (Date.now() - new Date(card.lastActive).getTime()) / (24 * 60 * 60 * 1000)
        );
        attentionItems.push({
          type: "amber",
          childName: card.name,
          childId: card.id,
          message: `${card.name} hasn't practiced in ${days} day${days === 1 ? "" : "s"}`,
          actionLabel: "Start Session",
          actionUrl: `/home`,
          icon: ALERT_ICONS.amber,
        });
      }

      // Recent badges (green)
      if (card.recentBadges.length > 0) {
        attentionItems.push({
          type: "green",
          childName: card.name,
          childId: card.id,
          message: `${card.name} earned a new badge!`,
          actionLabel: "Celebrate",
          actionUrl: `/badges/${card.id}`,
          icon: ALERT_ICONS.green,
        });
      }
    }

    // Sort: red first, then amber, then blue, then green
    const typePriority: Record<string, number> = { red: 0, amber: 1, blue: 2, green: 3 };
    attentionItems.sort(
      (a, b) => (typePriority[a.type] ?? 4) - (typePriority[b.type] ?? 4)
    );

    return NextResponse.json({
      parentName: session.user.name ?? "Parent",
      subscription: subscription
        ? { plan: subscription.plan, status: subscription.status }
        : null,
      children: childCards,
      attentionItems,
    });
  } catch (error) {
    console.error("GET /api/dashboard/parent error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
