/**
 * Tests for src/lib/badges.ts and src/lib/badge-checker.ts
 *
 * Covers: BADGE_CATALOG validation, checkAndUnlockBadges(), no-duplicate unlocks
 *
 * The actual function signature for checkAndUnlockBadges is:
 *   checkAndUnlockBadges(childId: string): Promise<string[]>
 *
 * It uses the global prisma (mocked via vi.mock) and batch-queries:
 *   - achievement.findMany (existing badges)
 *   - lessonProgress.findMany (completed lessons)
 *   - writingSubmission.findMany (word counts, revisions)
 *   - skillProgress.findMany (skill levels)
 *   - streak.findUnique (streak data)
 *   - assessment.findMany (scores)
 * Then uses achievement.createMany to persist new badges.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { prismaMock, resetPrismaMock } from '../../setup/db-mock';
import {
  CHILD_MAYA, BADGE_FIRST_STORY, STREAK_ACTIVE,
  ALL_SKILLS_MAYA, SUBMISSION_ORIGINAL,
} from '../../setup/fixtures';

vi.mock('@/lib/db', () => ({ prisma: prismaMock }));

import { BADGE_CATALOG, getBadgeById } from '@/lib/badges';
import { checkAndUnlockBadges } from '@/lib/badge-checker';

describe('badges', () => {
  describe('BADGE_CATALOG', () => {
    it('has at least 20 badges', () => {
      expect(BADGE_CATALOG.length).toBeGreaterThanOrEqual(20);
    });

    it('every badge has required fields', () => {
      for (const badge of BADGE_CATALOG) {
        expect(badge.id).toBeDefined();
        expect(badge.name).toBeDefined();
        expect(badge.description).toBeDefined();
        expect(badge.emoji).toBeDefined();
        expect(badge.category).toBeDefined();
      }
    });

    it('all badge IDs are unique', () => {
      const ids = BADGE_CATALOG.map(b => b.id);
      expect(new Set(ids).size).toBe(ids.length);
    });

    it('covers all 5 categories', () => {
      const categories = [...new Set(BADGE_CATALOG.map(b => b.category))];
      expect(categories).toContain('writing');
      expect(categories).toContain('progress');
      expect(categories).toContain('streak');
      expect(categories).toContain('skill');
      expect(categories).toContain('special');
    });

    it('getBadgeById returns correct badge', () => {
      const badge = getBadgeById('first_lesson');
      expect(badge).toBeDefined();
      expect(badge!.name).toBe('Story Starter');
    });

    it('getBadgeById returns undefined for unknown ID', () => {
      expect(getBadgeById('nonexistent_badge')).toBeUndefined();
    });
  });
});

describe('badge-checker', () => {
  beforeEach(() => {
    resetPrismaMock();
  });

  /**
   * Helper to set up default mock returns for all queries checkAndUnlockBadges uses.
   * Individual tests override the specific mocks they care about.
   */
  function setupDefaultMocks() {
    prismaMock.achievement.findMany.mockResolvedValue([]);
    prismaMock.lessonProgress.findMany.mockResolvedValue([]);
    prismaMock.writingSubmission.findMany.mockResolvedValue([]);
    prismaMock.skillProgress.findMany.mockResolvedValue([]);
    prismaMock.streak.findUnique.mockResolvedValue(null);
    prismaMock.assessment.findMany.mockResolvedValue([]);
    prismaMock.achievement.createMany.mockResolvedValue({ count: 0 });
  }

  describe('checkAndUnlockBadges()', () => {
    it('does not unlock already-earned badges', async () => {
      setupDefaultMocks();
      // Maya already has 'first_lesson' badge
      prismaMock.achievement.findMany.mockResolvedValue([
        { ...BADGE_FIRST_STORY, badgeId: 'first_lesson' },
      ]);
      prismaMock.lessonProgress.findMany.mockResolvedValue([
        { lessonId: 'N1.1.1', completedAt: new Date() },
      ]);
      prismaMock.writingSubmission.findMany.mockResolvedValue([SUBMISSION_ORIGINAL]);
      prismaMock.skillProgress.findMany.mockResolvedValue(ALL_SKILLS_MAYA);
      prismaMock.streak.findUnique.mockResolvedValue(STREAK_ACTIVE);
      prismaMock.assessment.findMany.mockResolvedValue([]);

      const newBadges = await checkAndUnlockBadges(CHILD_MAYA.id);

      // Should NOT include 'first_lesson' since it's already earned
      expect(newBadges).not.toContain('first_lesson');
    });

    it('unlocks streak_7 when longestStreak reaches 7', async () => {
      setupDefaultMocks();
      prismaMock.streak.findUnique.mockResolvedValue({
        ...STREAK_ACTIVE,
        longestStreak: 7,
      });

      const newBadges = await checkAndUnlockBadges(CHILD_MAYA.id);

      expect(newBadges).toContain('streak_7');
    });

    it('unlocks wordsmith_100 when submission has 100+ words', async () => {
      setupDefaultMocks();
      prismaMock.writingSubmission.findMany.mockResolvedValue([
        { ...SUBMISSION_ORIGINAL, wordCount: 105, revisionNumber: 0 },
      ]);
      prismaMock.lessonProgress.findMany.mockResolvedValue([
        { lessonId: 'N1.1.1', completedAt: new Date() },
      ]);

      const newBadges = await checkAndUnlockBadges(CHILD_MAYA.id);

      expect(newBadges).toContain('wordsmith_100');
    });

    it('unlocks first_proficient when any skill reaches PROFICIENT', async () => {
      setupDefaultMocks();
      prismaMock.skillProgress.findMany.mockResolvedValue([
        { ...ALL_SKILLS_MAYA[1], level: 'PROFICIENT', score: 3.8 },
      ]);

      const newBadges = await checkAndUnlockBadges(CHILD_MAYA.id);

      expect(newBadges).toContain('first_proficient');
    });

    it('can unlock multiple badges in a single check', async () => {
      setupDefaultMocks();
      prismaMock.writingSubmission.findMany.mockResolvedValue([
        { ...SUBMISSION_ORIGINAL, wordCount: 120, revisionNumber: 0 }, // wordsmith_100
      ]);
      prismaMock.lessonProgress.findMany.mockResolvedValue([
        { lessonId: 'N1.1.1', completedAt: new Date() },
        { lessonId: 'N1.1.2', completedAt: new Date() },
        { lessonId: 'N1.1.3', completedAt: new Date() },
        { lessonId: 'N1.1.4', completedAt: new Date() },
        { lessonId: 'N1.1.5', completedAt: new Date() },
      ]); // 5 lessons -> five_lessons badge + first_lesson + all_narrative
      prismaMock.streak.findUnique.mockResolvedValue({ ...STREAK_ACTIVE, longestStreak: 7 }); // streak_7 + streak_3

      const newBadges = await checkAndUnlockBadges(CHILD_MAYA.id);

      expect(newBadges.length).toBeGreaterThanOrEqual(3);
    });

    it('newly created achievements are persisted via createMany', async () => {
      setupDefaultMocks();
      prismaMock.streak.findUnique.mockResolvedValue({ ...STREAK_ACTIVE, longestStreak: 7 });

      await checkAndUnlockBadges(CHILD_MAYA.id);

      // createMany should be called with badge data
      expect(prismaMock.achievement.createMany).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.arrayContaining([
            expect.objectContaining({ childId: CHILD_MAYA.id }),
          ]),
        })
      );
    });
  });
});
