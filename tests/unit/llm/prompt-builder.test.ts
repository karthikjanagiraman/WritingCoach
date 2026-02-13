/**
 * Tests for src/lib/llm/prompt-builder.ts, rubrics.ts, client.ts
 *
 * Covers: prompt assembly order, rubric loading, phase marker detection/stripping
 */
import { describe, it, expect } from 'vitest';

import { buildPrompt, buildPromptFromSession } from '@/lib/llm/prompt-builder';
import type { PromptContext } from '@/lib/llm/prompt-builder';
import { getRubric, formatRubricForPrompt } from '@/lib/llm/rubrics';
import { stripPhaseMarkers } from '@/lib/llm/client';
import { getAllLessons, getLesson } from '@/lib/llm/curriculum';
import type { SessionState } from '@/types';

describe('prompt-builder', () => {
  // These tests verify file loading and assembly — no mocks needed

  describe('buildPrompt()', () => {
    it('includes core system prompt (SKILL.md content)', () => {
      const prompt = buildPrompt({
        phase: 'instruction',
        tier: 1,
        lessonTitle: 'What Makes a Good Story?',
        learningObjectives: ['Identify that stories have a beginning, middle, and end'],
      });
      // SKILL.md should be present
      expect(prompt).toContain('writing coach');
    });

    it('includes tier-specific insert for tier 1', () => {
      const prompt = buildPrompt({
        phase: 'instruction',
        tier: 1,
        lessonTitle: 'Test Lesson',
        learningObjectives: ['Test objective'],
      });
      // Tier 1 inserts mention age-appropriate vocabulary
      expect(prompt).toMatch(/tier 1|ages? 7|simple|playful/i);
    });

    it('includes tier-specific insert for tier 3', () => {
      const prompt = buildPrompt({
        phase: 'instruction',
        tier: 3,
        lessonTitle: 'Test Lesson',
        learningObjectives: ['Test objective'],
      });
      expect(prompt).toMatch(/tier 3|ages? 13|sophisticated|advanced/i);
    });

    it('includes phase-specific prompt for instruction', () => {
      const prompt = buildPrompt({
        phase: 'instruction',
        tier: 1,
        lessonTitle: 'Test Lesson',
        learningObjectives: ['Test objective'],
      });
      expect(prompt).toMatch(/instruction|teach|comprehension/i);
    });

    it('includes phase-specific prompt for assessment', () => {
      const prompt = buildPrompt({
        phase: 'assessment',
        tier: 1,
        lessonTitle: 'Test Lesson',
        learningObjectives: ['Test objective'],
        rubricSummary: 'Hook: 1-5',
      });
      expect(prompt).toMatch(/assessment|independent|do not help/i);
    });

    it('includes rubric summary only for assessment/feedback phases', () => {
      const withRubric = buildPrompt({
        phase: 'assessment',
        tier: 1,
        lessonTitle: 'Test Lesson',
        learningObjectives: ['Test objective'],
        rubricSummary: 'Hook criteria',
      });
      const withoutRubric = buildPrompt({
        phase: 'instruction',
        tier: 1,
        lessonTitle: 'Test Lesson',
        learningObjectives: ['Test objective'],
      });

      expect(withRubric).toContain('Hook criteria');
      expect(withoutRubric).not.toContain('Hook criteria');
    });

    it('prompt sections are joined with --- separator', () => {
      const prompt = buildPrompt({
        phase: 'instruction',
        tier: 1,
        lessonTitle: 'Test Lesson',
        learningObjectives: ['Test objective'],
        studentName: 'Maya',
      });
      expect(prompt).toContain('---');
    });
  });

  describe('buildPromptFromSession()', () => {
    it('builds prompt from a SessionState and lesson object', () => {
      const session: SessionState = {
        id: 'test-session',
        childId: 'child-1',
        lessonId: 'N1.1.1',
        phase: 'instruction',
        phaseState: {},
        conversationHistory: [],
      };
      const lesson = { title: 'What Makes a Good Story?', learningObjectives: ['Test objective'], tier: 1 as const };
      const prompt = buildPromptFromSession(session, lesson, 'Maya');
      expect(prompt).toContain('writing coach');
      expect(prompt).toContain('Maya');
      expect(prompt).toContain('N1.1.1');
    });

    it('includes rubric summary when provided for assessment phase', () => {
      const session: SessionState = {
        id: 'test-session',
        childId: 'child-1',
        lessonId: 'N1.1.1',
        phase: 'assessment',
        phaseState: {},
        conversationHistory: [],
      };
      const lesson = { title: 'Test', learningObjectives: ['Obj'], tier: 1 as const };
      const prompt = buildPromptFromSession(session, lesson, undefined, 'Hook: 1-5 scale');
      expect(prompt).toContain('Hook: 1-5 scale');
    });
  });
});

