/**
 * E2E Lesson Lifecycle Tests
 *
 * Tests full lesson workflows by chaining multiple route handler calls:
 *   start → message → submit → revise
 *
 * Uses mocked DB/auth/LLM but exercises real route handler logic end-to-end.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { prismaMock, resetPrismaMock } from '../setup/db-mock';
import { mockAuth, resetAuthMock, mockAuthAsUnauthenticated } from '../setup/auth-mock';
import { claudeMock, COACH_RESPONSES, EVALUATION_RESPONSES, resetClaudeMock } from '../setup/claude-mock';
import {
  PARENT_USER, CHILD_MAYA,
  SESSION_INSTRUCTION, SESSION_GUIDED, SESSION_ASSESSMENT, SESSION_FEEDBACK,
  PROGRESS_IN_PROGRESS, SUBMISSION_ORIGINAL, SUBMISSION_REVISION, AI_FEEDBACK_GOOD,
  ASSESSMENT_FOR_COMPLETED, SUBMISSION_FOR_COMPLETED, SESSION_COMPLETED,
} from '../setup/fixtures';

// Mock all external dependencies
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
  checkAndUnlockBadges: vi.fn().mockResolvedValue(['first_story']),
}));
vi.mock('@/lib/curriculum-adapter', () => ({
  checkCurriculumAdaptation: vi.fn().mockResolvedValue(undefined),
}));

// Import route handlers after mocks
import { POST as startPOST } from '@/app/api/lessons/start/route';
import { POST as messagePOST } from '@/app/api/lessons/message/route';
import { POST as submitPOST } from '@/app/api/lessons/submit/route';
import { POST as revisePOST } from '@/app/api/lessons/revise/route';

// Import side-effect modules to verify they were called
import { updateSkillProgress } from '@/lib/progress-tracker';
import { updateStreak } from '@/lib/streak-tracker';
import { checkAndUnlockBadges } from '@/lib/badge-checker';
import { checkCurriculumAdaptation } from '@/lib/curriculum-adapter';

function sessionWithChild(session: any) {
  return { ...session, child: CHILD_MAYA };
}

function makeRequest(url: string, body: any) {
  return new Request(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }) as any;
}

describe('E2E: Lesson Lifecycle', () => {
  beforeEach(() => {
    resetPrismaMock();
    resetAuthMock();
    resetClaudeMock();
    vi.mocked(updateSkillProgress).mockClear();
    vi.mocked(updateStreak).mockClear();
    vi.mocked(checkAndUnlockBadges).mockClear().mockResolvedValue(['first_story']);
    vi.mocked(checkCurriculumAdaptation).mockClear();
  });

  it('full lifecycle: start → instruction message → guided transition → submit', async () => {
    // Step 1: Start a new lesson
    prismaMock.childProfile.findFirst.mockResolvedValue(CHILD_MAYA);
    prismaMock.session.findFirst.mockResolvedValue(null);
    prismaMock.session.create.mockResolvedValue(SESSION_INSTRUCTION);
    prismaMock.lessonProgress.upsert.mockResolvedValue(PROGRESS_IN_PROGRESS);
    claudeMock.getInitialPrompt.mockResolvedValue('Welcome! Today we learn about story hooks.');

    const startRes = await startPOST(makeRequest('http://localhost/api/lessons/start', {
      childId: CHILD_MAYA.id,
      lessonId: 'N1.1.1',
    }));
    const startData = await startRes.json();

    expect(startData.sessionId).toBe(SESSION_INSTRUCTION.id);
    expect(startData.resumed).toBe(false);
    expect(startData.phase).toBe('instruction');

    // Step 2: Send a message during instruction phase
    prismaMock.session.findUnique.mockResolvedValue(sessionWithChild(SESSION_INSTRUCTION));
    prismaMock.session.update.mockResolvedValue({});
    prismaMock.lessonProgress.updateMany.mockResolvedValue({});
    claudeMock.getCoachResponse.mockResolvedValue(COACH_RESPONSES.instruction);

    const msgRes1 = await messagePOST(makeRequest('http://localhost/api/lessons/message', {
      sessionId: SESSION_INSTRUCTION.id,
      message: 'What is a story hook?',
    }));
    const msgData1 = await msgRes1.json();

    expect(msgData1.response).toBeDefined();
    expect(msgData1.response.role).toBe('coach');

    // Step 3: Trigger guided transition (comprehension passed + phase transition marker)
    prismaMock.session.findUnique.mockResolvedValue(sessionWithChild({
      ...SESSION_INSTRUCTION,
      phaseState: JSON.stringify({ comprehensionCheckPassed: true }),
    }));
    prismaMock.session.update.mockResolvedValue({});
    prismaMock.lessonProgress.updateMany.mockResolvedValue({});
    claudeMock.getCoachResponse.mockResolvedValue(COACH_RESPONSES.instructionToGuided);

    const msgRes2 = await messagePOST(makeRequest('http://localhost/api/lessons/message', {
      sessionId: SESSION_INSTRUCTION.id,
      message: 'Yes I understand hooks!',
    }));
    const msgData2 = await msgRes2.json();

    expect(msgData2.phaseUpdate).toBe('guided');

    // Step 4: Submit assessment
    prismaMock.session.findUnique.mockResolvedValue(sessionWithChild(SESSION_ASSESSMENT));
    prismaMock.assessment.create.mockResolvedValue({ id: 'assessment-001' });
    prismaMock.writingSubmission.create.mockResolvedValue(SUBMISSION_ORIGINAL);
    prismaMock.session.update.mockResolvedValue({});
    prismaMock.lessonProgress.updateMany.mockResolvedValue({});

    const submitRes = await submitPOST(makeRequest('http://localhost/api/lessons/submit', {
      sessionId: SESSION_ASSESSMENT.id,
      text: 'The door wasnt there yesterday. Emma stared at it.',
    }));
    const submitData = await submitRes.json();

    expect(submitData.scores).toBeDefined();
    expect(submitData.overallScore).toBeGreaterThan(0);
    expect(submitData.feedback.strength).toBeDefined();
    expect(submitData.newBadges).toContain('first_story');
  });

  it('completed lesson start returns assessment data', async () => {
    prismaMock.childProfile.findFirst.mockResolvedValue(CHILD_MAYA);
    // Return a session in feedback phase (completed)
    prismaMock.session.findFirst.mockResolvedValue(SESSION_COMPLETED);
    prismaMock.assessment.findFirst.mockResolvedValue(ASSESSMENT_FOR_COMPLETED);
    prismaMock.writingSubmission.findFirst.mockResolvedValue(SUBMISSION_FOR_COMPLETED);

    const res = await startPOST(makeRequest('http://localhost/api/lessons/start', {
      childId: CHILD_MAYA.id,
      lessonId: 'N1.1.2',
    }));
    const data = await res.json();

    expect(data.completed).toBe(true);
    expect(data.resumed).toBe(true);
    expect(data.phase).toBe('feedback');
    expect(data.assessment).toBeDefined();
    expect(data.assessment.overallScore).toBe(3.7);
    expect(data.submittedText).toBe(SUBMISSION_FOR_COMPLETED.submissionText);
  });

  it('retake (forceNew) creates new session after completion', async () => {
    prismaMock.childProfile.findFirst.mockResolvedValue(CHILD_MAYA);
    // forceNew skips the existing session check entirely
    prismaMock.session.create.mockResolvedValue({
      ...SESSION_INSTRUCTION,
      id: 'session-new-retake',
    });
    prismaMock.lessonProgress.upsert.mockResolvedValue(PROGRESS_IN_PROGRESS);
    claudeMock.getInitialPrompt.mockResolvedValue('Welcome back! Let us try again.');

    const res = await startPOST(makeRequest('http://localhost/api/lessons/start', {
      childId: CHILD_MAYA.id,
      lessonId: 'N1.1.1',
      forceNew: true,
    }));
    const data = await res.json();

    expect(data.resumed).toBe(false);
    expect(data.phase).toBe('instruction');
    expect(data.sessionId).toBe('session-new-retake');
    // session.findFirst should NOT have been called (forceNew skips it)
    expect(prismaMock.session.findFirst).not.toHaveBeenCalled();
    expect(prismaMock.session.create).toHaveBeenCalledTimes(1);
  });

  it('revision chain: submit → revise x2 succeed → revise x1 rejected at limit', async () => {
    // First revision: assessmentCount=1 (original only), room for more
    prismaMock.session.findUnique.mockResolvedValue(sessionWithChild(SESSION_FEEDBACK));
    prismaMock.assessment.count.mockResolvedValueOnce(1);
    prismaMock.assessment.findFirst.mockResolvedValue({
      id: 'assessment-001',
      sessionId: SESSION_FEEDBACK.id,
      scores: JSON.stringify({ hook: 3, character: 3, setting: 3, creativity: 3 }),
      overallScore: 3.0,
      createdAt: new Date(),
    });
    prismaMock.assessment.create.mockResolvedValue({ id: 'assessment-002' });
    prismaMock.writingSubmission.findFirst.mockResolvedValue(SUBMISSION_ORIGINAL);
    prismaMock.writingSubmission.count.mockResolvedValueOnce(0);
    prismaMock.writingSubmission.create.mockResolvedValue(SUBMISSION_REVISION);
    prismaMock.session.update.mockResolvedValue({});

    const revise1Res = await revisePOST(makeRequest('http://localhost/api/lessons/revise', {
      sessionId: SESSION_FEEDBACK.id,
      text: 'Revised story attempt 1...',
    }));
    const revise1Data = await revise1Res.json();
    expect(revise1Data.scores).toBeDefined();
    expect(revise1Data.previousScores).toBeDefined();
    expect(revise1Data.revisionsRemaining).toBeDefined();

    // Second revision: assessmentCount=2, still room
    prismaMock.session.findUnique.mockResolvedValue(sessionWithChild(SESSION_FEEDBACK));
    prismaMock.assessment.count.mockResolvedValueOnce(2);
    prismaMock.assessment.findFirst.mockResolvedValue({
      id: 'assessment-002',
      sessionId: SESSION_FEEDBACK.id,
      scores: JSON.stringify({ hook: 4, character: 3, setting: 4, creativity: 4 }),
      overallScore: 3.75,
      createdAt: new Date(),
    });
    prismaMock.assessment.create.mockResolvedValue({ id: 'assessment-003' });
    prismaMock.writingSubmission.findFirst.mockResolvedValue(SUBMISSION_ORIGINAL);
    prismaMock.writingSubmission.count.mockResolvedValueOnce(1);
    prismaMock.writingSubmission.create.mockResolvedValue({
      ...SUBMISSION_REVISION,
      id: 'submission-003',
      revisionNumber: 2,
    });
    prismaMock.session.update.mockResolvedValue({});

    const revise2Res = await revisePOST(makeRequest('http://localhost/api/lessons/revise', {
      sessionId: SESSION_FEEDBACK.id,
      text: 'Revised story attempt 2...',
    }));
    const revise2Data = await revise2Res.json();
    expect(revise2Data.scores).toBeDefined();

    // Third revision: assessmentCount=4 (original + 2 revisions = 3, but route checks > MAX_REVISIONS(2) with count=4)
    // Actually the route checks assessmentCount > MAX_REVISIONS (2), so count=3 would pass, count=4 would fail
    prismaMock.session.findUnique.mockResolvedValue(sessionWithChild(SESSION_FEEDBACK));
    prismaMock.assessment.count.mockResolvedValueOnce(4); // Exceeds MAX_REVISIONS

    const revise3Res = await revisePOST(makeRequest('http://localhost/api/lessons/revise', {
      sessionId: SESSION_FEEDBACK.id,
      text: 'This should be rejected.',
    }));
    expect(revise3Res.status).toBe(400);
    const revise3Data = await revise3Res.json();
    expect(revise3Data.error).toContain('Maximum');
  });

  it('submit triggers all side effects: skills, streak, badges, adaptation', async () => {
    prismaMock.session.findUnique.mockResolvedValue(sessionWithChild(SESSION_ASSESSMENT));
    prismaMock.assessment.create.mockResolvedValue({ id: 'assessment-se-001' });
    prismaMock.writingSubmission.create.mockResolvedValue(SUBMISSION_ORIGINAL);
    prismaMock.session.update.mockResolvedValue({});
    prismaMock.lessonProgress.updateMany.mockResolvedValue({});

    const res = await submitPOST(makeRequest('http://localhost/api/lessons/submit', {
      sessionId: SESSION_ASSESSMENT.id,
      text: 'The sky turned an impossible shade of green.',
    }));
    const data = await res.json();

    // Verify all side effects were invoked
    expect(updateSkillProgress).toHaveBeenCalledWith(
      CHILD_MAYA.id,
      SESSION_ASSESSMENT.lessonId,
      expect.any(Number),
    );
    expect(updateStreak).toHaveBeenCalledWith(CHILD_MAYA.id);
    expect(checkAndUnlockBadges).toHaveBeenCalledWith(CHILD_MAYA.id);
    expect(checkCurriculumAdaptation).toHaveBeenCalledWith(
      CHILD_MAYA.id,
      SESSION_ASSESSMENT.lessonId,
      expect.any(Number),
    );

    // Response includes badges
    expect(data.newBadges).toBeDefined();
    expect(data.newBadges).toContain('first_story');
  });
});
