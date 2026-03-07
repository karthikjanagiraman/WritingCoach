import type { AssessmentResult, Rubric, Tier, Message, PhaseState } from "@/types";
import { sendMessageWithMeta } from "./client";
import type { LLMMeta } from "./client";
import { formatRubricForPrompt } from "./rubrics";
import { TIER_INSERTS } from "./prompt-builder";

export interface LessonContext {
  title: string;
  learningObjectives: string[];
}

export interface EvalResultWithMeta extends AssessmentResult {
  llmMeta: LLMMeta;
  systemPromptUsed: string;
}

// ---------------------------------------------------------------------------
// extractTeachingContext — summarize what was taught from conversation history
// ---------------------------------------------------------------------------

/**
 * Extract a concise summary of what was taught during instruction and guided
 * practice from the session's conversation history and phase state.
 *
 * This is pure string/regex extraction — no LLM call. The output is injected
 * into the evaluator's system prompt so the LLM knows what techniques were
 * discussed and can reference them in feedback.
 *
 * Returns undefined if there's not enough context to be useful.
 */
export function extractTeachingContext(
  conversationHistory: Message[],
  phaseState: PhaseState,
  lessonTemplate?: string
): string | undefined {
  if (!conversationHistory || conversationHistory.length === 0) {
    return undefined;
  }

  const sections: string[] = [];

  // 1. Lesson template info
  if (lessonTemplate) {
    const templateLabels: Record<string, string> = {
      try_first: "Student tried the skill first, then coach taught from their attempt",
      study_apply: "Coach introduced concept with examples, then student applied it",
      workshop: "Coach and student co-constructed a piece together",
    };
    const label = templateLabels[lessonTemplate] ?? lessonTemplate;
    sections.push(`Teaching approach: ${label}`);
  }

  // 2. Extract key teaching content from coach messages in instruction phase
  const coachMessages = conversationHistory.filter((m) => m.role === "coach");
  const studentMessages = conversationHistory.filter((m) => m.role === "student");

  // Find instruction-phase coach messages (before guided practice started)
  // We look for messages before any guided stage markers were set
  const instructionMessages: string[] = [];
  const guidedMessages: string[] = [];
  let inGuidedPhase = false;

  for (const msg of coachMessages) {
    const content = msg.content;
    // Check if this message signals guided practice
    if (
      content.includes("practice") ||
      content.includes("your turn") ||
      content.includes("try it") ||
      inGuidedPhase
    ) {
      if (
        content.includes("Stage") ||
        content.includes("exercise") ||
        content.includes("practice")
      ) {
        inGuidedPhase = true;
        guidedMessages.push(content);
        continue;
      }
    }
    if (!inGuidedPhase) {
      instructionMessages.push(content);
    }
  }

  // 3. Extract techniques/concepts mentioned in instruction
  const techniques = extractTechniques(instructionMessages);
  if (techniques.length > 0) {
    sections.push(`Key techniques taught: ${techniques.join(", ")}`);
  }

  // 4. Extract short quoted examples from coach messages (mentor texts)
  const examples = extractExamples(instructionMessages);
  if (examples.length > 0) {
    sections.push(
      `Examples discussed:\n${examples.map((e) => `  - "${e}"`).join("\n")}`
    );
  }

  // 5. Summarize student practice from guided messages
  const studentPracticeSnippets = extractStudentPractice(studentMessages, guidedMessages);
  if (studentPracticeSnippets.length > 0) {
    sections.push(
      `Student practiced: ${studentPracticeSnippets.join("; ")}`
    );
  }

  // 6. Phase state summary
  const phaseInfo: string[] = [];
  if (phaseState.guidedStage) {
    const stageLabels: Record<number, string> = {
      1: "Focused Drill",
      2: "Combination",
      3: "Mini-Draft",
    };
    phaseInfo.push(
      `Completed guided practice through Stage ${phaseState.guidedStage} (${stageLabels[phaseState.guidedStage] ?? ""})`
    );
  }
  if (phaseState.hintsGiven && phaseState.hintsGiven > 0) {
    phaseInfo.push(
      `${phaseState.hintsGiven} hint${phaseState.hintsGiven === 1 ? "" : "s"} given during practice`
    );
  }
  if (phaseInfo.length > 0) {
    sections.push(phaseInfo.join(". "));
  }

  if (sections.length === 0) {
    return undefined;
  }

  return `TEACHING CONTEXT (what was covered in this lesson before the assessment):\n${sections.map((s) => `- ${s}`).join("\n")}`;
}

