import type { Rubric, RubricCriterion, Tier, Lesson } from "@/types";

// ---------------------------------------------------------------------------
// generateRubricFromLesson — create evaluation criteria from lesson objectives
// ---------------------------------------------------------------------------

/**
 * For lessons without a hand-authored rubricId, generate a Rubric object
 * from the lesson's learning objectives, type, and tier.
 *
 * This is deterministic (no LLM call). The generated rubric follows the
 * same shape as the JSON rubrics in content/rubrics/, so the evaluator
 * can use it identically.
 */
export function generateRubricFromLesson(lesson: Lesson): Rubric {
  const objectives = lesson.learningObjectives;
  const tier = lesson.tier;

  // Build lesson-specific criteria from objectives (max 3)
  const lessonCriteria = objectives.slice(0, 3).map((objective, idx) => {
    return objectiveToCriterion(objective, tier, idx, objectives.length);
  });

  // Always include a baseline writing quality criterion
  const baselineCriterion = getBaselineCriterion(tier);

  // Weight: lesson criteria share 75%, baseline gets 25%
  const lessonWeight = 0.75 / lessonCriteria.length;
  for (const c of lessonCriteria) {
    c.weight = round2(lessonWeight);
  }
  baselineCriterion.weight = 0.25;

  const criteria = [...lessonCriteria, baselineCriterion];

  return {
    id: `generated_${lesson.id}`,
    description: buildDescription(lesson.title, objectives),
    word_range: getWordRange(tier),
    criteria,
  };
}

// ---------------------------------------------------------------------------
// objectiveToCriterion — convert a learning objective into a rubric criterion
// ---------------------------------------------------------------------------

function objectiveToCriterion(
  objective: string,
  tier: Tier,
  index: number,
  totalObjectives: number
): RubricCriterion {
  // Extract the core skill from the objective
  const skillName = extractSkillName(objective);
  const displayName = extractDisplayName(objective);

  // Generate tier-appropriate level descriptions
  const levels = generateLevels(objective, tier);

  // Generate feedback stems from the objective
  const feedbackStems = generateFeedbackStems(objective, tier);

  return {
    name: skillName,
    display_name: displayName,
    weight: 0, // set by caller
    levels,
    feedback_stems: feedbackStems,
  };
}

// ---------------------------------------------------------------------------
// extractSkillName — turn an objective into a snake_case criterion name
// ---------------------------------------------------------------------------

function extractSkillName(objective: string): string {
  // Remove common leading verbs and articles
  const cleaned = objective
    .toLowerCase()
    .replace(
      /^(write|use|create|identify|understand|show|make|add|build|explore|practice|recognize|include|develop|apply|analyze|combine|maintain|introduce|replace|choose|keep)\s+/i,
      ""
    )
    .replace(/^(a|an|the|that|how|what|which)\s+/i, "")
    .replace(/[^a-z0-9\s]/g, "")
    .trim();

  // Take first 3-4 meaningful words
  const words = cleaned.split(/\s+/).slice(0, 4);
  return words.join("_") || "skill";
}

// ---------------------------------------------------------------------------
// extractDisplayName — turn an objective into a human-readable criterion name
// ---------------------------------------------------------------------------

function extractDisplayName(objective: string): string {
  // Remove leading verb to get the skill noun phrase
  const withoutVerb = objective.replace(
    /^(Write|Use|Create|Identify|Understand|Show|Make|Add|Build|Explore|Practice|Recognize|Include|Develop|Apply|Analyze|Combine|Maintain|Introduce|Replace|Choose|Keep)\s+/,
    ""
  );

  // Clean up and capitalize
  const cleaned = withoutVerb
    .replace(/^(a|an|the|that|how to|what makes)\s+/i, "")
    .replace(/\.$/, "")
    .trim();

  // Capitalize first letter of each major word
  return capitalizeTitle(cleaned);
}

// ---------------------------------------------------------------------------
// generateLevels — create tier-appropriate rubric level descriptions
// ---------------------------------------------------------------------------

