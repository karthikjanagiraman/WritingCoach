/**
 * Tests for src/lib/streak-tracker.ts
 *
 * Covers: updateStreak() — consecutive day logic, weekly resets, same-day no-ops
 *
 * The actual function signature is:
 *   updateStreak(childId: string): Promise<void>
 *
 * It uses the global prisma (mocked via vi.mock).
 * - For first-time activity: calls prisma.streak.create
 * - For same-day activity: returns early (no DB call)
 * - For subsequent activity: calls prisma.streak.update
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { prismaMock, resetPrismaMock } from '../../setup/db-mock';
import { CHILD_MAYA, STREAK_ACTIVE } from '../../setup/fixtures';

vi.mock('@/lib/db', () => ({ prisma: prismaMock }));

import { updateStreak } from '@/lib/streak-tracker';

describe('streak-tracker', () => {
  beforeEach(() => {
    resetPrismaMock();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('updateStreak()', () => {
    it('creates new streak record for first-time activity', async () => {
      vi.setSystemTime(new Date('2026-02-12T15:00:00Z'));
      prismaMock.streak.findUnique.mockResolvedValue(null);
      prismaMock.streak.create.mockResolvedValue({});

      await updateStreak(CHILD_MAYA.id);

      expect(prismaMock.streak.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            childId: CHILD_MAYA.id,
            currentStreak: 1,
            longestStreak: 1,
          }),
        })
      );
    });

    it('extends streak when activity is on the next consecutive day', async () => {
      // Last active: Feb 11. Today: Feb 12 -> consecutive -> streak + 1
      vi.setSystemTime(new Date('2026-02-12T10:00:00Z'));
      prismaMock.streak.findUnique.mockResolvedValue({
        ...STREAK_ACTIVE,
        currentStreak: 5,
        lastActiveDate: new Date('2026-02-11'),
      });
      prismaMock.streak.update.mockResolvedValue({});

      await updateStreak(CHILD_MAYA.id);

      expect(prismaMock.streak.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            currentStreak: 6,
          }),
        })
      );
    });

    it('does NOT increment streak for same-day activity', async () => {
      // Last active: today -> no change
      vi.setSystemTime(new Date('2026-02-12T15:00:00Z'));
      prismaMock.streak.findUnique.mockResolvedValue({
        ...STREAK_ACTIVE,
        currentStreak: 5,
        lastActiveDate: new Date('2026-02-12T08:00:00Z'), // Same day, earlier
      });

      await updateStreak(CHILD_MAYA.id);

      // Should not call update or create since it's the same day
      expect(prismaMock.streak.update).not.toHaveBeenCalled();
      expect(prismaMock.streak.create).not.toHaveBeenCalled();
    });

    it('resets streak to 1 when there is a gap of 2+ days', async () => {
      // Last active: Feb 9. Today: Feb 12 -> 3-day gap -> reset
      vi.setSystemTime(new Date('2026-02-12T10:00:00Z'));
      prismaMock.streak.findUnique.mockResolvedValue({
        ...STREAK_ACTIVE,
        currentStreak: 5,
        longestStreak: 12,
        lastActiveDate: new Date('2026-02-09'),
      });
      prismaMock.streak.update.mockResolvedValue({});

      await updateStreak(CHILD_MAYA.id);

      expect(prismaMock.streak.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            currentStreak: 1,
            longestStreak: 12, // Should preserve existing longest
          }),
        })
      );
    });

    it('updates longestStreak when current exceeds it', async () => {
      vi.setSystemTime(new Date('2026-02-12T10:00:00Z'));
      prismaMock.streak.findUnique.mockResolvedValue({
        ...STREAK_ACTIVE,
        currentStreak: 12,
        longestStreak: 12,
        lastActiveDate: new Date('2026-02-11'),
      });
      prismaMock.streak.update.mockResolvedValue({});

      await updateStreak(CHILD_MAYA.id);

      // currentStreak becomes 13, which exceeds longestStreak of 12
      expect(prismaMock.streak.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            currentStreak: 13,
            longestStreak: 13,
          }),
        })
      );
    });

    it('resets weekly counter when new week starts', async () => {
      // weekStartDate was last Monday (Feb 3). Today is Monday Feb 10 -> new week
      vi.setSystemTime(new Date('2026-02-10T10:00:00Z')); // Monday
      prismaMock.streak.findUnique.mockResolvedValue({
        ...STREAK_ACTIVE,
        weeklyCompleted: 3,
        weekStartDate: new Date('2026-02-03'), // Previous Monday
        lastActiveDate: new Date('2026-02-07'), // Friday of last week
      });
      prismaMock.streak.update.mockResolvedValue({});

      await updateStreak(CHILD_MAYA.id);

      // weeklyCompleted should reset to 1 since it's a new week
      expect(prismaMock.streak.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            weeklyCompleted: 1,
          }),
        })
      );
    });

    it('increments weekly counter within same week', async () => {
      vi.setSystemTime(new Date('2026-02-12T10:00:00Z')); // Thursday
      prismaMock.streak.findUnique.mockResolvedValue({
        ...STREAK_ACTIVE,
        weeklyCompleted: 2,
        weekStartDate: new Date('2026-02-09'), // Monday (week start for Feb 12)
        lastActiveDate: new Date('2026-02-11'), // Yesterday
      });
      prismaMock.streak.update.mockResolvedValue({});

      await updateStreak(CHILD_MAYA.id);

      // weeklyCompleted should be 3
      expect(prismaMock.streak.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            weeklyCompleted: 3,
          }),
        })
      );
    });
  });
});
