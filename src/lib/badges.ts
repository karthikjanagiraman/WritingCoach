// Badge catalog — all badge definitions for the achievement system

export interface BadgeDefinition {
  id: string;
  name: string;
  emoji: string;
  description: string;
  category: "writing" | "progress" | "streak" | "skill" | "special";
}

export const BADGE_CATALOG: BadgeDefinition[] = [
  // ============================================
  // Writing (based on submissions / lesson completions)
  // ============================================
  {
    id: "first_lesson",
    name: "Story Starter",
    emoji: "\u{1F4DD}",
    description: "Complete your first lesson",
    category: "writing",
  },
  {
    id: "five_lessons",
    name: "Bookworm",
    emoji: "\u{1F4DA}",
    description: "Complete 5 lessons",
    category: "writing",
  },
  {
    id: "ten_lessons",
    name: "Writing Champion",
    emoji: "\u{1F3C6}",
    description: "Complete 10 lessons",
    category: "writing",
  },
  {
    id: "twenty_lessons",
    name: "Master Writer",
    emoji: "\u270D\uFE0F",
    description: "Complete 20 lessons",
    category: "writing",
  },
  {
    id: "first_revision",
    name: "Editor in Chief",
    emoji: "\u270F\uFE0F",
    description: "Revise a piece of writing",
    category: "writing",
  },
  {
    id: "wordsmith_100",
    name: "Wordsmith",
    emoji: "\u{1F4AC}",
    description: "Write 100+ words in one submission",
    category: "writing",
  },
  {
    id: "wordsmith_250",
    name: "Word Wizard",
    emoji: "\u{1FA84}",
    description: "Write 250+ words in one submission",
    category: "writing",
  },
  {
    id: "wordsmith_500",
    name: "Novel Author",
    emoji: "\u{1F4D6}",
    description: "Write 500+ words in one submission",
    category: "writing",
  },

  // ============================================
  // Progress (based on scores and writing types)
  // ============================================
  {
    id: "perfect_score",
    name: "Perfect Score",
    emoji: "\u2B50",
    description: "Score 4/4 on an assessment",
    category: "progress",
  },
  {
    id: "high_achiever",
    name: "High Achiever",
    emoji: "\u{1F31F}",
    description: "Score 3.5+ three times",
    category: "progress",
  },
  {
    id: "all_narrative",
    name: "Story Teller",
    emoji: "\u{1F4D5}",
    description: "Complete a narrative lesson",
    category: "progress",
  },
  {
    id: "all_persuasive",
    name: "Debate Star",
    emoji: "\u{1F3A4}",
    description: "Complete a persuasive lesson",
    category: "progress",
  },
  {
    id: "all_expository",
    name: "Knowledge Sharer",
    emoji: "\u{1F52C}",
    description: "Complete an expository lesson",
    category: "progress",
  },
  {
    id: "all_descriptive",
    name: "Word Painter",
    emoji: "\u{1F3A8}",
    description: "Complete a descriptive lesson",
    category: "progress",
  },

  // ============================================
  // Streak (based on streak data)
  // ============================================
  {
    id: "streak_3",
    name: "On a Roll",
    emoji: "\u{1F525}",
    description: "3-day writing streak",
    category: "streak",
  },
  {
    id: "streak_7",
    name: "Week Warrior",
    emoji: "\u{1F4AA}",
    description: "7-day writing streak",
    category: "streak",
  },
  {
    id: "streak_14",
    name: "Unstoppable",
    emoji: "\u{1F680}",
    description: "14-day writing streak",
    category: "streak",
  },
  {
    id: "weekly_goal",
    name: "Goal Getter",
    emoji: "\u{1F3AF}",
    description: "Meet weekly lesson goal",
    category: "streak",
  },

  // ============================================
  // Skill (based on skill progress)
  // ============================================
  {
    id: "first_proficient",
    name: "Skill Master",
    emoji: "\u{1F9E0}",
    description: "Reach PROFICIENT in any skill",
    category: "skill",
  },
  {
    id: "first_advanced",
    name: "Writing Genius",
    emoji: "\u{1F393}",
    description: "Reach ADVANCED in any skill",
    category: "skill",
  },
  {
    id: "well_rounded",
    name: "Well Rounded",
    emoji: "\u{1F308}",
    description: "Score 2.0+ in all 4 writing categories",
    category: "skill",
  },

  // ============================================
  // Special (time-based or unique conditions)
  // ============================================
  {
    id: "early_bird",
    name: "Early Bird",
    emoji: "\u{1F305}",
    description: "Complete a lesson before 9 AM",
    category: "special",
  },
  {
    id: "night_owl",
    name: "Night Owl",
    emoji: "\u{1F989}",
    description: "Complete a lesson after 8 PM",
    category: "special",
  },
];

/** Look up a badge by its unique ID */
export function getBadgeById(id: string): BadgeDefinition | undefined {
  return BADGE_CATALOG.find((b) => b.id === id);
}
