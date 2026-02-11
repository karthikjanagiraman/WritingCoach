import type { Tier, WritingType } from "@/types";
import {
  getLesson,
  getLessonsByTier as getLessonsByTierInternal,
  getAllLessons as getAllLessonsInternal,
} from "@/lib/llm";

/**
 * Re-export curriculum lookups from the canonical source in the LLM module.
 * This keeps a single source of truth for lesson data.
 */
export const getLessonById = getLesson;

export const getLessonsByTier = getLessonsByTierInternal;

export function getLessonsByType(type: WritingType) {
  return getAllLessonsInternal().filter((l) => l.type === type);
}

export const getAllLessons = getAllLessonsInternal;
