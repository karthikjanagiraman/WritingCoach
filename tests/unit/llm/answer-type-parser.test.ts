/**
 * Tests for interactive answer type marker parsing and stripping.
 *
 * Verifies:
 * - stripPhaseMarkers() correctly strips [ANSWER_TYPE], [OPTIONS], [PASSAGE] markers
 * - Regex parsing extracts answerType, options, and passage from AI responses
 * - Edge cases: malformed markers, empty options, mixed markers
 */
import { describe, it, expect } from 'vitest';
import { stripPhaseMarkers } from '@/lib/llm/client';

// ---------------------------------------------------------------------------
// Helper: replicates the parsing logic from getCoachResponse() in client.ts
// ---------------------------------------------------------------------------
function parseAnswerMarkers(text: string): {
  answerType: string | undefined;
  options: string[] | undefined;
  passage: string | undefined;
} {
  const answerTypeMatch = text.match(
    /\[ANSWER_TYPE:\s*(choice|multiselect|poll|order|highlight)\]/i
  );
  const answerType = answerTypeMatch
    ? answerTypeMatch[1].toLowerCase()
    : undefined;

  const optionsMatch = text.match(/\[OPTIONS:\s*(.+?)\]/i);
  const options = optionsMatch
    ? optionsMatch[1]
        .split('|')
        .map((o) => o.trim().replace(/^"|"$/g, ''))
    : undefined;

  const passageMatch = text.match(/\[PASSAGE:\s*"([\s\S]+?)"\]/i);
  const passage = passageMatch ? passageMatch[1] : undefined;

  return { answerType, options, passage };
}

// ===========================================================================
// stripPhaseMarkers tests
// ===========================================================================
describe('stripPhaseMarkers — answer type markers', () => {
  it('strips [ANSWER_TYPE: choice] marker from text', () => {
    const input = 'Which one do you like best?\n\n[ANSWER_TYPE: choice]';
    const result = stripPhaseMarkers(input);
    expect(result).toBe('Which one do you like best?');
    expect(result).not.toContain('[ANSWER_TYPE');
  });

  it('strips [OPTIONS: "A" | "B" | "C"] marker from text', () => {
    const input = 'Pick your favorite color.\n\n[OPTIONS: "Red" | "Blue" | "Green"]';
    const result = stripPhaseMarkers(input);
    expect(result).toBe('Pick your favorite color.');
    expect(result).not.toContain('[OPTIONS');
  });

  it('strips [PASSAGE: "some text here"] marker', () => {
    const input = 'Find the adjectives!\n\n[PASSAGE: "The big brown dog ran fast."]';
    const result = stripPhaseMarkers(input);
    expect(result).toBe('Find the adjectives!');
    expect(result).not.toContain('[PASSAGE');
  });

  it('strips all three markers together (full choice response)', () => {
    const input = [
      'Which hook technique works best here?',
      '',
      '[ANSWER_TYPE: choice]',
      '[OPTIONS: "Question hook" | "Action hook" | "Dialogue hook"]',
    ].join('\n');
    const result = stripPhaseMarkers(input);
    expect(result).toBe('Which hook technique works best here?');
    expect(result).not.toContain('[ANSWER_TYPE');
    expect(result).not.toContain('[OPTIONS');
  });

  it('strips all three markers plus [EXPECTS_RESPONSE] is not present so markers still clear', () => {
    // [EXPECTS_RESPONSE] is parsed client-side, not by stripPhaseMarkers.
    // When an answer type is used, the prompt rules say NOT to include [EXPECTS_RESPONSE].
    // This test ensures that [ANSWER_TYPE] + [OPTIONS] alone are cleanly stripped.
    const input = [
      'How confident are you?',
      '',
      '[ANSWER_TYPE: poll]',
      '[OPTIONS: "Not sure" | "Getting there" | "Got it!"]',
    ].join('\n');
    const result = stripPhaseMarkers(input);
    expect(result).toBe('How confident are you?');
  });

  it('strips [ANSWER_TYPE: highlight] + [PASSAGE: "..."] together', () => {
    const input = [
      'Tap the sensory words in this sentence:',
      '',
      '[ANSWER_TYPE: highlight]',
      '[PASSAGE: "The warm sunlight danced across the shimmering lake."]',
    ].join('\n');
    const result = stripPhaseMarkers(input);
    expect(result).toBe('Tap the sensory words in this sentence:');
    expect(result).not.toContain('[ANSWER_TYPE');
    expect(result).not.toContain('[PASSAGE');
  });

  it('preserves text content while only removing markers', () => {
    const input = [
      'Great job! You identified two strong verbs.',
      '',
      'Now, which sentence uses a simile?',
      '',
      '[ANSWER_TYPE: choice]',
      '[OPTIONS: "The cat sat on the mat" | "Her smile was like sunshine" | "I went to the store"]',
    ].join('\n');
    const result = stripPhaseMarkers(input);
    expect(result).toContain('Great job! You identified two strong verbs.');
    expect(result).toContain('Now, which sentence uses a simile?');
    expect(result).not.toContain('[ANSWER_TYPE');
    expect(result).not.toContain('[OPTIONS');
  });

  it('handles passage with newlines/multiline text', () => {
    const input = [
      'Find the topic sentence:',
      '',
      '[ANSWER_TYPE: highlight]',
      '[PASSAGE: "Dogs are wonderful pets.',
      'They provide companionship and love.',
      'Many families enjoy having a dog."]',
    ].join('\n');
    const result = stripPhaseMarkers(input);
    expect(result).toBe('Find the topic sentence:');
    expect(result).not.toContain('[PASSAGE');
  });

  it('leaves text unchanged when no markers present (backward compat)', () => {
    const input = 'That is a wonderful opening sentence! Can you tell me more about your character?';
    const result = stripPhaseMarkers(input);
    expect(result).toBe(input);
  });

  it('strips combined old markers + new markers (e.g., [STEP: N] preserved + [ANSWER_TYPE] + [OPTIONS])', () => {
    const input = [
      '[STEP: 3] Now let me test your understanding.',
      '',
      'What is the purpose of a topic sentence?',
      '',
      '[ANSWER_TYPE: choice]',
      '[OPTIONS: "To entertain" | "To introduce the main idea" | "To end a paragraph"]',
      '[COMPREHENSION_CHECK: passed]',
    ].join('\n');
    const result = stripPhaseMarkers(input);
    // [STEP: N] should be preserved (not stripped by stripPhaseMarkers)
    expect(result).toContain('[STEP: 3]');
    expect(result).toContain('What is the purpose of a topic sentence?');
    // All other markers should be stripped
    expect(result).not.toContain('[ANSWER_TYPE');
    expect(result).not.toContain('[OPTIONS');
    expect(result).not.toContain('[COMPREHENSION_CHECK');
  });
});

