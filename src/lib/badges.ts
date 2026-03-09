// Badge catalog — 12-badge "Ink Splat Sticker" collection
//
// Redesigned from 24 badges to 12, with rarity tiers that govern
// visual treatment and celebration intensity. Categories tell a
// journey story: First Steps → Building Your Craft → Mastery → Legendary.

export type BadgeRarity = "common" | "rare" | "epic" | "legendary";
export type BadgeCategory = "first_steps" | "craft" | "mastery" | "legendary";

export interface BadgeDefinition {
  id: string;
  name: string;
  emoji: string;
  description: string;
  category: BadgeCategory;
  rarity: BadgeRarity;
}

export const BADGE_CATALOG: BadgeDefinition[] = [
  // ============================================
  // First Steps (Common — early wins, first month)
  // ============================================
  {
    id: "brave_start",
    name: "Brave Start",
    emoji: "✏️",
    description: "You put your ideas on paper for the first time!",
    category: "first_steps",
    rarity: "common",
  },
  {
    id: "ink_explorer",
    name: "Ink Explorer",
    emoji: "🧭",
    description: "You've tried all four kinds of writing!",
    category: "first_steps",
    rarity: "common",
  },
  {
    id: "draft_doctor",
    name: "Draft Doctor",
    emoji: "🩹",
    description: "You revised your writing and made it better!",
    category: "first_steps",
    rarity: "common",
  },
  {
    id: "rhythm_writer",
    name: "Rhythm Writer",
    emoji: "🎵",
    description: "You completed 3 lessons in a single week!",
    category: "first_steps",
    rarity: "common",
  },

  // ============================================
  // Building Your Craft (Rare — months 1-3)
  // ============================================
  {
    id: "ten_down",
    name: "Ten Down",
    emoji: "🔟",
    description: "You've finished ten lessons. That's real dedication!",
    category: "craft",
    rarity: "rare",
  },
  {
    id: "high_marks",
    name: "High Marks",
    emoji: "⭐",
    description: "You've scored 3.5 stars or higher three times!",
    category: "craft",
    rarity: "rare",
  },
  {
    id: "comeback_kid",
    name: "Comeback Kid",
    emoji: "🦋",
    description: "You scored low, kept going, and scored high on a later lesson!",
    category: "craft",
    rarity: "rare",
  },
  {
    id: "deep_diver",
    name: "Deep Diver",
    emoji: "🤿",
    description: "You reached Proficient level in a writing skill!",
    category: "craft",
    rarity: "rare",
  },

  // ============================================
  // On the Path to Mastery (Epic — months 3-6)
  // ============================================
  {
    id: "well_rounded",
    name: "Well Rounded",
    emoji: "🌈",
    description: "You've built real skill in all four writing categories!",
    category: "mastery",
    rarity: "epic",
  },
  {
    id: "renaissance_writer",
    name: "Renaissance Writer",
    emoji: "🏆",
    description: "You've scored 3.5+ in all four writing types!",
    category: "mastery",
    rarity: "epic",
  },
  {
    id: "marathon_writer",
    name: "Marathon Writer",
    emoji: "🏅",
    description: "You've completed 30 lessons. Nothing can stop you!",
    category: "mastery",
    rarity: "epic",
  },

  // ============================================
  // Legendary (The capstone)
  // ============================================
  {
    id: "writing_master",
    name: "Writing Master",
    emoji: "👑",
    description: "Proficient in 3+ skills and 40+ lessons completed. A true master!",
    category: "legendary",
    rarity: "legendary",
  },
];

/** Look up a badge by its unique ID */
export function getBadgeById(id: string): BadgeDefinition | undefined {
  return BADGE_CATALOG.find((b) => b.id === id);
}

/** Rarity-ordered category list for display */
export const RARITY_CATEGORIES: { id: BadgeCategory; label: string; emoji: string }[] = [
  { id: "first_steps", label: "First Steps", emoji: "👣" },
  { id: "craft", label: "Building Your Craft", emoji: "🛠️" },
  { id: "mastery", label: "On the Path to Mastery", emoji: "⛰️" },
  { id: "legendary", label: "Legendary", emoji: "👑" },
];

/** Rarity visual config for celebrations and display */
export const RARITY_CONFIG: Record<BadgeRarity, {
  label: string;
  confettiParticles: number;
  confettiBursts: number;
  autoDismissMs: number | null;
  color: string;
  glowColor: string;
}> = {
  common: {
    label: "Common",
    confettiParticles: 60,
    confettiBursts: 1,
    autoDismissMs: 3000,
    color: "#FF6B6B",
    glowColor: "rgba(255, 107, 107, 0.3)",
  },
  rare: {
    label: "Rare",
    confettiParticles: 100,
    confettiBursts: 2,
    autoDismissMs: null,
    color: "#6C5CE7",
    glowColor: "rgba(108, 92, 231, 0.3)",
  },
  epic: {
    label: "Epic",
    confettiParticles: 150,
    confettiBursts: 3,
    autoDismissMs: null,
    color: "#4ECDC4",
    glowColor: "rgba(78, 205, 196, 0.4)",
  },
  legendary: {
    label: "Legendary",
    confettiParticles: 250,
    confettiBursts: 5,
    autoDismissMs: null,
    color: "#FECA57",
    glowColor: "rgba(254, 202, 87, 0.5)",
  },
};