describe('rubrics', () => {
  describe('getRubric()', () => {
    it('loads rubric for N1_story_beginning', () => {
      const rubric = getRubric('N1_story_beginning');
      expect(rubric).toBeDefined();
      expect(rubric!.criteria).toBeDefined();
    });

    it('returns undefined for unknown rubric ID', () => {
      expect(getRubric('nonexistent_rubric')).toBeUndefined();
    });

    it('rubric has valid structure', () => {
      const rubric = getRubric('N1_story_beginning');
      expect(rubric).toBeDefined();
      expect(rubric!.criteria).toBeInstanceOf(Array);
      expect(rubric!.criteria.length).toBeGreaterThan(0);
      for (const criterion of rubric!.criteria) {
        expect(criterion.name).toBeDefined();
        expect(criterion.weight).toBeGreaterThan(0);
      }
    });
  });

  describe('formatRubricForPrompt()', () => {
    it('returns a string representation of rubric criteria', () => {
      const rubric = getRubric('N1_story_beginning');
      expect(rubric).toBeDefined();
      const formatted = formatRubricForPrompt(rubric!);
      expect(typeof formatted).toBe('string');
      expect(formatted.length).toBeGreaterThan(0);
    });
  });
});

describe('curriculum catalog', () => {
  describe('getAllLessons()', () => {
    it('returns 100+ lessons', () => {
      const lessons = getAllLessons();
      expect(lessons.length).toBeGreaterThanOrEqual(100);
    });

    it('all lessons have required fields', () => {
      for (const lesson of getAllLessons()) {
        expect(lesson.id).toBeDefined();
        expect(lesson.title).toBeDefined();
        expect(lesson.type).toBeDefined();
        expect(lesson.tier).toBeGreaterThanOrEqual(1);
        expect(lesson.tier).toBeLessThanOrEqual(3);
        expect(lesson.learningObjectives).toBeDefined();
        expect(lesson.learningObjectives.length).toBeGreaterThan(0);
      }
    });

    it('covers all 4 writing types', () => {
      const types = [...new Set(getAllLessons().map(l => l.type))];
      expect(types).toContain('narrative');
      expect(types).toContain('persuasive');
      expect(types).toContain('expository');
      expect(types).toContain('descriptive');
    });

    it('covers all 3 tiers', () => {
      const tiers = [...new Set(getAllLessons().map(l => l.tier))];
      expect(tiers).toContain(1);
      expect(tiers).toContain(2);
      expect(tiers).toContain(3);
    });

    it('lesson IDs follow format: {TYPE_CODE}{TIER}.{UNIT}.{LESSON}', () => {
      for (const lesson of getAllLessons()) {
        expect(lesson.id).toMatch(/^[NPED]\d\.\d+\.\d+$/);
      }
    });
  });

  describe('getLesson()', () => {
    it('returns correct lesson', () => {
      const lesson = getLesson('N1.1.1');
      expect(lesson).toBeDefined();
      expect(lesson!.tier).toBe(1);
      expect(lesson!.type).toBe('narrative');
    });

    it('returns undefined for unknown ID', () => {
      expect(getLesson('X9.9.9')).toBeUndefined();
    });
  });
});

describe('client — marker stripping', () => {
  // These can be tested with pure string functions — no API mock needed

  it('strips [PHASE_TRANSITION: guided]', () => {
    const input = 'Great job! Ready to practice? [PHASE_TRANSITION: guided]';
    expect(stripPhaseMarkers(input)).toBe('Great job! Ready to practice?');
  });

  it('strips [PHASE_TRANSITION: assessment]', () => {
    const input = 'You\'re ready to write on your own! [PHASE_TRANSITION: assessment]';
    expect(stripPhaseMarkers(input)).toBe('You\'re ready to write on your own!');
  });

  it('strips [COMPREHENSION_CHECK: passed]', () => {
    const input = 'You got it! [COMPREHENSION_CHECK: passed] Let\'s move on.';
    const result = stripPhaseMarkers(input);
    expect(result).not.toContain('[COMPREHENSION_CHECK');
    expect(result).toContain('You got it!');
    expect(result).toContain("Let's move on.");
  });

  it('strips [HINT_GIVEN]', () => {
    const input = 'Think about what makes a sentence exciting. [HINT_GIVEN]';
    expect(stripPhaseMarkers(input)).toBe('Think about what makes a sentence exciting.');
  });

  it('strips multiple markers from same message', () => {
    const input = 'Correct! [COMPREHENSION_CHECK: passed] Ready? [PHASE_TRANSITION: guided]';
    const result = stripPhaseMarkers(input);
    expect(result).not.toContain('[');
    expect(result).not.toContain(']');
  });

  it('returns unchanged text when no markers present', () => {
    const input = 'This is a normal message with no markers.';
    expect(stripPhaseMarkers(input)).toBe(input);
  });

  it('handles empty string', () => {
    expect(stripPhaseMarkers('')).toBe('');
  });
});
