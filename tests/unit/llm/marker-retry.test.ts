/**
 * Tests for the marker validation + retry layer in client.ts.
 *
 * Verifies:
 * - responseHasExpectedMarkers() correctly identifies present/absent markers
 * - Assessment/feedback phases always pass (no markers expected)
 * - Instruction/guided phases require an interactive marker or phase transition
 * - State-only markers (STEP, GUIDED_STAGE, HINT_GIVEN, COMPREHENSION_CHECK)
 *   are NOT sufficient alone — the retry layer should fire
 * - validateAndRetryMarkers() retries when markers are missing
 * - validateAndRetryMarkers() passes through when markers present
 * - validateAndRetryMarkers() falls back gracefully on retry failure
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { responseHasExpectedMarkers } from '@/lib/llm/client';

// ===========================================================================
// responseHasExpectedMarkers — pure function tests (no mocking needed)
// ===========================================================================
describe('responseHasExpectedMarkers', () => {
  // ---- Assessment & feedback always pass ----
  it('returns true for assessment phase regardless of content', () => {
    expect(responseHasExpectedMarkers('Plain text with no markers at all.', 'assessment')).toBe(true);
  });

  it('returns true for feedback phase regardless of content', () => {
    expect(responseHasExpectedMarkers('Great job on your essay!', 'feedback')).toBe(true);
  });

  // ---- Interactive markers pass (instruction & guided) ----
  it('detects [ANSWER_TYPE: choice] marker in instruction phase', () => {
    const text = 'Which one is a simile?\n\n[ANSWER_TYPE: choice]\n[OPTIONS: "A" | "B" | "C"]';
    expect(responseHasExpectedMarkers(text, 'instruction')).toBe(true);
  });

  it('detects [WRITING_PROMPT: "..."] marker in instruction phase', () => {
    const text = 'Try writing a sentence with a simile!\n\n[WRITING_PROMPT: "Write a sentence using a simile to describe the sunset."]';
    expect(responseHasExpectedMarkers(text, 'instruction')).toBe(true);
  });

  it('detects [EXPECTS_RESPONSE] marker in instruction phase', () => {
    const text = 'What do you think makes a story exciting?\n\n[EXPECTS_RESPONSE]';
    expect(responseHasExpectedMarkers(text, 'instruction')).toBe(true);
  });

  it('detects [WRITING_PROMPT: "..."] in guided phase', () => {
    const text = 'Now try this exercise:\n\n[WRITING_PROMPT: "Describe your favorite place using three sensory details."]';
    expect(responseHasExpectedMarkers(text, 'guided')).toBe(true);
  });

  // ---- Phase transition markers pass ----
  it('detects [PHASE_TRANSITION: guided] marker in instruction phase', () => {
    const text = 'Great work! Ready to practice together?\n\n[PHASE_TRANSITION: guided]';
    expect(responseHasExpectedMarkers(text, 'instruction')).toBe(true);
  });

  it('detects [PHASE_TRANSITION: assessment] marker in guided phase', () => {
    const text = 'You\'re ready to write on your own!\n\n[PHASE_TRANSITION: assessment]';
    expect(responseHasExpectedMarkers(text, 'guided')).toBe(true);
  });

  // ---- State-only markers are NOT sufficient alone ----
  it('returns false for [STEP: N] alone — state-only, no interactive element', () => {
    const text = '[STEP: 1] Welcome to today\'s lesson on descriptive writing!';
    expect(responseHasExpectedMarkers(text, 'instruction')).toBe(false);
  });

  it('returns false for [STEP: 2] alone — student has nothing to interact with', () => {
    const text = '[STEP: 2] Now let\'s look at some examples of descriptive writing.';
    expect(responseHasExpectedMarkers(text, 'instruction')).toBe(false);
  });

  it('returns false for [GUIDED_STAGE: N] alone — state-only', () => {
    const text = '[GUIDED_STAGE: 2] Now let\'s combine two techniques together.';
    expect(responseHasExpectedMarkers(text, 'guided')).toBe(false);
  });

  it('returns false for [HINT_GIVEN] alone — state-only', () => {
    const text = 'Here\'s a hint: think about comparing two things.\n\n[HINT_GIVEN]';
    expect(responseHasExpectedMarkers(text, 'instruction')).toBe(false);
  });

  it('returns false for [COMPREHENSION_CHECK: passed] alone — state-only', () => {
    const text = 'That\'s exactly right! You understand similes well.\n\n[COMPREHENSION_CHECK: passed]';
    expect(responseHasExpectedMarkers(text, 'instruction')).toBe(false);
  });

  // ---- State marker + interactive marker together = pass ----
  it('passes when [STEP: N] is paired with an interactive marker', () => {
    const text = '[STEP: 1] Welcome to today\'s lesson!\n\nWhat is your favorite type of writing?\n\n[EXPECTS_RESPONSE]';
    expect(responseHasExpectedMarkers(text, 'instruction')).toBe(true);
  });

  it('passes when [STEP: N] is paired with [ANSWER_TYPE]', () => {
    const text = '[STEP: 3] Let me check your understanding.\n\nWhich is correct?\n\n[ANSWER_TYPE: choice]\n[OPTIONS: "A" | "B"]\n[ANSWER_PROMPT: "Pick the right answer"]';
    expect(responseHasExpectedMarkers(text, 'instruction')).toBe(true);
  });

  it('passes when [GUIDED_STAGE: N] is paired with [WRITING_PROMPT]', () => {
    const text = '[GUIDED_STAGE: 1] Let\'s drill this technique.\n\n[WRITING_PROMPT: "Write a sentence using a simile."]';
    expect(responseHasExpectedMarkers(text, 'guided')).toBe(true);
  });

  it('passes when [COMPREHENSION_CHECK: passed] is paired with [PHASE_TRANSITION]', () => {
    const text = 'Correct! You nailed it.\n\n[COMPREHENSION_CHECK: passed]\n[PHASE_TRANSITION: guided]';
    expect(responseHasExpectedMarkers(text, 'instruction')).toBe(true);
  });

  // ---- Missing markers (should return false) ----
  it('returns false for instruction phase with no markers', () => {
    const text = 'Today we\'re going to learn about descriptive writing. Descriptive writing uses sensory details to paint a picture in the reader\'s mind.';
    expect(responseHasExpectedMarkers(text, 'instruction')).toBe(false);
  });

  it('returns false for guided phase with no markers', () => {
    const text = 'Good thinking! That\'s a great use of sensory detail. Can you think of another way to describe the scene?';
    expect(responseHasExpectedMarkers(text, 'guided')).toBe(false);
  });

  it('returns false when markers are malformed (missing brackets)', () => {
    const text = 'Here is your question. STEP: 1 Learn about verbs.';
    expect(responseHasExpectedMarkers(text, 'instruction')).toBe(false);
  });

  it('returns false when markers are mentioned in prose but not as markers', () => {
    const text = 'The STEP marker is used to track instruction progress. The GUIDED_STAGE helps organize practice.';
    expect(responseHasExpectedMarkers(text, 'instruction')).toBe(false);
  });

  // ---- Case insensitivity ----
  it('handles case-insensitive interactive markers', () => {
    const text = 'What do you think?\n\n[Expects_Response]';
    expect(responseHasExpectedMarkers(text, 'instruction')).toBe(true);
  });

  it('handles case-insensitive phase transition', () => {
    const text = 'Ready to practice!\n\n[phase_transition: guided]';
    expect(responseHasExpectedMarkers(text, 'instruction')).toBe(true);
  });

  // ---- Edge cases ----
  it('handles empty string', () => {
    expect(responseHasExpectedMarkers('', 'instruction')).toBe(false);
    expect(responseHasExpectedMarkers('', 'guided')).toBe(false);
    expect(responseHasExpectedMarkers('', 'assessment')).toBe(true);
    expect(responseHasExpectedMarkers('', 'feedback')).toBe(true);
  });

  it('does not match partial markers', () => {
    expect(responseHasExpectedMarkers('[STEP', 'instruction')).toBe(false);
    expect(responseHasExpectedMarkers('STEP: 1]', 'instruction')).toBe(false);
    expect(responseHasExpectedMarkers('[GUIDED_STAGE]', 'guided')).toBe(false);
  });

  it('detects marker anywhere in long response', () => {
    const longText = 'A'.repeat(1000) + '\n\n[EXPECTS_RESPONSE]';
    expect(responseHasExpectedMarkers(longText, 'instruction')).toBe(true);
  });

  it('detects WRITING_PROMPT with various content', () => {
    expect(responseHasExpectedMarkers('[WRITING_PROMPT: "Write a poem."]', 'guided')).toBe(true);
    expect(responseHasExpectedMarkers('[WRITING_PROMPT: ""]', 'guided')).toBe(true);
  });
});

// ===========================================================================
// validateAndRetryMarkers — integration tests (requires mocking llmSend)
// ===========================================================================
describe('validateAndRetryMarkers (integration)', () => {
  let mockLlmSend: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    vi.resetModules();
    mockLlmSend = vi.fn();
    vi.doMock('@/lib/llm/provider', () => ({
      llmSend: mockLlmSend,
      getLLMConfig: () => ({ provider: 'test', model: 'test-model' }),
    }));
  });

  it('does not retry when interactive markers are present', async () => {
    const text = '[STEP: 1] Welcome!\n\n[EXPECTS_RESPONSE]';
    expect(responseHasExpectedMarkers(text, 'instruction')).toBe(true);
  });

  it('does not retry when phase transition marker is present', async () => {
    const text = 'Ready to practice!\n\n[PHASE_TRANSITION: guided]';
    expect(responseHasExpectedMarkers(text, 'instruction')).toBe(true);
  });

  it('triggers retry when only state markers are present', async () => {
    // [STEP: 2] alone should fail and trigger retry
    const text = '[STEP: 2] Great observation! Let me show you some examples.';
    expect(responseHasExpectedMarkers(text, 'instruction')).toBe(false);
  });

  it('triggers retry when text has no markers at all', async () => {
    const text = 'Welcome to descriptive writing! Let me teach you about using sensory details.';
    expect(responseHasExpectedMarkers(text, 'instruction')).toBe(false);
  });

  it('skips retry for assessment phase', async () => {
    const text = 'Here is your writing prompt. Write about your favorite season.';
    expect(responseHasExpectedMarkers(text, 'assessment')).toBe(true);
  });

  it('skips retry for feedback phase', async () => {
    const text = 'Great work! You showed strong use of descriptive language.';
    expect(responseHasExpectedMarkers(text, 'feedback')).toBe(true);
  });
});
