// Writing skill categories and their sub-skills
export const SKILL_DEFINITIONS: Record<
  string,
  { displayName: string; skills: Record<string, string> }
> = {
  narrative: {
    displayName: "Narrative Writing",
    skills: {
      story_structure: "Story Structure",
      character_development: "Character Development",
      setting_description: "Setting & Description",
      voice_style: "Voice & Style",
      plot_pacing: "Plot & Pacing",
    },
  },
  persuasive: {
    displayName: "Persuasive Writing",
    skills: {
      argument_structure: "Argument Structure",
      evidence_support: "Evidence & Support",
      counterarguments: "Counterarguments",
      persuasive_language: "Persuasive Language",
      conclusion_impact: "Conclusion & Impact",
    },
  },
  expository: {
    displayName: "Expository Writing",
    skills: {
      topic_clarity: "Topic Clarity",
      organization: "Organization",
      information_depth: "Information Depth",
      transitions: "Transitions",
      conclusion: "Conclusion",
    },
  },
  descriptive: {
    displayName: "Descriptive Writing",
    skills: {
      sensory_detail: "Sensory Detail",
      figurative_language: "Figurative Language",
      word_choice: "Word Choice",
      imagery: "Imagery",
      mood_atmosphere: "Mood & Atmosphere",
    },
  },
};

/**
 * Map a lesson ID to the skill category and specific skills it develops.
 * Lesson IDs follow the format: {TYPE_CHAR}{TIER}.{UNIT}.{LESSON}
 * e.g. N1.1.5 = Narrative, Tier 1, Unit 1, Lesson 5
 */
export function getLessonSkills(lessonId: string): {
  category: string;
  skills: string[];
} {
  const typeChar = lessonId.charAt(0);
  const categoryMap: Record<string, string> = {
    N: "narrative",
    P: "persuasive",
    E: "expository",
    D: "descriptive",
  };
  const category = categoryMap[typeChar] || "narrative";

  // Parse unit from lesson ID: e.g., N1.1.5 -> unit 1 (second segment)
  const parts = lessonId.split(".");
  const unitNum = parseInt(parts[1]) || 1;

  // Map units to the primary skills they develop (approximate)
  const skillsByUnit: Record<string, Record<number, string[]>> = {
    narrative: {
      1: ["story_structure", "setting_description"],
      2: ["plot_pacing", "character_development"],
      3: ["voice_style", "story_structure"],
      4: ["character_development", "plot_pacing"],
    },
    persuasive: {
      1: ["argument_structure", "persuasive_language"],
      2: ["evidence_support", "counterarguments"],
      3: ["conclusion_impact", "persuasive_language"],
      4: ["argument_structure", "evidence_support"],
    },
    expository: {
      1: ["topic_clarity", "organization"],
      2: ["information_depth", "transitions"],
      3: ["conclusion", "organization"],
      4: ["topic_clarity", "information_depth"],
    },
    descriptive: {
      1: ["sensory_detail", "imagery"],
      2: ["figurative_language", "word_choice"],
      3: ["mood_atmosphere", "sensory_detail"],
      4: ["word_choice", "imagery"],
    },
  };

  const skills =
    skillsByUnit[category]?.[unitNum] || [
      Object.keys(SKILL_DEFINITIONS[category]?.skills || {})[0],
    ];
  return { category, skills };
}

/** Convert a numeric score (1-4 scale) to a SkillLevel enum value */
export function scoreToLevel(
  score: number
): "EMERGING" | "DEVELOPING" | "PROFICIENT" | "ADVANCED" {
  if (score >= 3.7) return "ADVANCED";
  if (score >= 2.8) return "PROFICIENT";
  if (score >= 1.8) return "DEVELOPING";
  return "EMERGING";
}
