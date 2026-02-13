/**
 * E2E Security Tests
 *
 * Verifies cross-parent access prevention and authentication enforcement
 * across multiple route handlers.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { prismaMock, resetPrismaMock } from '../setup/db-mock';
import { mockAuth, mockAuthAsUnauthenticated, resetAuthMock } from '../setup/auth-mock';
import {
  PARENT_USER, CHILD_MAYA, CHILD_OTHER,
  SESSION_INSTRUCTION, SESSION_ASSESSMENT,
} from '../setup/fixtures';

vi.mock('@/lib/db', () => ({ prisma: prismaMock }));
vi.mock('@/lib/auth', () => ({ auth: mockAuth }));
vi.mock('@/lib/llm', () => ({
  getCoachResponse: vi.fn().mockResolvedValue({
    message: 'Mock response',
    phaseUpdate: undefined,
    assessmentReady: false,
    comprehensionPassed: false,
    hintGiven: false,
  }),
  getInitialPrompt: vi.fn().mockResolvedValue('Welcome!'),
  evaluateWriting: vi.fn().mockResolvedValue({
    scores: { hook: 4, character: 3, setting: 4, creativity: 5 },
    overallScore: 4.0,
    feedback: { strength: 'Good', growth: 'Improve', encouragement: 'Keep going' },
  }),
  evaluateWritingGeneral: vi.fn().mockResolvedValue({
    scores: { hook: 4 },
    overallScore: 4.0,
    feedback: { strength: 'Good', growth: 'Improve', encouragement: 'Keep going' },
  }),
  stripPhaseMarkers: vi.fn((text: string) => text),
}));
vi.mock('@/lib/curriculum', () => ({
  getLessonById: vi.fn(() => ({
    id: 'N1.1.1',
    title: 'Story Hooks',
    unit: 'Getting Started',
    type: 'narrative',
    tier: 1,
    rubricId: 'N1_story_beginning',
    learningObjectives: ['Learn hooks'],
  })),
  getLessonsByTier: vi.fn(() => []),
  getAllLessons: vi.fn(() => []),
}));
vi.mock('@/lib/rubrics', () => ({
  getRubricById: vi.fn(() => ({
    id: 'N1_story_beginning',
    description: 'Story beginning rubric',
    criteria: [
      { name: 'hook', display_name: 'Hook', weight: 0.25 },
      { name: 'character', display_name: 'Character', weight: 0.25 },
      { name: 'setting', display_name: 'Setting', weight: 0.25 },
      { name: 'creativity', display_name: 'Creativity', weight: 0.25 },
    ],
  })),
}));
vi.mock('@/lib/progress-tracker', () => ({
  updateSkillProgress: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('@/lib/streak-tracker', () => ({
  updateStreak: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('@/lib/badge-checker', () => ({
  checkAndUnlockBadges: vi.fn().mockResolvedValue([]),
}));
vi.mock('@/lib/curriculum-adapter', () => ({
  checkCurriculumAdaptation: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('@/lib/skill-map', () => ({
  SKILL_DEFINITIONS: {},
}));

// Import route handlers after mocks
import { POST as startPOST } from '@/app/api/lessons/start/route';
import { POST as messagePOST } from '@/app/api/lessons/message/route';
import { POST as submitPOST } from '@/app/api/lessons/submit/route';
import { GET as progressGET } from '@/app/api/children/[id]/progress/route';
import { GET as skillsGET } from '@/app/api/children/[id]/skills/route';
import { GET as streakGET } from '@/app/api/children/[id]/streak/route';

function makePostRequest(url: string, body: any) {
  return new Request(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }) as any;
}

function makeParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

describe('E2E: Security — Cross-parent access prevention', () => {
  beforeEach(() => {
    resetPrismaMock();
    resetAuthMock(); // Authenticated as PARENT_USER
  });

  it('Parent A cannot start lesson for Parent B\'s child', async () => {
    // PARENT_USER tries to start a lesson with CHILD_OTHER (belongs to OTHER_PARENT)
    // The start route uses childProfile.findFirst with parentId filter → returns null → 403
    prismaMock.childProfile.findFirst.mockResolvedValue(null);

    const res = await startPOST(makePostRequest('http://localhost/api/lessons/start', {
      childId: CHILD_OTHER.id,
      lessonId: 'N1.1.1',
    }));
    expect(res.status).toBe(403);

    // Verify the ownership check was made
    expect(prismaMock.childProfile.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: CHILD_OTHER.id, parentId: PARENT_USER.id },
      }),
    );
  });

  it('Parent A cannot view Parent B\'s child progress', async () => {
    // PARENT_USER tries to access CHILD_OTHER's progress
    prismaMock.childProfile.findFirst.mockResolvedValue(null);

    const res = await progressGET(
      new Request('http://localhost/api/children/' + CHILD_OTHER.id + '/progress') as any,
      makeParams(CHILD_OTHER.id),
    );
    expect(res.status).toBe(403);
  });
});

describe('E2E: Security — Unauthenticated requests fail', () => {
  beforeEach(() => {
    resetPrismaMock();
    mockAuthAsUnauthenticated();
  });

  it('all protected endpoints return 401 when unauthenticated', async () => {
    // 1. Start lesson
    const startRes = await startPOST(makePostRequest('http://localhost/api/lessons/start', {
      childId: CHILD_MAYA.id,
      lessonId: 'N1.1.1',
    }));
    expect(startRes.status).toBe(401);

    // 2. Send message
    const messageRes = await messagePOST(makePostRequest('http://localhost/api/lessons/message', {
      sessionId: SESSION_INSTRUCTION.id,
      message: 'Hello',
    }));
    expect(messageRes.status).toBe(401);

    // 3. Submit assessment
    const submitRes = await submitPOST(makePostRequest('http://localhost/api/lessons/submit', {
      sessionId: SESSION_ASSESSMENT.id,
      text: 'My story...',
    }));
    expect(submitRes.status).toBe(401);

    // 4. Get progress
    const progressRes = await progressGET(
      new Request('http://localhost/api/children/' + CHILD_MAYA.id + '/progress') as any,
      makeParams(CHILD_MAYA.id),
    );
    expect(progressRes.status).toBe(401);

    // 5. Get skills
    const skillsRes = await skillsGET(
      new Request('http://localhost/api/children/' + CHILD_MAYA.id + '/skills') as any,
      makeParams(CHILD_MAYA.id),
    );
    expect(skillsRes.status).toBe(401);

    // 6. Get streak
    const streakRes = await streakGET(
      new Request('http://localhost/api/children/' + CHILD_MAYA.id + '/streak') as any,
      makeParams(CHILD_MAYA.id),
    );
    expect(streakRes.status).toBe(401);

    // Verify none of the DB calls were made (auth blocked them first)
    expect(prismaMock.childProfile.findFirst).not.toHaveBeenCalled();
    expect(prismaMock.session.findUnique).not.toHaveBeenCalled();
  });
});
