import { prisma } from "@/lib/db";

/**
 * Update streak data after a child completes a lesson.
 * Tracks consecutive-day streaks and weekly lesson completion.
 */
export async function updateStreak(childId: string): Promise<void> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const streak = await prisma.streak.findUnique({ where: { childId } });

  if (!streak) {
    // First activity ever
    await prisma.streak.create({
      data: {
        childId,
        currentStreak: 1,
        longestStreak: 1,
        lastActiveDate: today,
        weeklyCompleted: 1,
        weekStartDate: getWeekStart(today),
      },
    });
    return;
  }

  const lastActive = streak.lastActiveDate
    ? new Date(streak.lastActiveDate)
    : null;
  if (lastActive) lastActive.setHours(0, 0, 0, 0);

  // Same day — don't double-count streak
  if (lastActive && lastActive.getTime() === today.getTime()) {
    return;
  }

  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  let newStreak: number;
  if (lastActive && lastActive.getTime() === yesterday.getTime()) {
    // Consecutive day
    newStreak = streak.currentStreak + 1;
  } else {
    // Gap — reset streak
    newStreak = 1;
  }

  const longestStreak = Math.max(newStreak, streak.longestStreak);

  // Weekly tracking
  const weekStart = getWeekStart(today);
  const existingWeekStart = streak.weekStartDate
    ? new Date(streak.weekStartDate)
    : null;
  if (existingWeekStart) existingWeekStart.setHours(0, 0, 0, 0);

  let weeklyCompleted: number;
  if (
    existingWeekStart &&
    existingWeekStart.getTime() === weekStart.getTime()
  ) {
    weeklyCompleted = streak.weeklyCompleted + 1;
  } else {
    // New week
    weeklyCompleted = 1;
  }

  await prisma.streak.update({
    where: { childId },
    data: {
      currentStreak: newStreak,
      longestStreak,
      lastActiveDate: today,
      weeklyCompleted,
      weekStartDate: weekStart,
    },
  });
}

/** Get the Monday of the week containing the given date */
function getWeekStart(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay();
  d.setDate(d.getDate() - (day === 0 ? 6 : day - 1)); // Monday start
  return d;
}
