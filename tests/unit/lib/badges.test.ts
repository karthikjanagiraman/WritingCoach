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
 *   - skillProgress.findMany (skill levels)
 *   - assessment.findMany (scores)
 *   - writingSubmission.findMany (revisions with feedback)
 * Then uses achievement.createMany to persist new badges.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { prismaMock, resetPrismaMock } from '../../setup/db-mock';
import {
  CHILD_MAYA, BADGE_FIRST_STORY,
  ALL_SKILLS_MAYA,
} from '../../setup/fixtures';

vi.mock('@/lib/db', () => ({ prisma: prismaMock }));

import { BADGE_CATALOG, getBadgeById } from '@/lib/badges';
import { checkAndUnlockBadges } from '@/lib/badge-checker';

describe('badges', () => {
  describe('BADGE_CATALOG', () => {
    it('has exactly 12 badges', () => {
      expect(BADGE_CATALOG.length).toBe(12);
    });

    it('every badge has required fields including rarity', () => {
      for (const badge of BADGE_CATALOG) {
        expect(badge.id).toBeDefined();
        expect(badge.name).toBeDefined();
        expect(badge.description).toBeDefined();
        expect(badge.emoji).toBeDefined();
        expect(badge.category).toBeDefined();
        expect(badge.rarity).toBeDefined();
        expect(['common', 'rare', 'epic', 'legendary']).toContain(badge.rarity);
      }
    });

    it('all badge IDs are unique', () => {
      const ids = BADGE_CATALOG.map(b => b.id);
      expect(new Set(ids).size).toBe(ids.length);
    });

    it('covers all 4 rarity categories', () => {
      const categories = [...new Set(BADGE_CATALOG.map(b => b.category))];
      expect(categories).toContain('first_steps');
      expect(categories).toContain('craft');
      expect(categories).toContain('mastery');
      expect(categories).toContain('legendary');
    });

    it('has correct rarity distribution (4 common, 4 rare, 3 epic, 1 legendary)', () => {
      const common = BADGE_CATALOG.filter(b => b.rarity === 'common');
      const rare = BADGE_CATALOG.filter(b => b.rarity === 'rare');
      const epic = BADGE_CATALOG.filter(b => b.rarity === 'epic');
      const legendary = BADGE_CATALOG.filter(b => b.rarity === 'legendary');
      expect(common.length).toBe(4);
      expect(rare.length).toBe(4);
      expect(epic.length).toBe(3);
      expect(legendary.length).toBe(1);
    });

    it('getBadgeById returns correct badge', () => {
      const badge = getBadgeById('brave_start');
      expect(badge).toBeDefined();
      expect(badge!.name).toBe('Brave Start');
      expect(badge!.rarity).toBe('common');
    });

    it('getBadgeById returns undefined for unknown ID', () => {
      expect(getBadgeById('nonexistent_badge')).toBeUndefined();
    });

    it('getBadgeById returns undefined for old badge IDs', () => {
      // These IDs no longer exist in the new system
      expect(getBadgeById('first_lesson')).toBeUndefined();
      expect(getBadgeById('streak_7')).toBeUndefined();
      expect(getBadgeById('wordsmith_100')).toBeUndefined();
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
    prismaMock.assessment.findMany.mockResolvedValue([]);
    prismaMock.achievement.createMany.mockResolvedValue({ count: 0 });
  }

  describe('checkAndUnlockBadges()', () => {
    it('does not unlock already-earned badges', async () => {
      setupDefaultMocks();
      // Maya already has 'brave_start' badge
      prismaMock.achievement.findMany.mockResolvedValue([
        { ...BADGE_FIRST_STORY, badgeId: 'brave_start' },
      ]);
      prismaMock.lessonProgress.findMany.mockResolvedValue([
        { lessonId: 'N1.1.1', completedAt: new Date() },
      ]);

      const newBadges = await checkAndUnlockBadges(CHILD_MAYA.id);

      // Should NOT include 'brave_start' since it's already earned
      expect(newBadges).not.toContain('brave_start');
    });

    it('unlocks brave_start when first lesson is completed', async () => {
      setupDefaultMocks();
      prismaMock.lessonProgress.findMany.mockResolvedValue([
        { lessonId: 'N1.1.1', completedAt: new Date() },
      ]);

      const newBadges = await checkAndUnlockBadges(CHILD_MAYA.id);

      expect(newBadges).toContain('brave_start');
    });

    it('unlocks ten_down when 10 lessons are completed', async () => {
      setupDefaultMocks();
      const lessons = Array.from({ length: 10 }, (_, i) => ({
        lessonId: `N1.1.${i + 1}`,
        completedAt: new Date(),
      }));
      prismaMock.lessonProgress.findMany.mockResolvedValue(lessons);

      const newBadges = await checkAndUnlockBadges(CHILD_MAYA.id);

      expect(newBadges).toContain('ten_down');
    });

    it('unlocks deep_diver when any skill reaches PROFICIENT', async () => {
      setupDefaultMocks();
      prismaMock.skillProgress.findMany.mockResolvedValue([
        { ...ALL_SKILLS_MAYA[1], level: 'PROFICIENT', score: 3.8 },
      ]);

      const newBadges = await checkAndUnlockBadges(CHILD_MAYA.id);

      expect(newBadges).toContain('deep_diver');
    });

    it('unlocks high_marks when 3+ assessments score 3.5+', async () => {
      setupDefaultMocks();
      prismaMock.assessment.findMany.mockResolvedValue([
        { overallScore: 3.5, lessonId: 'N1.1.1', createdAt: new Date() },
        { overallScore: 3.8, lessonId: 'N1.1.2', createdAt: new Date() },
        { overallScore: 4.0, lessonId: 'N1.1.3', createdAt: new Date() },
      ]);

      const newBadges = await checkAndUnlockBadges(CHILD_MAYA.id);

      expect(newBadges).toContain('high_marks');
    });

    it('unlocks comeback_kid when low score is followed by high score', async () => {
      setupDefaultMocks();
      prismaMock.assessment.findMany.mockResolvedValue([
        { overallScore: 1.5, lessonId: 'N1.1.1', createdAt: new Date('2026-01-01') },
        { overallScore: 3.2, lessonId: 'N1.1.2', createdAt: new Date('2026-01-10') },
      ]);

      const newBadges = await checkAndUnlockBadges(CHILD_MAYA.id);

      expect(newBadges).toContain('comeback_kid');
    });

    it('can unlock multiple badges in a single check', async () => {
      setupDefaultMocks();
      prismaMock.lessonProgress.findMany.mockResolvedValue([
        { lessonId: 'N1.1.1', completedAt: new Date() },
        { lessonId: 'N1.1.2', completedAt: new Date() },
        { lessonId: 'P1.1.1', completedAt: new Date() },
        { lessonId: 'E1.1.1', completedAt: new Date() },
        { lessonId: 'D1.1.1', completedAt: new Date() },
      ]);

      const newBadges = await checkAndUnlockBadges(CHILD_MAYA.id);

      // Should unlock brave_start (1+ lessons) and ink_explorer (all 4 types)
      expect(newBadges).toContain('brave_start');
      expect(newBadges).toContain('ink_explorer');
      expect(newBadges.length).toBeGreaterThanOrEqual(2);
    });

    it('newly created achievements are persisted via createMany', async () => {
      setupDefaultMocks();
      prismaMock.lessonProgress.findMany.mockResolvedValue([
        { lessonId: 'N1.1.1', completedAt: new Date() },
      ]);

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
