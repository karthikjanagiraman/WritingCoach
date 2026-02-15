export {
  getCoachResponse,
  getInitialPrompt,
  generateCoachResponse,
  sendMessage,
  stripPhaseMarkers,
} from "./client";
export type { CoachResponse } from "./client";

export { evaluateWriting, evaluateSubmission, evaluateWritingGeneral } from "./evaluator";
export type { LessonContext } from "./evaluator";

export {
  buildPrompt,
  buildPromptFromSession,
  CORE_SYSTEM_PROMPT,
  TIER_INSERTS,
  PHASE_PROMPTS,
} from "./prompt-builder";
export type { PromptContext } from "./prompt-builder";

export { getRubric, getAllRubricIds, formatRubricForPrompt } from "./rubrics";

export { getLesson, getLessonsByTier, getAllLessons } from "./curriculum";
