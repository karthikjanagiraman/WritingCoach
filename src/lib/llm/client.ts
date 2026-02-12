import Anthropic from "@anthropic-ai/sdk";
import type { Message, Phase, SessionState, Lesson } from "@/types";
import { buildPromptFromSession } from "./prompt-builder";
import { getLesson } from "./curriculum";
import { getRubric, formatRubricForPrompt } from "./rubrics";

// ---------------------------------------------------------------------------
// CoachResponse — the interface the backend expects
// ---------------------------------------------------------------------------
export interface CoachResponse {
  message: string;
  phaseUpdate?: Phase;
  assessmentReady?: boolean;
  comprehensionPassed?: boolean;
  hintGiven?: boolean;
}

// ---------------------------------------------------------------------------
// Claude API client — singleton for the server process
// ---------------------------------------------------------------------------
let clientInstance: Anthropic | null = null;

function getClient(): Anthropic {
  if (!clientInstance) {
    clientInstance = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });
  }
  return clientInstance;
}

const MODEL = "claude-sonnet-4-5-20250929";
const MAX_TOKENS = 1024;

// ---------------------------------------------------------------------------
// sendMessage — low-level call to Claude API
// ---------------------------------------------------------------------------
export async function sendMessage(
  systemPrompt: string,
  messages: Array<{ role: "user" | "assistant"; content: string }>
): Promise<string> {
  const client = getClient();

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: MAX_TOKENS,
    system: systemPrompt,
    messages,
  });

  const textBlock = response.content.find((block) => block.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("No text content in Claude response");
  }

  return textBlock.text;
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
  studentMessage: string
): Promise<CoachResponse> {
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
    rubricSummary
  );

  // Convert conversation history and append the new student message
  const messages = convertHistory(session.conversationHistory);
  messages.push({ role: "user", content: studentMessage });

  const responseText = await sendMessage(systemPrompt, messages);

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

  return {
    message: stripPhaseMarkers(responseText),
    phaseUpdate,
    assessmentReady,
    comprehensionPassed,
    hintGiven,
  };
}

// ---------------------------------------------------------------------------
// getInitialPrompt — generate the opening message for a lesson session
// ---------------------------------------------------------------------------
export async function getInitialPrompt(
  lesson: Lesson,
  studentName: string,
  tier: number
): Promise<string> {
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
    studentName
  );

  const messages: Array<{ role: "user" | "assistant"; content: string }> = [
    {
      role: "user",
      content: `Hi! I'm ${studentName} and I'm ready for today's lesson.`,
    },
  ];

  const responseText = await sendMessage(systemPrompt, messages);
  return stripPhaseMarkers(responseText);
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
    if (currentPhase === "guided" && target === "assessment" && lesson.rubricId)
      return "assessment";
  }
  return undefined;
}

// ---------------------------------------------------------------------------
// stripPhaseMarkers — remove structured markers from displayed text
// ---------------------------------------------------------------------------
export function stripPhaseMarkers(text: string): string {
  return text
    .replace(/\[PHASE_TRANSITION:\s*(?:guided|assessment)\]\s*/gi, "")
    .replace(/\[COMPREHENSION_CHECK:\s*(?:passed|failed)\]\s*/gi, "")
    .replace(/\[COMPREHENSION_CHECK_PASSED\]\s*/gi, "")
    .replace(/\[HINT_GIVEN\]\s*/gi, "")
    .trim();
}
