/**
 * Edge case tests for POST /api/lessons/revise.
 *
 * Covers: phase validation, session not found, revision number increment.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { prismaMock, resetPrismaMock } from '../../setup/db-mock';
import { mockAuth, resetAuthMock } from '../../setup/auth-mock';
import { claudeMock, resetClaudeMock } from '../../setup/claude-mock';
import {
  CHILD_MAYA,
  SESSION_ASSESSMENT, SESSION_FEEDBACK,
  SUBMISSION_ORIGINAL, SUBMISSION_REVISION,
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

import { POST as revisePOST } from '@/app/api/lessons/revise/route';

function sessionWithChild(session: any) {
  return { ...session, child: CHILD_MAYA };
}

describe('POST /api/lessons/revise — edge cases', () => {
  beforeEach(() => {
    resetPrismaMock();
    resetAuthMock();
    resetClaudeMock();
  });

  it('rejects revision when session in assessment phase', async () => {
    prismaMock.session.findUnique.mockResolvedValue(sessionWithChild(SESSION_ASSESSMENT));

    const res = await revisePOST(new Request('http://localhost/api/lessons/revise', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: SESSION_ASSESSMENT.id, text: 'Revised text' }),
    }) as any);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain('feedback phase');
  });

  it('returns 404 when session does not exist', async () => {
    prismaMock.session.findUnique.mockResolvedValue(null);

    const res = await revisePOST(new Request('http://localhost/api/lessons/revise', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: 'nonexistent-session', text: 'Revised text' }),
    }) as any);
    expect(res.status).toBe(404);
  });

  it('correctly increments revisionNumber', async () => {
    prismaMock.session.findUnique.mockResolvedValue(sessionWithChild(SESSION_FEEDBACK));
    prismaMock.assessment.count.mockResolvedValue(1); // Original only, room for revision
    prismaMock.assessment.findFirst.mockResolvedValue({
      id: 'assessment-001',
      sessionId: SESSION_FEEDBACK.id,
      scores: JSON.stringify({ hook: 3, character: 3, setting: 3, creativity: 3 }),
      overallScore: 3.0,
      createdAt: new Date(),
    });
    prismaMock.assessment.create.mockResolvedValue({ id: 'assessment-002' });
    prismaMock.writingSubmission.findFirst.mockResolvedValue(SUBMISSION_ORIGINAL);
    // 1 existing revision already (revisionNumber > 0)
    prismaMock.writingSubmission.count.mockResolvedValue(1);
    prismaMock.writingSubmission.create.mockImplementation(async ({ data }: any) => {
      // existingRevisions=1, so new revisionNumber should be 2
      expect(data.revisionNumber).toBe(2);
      return { ...SUBMISSION_REVISION, ...data };
    });
    prismaMock.session.update.mockResolvedValue({});

    const res = await revisePOST(new Request('http://localhost/api/lessons/revise', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: SESSION_FEEDBACK.id, text: 'My second revision.' }),
    }) as any);

    expect(res.status).toBe(200);
    expect(prismaMock.writingSubmission.create).toHaveBeenCalled();
  });
});
