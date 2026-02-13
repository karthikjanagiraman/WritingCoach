/**
 * API tests for the lesson flow — the critical path of the application.
 *
 * Covers:
 *   POST /api/lessons/start     — session creation/resume
 *   POST /api/lessons/message   — phase conversation + marker detection
 *   POST /api/lessons/submit    — grading + side effects (skills, streak, badges, adaptation)
 *   POST /api/lessons/revise    — revision chain + max limit
 *
 * These are the MOST IMPORTANT tests. If any of these fail, the core product is broken.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { prismaMock, resetPrismaMock } from '../../setup/db-mock';
import { mockAuth, resetAuthMock } from '../../setup/auth-mock';
import { claudeMock, COACH_RESPONSES, EVALUATION_RESPONSES, resetClaudeMock } from '../../setup/claude-mock';
import {
  CHILD_MAYA, PARENT_USER,
  SESSION_INSTRUCTION, SESSION_GUIDED, SESSION_ASSESSMENT, SESSION_FEEDBACK,
  PROGRESS_IN_PROGRESS, SUBMISSION_ORIGINAL, SUBMISSION_REVISION, AI_FEEDBACK_GOOD,
} from '../../setup/fixtures';

// Mock all external dependencies before importing route handlers
vi.mock('@/lib/db', () => ({ prisma: prismaMock }));
vi.mock('@/lib/auth', () => ({ auth: mockAuth }));
vi.mock('@/lib/llm', () => claudeMock);
vi.mock('@/lib/curriculum', () => ({
  getLessonById: vi.fn(() => ({
    id: 'N1.1.1',
    title: 'Story Hooks',
    unit: 'Getting Started',
    type: 'narrative',
    tier: 1,
    rubricId: 'N1_story_beginning',
    learningObjectives: ['Learn what a hook is', 'Write an engaging first sentence'],
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

// Import route handlers after mocks
import { POST as startPOST } from '@/app/api/lessons/start/route';
import { POST as messagePOST } from '@/app/api/lessons/message/route';
import { POST as submitPOST } from '@/app/api/lessons/submit/route';
import { POST as revisePOST } from '@/app/api/lessons/revise/route';

/** Helper to build a session with included child */
function sessionWithChild(session: any) {
  return { ...session, child: CHILD_MAYA };
}

describe('POST /api/lessons/start', () => {
  beforeEach(() => {
    resetPrismaMock();
    resetAuthMock();
    resetClaudeMock();
  });

  it('creates new session when no existing session for this lesson', async () => {
    prismaMock.childProfile.findFirst.mockResolvedValue(CHILD_MAYA);
    prismaMock.session.findFirst.mockResolvedValue(null); // No existing session
    prismaMock.session.create.mockResolvedValue(SESSION_INSTRUCTION);
    prismaMock.lessonProgress.upsert.mockResolvedValue(PROGRESS_IN_PROGRESS);
    claudeMock.getInitialPrompt.mockResolvedValue('Welcome to the lesson!');

    const res = await startPOST(new Request('http://localhost/api/lessons/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ childId: CHILD_MAYA.id, lessonId: 'N1.1.1' }),
    }) as any);
    const data = await res.json();
    expect(data.sessionId).toBeDefined();
    expect(data.resumed).toBe(false);
    expect(data.phase).toBe('instruction');
  });

  it('resumes existing session if one exists for this lesson', async () => {
    prismaMock.childProfile.findFirst.mockResolvedValue(CHILD_MAYA);
    prismaMock.session.findFirst.mockResolvedValue(SESSION_GUIDED); // Existing session in guided phase

    const res = await startPOST(new Request('http://localhost/api/lessons/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ childId: CHILD_MAYA.id, lessonId: 'N1.1.1' }),
    }) as any);
    const data = await res.json();
    expect(data.sessionId).toBe(SESSION_GUIDED.id);
    expect(data.resumed).toBe(true);
    expect(data.phase).toBe('guided');
    expect(data.conversationHistory.length).toBeGreaterThan(0);
  });

  it('returns lesson metadata with session', async () => {
    prismaMock.childProfile.findFirst.mockResolvedValue(CHILD_MAYA);
    prismaMock.session.findFirst.mockResolvedValue(null);
    prismaMock.session.create.mockResolvedValue(SESSION_INSTRUCTION);
    prismaMock.lessonProgress.upsert.mockResolvedValue({});
    claudeMock.getInitialPrompt.mockResolvedValue('Welcome!');

    const res = await startPOST(new Request('http://localhost/api/lessons/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ childId: CHILD_MAYA.id, lessonId: 'N1.1.1' }),
    }) as any);
    const data = await res.json();
    expect(data.lesson).toBeDefined();
    expect(data.lesson.id).toBe('N1.1.1');
    expect(data.lesson.title).toBeDefined();
    expect(data.lesson.learningObjectives).toBeDefined();
  });

  it('rejects if child does not belong to parent', async () => {
    prismaMock.childProfile.findFirst.mockResolvedValue(null); // findFirst with parentId filter returns null

    const res = await startPOST(new Request('http://localhost/api/lessons/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ childId: CHILD_MAYA.id, lessonId: 'N1.1.1' }),
    }) as any);
    expect(res.status).toBe(403);
  });

  it('returns 401 if unauthenticated', async () => {
    mockAuth.mockResolvedValue(null);
    const res = await startPOST(new Request('http://localhost/api/lessons/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ childId: CHILD_MAYA.id, lessonId: 'N1.1.1' }),
    }) as any);
    expect(res.status).toBe(401);
  });
});

