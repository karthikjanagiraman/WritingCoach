import type { Message, Phase, SessionState, Lesson, AnswerType } from "@/types";
import { buildPromptFromSession } from "./prompt-builder";
import { getLesson } from "./curriculum";
import { getRubric, formatRubricForPrompt } from "./rubrics";
import { llmSend } from "./provider";
import type { LLMResult } from "./provider";

// ---------------------------------------------------------------------------
// LLMMeta — metadata from an LLM call, for logging
// ---------------------------------------------------------------------------
export interface LLMMeta {
  provider: string;
  model: string;
  inputTokens: number | null;
  outputTokens: number | null;
  latencyMs: number;
}

// ---------------------------------------------------------------------------
// CoachResponse — the interface the backend expects
// ---------------------------------------------------------------------------
export interface CoachResponse {
  message: string;
  phaseUpdate?: Phase;
  assessmentReady?: boolean;
  comprehensionPassed?: boolean;
  hintGiven?: boolean;
  stepUpdate?: number;
  guidedStageUpdate?: number;
  answerType?: AnswerType;
  answerOptions?: string[];
  highlightPassage?: string;
  answerPrompt?: string;
  // Learner profile data markers (Phase 4)
  scores?: Record<string, number>;
  samples?: Array<{ type: string; criterion: string; excerpt: string }>;
  preferences?: Array<{ category: string; value: string }>;
}

// ---------------------------------------------------------------------------
// CoachResponseWithMeta — CoachResponse + logging metadata
// ---------------------------------------------------------------------------
export interface CoachResponseWithMeta extends CoachResponse {
  llmMeta: LLMMeta;
  rawResponse: string;
  systemPromptUsed: string;
}

// ---------------------------------------------------------------------------
// sendMessage — low-level LLM call (delegates to provider abstraction)
// ---------------------------------------------------------------------------
export async function sendMessage(
  systemPrompt: string,
  messages: Array<{ role: "user" | "assistant"; content: string }>,
  maxTokens?: number
): Promise<string> {
  const result = await llmSend({ systemPrompt, messages, maxTokens });
  return result.text;
}

// ---------------------------------------------------------------------------
// sendMessageWithMeta — same as sendMessage but returns LLMResult metadata
// ---------------------------------------------------------------------------
export async function sendMessageWithMeta(
  systemPrompt: string,
  messages: Array<{ role: "user" | "assistant"; content: string }>,
  maxTokens?: number
): Promise<{ text: string; llmMeta: LLMMeta }> {
  const result: LLMResult = await llmSend({ systemPrompt, messages, maxTokens });
  return {
    text: result.text,
    llmMeta: {
      provider: result.provider,
      model: result.model,
      inputTokens: result.inputTokens,
      outputTokens: result.outputTokens,
      latencyMs: result.latencyMs,
    },
  };
}

// ---------------------------------------------------------------------------
// convertHistory — maps our Message[] to Claude's message format
// ---------------------------------------------------------------------------
function convertHistory(
  conversationHistory: Message[]
): Array<{ role: "user" | "assistant"; content: string }> {
  return conversationHistory.map((msg) => ({
    role: msg.role === "student" ? ("user" as const) : ("assistant" as const),
    content: msg.content,
  }));
}