// ---------------------------------------------------------------------------
// extractTechniques — find technique/concept keywords from coach messages
// ---------------------------------------------------------------------------

function extractTechniques(messages: string[]): string[] {
  const allText = messages.join(" ").toLowerCase();
  const found: string[] = [];

  // Common writing technique patterns
  const techniquePatterns: Array<{ pattern: RegExp; label: string }> = [
    { pattern: /\bhooks?\b/, label: "hooks" },
    { pattern: /\baction hook/, label: "action hooks" },
    { pattern: /\bquestion hook/, label: "question hooks" },
    { pattern: /\bdialogue\b/, label: "dialogue" },
    { pattern: /\bsensory\s+detail/, label: "sensory details" },
    { pattern: /\bfive\s+senses\b/, label: "five senses" },
    { pattern: /\bshow,?\s*don'?t\s+tell/, label: "show don't tell" },
    { pattern: /\btransition\s*words?\b/, label: "transition words" },
    { pattern: /\btopic\s+sentence/, label: "topic sentences" },
    { pattern: /\bclim[a]x\b/, label: "climax" },
    { pattern: /\brising\s+action/, label: "rising action" },
    { pattern: /\bfalling\s+action/, label: "falling action" },
    { pattern: /\bexposition\b/, label: "exposition" },
    { pattern: /\bresolution\b/, label: "resolution" },
    { pattern: /\bsetting\b/, label: "setting" },
    { pattern: /\bcharacter\s*(development|trait|feeling)/, label: "character development" },
    { pattern: /\bpoint\s+of\s+view/, label: "point of view" },
    { pattern: /\bfirst\s+person/, label: "first person" },
    { pattern: /\bthird\s+person/, label: "third person" },
    { pattern: /\bmetaphor/, label: "metaphors" },
    { pattern: /\bsimile/, label: "similes" },
    { pattern: /\bfigurative\s+language/, label: "figurative language" },
    { pattern: /\bpersonification/, label: "personification" },
    { pattern: /\bonomatopoeia/, label: "onomatopoeia" },
    { pattern: /\bflashback/, label: "flashbacks" },
    { pattern: /\bforeshadowing/, label: "foreshadowing" },
    { pattern: /\bthesis\s*(statement)?/, label: "thesis statement" },
    { pattern: /\bevidence\b/, label: "evidence" },
    { pattern: /\bcounterargument/, label: "counterarguments" },
    { pattern: /\btopic\s+sentence/, label: "topic sentences" },
    { pattern: /\bconclusion\b/, label: "conclusion" },
    { pattern: /\bintroduction\b/, label: "introduction" },
    { pattern: /\bparagraph\s+structure/, label: "paragraph structure" },
    { pattern: /\bword\s+choice/, label: "word choice" },
    { pattern: /\bvoice\b/, label: "voice" },
    { pattern: /\btone\b/, label: "tone" },
    { pattern: /\bimagery\b/, label: "imagery" },
    { pattern: /\bpacing\b/, label: "pacing" },
    { pattern: /\bsuspense\b/, label: "suspense" },
    { pattern: /\bmood\b/, label: "mood" },
  ];

  const seen = new Set<string>();
  for (const { pattern, label } of techniquePatterns) {
    if (pattern.test(allText) && !seen.has(label)) {
      found.push(label);
      seen.add(label);
    }
  }

  return found.slice(0, 6); // Cap at 6 most relevant
}

// ---------------------------------------------------------------------------
// extractExamples — find quoted or example text from coach messages
// ---------------------------------------------------------------------------

function extractExamples(messages: string[]): string[] {
  const examples: string[] = [];

  for (const msg of messages) {
    // Find quoted text (in double or single quotes, or italicized markdown)
    const quoteMatches = msg.match(/"([^"]{10,80})"/g);
    if (quoteMatches) {
      for (const match of quoteMatches.slice(0, 2)) {
        const cleaned = match.replace(/"/g, "");
        // Filter out non-example text (instructions, questions)
        if (
          !cleaned.includes("?") &&
          !cleaned.startsWith("Remember") &&
          !cleaned.startsWith("Try") &&
          cleaned.length >= 10
        ) {
          examples.push(cleaned);
        }
      }
    }

    // Find italicized markdown examples
    const italicMatches = msg.match(/\*([^*]{10,80})\*/g);
    if (italicMatches) {
      for (const match of italicMatches.slice(0, 2)) {
        const cleaned = match.replace(/\*/g, "");
        if (cleaned.length >= 10 && !cleaned.includes("?")) {
          examples.push(cleaned);
        }
      }
    }
  }

  return examples.slice(0, 3); // Cap at 3 examples
}

// ---------------------------------------------------------------------------
// extractStudentPractice — summarize what the student practiced
// ---------------------------------------------------------------------------

function extractStudentPractice(
  studentMessages: Message[],
  guidedCoachMessages: string[]
): string[] {
  const summaries: string[] = [];

  // Count how many writing exercises the student did
  const writingAttempts = studentMessages.filter(
    (m) => m.content.length > 30 // Real writing attempts, not short responses
  );

  if (writingAttempts.length > 0) {
    summaries.push(
      `wrote ${writingAttempts.length} practice piece${writingAttempts.length === 1 ? "" : "s"} during guided practice`
    );
  }

  // Check if coach provided feedback on their practice
  const coachFeedbackCount = guidedCoachMessages.filter(
    (m) =>
      m.toLowerCase().includes("great") ||
      m.toLowerCase().includes("nice") ||
      m.toLowerCase().includes("well done") ||
      m.toLowerCase().includes("good")
  ).length;

  if (coachFeedbackCount > 0) {
    summaries.push(
      `received feedback on ${coachFeedbackCount} practice attempt${coachFeedbackCount === 1 ? "" : "s"}`
    );
  }

  return summaries;
}

// ---------------------------------------------------------------------------
// evaluateWriting — sends student writing + rubric to Claude for scoring
// ---------------------------------------------------------------------------
export async function evaluateWriting(
  submissionText: string,
  rubric: Rubric,
  studentName: string,
  tier: number,
  lessonContext?: LessonContext,
  teachingContext?: string
): Promise<EvalResultWithMeta> {
  return evaluateSubmission(
    submissionText,
    rubric,
    tier as Tier,
    lessonContext,
    teachingContext
  );
}

// ---------------------------------------------------------------------------
// evaluateSubmission — core evaluation logic (enhanced with teaching context)
// ---------------------------------------------------------------------------
export async function evaluateSubmission(
  studentText: string,
  rubric: Rubric,
  tier: Tier,
  lessonContext?: LessonContext,
  teachingContext?: string
): Promise<EvalResultWithMeta> {
  const rubricText = formatRubricForPrompt(rubric);

  // Build feedback stems section from rubric criteria
  const feedbackStemsText = rubric.criteria
    .map(
      (c) =>
        `- ${c.display_name}: strength stem: "${c.feedback_stems.strength}" / growth stem: "${c.feedback_stems.growth}"`
    )
    .join("\n");

  // Build lesson section with objectives
  const lessonSection = lessonContext
    ? `## This Lesson
Title: "${lessonContext.title}"
Learning Objectives:
${lessonContext.learningObjectives.map((o) => `- ${o}`).join("\n")}
`
    : "";

  // Build teaching context section (new)
  const teachingSection = teachingContext
    ? `\n${teachingContext}\n`
    : "";

  const systemPrompt = `You are an expert writing assessor for young student writers.

${TIER_INSERTS[tier]}

${lessonSection}${teachingSection}
## Your Task
Evaluate this student's writing based on how well it demonstrates the skills taught in THIS lesson. Your feedback must reference the specific techniques and concepts from the lesson objectives above.

## Rubric
${rubricText}

FEEDBACK STEMS (use these as starting points for your feedback):
${feedbackStemsText}

RESPONSE FORMAT — you MUST respond with valid JSON and nothing else:
{
  "scores": {
    "<criterion_name>": <score: 1, 1.5, 2, 2.5, 3, 3.5, or 4>,
    ...one entry per criterion in the rubric
  },
  "feedback": {
    "strength": "<1-2 sentences about what the student did well, referencing their actual writing AND a specific technique from the lesson>",
    "growth": "<1-2 sentences about one area for improvement, connected to a lesson objective, with a concrete suggestion>",
    "encouragement": "<1 warm sentence celebrating their effort and looking forward>"
  }
}

SCORING GUIDELINES:
- 4 = Exceeds Expectations — genuinely excellent work for this age/tier
- 3 = Meets Expectations — solid, competent writing
- 2 = Approaching Expectations — shows understanding but needs development
- 1 = Beginning — significant gaps in this area
- Half-scores (1.5, 2.5, 3.5) are encouraged when work falls between levels.
- Score HONESTLY based on writing quality. Do NOT inflate scores to be encouraging — the feedback section is where you encourage. A score of 2 is normal for students still learning. Reserve 4 for genuinely excellent work.

CRITICAL — LESSON-SPECIFIC FEEDBACK:
- Your "strength" feedback MUST name a specific technique from the lesson objectives that the student demonstrated, and quote their actual writing.
- Your "growth" feedback MUST suggest improvement on a technique from the lesson objectives, with a concrete example of what they could try.
- Do NOT give generic feedback like "good ideas" or "nice organization" — always connect to what was taught in THIS lesson.
- If the student demonstrated a technique from guided practice, acknowledge it.
- The "encouragement" should be warm and age-appropriate for the tier.`;

  const messages: Array<{ role: "user" | "assistant"; content: string }> = [
    {
      role: "user",
      content: `Please evaluate this student writing:\n\n---\n${studentText}\n---`,
    },
  ];

  const { text: responseText, llmMeta } = await sendMessageWithMeta(
    systemPrompt,
    messages
  );

  return {
    ...parseEvaluationResponse(responseText, rubric),
    llmMeta,
    systemPromptUsed: systemPrompt,
  };
}

// ---------------------------------------------------------------------------
// evaluateWritingGeneral — evaluate without a rubric (for non-capstone lessons)
// DEPRECATED: Kept for backwards compatibility but no longer called by submit.
// All lessons now go through evaluateWriting() with generated rubrics.
// ---------------------------------------------------------------------------
export async function evaluateWritingGeneral(
  studentText: string,
  tier: Tier,
  lessonTitle: string,
  lessonContext?: LessonContext
): Promise<EvalResultWithMeta> {
  const lessonSection = lessonContext
    ? `\nLESSON: "${lessonContext.title}"\nLEARNING OBJECTIVES:\n${lessonContext.learningObjectives.map((o) => `- ${o}`).join("\n")}\n`
    : `\nLESSON: "${lessonTitle}"\n`;

  const systemPrompt = `You are an expert writing assessor for young student writers.

${TIER_INSERTS[tier]}
${lessonSection}
TASK: Evaluate the student's writing for this lesson. Assess how well the writing demonstrates the lesson's goals.

RESPONSE FORMAT — you MUST respond with valid JSON and nothing else:
{
  "scores": {
    "ideas_content": <score: 1, 1.5, 2, 2.5, 3, 3.5, or 4>,
    "organization": <score: 1, 1.5, 2, 2.5, 3, 3.5, or 4>,
    "voice_style": <score: 1, 1.5, 2, 2.5, 3, 3.5, or 4>
  },
  "feedback": {
    "strength": "<1-2 sentences about what the student did well, referencing their actual writing>",
    "growth": "<1-2 sentences about one area for improvement, with a concrete suggestion>",
    "encouragement": "<1 warm sentence celebrating their effort and looking forward>"
  }
}

SCORING GUIDELINES:
- 4 = Exceeds Expectations — genuinely excellent work for this age/tier
- 3 = Meets Expectations — solid, competent writing
- 2 = Approaching Expectations — shows understanding but needs development
- 1 = Beginning — significant gaps in this area
- Half-scores (1.5, 2.5, 3.5) are encouraged when work falls between levels.
- Score HONESTLY based on writing quality. Do NOT inflate scores to be encouraging — the feedback section is where you encourage. A score of 2 is normal for students still learning. Reserve 4 for genuinely excellent work.
- The "strength" feedback MUST quote or reference specific parts of the student's writing.`;

  const messages: Array<{ role: "user" | "assistant"; content: string }> = [
    {
      role: "user",
      content: `Please evaluate this student writing:\n\n---\n${studentText}\n---`,
    },
  ];

  const { text: responseText, llmMeta } = await sendMessageWithMeta(
    systemPrompt,
    messages
  );

  return {
    ...parseGeneralEvaluationResponse(responseText),
    llmMeta,
    systemPromptUsed: systemPrompt,
  };
}

// ---------------------------------------------------------------------------
// roundToHalf — round a number to the nearest 0.5
// ---------------------------------------------------------------------------
function roundToHalf(n: number): number {
  return Math.round(n * 2) / 2;
}

// ---------------------------------------------------------------------------
// parseGeneralEvaluationResponse — parse response for rubric-free evaluation
// ---------------------------------------------------------------------------
function parseGeneralEvaluationResponse(
  responseText: string
): AssessmentResult {
  let jsonStr = responseText.trim();
  const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonMatch) {
    jsonStr = jsonMatch[1].trim();
  }

  try {
    const parsed = JSON.parse(jsonStr);

    const scores: Record<string, number> = {};
    for (const key of ["ideas_content", "organization", "voice_style"]) {
      const score = parsed.scores?.[key];
      scores[key] =
        typeof score === "number"
          ? Math.min(4, Math.max(1, roundToHalf(score)))
          : 2;
    }

    // Always compute overall score from criteria — never trust LLM's value
    let overallScore =
      (scores.ideas_content + scores.organization + scores.voice_style) / 3;
    overallScore = Math.round(overallScore * 10) / 10;

    return {
      scores,
      overallScore,
      feedback: {
        strength:
          parsed.feedback?.strength ?? "Great effort on this writing piece!",
        growth:
          parsed.feedback?.growth ??
          "Keep practicing and try adding more details next time.",
        encouragement:
          parsed.feedback?.encouragement ??
          "You're becoming a stronger writer every day!",
      },
    };
  } catch {
    return {
      scores: { ideas_content: 2, organization: 2, voice_style: 2 },
      overallScore: 2,
      feedback: {
        strength: "You put real effort into this writing piece!",
        growth: "Keep practicing the skills from this lesson.",
        encouragement: "Every time you write, you get a little bit better!",
      },
    };
  }
}