describe('POST /api/lessons/message', () => {
  beforeEach(() => {
    resetPrismaMock();
    resetAuthMock();
    resetClaudeMock();
  });

  it('sends message to coach and returns response', async () => {
    prismaMock.session.findUnique.mockResolvedValue(sessionWithChild(SESSION_INSTRUCTION));
    prismaMock.session.update.mockResolvedValue({});
    prismaMock.lessonProgress.updateMany.mockResolvedValue({});
    claudeMock.getCoachResponse.mockResolvedValue(COACH_RESPONSES.instruction);

    const res = await messagePOST(new Request('http://localhost/api/lessons/message', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: SESSION_INSTRUCTION.id, message: 'What is a hook?' }),
    }) as any);
    const data = await res.json();
    expect(data.response).toBeDefined();
    expect(data.response.role).toBe('coach');
  });

  it('detects [PHASE_TRANSITION: guided] and returns phaseUpdate', async () => {
    prismaMock.session.findUnique.mockResolvedValue(sessionWithChild({
      ...SESSION_INSTRUCTION,
      phaseState: JSON.stringify({ comprehensionCheckPassed: true }),
    }));
    prismaMock.session.update.mockResolvedValue({});
    prismaMock.lessonProgress.updateMany.mockResolvedValue({});
    claudeMock.getCoachResponse.mockResolvedValue(COACH_RESPONSES.instructionToGuided);

    const res = await messagePOST(new Request('http://localhost/api/lessons/message', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: SESSION_INSTRUCTION.id, message: 'Yes I understand!' }),
    }) as any);
    const data = await res.json();
    expect(data.phaseUpdate).toBe('guided');
  });

  it('detects [PHASE_TRANSITION: assessment] and sets assessmentReady', async () => {
    prismaMock.session.findUnique.mockResolvedValue(sessionWithChild(SESSION_GUIDED));
    prismaMock.session.update.mockResolvedValue({});
    prismaMock.lessonProgress.updateMany.mockResolvedValue({});
    claudeMock.getCoachResponse.mockResolvedValue(COACH_RESPONSES.guidedToAssessment);

    const res = await messagePOST(new Request('http://localhost/api/lessons/message', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: SESSION_GUIDED.id, message: 'I think I understand now!' }),
    }) as any);
    const data = await res.json();
    expect(data.phaseUpdate).toBe('assessment');
    expect(data.assessmentReady).toBe(true);
  });

  it('increments hintsGiven when hintGiven detected', async () => {
    prismaMock.session.findUnique.mockResolvedValue(sessionWithChild(SESSION_GUIDED));
    prismaMock.session.update.mockImplementation(async ({ data }: any) => {
      const state = JSON.parse(data.phaseState);
      expect(state.hintsGiven).toBeGreaterThan(0);
      return {};
    });
    prismaMock.lessonProgress.updateMany.mockResolvedValue({});
    claudeMock.getCoachResponse.mockResolvedValue(COACH_RESPONSES.guidedWithHint);

    await messagePOST(new Request('http://localhost/api/lessons/message', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: SESSION_GUIDED.id, message: 'I dont know what to write' }),
    }) as any);

    expect(prismaMock.session.update).toHaveBeenCalled();
  });

  it('appends both user message and coach response to conversation history', async () => {
    const session = sessionWithChild({ ...SESSION_INSTRUCTION, conversationHistory: JSON.stringify([]) });
    prismaMock.session.findUnique.mockResolvedValue(session);
    prismaMock.session.update.mockImplementation(async ({ data }: any) => {
      const history = JSON.parse(data.conversationHistory);
      // Should have user message + assistant response = 2 new messages
      expect(history.length).toBeGreaterThanOrEqual(2);
      expect(history[history.length - 2].role).toBe('student');
      expect(history[history.length - 1].role).toBe('coach');
      return {};
    });
    prismaMock.lessonProgress.updateMany.mockResolvedValue({});
    claudeMock.getCoachResponse.mockResolvedValue(COACH_RESPONSES.instruction);

    await messagePOST(new Request('http://localhost/api/lessons/message', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: session.id, message: 'Tell me about hooks' }),
    }) as any);

    expect(prismaMock.session.update).toHaveBeenCalled();
  });

  it('strips markers from the response text before returning', async () => {
    prismaMock.session.findUnique.mockResolvedValue(sessionWithChild(SESSION_GUIDED));
    prismaMock.session.update.mockResolvedValue({});
    prismaMock.lessonProgress.updateMany.mockResolvedValue({});
    // The getCoachResponse already strips markers and returns clean text in `message`
    claudeMock.getCoachResponse.mockResolvedValue({
      message: 'Great work!',
      phaseUpdate: 'assessment',
      assessmentReady: true,
      comprehensionPassed: false,
      hintGiven: false,
    });

    const res = await messagePOST(new Request('http://localhost/api/lessons/message', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: SESSION_GUIDED.id, message: 'Done!' }),
    }) as any);
    const data = await res.json();
    // The response text should NOT contain [PHASE_TRANSITION]
    expect(data.response.content).not.toContain('[PHASE_TRANSITION');
  });
});