// ---------------------------------------------------------------------------
// getCoachResponse — full pipeline used by the API route
// ---------------------------------------------------------------------------
export async function getCoachResponse(
  session: SessionState,
  lesson: Lesson,
  studentMessage: string,
  learnerContext?: string
): Promise<CoachResponseWithMeta> {
  // Build rubric summary for assessment or feedback phase
  let rubricSummary: string | undefined;
  if ((session.phase === "assessment" || session.phase === "feedback") && lesson.rubricId) {
    const rubric = getRubric(lesson.rubricId);
    if (rubric) {
      rubricSummary = formatRubricForPrompt(rubric);
    }
  }

  // Build the system prompt
  const systemPrompt = buildPromptFromSession(
    session,
    lesson,
    undefined,
    rubricSummary,
    learnerContext
  );

  // Convert conversation history and append the new student message
  const messages = convertHistory(session.conversationHistory);
  messages.push({ role: "user", content: studentMessage });

  const { text: responseText, llmMeta } = await sendMessageWithMeta(systemPrompt, messages);

  // Detect phase transition signals in the response
  const phaseUpdate = detectPhaseTransition(responseText, session.phase, lesson);
  const assessmentReady =
    session.phase === "assessment" &&
    studentMessage.trim().split(/\s+/).length >= 15;

  // Detect comprehension check marker
  const comprehensionPassed =
    /\[COMPREHENSION_CHECK:\s*passed\]/i.test(responseText) ||
    /\[COMPREHENSION_CHECK_PASSED\]/i.test(responseText);

  // Detect hint marker
  const hintGiven = /\[HINT_GIVEN\]/i.test(responseText);

  // Detect step marker (Phase 1 interactive lesson steps)
  const stepMatch = responseText.match(/\[STEP:\s*(\d)\]/i);
  const stepUpdate = stepMatch ? parseInt(stepMatch[1], 10) : undefined;

  // Detect guided stage marker
  const guidedStageMatch = responseText.match(/\[GUIDED_STAGE:\s*(\d)\]/i);
  const guidedStageUpdate = guidedStageMatch ? parseInt(guidedStageMatch[1], 10) : undefined;

  // Detect answer type markers
  const answerTypeMatch = responseText.match(
    /\[ANSWER_TYPE:\s*(choice|multiselect|poll|order|highlight)\]/i
  );
  const answerType = answerTypeMatch
    ? (answerTypeMatch[1].toLowerCase() as AnswerType)
    : undefined;

  const optionsMatch = responseText.match(/\[OPTIONS:\s*(.+?)\]/i);
  const answerOptions = optionsMatch
    ? optionsMatch[1].split("|").map((o) => o.trim().replace(/^"|"$/g, ""))
    : undefined;

  const passageMatch = responseText.match(/\[PASSAGE:\s*"([\s\S]+?)"\]/i);
  const highlightPassage = passageMatch ? passageMatch[1] : undefined;

  const answerPromptMatch = responseText.match(/\[ANSWER_PROMPT:\s*"?(.+?)"?\]/i);
  const answerPrompt = answerPromptMatch ? answerPromptMatch[1].trim() : undefined;

  // Parse learner profile data markers
  const scores = extractScores(responseText);
  const samples = extractSamples(responseText);
  const preferences = extractPreferences(responseText);

  return {
    message: stripPhaseMarkers(responseText),
    phaseUpdate,
    assessmentReady,
    comprehensionPassed,
    hintGiven,
    stepUpdate,
    guidedStageUpdate,
    answerType,
    answerOptions,
    highlightPassage,
    answerPrompt,
    scores,
    samples,
    preferences,
    llmMeta,
    rawResponse: responseText,
    systemPromptUsed: systemPrompt,
  };
}

// ---------------------------------------------------------------------------
// getInitialPrompt — generate the opening message for a lesson session
// ---------------------------------------------------------------------------
export async function getInitialPrompt(
  lesson: Lesson,
  studentName: string,
  tier: number,
  learnerContext?: string
): Promise<CoachResponseWithMeta> {
  const sessionStub: SessionState = {
    id: "init",
    childId: "",
    lessonId: lesson.id,
    phase: "instruction",
    phaseState: {},
    conversationHistory: [],
  };

  const systemPrompt = buildPromptFromSession(
    sessionStub,
    lesson,
    studentName,
    undefined,
    learnerContext
  );

  const messages: Array<{ role: "user" | "assistant"; content: string }> = [
    {
      role: "user",
      content: `Hi! I'm ${studentName} and I'm ready for today's lesson.`,
    },
  ];

  const { text: responseText, llmMeta } = await sendMessageWithMeta(systemPrompt, messages);

  // Parse markers the same way getCoachResponse does
  const stepMatch = responseText.match(/\[STEP:\s*(\d)\]/i);
  const stepUpdate = stepMatch ? parseInt(stepMatch[1], 10) : undefined;

  const answerTypeMatch = responseText.match(
    /\[ANSWER_TYPE:\s*(choice|multiselect|poll|order|highlight)\]/i
  );
  const answerType = answerTypeMatch
    ? (answerTypeMatch[1].toLowerCase() as AnswerType)
    : undefined;

  const optionsMatch = responseText.match(/\[OPTIONS:\s*(.+?)\]/i);
  const answerOptions = optionsMatch
    ? optionsMatch[1].split("|").map((o) => o.trim().replace(/^"|"$/g, ""))
    : undefined;

  const passageMatch = responseText.match(/\[PASSAGE:\s*"([\s\S]+?)"\]/i);
  const highlightPassage = passageMatch ? passageMatch[1] : undefined;

  const answerPromptMatch = responseText.match(/\[ANSWER_PROMPT:\s*"?(.+?)"?\]/i);
  const answerPrompt = answerPromptMatch ? answerPromptMatch[1].trim() : undefined;

  return {
    message: stripPhaseMarkers(responseText),
    stepUpdate,
    answerType,
    answerOptions,
    highlightPassage,
    answerPrompt,
    llmMeta,
    rawResponse: responseText,
    systemPromptUsed: systemPrompt,
  };
}