function generateLevels(
  objective: string,
  tier: Tier
): Record<string, string> {
  // Extract the core action/skill from the objective
  const action = objective.toLowerCase();

  if (tier === 1) {
    return {
      "4": `Excellent! ${objective} in a way that really stands out`,
      "3": `Good job — shows understanding of how to ${action}`,
      "2": `Tries to ${action} but needs more practice`,
      "1": `Not yet — doesn't show this skill`,
    };
  }

  if (tier === 2) {
    return {
      "4": `Demonstrates strong command: ${action} with confidence and creativity`,
      "3": `Shows solid understanding: ${action} competently`,
      "2": `Attempts to ${action} but execution needs development`,
      "1": `Does not yet demonstrate ability to ${action}`,
    };
  }

  // Tier 3
  return {
    "4": `Sophisticated execution: ${action} with nuance and intentionality`,
    "3": `Competent demonstration: ${action} effectively`,
    "2": `Emerging attempt to ${action}; technique present but underdeveloped`,
    "1": `Does not demonstrate this skill in the writing`,
  };
}

// ---------------------------------------------------------------------------
// generateFeedbackStems — create lesson-aware feedback stem templates
// ---------------------------------------------------------------------------

function generateFeedbackStems(
  objective: string,
  tier: Tier
): { strength: string; growth: string } {
  // Extract the key verb/skill for feedback
  const action = objective.toLowerCase().replace(/\.$/, "");

  if (tier === 1) {
    return {
      strength: `Great job! You showed you can ${action} when you wrote`,
      growth: `Next time, try to ${action} even more — here's an idea:`,
    };
  }

  if (tier === 2) {
    return {
      strength: `You demonstrated your ability to ${action}, especially when you wrote`,
      growth: `To strengthen this further, focus on how to ${action} more deliberately`,
    };
  }

  // Tier 3
  return {
    strength: `Your writing shows skill in the area of: ${action}. This is evident when you wrote`,
    growth: `To refine your technique, consider how to ${action} with greater intentionality`,
  };
}

// ---------------------------------------------------------------------------
// getBaselineCriterion — tier-appropriate writing quality baseline
// ---------------------------------------------------------------------------

function getBaselineCriterion(tier: Tier): RubricCriterion {
  if (tier === 1) {
    return {
      name: "writing_quality",
      display_name: "Clear Writing",
      weight: 0.25,
      levels: {
        "4": "Sentences are complete and easy to read; spelling doesn't get in the way",
        "3": "Most sentences are complete; most words are spelled correctly",
        "2": "Some sentences are incomplete or hard to follow",
        "1": "Writing is hard to read or understand",
      },
      feedback_stems: {
        strength: "Your writing was clear and easy to read",
        growth: "Remember to check that each sentence is complete and makes sense",
      },
    };
  }

  if (tier === 2) {
    return {
      name: "writing_quality",
      display_name: "Writing Craft",
      weight: 0.25,
      levels: {
        "4": "Writing flows smoothly with varied sentences, clear transitions, and few errors",
        "3": "Writing is clear and organized with adequate sentence variety",
        "2": "Writing is understandable but choppy or repetitive in places",
        "1": "Writing is difficult to follow due to unclear sentences or frequent errors",
      },
      feedback_stems: {
        strength: "Your writing demonstrates good craft with clear, varied sentences",
        growth: "Work on varying your sentence structure and using transitions between ideas",
      },
    };
  }

  // Tier 3
  return {
    name: "writing_quality",
    display_name: "Prose Quality",
    weight: 0.25,
    levels: {
      "4": "Polished prose with intentional sentence craft, precise diction, and effective pacing",
      "3": "Competent prose that communicates ideas clearly with some stylistic awareness",
      "2": "Functional prose but lacks polish — sentences are workmanlike",
      "1": "Prose quality undermines the writing's effectiveness",
    },
    feedback_stems: {
      strength: "Your prose shows intentional craft in word choice and sentence rhythm",
      growth: "Elevate your prose by attending to diction, sentence variety, and pacing",
    },
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getWordRange(tier: Tier): [number, number] {
  switch (tier) {
    case 1:
      return [25, 75];
    case 2:
      return [75, 200];
    case 3:
      return [150, 400];
  }
}

function buildDescription(title: string, objectives: string[]): string {
  const objectivesSummary = objectives
    .map((o) => o.toLowerCase().replace(/\.$/, ""))
    .join(" and ");
  return `Assesses how well the student can ${objectivesSummary} (${title})`;
}

function capitalizeTitle(str: string): string {
  const minorWords = new Set([
    "a", "an", "the", "and", "but", "or", "for", "in", "on",
    "at", "to", "of", "with", "by", "from", "up", "as", "is",
    "that", "it", "its",
  ]);

  return str
    .split(/\s+/)
    .map((word, idx) => {
      if (idx === 0 || !minorWords.has(word.toLowerCase())) {
        return word.charAt(0).toUpperCase() + word.slice(1);
      }
      return word.toLowerCase();
    })
    .join(" ");
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
