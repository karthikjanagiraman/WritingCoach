/**
 * Edge case tests for POST /api/lessons/start.
 *
 * Covers: forceNew, completed-session resume, missing fields, unknown lesson,
 * initial prompt args, db errors.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { prismaMock, resetPrismaMock } from '../../setup/db-mock';
import { mockAuth, resetAuthMock } from '../../setup/auth-mock';
import { claudeMock, resetClaudeMock } from '../../setup/claude-mock';
import {
  CHILD_MAYA,
  SESSION_GUIDED, SESSION_FEEDBACK, SESSION_INSTRUCTION,
  PROGRESS_IN_PROGRESS, SUBMISSION_ORIGINAL,
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
  getRubricById: vi.fn(() => null),
}));

import { POST as startPOST } from '@/app/api/lessons/start/route';
import { getLessonById } from '@/lib/curriculum';

function sessionWithChild(session: any) {
  return { ...session, child: CHILD_MAYA };
}

describe('POST /api/lessons/start — edge cases', () => {
  beforeEach(() => {
    resetPrismaMock();
    resetAuthMock();
    resetClaudeMock();
    // Restore default getLessonById mock
    (getLessonById as any).mockReturnValue({
      id: 'N1.1.1',
      title: 'Story Hooks',
      unit: 'Getting Started',
      type: 'narrative',
      tier: 1,
      rubricId: 'N1_story_beginning',
      learningObjectives: ['Learn what a hook is', 'Write an engaging first sentence'],
    });
  });

  it('forceNew=true creates new session even when existing session exists', async () => {
    prismaMock.childProfile.findFirst.mockResolvedValue(CHILD_MAYA);
    // session.findFirst should NOT be called when forceNew=true
    prismaMock.session.create.mockResolvedValue(SESSION_INSTRUCTION);
    prismaMock.lessonProgress.upsert.mockResolvedValue(PROGRESS_IN_PROGRESS);
    claudeMock.getInitialPrompt.mockResolvedValue('Welcome!');

    const res = await startPOST(new Request('http://localhost/api/lessons/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ childId: CHILD_MAYA.id, lessonId: 'N1.1.1', forceNew: true }),
    }) as any);
    const data = await res.json();

    expect(prismaMock.session.findFirst).not.toHaveBeenCalled();
    expect(prismaMock.session.create).toHaveBeenCalled();
    expect(data.resumed).toBe(false);
    expect(data.phase).toBe('instruction');
  });

  it('returns completed lesson with assessment data when session in feedback phase', async () => {
    const feedbackSession = { ...SESSION_FEEDBACK, conversationHistory: JSON.stringify([
      { id: 'c1', role: 'coach', content: 'Welcome!', timestamp: '2026-02-01T09:00:00Z' },
    ]) };
    prismaMock.childProfile.findFirst.mockResolvedValue(CHILD_MAYA);
    prismaMock.session.findFirst.mockResolvedValue(feedbackSession);
    prismaMock.assessment.findFirst.mockResolvedValue({
      id: 'assessment-001',
      sessionId: SESSION_FEEDBACK.id,
      scores: JSON.stringify({ hook: 4, creativity: 5 }),
      overallScore: 4.5,
      feedback: JSON.stringify({
        strength: 'Great hook!',
        growth: 'Add detail.',
        encouragement: 'Keep going!',
      }),
      createdAt: new Date(),
    });
    prismaMock.writingSubmission.findFirst.mockResolvedValue(SUBMISSION_ORIGINAL);

    const res = await startPOST(new Request('http://localhost/api/lessons/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ childId: CHILD_MAYA.id, lessonId: 'N1.1.1' }),
    }) as any);
    const data = await res.json();

    expect(data.completed).toBe(true);
    expect(data.assessment).toBeDefined();
    expect(data.assessment.scores).toBeDefined();
    expect(data.assessment.scores.hook).toBe(4);
    expect(data.submittedText).toBe(SUBMISSION_ORIGINAL.submissionText);
  });

  it('returns 400 when childId missing', async () => {
    const res = await startPOST(new Request('http://localhost/api/lessons/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lessonId: 'N1.1.1' }),
    }) as any);
    expect(res.status).toBe(400);
  });

  it('returns 400 when lessonId missing', async () => {
    const res = await startPOST(new Request('http://localhost/api/lessons/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ childId: CHILD_MAYA.id }),
    }) as any);
    expect(res.status).toBe(400);
  });

  it('returns 404 when lesson not in catalog', async () => {
    prismaMock.childProfile.findFirst.mockResolvedValue(CHILD_MAYA);
    (getLessonById as any).mockReturnValue(null);

    const res = await startPOST(new Request('http://localhost/api/lessons/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ childId: CHILD_MAYA.id, lessonId: 'UNKNOWN.99.99' }),
    }) as any);
    expect(res.status).toBe(404);
  });

  it('calls getInitialPrompt with child name and tier', async () => {
    prismaMock.childProfile.findFirst.mockResolvedValue(CHILD_MAYA);
    prismaMock.session.findFirst.mockResolvedValue(null);
    prismaMock.session.create.mockResolvedValue(SESSION_INSTRUCTION);
    prismaMock.lessonProgress.upsert.mockResolvedValue(PROGRESS_IN_PROGRESS);
    claudeMock.getInitialPrompt.mockResolvedValue('Welcome Maya!');

    await startPOST(new Request('http://localhost/api/lessons/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ childId: CHILD_MAYA.id, lessonId: 'N1.1.1' }),
    }) as any);

    expect(claudeMock.getInitialPrompt).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'N1.1.1' }),
      CHILD_MAYA.name,
      CHILD_MAYA.tier,
    );
  });

  it('handles database error gracefully with 500', async () => {
    prismaMock.childProfile.findFirst.mockResolvedValue(CHILD_MAYA);
    prismaMock.session.findFirst.mockResolvedValue(null);
    prismaMock.session.create.mockRejectedValue(new Error('DB connection lost'));
    claudeMock.getInitialPrompt.mockResolvedValue('Welcome!');

    const res = await startPOST(new Request('http://localhost/api/lessons/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ childId: CHILD_MAYA.id, lessonId: 'N1.1.1' }),
    }) as any);
    expect(res.status).toBe(500);
  });

  it('forceNew creates fresh session after completed session', async () => {
    prismaMock.childProfile.findFirst.mockResolvedValue(CHILD_MAYA);
    prismaMock.session.create.mockResolvedValue(SESSION_INSTRUCTION);
    prismaMock.lessonProgress.upsert.mockResolvedValue(PROGRESS_IN_PROGRESS);
    claudeMock.getInitialPrompt.mockResolvedValue('Welcome to a fresh start!');

    const res = await startPOST(new Request('http://localhost/api/lessons/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ childId: CHILD_MAYA.id, lessonId: 'N1.1.1', forceNew: true }),
    }) as any);
    const data = await res.json();

    expect(data.resumed).toBe(false);
    expect(data.phase).toBe('instruction');
    expect(prismaMock.session.create).toHaveBeenCalled();
    // findFirst should not have been called since forceNew skips session lookup
    expect(prismaMock.session.findFirst).not.toHaveBeenCalled();
  });
});