// ===========================================================================
// Answer type regex parsing tests
// ===========================================================================
describe('parseAnswerMarkers — answer type extraction', () => {
  it('parses [ANSWER_TYPE: choice] -> "choice"', () => {
    const text = 'Pick one!\n[ANSWER_TYPE: choice]\n[OPTIONS: "A" | "B"]';
    const { answerType } = parseAnswerMarkers(text);
    expect(answerType).toBe('choice');
  });

  it('parses [ANSWER_TYPE: multiselect] -> "multiselect"', () => {
    const text = 'Select all that apply.\n[ANSWER_TYPE: multiselect]\n[OPTIONS: "A" | "B" | "C"]';
    const { answerType } = parseAnswerMarkers(text);
    expect(answerType).toBe('multiselect');
  });

  it('parses [ANSWER_TYPE: poll] -> "poll"', () => {
    const text = 'How do you feel?\n[ANSWER_TYPE: poll]\n[OPTIONS: "Great" | "OK" | "Confused"]';
    const { answerType } = parseAnswerMarkers(text);
    expect(answerType).toBe('poll');
  });

  it('parses [ANSWER_TYPE: order] -> "order"', () => {
    const text = 'Put these in order.\n[ANSWER_TYPE: order]\n[OPTIONS: "First" | "Second" | "Third"]';
    const { answerType } = parseAnswerMarkers(text);
    expect(answerType).toBe('order');
  });

  it('parses [ANSWER_TYPE: highlight] -> "highlight"', () => {
    const text = 'Find the verbs.\n[ANSWER_TYPE: highlight]\n[PASSAGE: "The cat jumped over the fence."]';
    const { answerType } = parseAnswerMarkers(text);
    expect(answerType).toBe('highlight');
  });

  it('case insensitive: [ANSWER_TYPE: Choice] -> "choice"', () => {
    const text = 'Pick one.\n[ANSWER_TYPE: Choice]\n[OPTIONS: "X" | "Y"]';
    const { answerType } = parseAnswerMarkers(text);
    expect(answerType).toBe('choice');
  });

  it('parses [OPTIONS: "A" | "B" | "C"] -> ["A", "B", "C"]', () => {
    const text = '[ANSWER_TYPE: choice]\n[OPTIONS: "A" | "B" | "C"]';
    const { options } = parseAnswerMarkers(text);
    expect(options).toEqual(['A', 'B', 'C']);
  });

  it('parses options with 2 items: [OPTIONS: "Yes" | "No"] -> ["Yes", "No"]', () => {
    const text = '[ANSWER_TYPE: choice]\n[OPTIONS: "Yes" | "No"]';
    const { options } = parseAnswerMarkers(text);
    expect(options).toEqual(['Yes', 'No']);
  });

  it('parses options with emoji content', () => {
    const text = '[ANSWER_TYPE: poll]\n[OPTIONS: "\u{1F615} Still learning" | "\u{1F60A} Got it!"]';
    const { options } = parseAnswerMarkers(text);
    expect(options).toEqual(['\u{1F615} Still learning', '\u{1F60A} Got it!']);
  });

  it('parses options with 5 items (order/multiselect)', () => {
    const text = '[ANSWER_TYPE: order]\n[OPTIONS: "Introduction" | "Rising action" | "Climax" | "Falling action" | "Resolution"]';
    const { options } = parseAnswerMarkers(text);
    expect(options).toEqual([
      'Introduction',
      'Rising action',
      'Climax',
      'Falling action',
      'Resolution',
    ]);
  });

  it('parses [PASSAGE: "The old house creaked."] -> "The old house creaked."', () => {
    const text = '[ANSWER_TYPE: highlight]\n[PASSAGE: "The old house creaked."]';
    const { passage } = parseAnswerMarkers(text);
    expect(passage).toBe('The old house creaked.');
  });

  it('parses passage with special characters: quotes, commas, exclamation marks inside', () => {
    const text = '[ANSWER_TYPE: highlight]\n[PASSAGE: "Wait, look! The sky is beautiful, isn\'t it?"]';
    const { passage } = parseAnswerMarkers(text);
    expect(passage).toBe("Wait, look! The sky is beautiful, isn't it?");
  });

  it('returns undefined for all fields when no markers present', () => {
    const text = 'Just a regular response with no markers at all.';
    const { answerType, options, passage } = parseAnswerMarkers(text);
    expect(answerType).toBeUndefined();
    expect(options).toBeUndefined();
    expect(passage).toBeUndefined();
  });

  it('returns answerType + options but no passage for choice type', () => {
    const text = 'Pick one.\n[ANSWER_TYPE: choice]\n[OPTIONS: "A" | "B"]';
    const { answerType, options, passage } = parseAnswerMarkers(text);
    expect(answerType).toBe('choice');
    expect(options).toEqual(['A', 'B']);
    expect(passage).toBeUndefined();
  });

  it('returns answerType + passage but no options for highlight type', () => {
    const text = 'Tap the adjectives.\n[ANSWER_TYPE: highlight]\n[PASSAGE: "The tiny gray mouse hid."]';
    const { answerType, options, passage } = parseAnswerMarkers(text);
    expect(answerType).toBe('highlight');
    expect(passage).toBe('The tiny gray mouse hid.');
    expect(options).toBeUndefined();
  });
});

