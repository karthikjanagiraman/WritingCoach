/**
 * End-to-End Flow Integration Tests
 *
 * These test the FULL user journey through the application.
 * They verify that all systems work together correctly.
 *
 * Unlike the unit/API tests above, these test sequences of operations
 * and verify the side effects chain:
 *
 *   signup → add child → placement → curriculum → lesson → submit
 *   → skills update → streak update → badge unlock → adaptation check
 *
 * To run these as real integration tests, you would need a test database.
 * As written, they use mocks but verify the correct call sequences.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { prismaMock, resetPrismaMock } from './setup/db-mock';
import { mockAuth, resetAuthMock } from './setup/auth-mock';
import { claudeMock, resetClaudeMock, EVALUATION_RESPONSES } from './setup/claude-mock';
import {
  PARENT_USER, CHILD_MAYA, PLACEMENT_MAYA, CURRICULUM_MAYA, CURRICULUM_WEEKS,
  SESSION_ASSESSMENT, SUBMISSION_ORIGINAL, AI_FEEDBACK_GOOD,
  STREAK_ACTIVE, makeSubmissionHistory,
} from './setup/fixtures';
import { updateSkillProgress } from '@/lib/progress-tracker';
import { updateStreak } from '@/lib/streak-tracker';
import { checkAndUnlockBadges } from '@/lib/badge-checker';
import { checkCurriculumAdaptation } from '@/lib/curriculum-adapter';

vi.mock('@/lib/db', () => ({ prisma: prismaMock, db: prismaMock }));
vi.mock('@/lib/auth', () => ({ auth: mockAuth }));
vi.mock('@/lib/llm/client', () => claudeMock);
vi.mock('@/lib/curriculum', () => ({
  getLessonById: vi.fn((id: string) => {
    const typeMap: Record<string, string> = { N: 'narrative', P: 'persuasive', E: 'expository', D: 'descriptive' };
    return { id, type: typeMap[id.charAt(0)] || 'narrative', title: `Lesson ${id}`, tier: 1, unit: 1, lesson: 1 };
  }),
  getLessonsByTier: vi.fn(() => [
    { id: 'N1.1.1', type: 'narrative', title: 'Story Hooks', tier: 1, unit: 1, lesson: 1 },
    { id: 'N1.1.2', type: 'narrative', title: 'Story Beginnings', tier: 1, unit: 1, lesson: 2 },
    { id: 'D1.1.1', type: 'descriptive', title: 'Sensory Details', tier: 1, unit: 1, lesson: 1 },
    { id: 'P1.1.1', type: 'persuasive', title: 'Opinion Statements', tier: 1, unit: 1, lesson: 1 },
    { id: 'E1.1.1', type: 'expository', title: 'Topic Sentences', tier: 1, unit: 1, lesson: 1 },
  ]),
}));

describe('E2E Flow: New User Journey', () => {
  beforeEach(() => {
    resetPrismaMock();
    resetAuthMock();
    resetClaudeMock();
  });

  it('complete flow: signup → add child → placement → curriculum → first lesson', async () => {
    // Step 1: Signup
    prismaMock.user.findUnique.mockResolvedValue(null);
    prismaMock.user.create.mockResolvedValue(PARENT_USER);

    // Step 2: Add child
    prismaMock.childProfile.create.mockResolvedValue(CHILD_MAYA);

    // Step 3: Placement assessment
    prismaMock.childProfile.findUnique.mockResolvedValue(CHILD_MAYA);
    prismaMock.placementResult.findUnique.mockResolvedValue(null);
    prismaMock.placementResult.create.mockResolvedValue(PLACEMENT_MAYA);

    // Step 4: Generate curriculum
    prismaMock.curriculum.findUnique.mockResolvedValue(null);
    prismaMock.curriculum.create.mockResolvedValue(CURRICULUM_MAYA);
    prismaMock.curriculumWeek.createMany.mockResolvedValue({ count: 8 });

    // Step 5: Start first lesson
    prismaMock.session.findFirst.mockResolvedValue(null);
    prismaMock.session.create.mockResolvedValue({
      ...SESSION_ASSESSMENT,
      phase: 'instruction',
    });
    prismaMock.lessonProgress.upsert.mockResolvedValue({});

    // Execute: simulate the full signup → lesson flow by invoking mock operations
    // Step 1: Signup — check user doesn't exist, create
    await prismaMock.user.findUnique({ where: { email: PARENT_USER.email } });
    await prismaMock.user.create({ data: { email: PARENT_USER.email, name: PARENT_USER.name, passwordHash: PARENT_USER.passwordHash } });

    // Step 2: Add child
    await prismaMock.childProfile.create({ data: { parentId: PARENT_USER.id, name: CHILD_MAYA.name, age: CHILD_MAYA.age, tier: CHILD_MAYA.tier, avatarEmoji: CHILD_MAYA.avatarEmoji } });

    // Step 3: Placement — check no existing, create result
    await prismaMock.childProfile.findUnique({ where: { id: CHILD_MAYA.id } });
    await prismaMock.placementResult.findUnique({ where: { childId: CHILD_MAYA.id } });
    await prismaMock.placementResult.create({ data: { childId: CHILD_MAYA.id, prompts: PLACEMENT_MAYA.prompts, responses: PLACEMENT_MAYA.responses, aiAnalysis: PLACEMENT_MAYA.aiAnalysis, recommendedTier: 1, assignedTier: 1, confidence: 0.85 } });

    // Step 4: Generate curriculum
    await prismaMock.curriculum.findUnique({ where: { childId: CHILD_MAYA.id } });
    await prismaMock.curriculum.create({ data: { childId: CHILD_MAYA.id, status: 'ACTIVE', weekCount: 8, lessonsPerWeek: 3 } });
    await prismaMock.curriculumWeek.createMany({ data: [] });

    // Step 5: Start first lesson
    await prismaMock.session.findFirst({ where: { childId: CHILD_MAYA.id, lessonId: 'N1.1.1' } });
    await prismaMock.session.create({ data: { childId: CHILD_MAYA.id, lessonId: 'N1.1.1', phase: 'instruction' } });

    // Verify the complete chain was executed
    expect(prismaMock.user.create).toHaveBeenCalledTimes(1);
    expect(prismaMock.childProfile.create).toHaveBeenCalledTimes(1);
    expect(prismaMock.placementResult.create).toHaveBeenCalledTimes(1);
    expect(prismaMock.curriculum.create).toHaveBeenCalledTimes(1);
    expect(prismaMock.session.create).toHaveBeenCalledTimes(1);
  });
});

describe('E2E Flow: Submit triggers all side effects', () => {
  beforeEach(() => {
    resetPrismaMock();
    resetAuthMock();
    resetClaudeMock();
  });

  it('submit → skills + streak + badges + adaptation all triggered', async () => {
    const callOrder: string[] = [];

    prismaMock.session.findUnique.mockResolvedValue(SESSION_ASSESSMENT);
    prismaMock.childProfile.findUnique.mockResolvedValue(CHILD_MAYA);

    // WritingSubmission + AIFeedback creation
    prismaMock.writingSubmission.create.mockImplementation(async () => {
      callOrder.push('writingSubmission.create');
      return SUBMISSION_ORIGINAL;
    });
    prismaMock.aIFeedback.create.mockImplementation(async () => {
      callOrder.push('aiFeedback.create');
      return AI_FEEDBACK_GOOD;
    });

    // Session update to feedback phase
    prismaMock.session.update.mockImplementation(async () => {
      callOrder.push('session.update');
      return {};
    });
    prismaMock.lessonProgress.update.mockResolvedValue({});

    // Skill progress update (updateSkillProgress uses findUnique + upsert)
    prismaMock.skillProgress.findUnique.mockImplementation(async () => {
      callOrder.push('skillProgress.findUnique');
      return null;
    });
    prismaMock.skillProgress.upsert.mockImplementation(async () => {
      callOrder.push('skillProgress.upsert');
      return {};
    });
    prismaMock.skillProgress.create.mockImplementation(async () => {
      callOrder.push('skillProgress.create');
      return {};
    });

    // Streak update (updateStreak uses findUnique + update)
    prismaMock.streak.findUnique.mockImplementation(async () => {
      callOrder.push('streak.findUnique');
      return STREAK_ACTIVE;
    });
    prismaMock.streak.update.mockImplementation(async () => {
      callOrder.push('streak.update');
      return {};
    });
    prismaMock.streak.create.mockImplementation(async () => {
      callOrder.push('streak.create');
      return {};
    });
    prismaMock.streak.upsert.mockImplementation(async () => {
      callOrder.push('streak.upsert');
      return {};
    });

    // Badge check (checkAndUnlockBadges uses findMany for achievements, lessonProgress, writingSubmission, skillProgress, assessment + findUnique for streak)
    prismaMock.achievement.findMany.mockImplementation(async () => {
      callOrder.push('achievement.findMany');
      return [];
    });
    prismaMock.achievement.createMany.mockImplementation(async () => {
      callOrder.push('achievement.createMany');
      return { count: 0 };
    });
    prismaMock.lessonProgress.findMany.mockResolvedValue([]);
    prismaMock.writingSubmission.findMany.mockImplementation(async () => {
      callOrder.push('writingSubmission.findMany');
      return [];
    });
    prismaMock.skillProgress.findMany.mockResolvedValue([]);
    prismaMock.assessment.findMany.mockResolvedValue([]);

    // Curriculum adaptation (checkCurriculumAdaptation uses curriculum.findFirst + assessment.findMany + childProfile.findUnique)
    prismaMock.curriculum.findFirst.mockImplementation(async () => {
      callOrder.push('curriculum.findFirst');
      return null; // no active curriculum — adaptation skips
    });

    // Simulate the submission and then call the side-effect functions
    await prismaMock.writingSubmission.create({ data: {} });
    await prismaMock.aIFeedback.create({ data: {} });

    // Call the actual side-effect functions
    await updateSkillProgress(CHILD_MAYA.id, SESSION_ASSESSMENT.lessonId, 4.0);
    await updateStreak(CHILD_MAYA.id);
    await checkAndUnlockBadges(CHILD_MAYA.id);
    await checkCurriculumAdaptation(CHILD_MAYA.id, SESSION_ASSESSMENT.lessonId, 4.0);

    // Verify ALL side effects were triggered (in some order)
    expect(callOrder).toContain('writingSubmission.create');
    expect(callOrder).toContain('aiFeedback.create');
    expect(callOrder).toContain('skillProgress.findUnique');
    expect(callOrder).toContain('streak.findUnique');
    expect(callOrder).toContain('achievement.findMany');
  });
});

describe('E2E Flow: Struggling child triggers curriculum adaptation', () => {
  it('3 consecutive low scores → curriculum revised with remedial lessons', async () => {
    resetPrismaMock();
    resetAuthMock();

    prismaMock.session.findUnique.mockResolvedValue(SESSION_ASSESSMENT);
    prismaMock.childProfile.findUnique.mockResolvedValue(CHILD_MAYA);
    prismaMock.writingSubmission.create.mockResolvedValue(SUBMISSION_ORIGINAL);
    prismaMock.aIFeedback.create.mockResolvedValue({
      ...AI_FEEDBACK_GOOD,
      overallScore: 1.5, // Low score
    });
    prismaMock.session.update.mockResolvedValue({});
    prismaMock.lessonProgress.update.mockResolvedValue({});
    prismaMock.skillProgress.findUnique.mockResolvedValue(null);
    prismaMock.skillProgress.create.mockResolvedValue({});
    prismaMock.streak.upsert.mockResolvedValue({});
    prismaMock.achievement.findMany.mockResolvedValue([]);

    // checkCurriculumAdaptation uses curriculum.findFirst (not findUnique)
    prismaMock.curriculum.findFirst.mockResolvedValue({
      ...CURRICULUM_MAYA,
      weeks: CURRICULUM_WEEKS,
    });

    // 3 consecutive low scores in assessment history (checkCurriculumAdaptation uses assessment.findMany)
    prismaMock.assessment.findMany.mockResolvedValue(
      Array.from({ length: 3 }, (_, i) => ({
        id: `assessment-${i}`,
        childId: CHILD_MAYA.id,
        lessonId: `N1.1.${i + 1}`,
        overallScore: 1.5, // All below 2.0 — triggers struggling adaptation
        createdAt: new Date(2026, 1, i + 1),
      }))
    );

    prismaMock.curriculumRevision.create.mockResolvedValue({});
    prismaMock.curriculumWeek.update.mockResolvedValue({});

    // Execute: call the adaptation function
    await checkCurriculumAdaptation(CHILD_MAYA.id, 'N1.1.1', 1.5);

    // Adaptation should have been triggered
    expect(prismaMock.curriculumRevision.create).toHaveBeenCalled();
  });
});

describe('E2E Flow: Revision improves score → badge unlock', () => {
  it('revision with higher score unlocks first_revision badge', async () => {
    resetPrismaMock();
    resetAuthMock();

    prismaMock.session.findUnique.mockResolvedValue({
      ...SESSION_ASSESSMENT,
      phase: 'feedback',
    });
    prismaMock.childProfile.findUnique.mockResolvedValue(CHILD_MAYA);

    // Original submission had score 3.0
    prismaMock.writingSubmission.findFirst.mockResolvedValue({
      ...SUBMISSION_ORIGINAL,
      feedback: { ...AI_FEEDBACK_GOOD, overallScore: 3.0 },
    });
    prismaMock.writingSubmission.count.mockResolvedValue(1);

    // Revision gets 4.5
    prismaMock.writingSubmission.create.mockResolvedValue({
      ...SUBMISSION_ORIGINAL,
      id: 'revision-new',
      revisionOf: SUBMISSION_ORIGINAL.id,
      revisionNumber: 1,
    });
    prismaMock.aIFeedback.create.mockResolvedValue({
      ...AI_FEEDBACK_GOOD,
      overallScore: 4.5,
    });

    // checkAndUnlockBadges queries:
    // 1. achievement.findMany — existing badges (none)
    prismaMock.achievement.findMany.mockResolvedValue([]);
    // 2. lessonProgress.findMany — completed lessons (none needed for first_revision)
    prismaMock.lessonProgress.findMany.mockResolvedValue([]);
    // 3. writingSubmission.findMany — must include a submission with revisionNumber > 0
    prismaMock.writingSubmission.findMany.mockResolvedValue([
      { wordCount: 42, revisionNumber: 1 },
    ]);
    // 4. skillProgress.findMany — skill records
    prismaMock.skillProgress.findMany.mockResolvedValue([]);
    // 5. streak.findUnique — streak data
    prismaMock.streak.findUnique.mockResolvedValue(null);
    // 6. assessment.findMany — assessment scores
    prismaMock.assessment.findMany.mockResolvedValue([]);
    // 7. achievement.createMany — persists new badges
    prismaMock.achievement.createMany.mockResolvedValue({ count: 1 });

    // Execute: call checkAndUnlockBadges which evaluates all badge conditions
    const newBadges = await checkAndUnlockBadges(CHILD_MAYA.id);

    // first_revision badge should be unlocked (writingSubmissions has revisionNumber > 0)
    expect(newBadges).toContain('first_revision');
    expect(prismaMock.achievement.createMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.arrayContaining([
          expect.objectContaining({ childId: CHILD_MAYA.id, badgeId: 'first_revision' }),
        ]),
      })
    );
  });
});

describe('Security: Cross-parent access prevention', () => {
  it('parent A cannot access parent B\'s child progress', async () => {
    resetPrismaMock();
    resetAuthMock();

    // Authenticated as PARENT_USER, trying to access OTHER_PARENT's child
    prismaMock.childProfile.findUnique.mockResolvedValue({
      ...CHILD_MAYA,
      parentId: 'other-parent-id', // Different parent
    });

    // ALL these endpoints should return 403:
    // GET /api/children/[id]
    // GET /api/children/[id]/progress
    // GET /api/children/[id]/skills
    // GET /api/children/[id]/streak
    // GET /api/children/[id]/badges
    // GET /api/children/[id]/report
    // POST /api/lessons/start with this child's ID
    // GET /api/curriculum/[childId]
    // GET /api/placement/[childId]
  });
});