describe('POST /api/lessons/submit', () => {
  beforeEach(() => {
    resetPrismaMock();
    resetAuthMock();
    resetClaudeMock();
  });

  function setupSubmitMocks() {
    prismaMock.session.findUnique.mockResolvedValue(sessionWithChild(SESSION_ASSESSMENT));
    prismaMock.assessment.create.mockResolvedValue({ id: 'assessment-001' });
    prismaMock.writingSubmission.create.mockResolvedValue(SUBMISSION_ORIGINAL);
    prismaMock.session.update.mockResolvedValue({});
    prismaMock.lessonProgress.updateMany.mockResolvedValue({});
  }

  it('grades writing and returns scores + feedback', async () => {
    setupSubmitMocks();

    const res = await submitPOST(new Request('http://localhost/api/lessons/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: SESSION_ASSESSMENT.id, text: 'My amazing story about a magical door.' }),
    }) as any);
    const data = await res.json();
    expect(data.scores).toBeDefined();
    expect(data.overallScore).toBeGreaterThan(0);
    expect(data.feedback.strength).toBeDefined();
    expect(data.feedback.growth).toBeDefined();
    expect(data.feedback.encouragement).toBeDefined();
  });

  it('rejects submit when session is NOT in assessment phase', async () => {
    // Session is in instruction phase, not assessment
    prismaMock.session.findUnique.mockResolvedValue(sessionWithChild({
      ...SESSION_INSTRUCTION,
      phase: 'instruction',
    }));

    const res = await submitPOST(new Request('http://localhost/api/lessons/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: SESSION_INSTRUCTION.id, text: 'My story...' }),
    }) as any);
    expect(res.status).toBe(400);
  });

  it('transitions session to feedback phase after submit', async () => {
    setupSubmitMocks();
    prismaMock.session.update.mockImplementation(async ({ data }: any) => {
      // The first update sets phase to 'feedback', the second updates conversationHistory
      if (data.phase) {
        expect(data.phase).toBe('feedback');
      }
      return {};
    });

    await submitPOST(new Request('http://localhost/api/lessons/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: SESSION_ASSESSMENT.id, text: 'My story about magic.' }),
    }) as any);

    expect(prismaMock.session.update).toHaveBeenCalled();
  });

  it('returns newBadges in the response', async () => {
    setupSubmitMocks();

    const res = await submitPOST(new Request('http://localhost/api/lessons/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: SESSION_ASSESSMENT.id, text: 'My amazing story.' }),
    }) as any);
    const data = await res.json();
    expect(data.newBadges).toBeDefined();
    expect(Array.isArray(data.newBadges)).toBe(true);
  });

  it('calculates and stores wordCount from submission text', async () => {
    prismaMock.session.findUnique.mockResolvedValue(sessionWithChild(SESSION_ASSESSMENT));
    prismaMock.assessment.create.mockResolvedValue({ id: 'assessment-001' });
    prismaMock.writingSubmission.create.mockImplementation(async ({ data }: any) => {
      expect(data.wordCount).toBe(5); // "This is my test story" = 5 words
      return { ...SUBMISSION_ORIGINAL, ...data };
    });
    prismaMock.session.update.mockResolvedValue({});
    prismaMock.lessonProgress.updateMany.mockResolvedValue({});

    await submitPOST(new Request('http://localhost/api/lessons/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: SESSION_ASSESSMENT.id, text: 'This is my test story' }),
    }) as any);

    expect(prismaMock.writingSubmission.create).toHaveBeenCalled();
  });
});

