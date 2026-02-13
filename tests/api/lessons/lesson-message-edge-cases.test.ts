/**
 * Edge case tests for POST /api/lessons/message.
 *
 * Covers: missing/empty fields, session not found, comprehension gating,
 * guided attempts tracking, phase state updates on transitions, LLM failure.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { prismaMock, resetPrismaMock } from '../../setup/db-mock';
import { mockAuth, resetAuthMock } from '../../setup/auth-mock';
import { claudeMock, COACH_RESPONSES, resetClaudeMock } from '../../setup/claude-mock';
import {
  CHILD_MAYA,
  SESSION_INSTRUCTION, SESSION_GUIDED,
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

import { POST as messagePOST } from '@/app/api/lessons/message/route';

function sessionWithChild(session: any) {
  return { ...session, child: CHILD_MAYA };
}

describe('POST /api/lessons/message — edge cases', () => {
  beforeEach(() => {
    resetPrismaMock();
    resetAuthMock();
    resetClaudeMock();
  });

  it('returns 400 when sessionId missing', async () => {
    const res = await messagePOST(new Request('http://localhost/api/lessons/message', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'hello' }),
    }) as any);
    expect(res.status).toBe(400);
  });

  it('returns 400 when message is empty string', async () => {
    const res = await messagePOST(new Request('http://localhost/api/lessons/message', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: 'session-001', message: '' }),
    }) as any);
    expect(res.status).toBe(400);
  });

  it('returns 400 when message is whitespace only', async () => {
    const res = await messagePOST(new Request('http://localhost/api/lessons/message', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: 'session-001', message: '   ' }),
    }) as any);
    expect(res.status).toBe(400);
  });

  it('returns 404 when session does not exist', async () => {
    prismaMock.session.findUnique.mockResolvedValue(null);

    const res = await messagePOST(new Request('http://localhost/api/lessons/message', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: 'nonexistent', message: 'hello' }),
    }) as any);
    expect(res.status).toBe(404);
  });

  it('blocks guided transition when comprehensionCheckPassed=false', async () => {
    const session = sessionWithChild({
      ...SESSION_INSTRUCTION,
      phaseState: JSON.stringify({ comprehensionCheckPassed: false }),
    });
    prismaMock.session.findUnique.mockResolvedValue(session);
    prismaMock.session.update.mockResolvedValue({});
    prismaMock.lessonProgress.updateMany.mockResolvedValue({});
    // Coach tries to transition to guided
    claudeMock.getCoachResponse.mockResolvedValue({
      message: 'Ready to practice!',
      phaseUpdate: 'guided',
      assessmentReady: false,
      comprehensionPassed: false,
      hintGiven: false,
    });

    const res = await messagePOST(new Request('http://localhost/api/lessons/message', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: SESSION_INSTRUCTION.id, message: 'I think so' }),
    }) as any);
    const data = await res.json();

    // Transition should be blocked
    expect(data.phaseUpdate).toBeNull();
  });

  it('allows guided transition when comprehensionCheckPassed=true', async () => {
    const session = sessionWithChild({
      ...SESSION_INSTRUCTION,
      phaseState: JSON.stringify({ comprehensionCheckPassed: true }),
    });
    prismaMock.session.findUnique.mockResolvedValue(session);
    prismaMock.session.update.mockResolvedValue({});
    prismaMock.lessonProgress.updateMany.mockResolvedValue({});
    claudeMock.getCoachResponse.mockResolvedValue({
      message: 'Ready to practice together!',
      phaseUpdate: 'guided',
      assessmentReady: false,
      comprehensionPassed: false,
      hintGiven: false,
    });

    const res = await messagePOST(new Request('http://localhost/api/lessons/message', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: SESSION_INSTRUCTION.id, message: 'Yes I understand!' }),
    }) as any);
    const data = await res.json();

    expect(data.phaseUpdate).toBe('guided');
  });

  it('increments guidedAttempts on every guided-phase message', async () => {
    const session = sessionWithChild({
      ...SESSION_GUIDED,
      phaseState: JSON.stringify({
        instructionCompleted: true,
        comprehensionCheckPassed: true,
        guidedAttempts: 2,
        hintsGiven: 0,
        guidedComplete: false,
      }),
    });
    prismaMock.session.findUnique.mockResolvedValue(session);
    prismaMock.session.update.mockResolvedValue({});
    prismaMock.lessonProgress.updateMany.mockResolvedValue({});
    claudeMock.getCoachResponse.mockResolvedValue({
      message: 'Good try!',
      phaseUpdate: undefined,
      assessmentReady: false,
      comprehensionPassed: false,
      hintGiven: false,
    });

    await messagePOST(new Request('http://localhost/api/lessons/message', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: SESSION_GUIDED.id, message: 'Here is my attempt' }),
    }) as any);

    expect(prismaMock.session.update).toHaveBeenCalled();
    const updateCall = prismaMock.session.update.mock.calls[0][0];
    const updatedState = JSON.parse(updateCall.data.phaseState);
    expect(updatedState.guidedAttempts).toBe(3);
  });

  it('sets writingStartedAt when transitioning to assessment', async () => {
    const session = sessionWithChild({
      ...SESSION_GUIDED,
      phaseState: JSON.stringify({
        instructionCompleted: true,
        comprehensionCheckPassed: true,
        guidedAttempts: 3,
        hintsGiven: 1,
        guidedComplete: false,
      }),
    });
    prismaMock.session.findUnique.mockResolvedValue(session);
    prismaMock.session.update.mockResolvedValue({});
    prismaMock.lessonProgress.updateMany.mockResolvedValue({});
    claudeMock.getCoachResponse.mockResolvedValue(COACH_RESPONSES.guidedToAssessment);

    await messagePOST(new Request('http://localhost/api/lessons/message', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: SESSION_GUIDED.id, message: 'I am ready!' }),
    }) as any);

    expect(prismaMock.session.update).toHaveBeenCalled();
    const updateCall = prismaMock.session.update.mock.calls[0][0];
    const updatedState = JSON.parse(updateCall.data.phaseState);
    expect(updatedState.writingStartedAt).toBeDefined();
    expect(updatedState.guidedComplete).toBe(true);
  });

  it('sets instructionCompleted when transitioning to guided', async () => {
    const session = sessionWithChild({
      ...SESSION_INSTRUCTION,
      phaseState: JSON.stringify({ comprehensionCheckPassed: true }),
    });
    prismaMock.session.findUnique.mockResolvedValue(session);
    prismaMock.session.update.mockResolvedValue({});
    prismaMock.lessonProgress.updateMany.mockResolvedValue({});
    claudeMock.getCoachResponse.mockResolvedValue(COACH_RESPONSES.instructionToGuided);

    await messagePOST(new Request('http://localhost/api/lessons/message', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: SESSION_INSTRUCTION.id, message: 'I understand hooks!' }),
    }) as any);

    expect(prismaMock.session.update).toHaveBeenCalled();
    const updateCall = prismaMock.session.update.mock.calls[0][0];
    const updatedState = JSON.parse(updateCall.data.phaseState);
    expect(updatedState.instructionCompleted).toBe(true);
  });

  it('handles LLM failure gracefully with 500', async () => {
    const session = sessionWithChild(SESSION_INSTRUCTION);
    prismaMock.session.findUnique.mockResolvedValue(session);
    claudeMock.getCoachResponse.mockRejectedValue(new Error('Claude API unavailable'));

    const res = await messagePOST(new Request('http://localhost/api/lessons/message', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: SESSION_INSTRUCTION.id, message: 'Hello' }),
    }) as any);
    expect(res.status).toBe(500);
  });
});