// ---------------------------------------------------------------------------
// generateCoachResponse — alternate entry point using lesson ID lookup
// ---------------------------------------------------------------------------
export async function generateCoachResponse(
  session: SessionState,
  studentMessage: string,
  studentName?: string
): Promise<string> {
  const lesson = getLesson(session.lessonId);
  if (!lesson) {
    throw new Error(`Lesson not found: ${session.lessonId}`);
  }

  const result = await getCoachResponse(session, lesson, studentMessage);
  return result.message;
}

// ---------------------------------------------------------------------------
// detectPhaseTransition — detect structured phase transition markers
// ---------------------------------------------------------------------------
function detectPhaseTransition(
  responseText: string,
  currentPhase: Phase,
  lesson: Lesson
): Phase | undefined {
  const transitionMatch = responseText.match(
    /\[PHASE_TRANSITION:\s*(guided|assessment)\]/i
  );
  if (transitionMatch) {
    const target = transitionMatch[1].toLowerCase() as Phase;
    // Validate transition is legal
    if (currentPhase === "instruction" && target === "guided") return "guided";
    if (currentPhase === "guided" && target === "assessment")
      return "assessment";
  }
  return undefined;
}

// ---------------------------------------------------------------------------
// extractScores — parse [SCORES]criterion:score,...[/SCORES] marker
// ---------------------------------------------------------------------------
function extractScores(text: string): Record<string, number> | undefined {
  const match = text.match(/\[SCORES\]([\s\S]+?)\[\/SCORES\]/i);
  if (!match) return undefined;
  const pairs = match[1].split(",").map((p) => p.trim()).filter(Boolean);
  const scores: Record<string, number> = {};
  for (const pair of pairs) {
    const [criterion, scoreStr] = pair.split(":").map((s) => s.trim());
    const score = parseFloat(scoreStr);
    if (criterion && !isNaN(score)) {
      scores[criterion] = score;
    }
  }
  return Object.keys(scores).length > 0 ? scores : undefined;
}

// ---------------------------------------------------------------------------
// extractSamples — parse [SAMPLE: type | criterion]excerpt[/SAMPLE] markers
// ---------------------------------------------------------------------------
function extractSamples(
  text: string
): Array<{ type: string; criterion: string; excerpt: string }> | undefined {
  const regex = /\[SAMPLE:\s*(\w+)\s*\|\s*(\w[\w\s]*?)\]([\s\S]+?)\[\/SAMPLE\]/gi;
  const samples: Array<{ type: string; criterion: string; excerpt: string }> = [];
  let match;
  while ((match = regex.exec(text)) !== null) {
    samples.push({
      type: match[1].trim(),
      criterion: match[2].trim(),
      excerpt: match[3].trim(),
    });
  }
  return samples.length > 0 ? samples : undefined;
}

// ---------------------------------------------------------------------------
// extractPreferences — parse [PREFERENCE: category | value] markers
// ---------------------------------------------------------------------------
function extractPreferences(
  text: string
): Array<{ category: string; value: string }> | undefined {
  const regex = /\[PREFERENCE:\s*(.+?)\s*\|\s*(.+?)\]/gi;
  const prefs: Array<{ category: string; value: string }> = [];
  let match;
  while ((match = regex.exec(text)) !== null) {
    prefs.push({
      category: match[1].trim(),
      value: match[2].trim(),
    });
  }
  return prefs.length > 0 ? prefs : undefined;
}

// ---------------------------------------------------------------------------
// stripPhaseMarkers — remove structured markers from displayed text
// ---------------------------------------------------------------------------
export function stripPhaseMarkers(text: string): string {
  // NOTE: [STEP], [GUIDED_STAGE], [WRITING_PROMPT], and [EXPECTS_RESPONSE]
  // are intentionally NOT stripped here — client components parse them from
  // message content for UI rendering (step/stage dividers, writing cards).
  return text
    .replace(/\[PHASE_TRANSITION:\s*(?:guided|assessment)\]\s*/gi, "")
    .replace(/\[COMPREHENSION_CHECK:\s*(?:passed|failed)\]\s*/gi, "")
    .replace(/\[COMPREHENSION_CHECK_PASSED\]\s*/gi, "")
    .replace(/\[HINT_GIVEN\]\s*/gi, "")
    .replace(/\[ANSWER_TYPE:\s*\w+\]\s*/gi, "")
    .replace(/\[OPTIONS:\s*.+?\]\s*/gi, "")
    .replace(/\[PASSAGE:\s*"[\s\S]+?"\]\s*/gi, "")
    .replace(/\[ANSWER_PROMPT:\s*[^\]]+?\]\s*/gi, "")
    .replace(/\[SCORES\][\s\S]+?\[\/SCORES\]\s*/gi, "")
    .replace(/\[SAMPLE:\s*[^\]]+?\][\s\S]+?\[\/SAMPLE\]\s*/gi, "")
    .replace(/\[PREFERENCE:\s*[^\]]+?\]\s*/gi, "")
    .trim();
}
