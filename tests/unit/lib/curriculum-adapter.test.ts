/**
 * Tests for src/lib/curriculum-adapter.ts
 *
 * Covers: checkCurriculumAdaptation() — struggling, excelling, type weakness triggers
 *
 * The actual function signature is:
 *   checkCurriculumAdaptation(childId: string, lessonId: string, overallScore: number): Promise<void>
 *
 * It uses the global prisma (mocked via vi.mock) and queries:
 *   - curriculum.findFirst (active curriculum with weeks)
 *   - assessment.findMany (last 10 assessments for analysis)
 *   - childProfile.findUnique (for tier)
 *   - curriculumRevision.create (when adaptation triggers)
 *   - curriculumWeek.update (to modify pending weeks)
 *
 * Returns void — does not return a result object. We verify behavior by
 * checking whether curriculumRevision.create and curriculumWeek.update were called.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { prismaMock, resetPrismaMock } from '../../setup/db-mock';
import { CHILD_MAYA, CURRICULUM_MAYA, CURRICULUM_WEEKS } from '../../setup/fixtures';

vi.mock('@/lib/db', () => ({ prisma: prismaMock }));

// Mock the curriculum module used internally by curriculum-adapter
vi.mock('@/lib/curriculum', () => ({
  getLessonById: vi.fn().mockReturnValue({ id: 'N1.1.1', type: 'narrative', tier: 1 }),
  getLessonsByTier: vi.fn().mockReturnValue([
    { id: 'N1.1.1', type: 'narrative', tier: 1 },
    { id: 'N1.1.2', type: 'narrative', tier: 1 },
    { id: 'N1.1.3', type: 'narrative', tier: 1 },
    { id: 'D1.1.1', type: 'descriptive', tier: 1 },
    { id: 'D1.1.2', type: 'descriptive', tier: 1 },
    { id: 'P1.1.1', type: 'persuasive', tier: 1 },
    { id: 'P1.1.2', type: 'persuasive', tier: 1 },
    { id: 'E1.1.1', type: 'expository', tier: 1 },
    // Some "advanced" unit 3+ lessons
    { id: 'N1.3.1', type: 'narrative', tier: 1 },
    { id: 'N1.4.1', type: 'narrative', tier: 1 },
  ]),
}));

import { checkCurriculumAdaptation } from '@/lib/curriculum-adapter';

// Helper: create assessment history with a given score
function makeAssessmentHistory(count: number, score: number) {
  return Array.from({ length: count }, (_, i) => ({
    id: `assessment-${i}`,
    childId: CHILD_MAYA.id,
    lessonId: `N1.1.${i + 1}`,
    overallScore: score,
    createdAt: new Date(2026, 1, count - i), // Most recent first
  }));
}

// Curriculum with weeks included (mimicking prisma include)
const curriculumWithWeeks = {
  ...CURRICULUM_MAYA,
  weeks: CURRICULUM_WEEKS,
};

describe('curriculum-adapter', () => {
  beforeEach(() => {
    resetPrismaMock();
  });

  describe('checkCurriculumAdaptation()', () => {
    it('triggers "struggling" adaptation when 3+ consecutive scores < 2.0', async () => {
      const lowAssessments = makeAssessmentHistory(5, 1.8);
      prismaMock.curriculum.findFirst.mockResolvedValue(curriculumWithWeeks);
      prismaMock.assessment.findMany.mockResolvedValue(lowAssessments);
      prismaMock.childProfile.findUnique.mockResolvedValue(CHILD_MAYA);
      prismaMock.curriculumRevision.create.mockResolvedValue({});
      prismaMock.curriculumWeek.update.mockResolvedValue({});

      await checkCurriculumAdaptation(CHILD_MAYA.id, 'N1.1.5', 1.8);

      // Should create a revision with "auto_struggling" reason
      expect(prismaMock.curriculumRevision.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            curriculumId: CURRICULUM_MAYA.id,
            reason: 'auto_struggling',
          }),
        })
      );
    });

    it('triggers "excelling" adaptation when 5+ consecutive scores > 3.5', async () => {
      const highAssessments = makeAssessmentHistory(5, 4.8);
      prismaMock.curriculum.findFirst.mockResolvedValue(curriculumWithWeeks);
      prismaMock.assessment.findMany.mockResolvedValue(highAssessments);
      prismaMock.childProfile.findUnique.mockResolvedValue(CHILD_MAYA);
      prismaMock.curriculumRevision.create.mockResolvedValue({});
      prismaMock.curriculumWeek.update.mockResolvedValue({});

      await checkCurriculumAdaptation(CHILD_MAYA.id, 'N1.1.5', 5.0);

      // Should create a revision with "auto_excelling" reason
      expect(prismaMock.curriculumRevision.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            curriculumId: CURRICULUM_MAYA.id,
            reason: 'auto_excelling',
          }),
        })
      );
    });

    it('does NOT trigger when scores are mixed', async () => {
      const mixedAssessments = makeAssessmentHistory(5, 3.0); // average, not extreme
      prismaMock.curriculum.findFirst.mockResolvedValue(curriculumWithWeeks);
      prismaMock.assessment.findMany.mockResolvedValue(mixedAssessments);
      prismaMock.childProfile.findUnique.mockResolvedValue(CHILD_MAYA);

      await checkCurriculumAdaptation(CHILD_MAYA.id, 'N1.1.5', 3.0);

      // Should NOT create any revision
      expect(prismaMock.curriculumRevision.create).not.toHaveBeenCalled();
    });

    it('does NOT trigger when no curriculum exists', async () => {
      prismaMock.curriculum.findFirst.mockResolvedValue(null);
      prismaMock.assessment.findMany.mockResolvedValue(makeAssessmentHistory(5, 1.5));

      await checkCurriculumAdaptation(CHILD_MAYA.id, 'N1.1.5', 1.5);

      expect(prismaMock.curriculumRevision.create).not.toHaveBeenCalled();
    });

    it('does NOT trigger with fewer than 3 assessments', async () => {
      const fewAssessments = makeAssessmentHistory(2, 1.0);
      prismaMock.curriculum.findFirst.mockResolvedValue(curriculumWithWeeks);
      prismaMock.assessment.findMany.mockResolvedValue(fewAssessments);

      await checkCurriculumAdaptation(CHILD_MAYA.id, 'N1.1.5', 1.0);

      expect(prismaMock.curriculumRevision.create).not.toHaveBeenCalled();
    });

    it('creates CurriculumRevision record when adaptation triggers', async () => {
      const lowAssessments = makeAssessmentHistory(5, 1.5);
      prismaMock.curriculum.findFirst.mockResolvedValue(curriculumWithWeeks);
      prismaMock.assessment.findMany.mockResolvedValue(lowAssessments);
      prismaMock.childProfile.findUnique.mockResolvedValue(CHILD_MAYA);
      prismaMock.curriculumRevision.create.mockResolvedValue({});
      prismaMock.curriculumWeek.update.mockResolvedValue({});

      await checkCurriculumAdaptation(CHILD_MAYA.id, 'N1.1.5', 1.5);

      expect(prismaMock.curriculumRevision.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            curriculumId: CURRICULUM_MAYA.id,
            reason: expect.stringContaining('struggling'),
          }),
        })
      );
    });
  });
});
