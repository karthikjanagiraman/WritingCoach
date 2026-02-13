/**
 * Tests for src/lib/progress-tracker.ts
 *
 * Covers: updateSkillProgress() — 70/30 rolling average, level transitions
 *
 * The actual function signature is:
 *   updateSkillProgress(childId: string, lessonId: string, overallScore: number): Promise<void>
 *
 * It internally calls getLessonSkills(lessonId) to determine category + skills,
 * then for each skill does a findUnique followed by upsert using the global prisma.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { prismaMock, resetPrismaMock } from '../../setup/db-mock';
import { CHILD_MAYA, SKILL_NARRATIVE_EMERGING, SKILL_NARRATIVE_PROFICIENT } from '../../setup/fixtures';

vi.mock('@/lib/db', () => ({ prisma: prismaMock }));

// Mock skill-map so we can control which skills getLessonSkills returns
vi.mock('@/lib/skill-map', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/skill-map')>();
  return {
    ...actual,
    getLessonSkills: vi.fn().mockReturnValue({
      category: 'narrative',
      skills: ['story_beginnings'],
    }),
  };
});

import { updateSkillProgress } from '@/lib/progress-tracker';

describe('progress-tracker', () => {
  beforeEach(() => {
    resetPrismaMock();
  });

  describe('updateSkillProgress()', () => {
    it('creates new skill record when none exists', async () => {
      prismaMock.skillProgress.findUnique.mockResolvedValue(null);
      prismaMock.skillProgress.upsert.mockResolvedValue({ id: 'new-skill' });

      await updateSkillProgress(CHILD_MAYA.id, 'N1.1.1', 3.0);

      expect(prismaMock.skillProgress.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({
            childId: CHILD_MAYA.id,
            skillCategory: 'narrative',
            skillName: 'story_beginnings',
            score: 3.0,
            level: 'DEVELOPING',
            totalAttempts: 1,
          }),
        })
      );
    });

    it('applies 70/30 rolling average on existing skill', async () => {
      prismaMock.skillProgress.findUnique.mockResolvedValue({
        ...SKILL_NARRATIVE_EMERGING,
        score: 2.0,
        totalAttempts: 3,
      });
      prismaMock.skillProgress.upsert.mockResolvedValue({ id: SKILL_NARRATIVE_EMERGING.id });

      await updateSkillProgress(CHILD_MAYA.id, 'N1.1.1', 4.0);

      // Expected: 4.0 * 0.7 + 2.0 * 0.3 = 2.8 + 0.6 = 3.4
      expect(prismaMock.skillProgress.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          update: expect.objectContaining({
            score: expect.closeTo(3.4, 2),
            totalAttempts: 4,
          }),
        })
      );
    });

    it('rolling average: new score weighted 70%, old 30%', async () => {
      prismaMock.skillProgress.findUnique.mockResolvedValue({
        ...SKILL_NARRATIVE_EMERGING,
        score: 1.0,
        totalAttempts: 1,
      });
      prismaMock.skillProgress.upsert.mockResolvedValue({});

      await updateSkillProgress(CHILD_MAYA.id, 'N1.1.1', 5.0);

      // Expected: 5.0 * 0.7 + 1.0 * 0.3 = 3.5 + 0.3 = 3.8
      expect(prismaMock.skillProgress.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          update: expect.objectContaining({
            score: expect.closeTo(3.8, 2),
            level: 'PROFICIENT',
          }),
        })
      );
    });

    it('level transitions correctly on score update', async () => {
      // EMERGING (1.5) + new score of 3.0 → 3.0*0.7 + 1.5*0.3 = 2.1 + 0.45 = 2.55 → DEVELOPING
      prismaMock.skillProgress.findUnique.mockResolvedValue({
        ...SKILL_NARRATIVE_EMERGING,
        score: 1.5,
        totalAttempts: 1,
      });
      prismaMock.skillProgress.upsert.mockResolvedValue({});

      await updateSkillProgress(CHILD_MAYA.id, 'N1.1.1', 3.0);

      expect(prismaMock.skillProgress.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          update: expect.objectContaining({
            level: 'DEVELOPING',
          }),
        })
      );
    });

    it('increments totalAttempts on update', async () => {
      prismaMock.skillProgress.findUnique.mockResolvedValue({
        ...SKILL_NARRATIVE_PROFICIENT,
        totalAttempts: 5,
      });
      prismaMock.skillProgress.upsert.mockResolvedValue({});

      await updateSkillProgress(CHILD_MAYA.id, 'N1.1.1', 4.0);

      expect(prismaMock.skillProgress.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          update: expect.objectContaining({
            totalAttempts: 6,
          }),
        })
      );
    });

    it('first assessment sets score directly (no rolling average)', async () => {
      prismaMock.skillProgress.findUnique.mockResolvedValue(null);
      prismaMock.skillProgress.upsert.mockResolvedValue({});

      await updateSkillProgress(CHILD_MAYA.id, 'N1.1.1', 4.5);

      expect(prismaMock.skillProgress.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({
            score: 4.5,
            level: 'ADVANCED',
          }),
        })
      );
    });
  });
});