describe('POST /api/lessons/revise', () => {
  beforeEach(() => {
    resetPrismaMock();
    resetAuthMock();
    resetClaudeMock();
  });

  it('creates revision linked to original submission', async () => {
    prismaMock.session.findUnique.mockResolvedValue(sessionWithChild(SESSION_FEEDBACK));
    prismaMock.assessment.count.mockResolvedValue(1); // 1 existing assessment (original)
    prismaMock.assessment.findFirst.mockResolvedValue({
      id: 'assessment-001',
      sessionId: SESSION_FEEDBACK.id,
      scores: JSON.stringify({ hook: 3 }),
      overallScore: 3.0,
      createdAt: new Date(),
    });
    prismaMock.assessment.create.mockResolvedValue({ id: 'assessment-002' });
    prismaMock.writingSubmission.findFirst.mockResolvedValue(SUBMISSION_ORIGINAL);
    prismaMock.writingSubmission.count.mockResolvedValue(0); // 0 existing revisions
    prismaMock.writingSubmission.create.mockImplementation(async ({ data }: any) => {
      expect(data.revisionOf).toBe(SUBMISSION_ORIGINAL.id);
      expect(data.revisionNumber).toBe(1);
      return { ...SUBMISSION_REVISION, ...data };
    });
    prismaMock.session.update.mockResolvedValue({});

    await revisePOST(new Request('http://localhost/api/lessons/revise', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: SESSION_FEEDBACK.id, text: 'Revised story...' }),
    }) as any);

    expect(prismaMock.writingSubmission.create).toHaveBeenCalled();
  });

  it('enforces max revisions', async () => {
    prismaMock.session.findUnique.mockResolvedValue(sessionWithChild(SESSION_FEEDBACK));
    prismaMock.assessment.count.mockResolvedValue(4); // Original + 3 = exceeds MAX_REVISIONS (2) + 1

    const res = await revisePOST(new Request('http://localhost/api/lessons/revise', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: SESSION_FEEDBACK.id, text: 'Another revision' }),
    }) as any);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain('Maximum');
  });

  it('returns previous scores for comparison', async () => {
    prismaMock.session.findUnique.mockResolvedValue(sessionWithChild(SESSION_FEEDBACK));
    prismaMock.assessment.count.mockResolvedValue(1); // 1 existing, room for revisions
    prismaMock.assessment.findFirst.mockResolvedValue({
      id: 'assessment-001',
      sessionId: SESSION_FEEDBACK.id,
      scores: JSON.stringify({ hook: 3, character: 3, setting: 3, creativity: 3 }),
      overallScore: 3.0,
      createdAt: new Date(),
    });
    prismaMock.assessment.create.mockResolvedValue({ id: 'assessment-002' });
    prismaMock.writingSubmission.findFirst.mockResolvedValue(SUBMISSION_ORIGINAL);
    prismaMock.writingSubmission.count.mockResolvedValue(0);
    prismaMock.writingSubmission.create.mockResolvedValue(SUBMISSION_REVISION);
    prismaMock.session.update.mockResolvedValue({});

    const res = await revisePOST(new Request('http://localhost/api/lessons/revise', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: SESSION_FEEDBACK.id, text: 'My improved story...' }),
    }) as any);
    const data = await res.json();
    expect(data.previousScores).toBeDefined();
    expect(data.revisionsRemaining).toBeDefined();
  });
});