// ===========================================================================
// Edge cases
// ===========================================================================
describe('parseAnswerMarkers — edge cases', () => {
  it('malformed marker: [ANSWER_TYPE: invalid] -> undefined (not a known type)', () => {
    const text = '[ANSWER_TYPE: invalid]\n[OPTIONS: "A" | "B"]';
    const { answerType } = parseAnswerMarkers(text);
    expect(answerType).toBeUndefined();
  });

  it('empty options: [OPTIONS: ] handles gracefully', () => {
    const text = '[ANSWER_TYPE: choice]\n[OPTIONS: ]';
    // The regex .+? matches the trailing space, producing a single empty-string element.
    // This is graceful — it does not throw — and the caller will get a harmless empty array.
    const { options } = parseAnswerMarkers(text);
    // The space inside the brackets is captured; after trim + quote strip we get [""]
    expect(options).toEqual(['']);
  });

  it('options without quotes: [OPTIONS: A | B | C] still parses (strip non-existent quotes)', () => {
    const text = '[ANSWER_TYPE: choice]\n[OPTIONS: A | B | C]';
    const { options } = parseAnswerMarkers(text);
    expect(options).toEqual(['A', 'B', 'C']);
  });

  it('double spaces in marker: [ANSWER_TYPE:  choice] (extra space)', () => {
    const text = '[ANSWER_TYPE:  choice]\n[OPTIONS: "X" | "Y"]';
    const { answerType } = parseAnswerMarkers(text);
    // The regex is \s* which matches multiple spaces
    expect(answerType).toBe('choice');
  });

  it('markers in the middle of content (not just at end)', () => {
    const text = 'Here is your question:\n[ANSWER_TYPE: choice]\n[OPTIONS: "A" | "B"]\nRemember to think carefully!';
    const { answerType, options } = parseAnswerMarkers(text);
    expect(answerType).toBe('choice');
    expect(options).toEqual(['A', 'B']);

    const stripped = stripPhaseMarkers(text);
    expect(stripped).toContain('Here is your question:');
    expect(stripped).toContain('Remember to think carefully!');
    expect(stripped).not.toContain('[ANSWER_TYPE');
    expect(stripped).not.toContain('[OPTIONS');
  });

  it('multiple [ANSWER_TYPE] markers — should only match first', () => {
    const text = '[ANSWER_TYPE: choice]\n[OPTIONS: "A" | "B"]\nSome text\n[ANSWER_TYPE: poll]\n[OPTIONS: "X" | "Y"]';
    const { answerType, options } = parseAnswerMarkers(text);
    // .match() returns first match
    expect(answerType).toBe('choice');
    expect(options).toEqual(['A', 'B']);
  });
});