// ---------------------------------------------------------------------------
// parseEvaluationResponse — extract structured result from Claude's response
// ---------------------------------------------------------------------------
function parseEvaluationResponse(
  responseText: string,
  rubric: Rubric
): AssessmentResult {
  // Try to extract JSON from the response (handle markdown code blocks)
  let jsonStr = responseText.trim();
  const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonMatch) {
    jsonStr = jsonMatch[1].trim();
  }

  try {
    const parsed = JSON.parse(jsonStr);

    // Validate scores exist for each criterion
    const scores: Record<string, number> = {};
    for (const criterion of rubric.criteria) {
      const score = parsed.scores?.[criterion.name];
      scores[criterion.name] =
        typeof score === "number"
          ? Math.min(4, Math.max(1, roundToHalf(score)))
          : 2;
    }

    // Always compute overall score from weighted criteria — never trust LLM's value
    let overallScore = 0;
    for (const criterion of rubric.criteria) {
      overallScore += scores[criterion.name] * criterion.weight;
    }
    overallScore = Math.round(overallScore * 10) / 10;

    // Log warning if LLM's self-reported score differs significantly
    if (typeof parsed.overallScore === "number" && Math.abs(parsed.overallScore - overallScore) > 0.5) {
      console.warn(
        `[Evaluator] LLM overallScore (${parsed.overallScore}) differs from computed (${overallScore}) — using computed`
      );
    }

    return {
      scores,
      overallScore,
      feedback: {
        strength:
          parsed.feedback?.strength ?? "Great effort on this writing piece!",
        growth:
          parsed.feedback?.growth ??
          "Keep practicing and try adding more details next time.",
        encouragement:
          parsed.feedback?.encouragement ??
          "You're becoming a stronger writer every day!",
      },
    };
  } catch {
    // Fallback: if JSON parsing fails, return a safe default
    const scores: Record<string, number> = {};
    for (const criterion of rubric.criteria) {
      scores[criterion.name] = 2;
    }

    return {
      scores,
      overallScore: 2,
      feedback: {
        strength: "You put real effort into this writing piece!",
        growth: "Keep practicing the skills from this lesson.",
        encouragement: "Every time you write, you get a little bit better!",
      },
    };
  }
}
