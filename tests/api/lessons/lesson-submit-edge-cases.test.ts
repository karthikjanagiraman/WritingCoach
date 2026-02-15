/**
 * Edge case tests for POST /api/lessons/submit.
 *
 * Covers: phase validation (guided allowed, instruction/feedback rejected),
 * empty/whitespace text, skill/streak/badge error resilience.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { prismaMock, resetPrismaMock } from '../../setup/db-mock';
import { mockAuth, resetAuthMock } from '../../setup/auth-mock';
import { claudeMock, resetClaudeMock } from '../../setup/claude-mock';
import {
  CHILD_MAYA,
  SESSION_INSTRUCTION, SESSION_GUIDED, SESSION_ASSESSMENT, SESSION_FEEDBACK,
  SUBMISSION_ORIGINAL,
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
    word_range: [30, 75],
    criteria: [
      { name: 'hook', display_name: 'Hook', weight: 0.25, levels: {}, feedback_stems: { strength: '', growth: '' } },
      { name: 'character', display_name: 'Character', weight: 0.25, levels: {}, feedback_stems: { strength: '', growth: '' } },
      { name: 'setting', display_name: 'Setting', weight: 0.25, levels: {}, feedback_stems: { strength: '', growth: '' } },
      { name: 'creativity', display_name: 'Creativity', weight: 0.25, levels: {}, feedback_stems: { strength: '', growth: '' } },
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
vi.mock('@/lib/submission-validator', async () => {
  const actual = await vi.importActual('@/lib/submission-validator');
  return actual;
});

import { POST as submitPOST } from '@/app/api/lessons/submit/route';
import { updateSkillProgress } from '@/lib/progress-tracker';
import { checkAndUnlockBadges } from '@/lib/badge-checker';

function sessionWithChild(session: any) {
  return { ...session, child: CHILD_MAYA };
}

function setupSubmitMocks() {
  prismaMock.assessment.create.mockResolvedValue({ id: 'assessment-001' });
  prismaMock.writingSubmission.create.mockResolvedValue(SUBMISSION_ORIGINAL);
  prismaMock.session.update.mockResolvedValue({});
  prismaMock.lessonProgress.updateMany.mockResolvedValue({});
}

describe('POST /api/lessons/submit — edge cases', () => {
  beforeEach(() => {
    resetPrismaMock();
    resetAuthMock();
    resetClaudeMock();
    // Re-set mocked side-effect modules after reset
    (updateSkillProgress as any).mockResolvedValue(undefined);
    (checkAndUnlockBadges as any).mockResolvedValue([]);
  });

  it('allows submit from guided phase', async () => {
    prismaMock.session.findUnique.mockResolvedValue(sessionWithChild(SESSION_GUIDED));
    setupSubmitMocks();

    const res = await submitPOST(new Request('http://localhost/api/lessons/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: SESSION_GUIDED.id, text: 'Once upon a time there was a little cat who loved to explore the big garden behind the house every sunny afternoon and play with butterflies.' }),
    }) as any);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.scores).toBeDefined();
  });

  it('rejects submit from instruction phase', async () => {
    prismaMock.session.findUnique.mockResolvedValue(sessionWithChild(SESSION_INSTRUCTION));

    const res = await submitPOST(new Request('http://localhost/api/lessons/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: SESSION_INSTRUCTION.id, text: 'My story...' }),
    }) as any);
    expect(res.status).toBe(400);
  });

  it('rejects submit from feedback phase', async () => {
    prismaMock.session.findUnique.mockResolvedValue(sessionWithChild(SESSION_FEEDBACK));

    const res = await submitPOST(new Request('http://localhost/api/lessons/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: SESSION_FEEDBACK.id, text: 'My story...' }),
    }) as any);
    expect(res.status).toBe(400);
  });

  it('returns 400 when text is empty', async () => {
    const res = await submitPOST(new Request('http://localhost/api/lessons/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: 'session-003', text: '' }),
    }) as any);
    expect(res.status).toBe(400);
  });

  it('returns 400 when text is whitespace only', async () => {
    const res = await submitPOST(new Request('http://localhost/api/lessons/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: 'session-003', text: '   ' }),
    }) as any);
    expect(res.status).toBe(400);
  });

  it('continues if skill/streak update fails', async () => {
    prismaMock.session.findUnique.mockResolvedValue(sessionWithChild(SESSION_ASSESSMENT));
    setupSubmitMocks();
    (updateSkillProgress as any).mockRejectedValue(new Error('Skill DB error'));

    const res = await submitPOST(new Request('http://localhost/api/lessons/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: SESSION_ASSESSMENT.id, text: 'Once upon a time there was a little cat who loved to explore the big garden behind the house every sunny afternoon and play with butterflies.' }),
    }) as any);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.scores).toBeDefined();
  });

  it('continues if badge check fails', async () => {
    prismaMock.session.findUnique.mockResolvedValue(sessionWithChild(SESSION_ASSESSMENT));
    setupSubmitMocks();
    (checkAndUnlockBadges as any).mockRejectedValue(new Error('Badge DB error'));

    const res = await submitPOST(new Request('http://localhost/api/lessons/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: SESSION_ASSESSMENT.id, text: 'Once upon a time there was a little cat who loved to explore the big garden behind the house every sunny afternoon and play with butterflies.' }),
    }) as any);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.scores).toBeDefined();
    // newBadges should be empty array (default when badge check fails)
    expect(data.newBadges).toEqual([]);
  });

  // ==========================================
  // Quality Gate
  // ==========================================
  it('returns 422 for too-short submissions', async () => {
    prismaMock.session.findUnique.mockResolvedValue(sessionWithChild(SESSION_ASSESSMENT));
    setupSubmitMocks();

    const res = await submitPOST(new Request('http://localhost/api/lessons/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: SESSION_ASSESSMENT.id, text: 'Too short.' }),
    }) as any);
    expect(res.status).toBe(422);
    const data = await res.json();
    expect(data.error).toBe('too_short');
    expect(data.message).toBeDefined();
    expect(data.wordCount).toBe(2);
  });

  it('returns 422 for gibberish submissions', async () => {
    prismaMock.session.findUnique.mockResolvedValue(sessionWithChild(SESSION_ASSESSMENT));
    setupSubmitMocks();

    // 15 "words" with no vowels — 0% vowel ratio
    const gibberish = 'bcd fgh jkl mnp qrs tvw xyz bcd fgh jkl mnp qrs tvw xyz bcd';
    const res = await submitPOST(new Request('http://localhost/api/lessons/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: SESSION_ASSESSMENT.id, text: gibberish }),
    }) as any);
    expect(res.status).toBe(422);
    const data = await res.json();
    expect(data.error).toBe('gibberish');
    expect(data.message).toBeDefined();
  });

  it('passes quality gate for real writing', async () => {
    prismaMock.session.findUnique.mockResolvedValue(sessionWithChild(SESSION_ASSESSMENT));
    setupSubmitMocks();

    const realWriting = 'Once upon a time there was a little cat who loved to explore the big garden behind the house every sunny afternoon.';
    const res = await submitPOST(new Request('http://localhost/api/lessons/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: SESSION_ASSESSMENT.id, text: realWriting }),
    }) as any);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.scores).toBeDefined();
  });
});
