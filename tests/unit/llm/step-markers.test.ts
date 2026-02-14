/**
 * Tests for [STEP: N] marker behavior.
 *
 * Verifies:
 * - stripPhaseMarkers() does NOT strip [STEP: N]
 * - Backend markers ARE stripped but [STEP: N] survives
 * - buildPrompt() includes phase1Step in session context
 */
import { describe, it, expect } from 'vitest';

import { stripPhaseMarkers } from '@/lib/llm/client';
import { buildPrompt } from '@/lib/llm/prompt-builder';

describe('[STEP: N] marker behavior', () => {
  it('stripPhaseMarkers does NOT strip [STEP: N]', () => {
    const input = '[STEP: 1] Welcome to our lesson on hooks!';
    const result = stripPhaseMarkers(input);
    expect(result).toContain('[STEP: 1]');
    expect(result).toContain('Welcome to our lesson on hooks!');
  });

  it('stripPhaseMarkers preserves [STEP: N] while stripping other markers', () => {
    const input = '[STEP: 5] You got it! Let\'s move on.\n\n[COMPREHENSION_CHECK: passed]\n[PHASE_TRANSITION: guided]';
    const result = stripPhaseMarkers(input);
    expect(result).toContain('[STEP: 5]');
    expect(result).not.toContain('[COMPREHENSION_CHECK');
    expect(result).not.toContain('[PHASE_TRANSITION');
  });

  it('stripPhaseMarkers handles [STEP: N] with various spacing', () => {
    expect(stripPhaseMarkers('[STEP: 3] Some content')).toContain('[STEP: 3]');
    expect(stripPhaseMarkers('[STEP:2] Some content')).toContain('[STEP:2]');
    expect(stripPhaseMarkers('[step: 4] Some content')).toContain('[step: 4]');
  });

  it('stripPhaseMarkers strips [HINT_GIVEN] but not [STEP: N]', () => {
    const input = '[STEP: 2] Think about what makes a sentence exciting. [HINT_GIVEN]';
    const result = stripPhaseMarkers(input);
    expect(result).toContain('[STEP: 2]');
    expect(result).not.toContain('[HINT_GIVEN]');
  });
});

describe('buildPrompt includes phase1Step', () => {
  it('includes phase1Step in session context when phaseState provided', () => {
    const prompt = buildPrompt({
      phase: 'instruction',
      tier: 1,
      lessonTitle: 'Test Lesson',
      learningObjectives: ['Test objective'],
      phaseState: {
        instructionCompleted: false,
        comprehensionPassed: false,
        phase1Step: 3,
      },
    });
    expect(prompt).toContain('Phase 1 current step: 3');
  });

  it('defaults phase1Step to 1 when not provided in phaseState', () => {
    const prompt = buildPrompt({
      phase: 'instruction',
      tier: 1,
      lessonTitle: 'Test Lesson',
      learningObjectives: ['Test objective'],
      phaseState: {
        instructionCompleted: false,
        comprehensionPassed: false,
      },
    });
    expect(prompt).toContain('Phase 1 current step: 1');
  });

  it('does not include phase1Step when phaseState is undefined', () => {
    const prompt = buildPrompt({
      phase: 'instruction',
      tier: 1,
      lessonTitle: 'Test Lesson',
      learningObjectives: ['Test objective'],
    });
    expect(prompt).not.toContain('Phase 1 current step');
  });
});
