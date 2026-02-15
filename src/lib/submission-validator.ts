import type { Rubric } from "@/types";

export type ValidationResult =
  | { valid: true; wordCount: number }
  | { valid: false; error: string; message: string; wordCount: number; minWords: number };

/**
 * Validates submission quality before sending to Claude for evaluation.
 * Returns a kid-friendly error message on failure.
 */
export function validateSubmissionQuality(
  text: string,
  rubric: Rubric | null
): ValidationResult {
  const trimmed = text.trim();
  const words = trimmed.split(/\s+/).filter((w) => w.length > 0);
  const wordCount = words.length;

  // Minimum word count: half of rubric's word_range[0], floor of 10
  const minWords = rubric?.word_range
    ? Math.max(10, Math.floor(rubric.word_range[0] / 2))
    : 10;

  if (wordCount < minWords) {
    return {
      valid: false,
      error: "too_short",
      message: `Your writing needs at least ${minWords} words to be scored. You have ${wordCount} so far — keep going, you've got this!`,
      wordCount,
      minWords,
    };
  }

  // Gibberish detection: require ≥40% of words contain a vowel (including y)
  const vowelWords = words.filter((w) => /[aeiouy]/i.test(w));
  const vowelRatio = vowelWords.length / words.length;

  if (vowelRatio < 0.4) {
    return {
      valid: false,
      error: "gibberish",
      message:
        "Hmm, that doesn't look like real writing yet. Try writing real sentences about the topic — you can do it!",
      wordCount,
      minWords,
    };
  }

  return { valid: true, wordCount };
}
