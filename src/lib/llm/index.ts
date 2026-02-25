export {
  getCoachResponse,
  getInitialPrompt,
  generateCoachResponse,
  sendMessage,
  sendMessageWithMeta,
  stripPhaseMarkers,
  responseHasExpectedMarkers,
  MARKER_RETRY_SYSTEM_PROMPT,
} from "./client";
export type { CoachResponse, CoachResponseWithMeta, LLMMeta } from "./client";

export { llmSend, getLLMConfig } from "./provider";
export type { LLMMessage, LLMRequestOptions, LLMResult } from "./provider";

export { evaluateWriting, evaluateSubmission, evaluateWritingGeneral, extractTeachingContext } from "./evaluator";
export type { LessonContext, EvalResultWithMeta } from "./evaluator";

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
