import {
  getRubric,
  getAllRubricIds as getAllRubricIdsInternal,
} from "@/lib/llm";
import rubricsData from "../../artifacts/writewise_rubrics.json";

/**
 * Re-export rubric lookups from the canonical source in the LLM module.
 * This keeps a single source of truth for rubric data.
 */
export const getRubricById = getRubric;

export const getAllRubricIds = getAllRubricIdsInternal;

export function getRubricMetadata() {
  return rubricsData.metadata;
}
