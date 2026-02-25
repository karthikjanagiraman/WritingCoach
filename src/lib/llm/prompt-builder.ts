import fs from "fs";
import path from "path";
import type { SessionState, Tier, Phase, LessonTemplate } from "@/types";

// ---------------------------------------------------------------------------
// Content directory — skill files loaded once at startup
// ---------------------------------------------------------------------------
const CONTENT_DIR = path.join(process.cwd(), "src/lib/llm/content");

function loadFile(relativePath: string): string {
  return fs.readFileSync(path.join(CONTENT_DIR, relativePath), "utf-8");
}

// Load skill files eagerly (they're read once and cached in memory)
const skillContent = {
  core: loadFile("SKILL.md"),
  tierInserts: loadFile("prompts/tier_inserts.md"),
  phasePrompts: loadFile("prompts/phase_prompts.md"),
};

// ---------------------------------------------------------------------------
// Section extraction — parse markdown sections by ## heading
// ---------------------------------------------------------------------------
function extractSection(content: string, startMarker: string): string {
  const startIndex = content.indexOf(startMarker);
  if (startIndex === -1) return "";

  // Find the next ## heading after this one
  const afterMarker = content.slice(startIndex + startMarker.length);
  const nextHeadingMatch = afterMarker.match(/\n## /);
  const endIndex = nextHeadingMatch
    ? startIndex + startMarker.length + (nextHeadingMatch.index ?? 0)
    : content.length;

  return content.slice(startIndex, endIndex).trim();
}

// ---------------------------------------------------------------------------
// CORE_SYSTEM_PROMPT — loaded from SKILL.md
// ---------------------------------------------------------------------------
export const CORE_SYSTEM_PROMPT: string = skillContent.core;

// ---------------------------------------------------------------------------
// TIER_INSERTS — parsed from tier_inserts.md
// ---------------------------------------------------------------------------
export const TIER_INSERTS: Record<Tier, string> = {
  1: extractSection(skillContent.tierInserts, "## Tier 1 Insert (Ages 7-9)"),
  2: extractSection(skillContent.tierInserts, "## Tier 2 Insert (Ages 10-12)"),
  3: extractSection(skillContent.tierInserts, "## Tier 3 Insert (Ages 13-15)"),
};

// ---------------------------------------------------------------------------
// PHASE_PROMPTS — parsed from phase_prompts.md (now includes feedback)
// ---------------------------------------------------------------------------

// Template-specific instruction prompts
const INSTRUCTION_PROMPTS: Record<LessonTemplate, string> = {
  try_first: extractSection(
    skillContent.phasePrompts,
    "## Instruction Phase: Try First"
  ),
  study_apply: extractSection(
    skillContent.phasePrompts,
    "## Instruction Phase: Study Then Apply"
  ),
  workshop: extractSection(
    skillContent.phasePrompts,
    "## Instruction Phase: Workshop"
  ),
};

// Common rules shared by all instruction templates
const INSTRUCTION_COMMON_RULES = extractSection(
  skillContent.phasePrompts,
  "## Instruction Phase: Common Rules"
);

export const PHASE_PROMPTS: Record<Phase, string> = {
  instruction: INSTRUCTION_COMMON_RULES, // fallback if no template specified
  guided: extractSection(
    skillContent.phasePrompts,
    "## Guided Practice Phase"
  ),
  assessment: extractSection(
    skillContent.phasePrompts,
    "## Assessment Phase"
  ),
  feedback: extractSection(skillContent.phasePrompts, "## Feedback Phase"),
};

// ---------------------------------------------------------------------------
// buildPhaseProgressContext — actionable phase-specific instructions
// ---------------------------------------------------------------------------
const ALL_ANSWER_TYPES = ["choice", "multiselect", "order", "highlight", "freeform"];

function buildPhaseProgressContext(
  phase: Phase,
  ps?: PromptContext["phaseState"]
): string {
  if (!ps) return "";

  if (phase === "instruction") {
    const step = ps.phase1Step ?? 1;
    const nextStep = Math.min(step + 1, 3);
    const compStatus = ps.comprehensionPassed ? "PASSED" : "not yet passed";
    const stepAdvice =
      step < 3
        ? `When you finish this step, emit \`[STEP: ${nextStep}]\` to advance.`
        : "This is the final step. You MUST run a comprehension check now.";

    let text = `## Phase Progress — Instruction

You are on Step ${step} of 3. ${stepAdvice}
Comprehension check status: ${compStatus}.`;

    if (step === 3 || ps.comprehensionPassed !== undefined) {
      text += `
When the student passes the comprehension check, emit \`[COMPREHENSION_CHECK: passed]\` then \`[PHASE_TRANSITION: guided]\`.
These markers are functional triggers that change the phase in the system — without them, the student stays stuck.`;
    }

    // Answer type diversity nudge
    text += buildAnswerTypeDiversityNudge(ps.answerTypesUsed);

    return text;
  }

  if (phase === "guided") {
    const stage = ps.guidedStage ?? 1;
    const nextStage = Math.min(stage + 1, 3);
    const hints = ps.hintsGiven ?? 0;
    const stageAdvice =
      stage < 3
        ? `When you finish this stage, emit \`[GUIDED_STAGE: ${nextStage}]\` to advance.`
        : "This is the final stage. When the student completes their mini-draft satisfactorily, emit `[PHASE_TRANSITION: assessment]`.";

    let text = `## Phase Progress — Guided Practice

You are on Stage ${stage} of 3 (Focused Drill → Combination → Mini-Draft). ${stageAdvice}
Hints used: ${hints}/3.
These markers are functional triggers — without them, the student cannot proceed.`;

    // Answer type diversity nudge
    text += buildAnswerTypeDiversityNudge(ps.answerTypesUsed);

    return text;
  }

  // Assessment and feedback phases don't need phase progress context
  return "";
}

function buildAnswerTypeDiversityNudge(answerTypesUsed?: string[]): string {
  const used = answerTypesUsed ?? [];
  if (used.length === 0) return "";

  const unused = ALL_ANSWER_TYPES.filter((t) => !used.includes(t));
  const lastUsed = used[used.length - 1];

  let nudge = `\n\nAnswer types used so far: [${used.join(", ")}].`;
  if (unused.length > 0) {
    nudge += `\nAvailable types you HAVEN'T used yet: ${unused.join(", ")}.`;
  }
  nudge += `\nRULE: You MUST use a different answer type than your last one (${lastUsed}). Prioritize unused types.`;

  return nudge;
}

// ---------------------------------------------------------------------------
// buildPrompt — assembles the full system prompt for a session + turn
// ---------------------------------------------------------------------------
export interface PromptContext {
  studentName?: string;
  studentAge?: number;
  tier: Tier;
  phase: Phase;
  lessonId?: string;
  lessonTitle: string;
  learningObjectives: string[];
  lessonTemplate?: LessonTemplate;
  learnerContext?: string;
  phaseState?: {
    instructionCompleted?: boolean;
    comprehensionPassed?: boolean;
    phase1Step?: number;
    guidedStage?: number;
    guidedAttempts?: number;
    hintsGiven?: number;
    assessmentSubmitted?: boolean;
    answerTypesUsed?: string[];
  };
  rubricSummary?: string;
}

export function buildPrompt(context: PromptContext): string {
  const parts: string[] = [];

  // 1. Core skill instructions
  parts.push(CORE_SYSTEM_PROMPT);

  // 2. Tier adaptation
  parts.push(TIER_INSERTS[context.tier]);

  // 3. Learner context (if available — injected between tier and phase)
  if (context.learnerContext) {
    parts.push(context.learnerContext);
  }

  // 4. Phase behavior (template-aware for instruction phase)
  if (context.phase === "instruction" && context.lessonTemplate) {
    // Use template-specific prompt + common rules
    parts.push(INSTRUCTION_PROMPTS[context.lessonTemplate]);
    parts.push(INSTRUCTION_COMMON_RULES);
  } else {
    parts.push(PHASE_PROMPTS[context.phase]);
  }

  // 4. Session context
  const objectives = context.learningObjectives
    .map((obj, i) => `${i + 1}. ${obj}`)
    .join("\n");

  let sessionContext = `## Current Session Context

Lesson: ${context.lessonId ? `${context.lessonId} - ` : ""}${context.lessonTitle}
Current Phase: ${context.phase.toUpperCase()}

LEARNING OBJECTIVES:
${objectives}

SESSION BOUNDARY: You are teaching ONLY this lesson. Your responses MUST stay within the learning objectives listed above. NEVER start a new lesson, introduce new topics, or teach content beyond this lesson's scope. If the current phase is complete, direct the student to proceed to the next phase or return to their dashboard to choose another lesson.`;

  if (context.studentName) {
    const ageStr = context.studentAge ? ` (age ${context.studentAge}, Tier ${context.tier})` : ` (Tier ${context.tier})`;
    sessionContext = `Student: ${context.studentName}${ageStr}\n${sessionContext}`;
  }

  if (context.lessonTemplate) {
    sessionContext += `\nLesson Template: ${context.lessonTemplate}`;
  }

  parts.push(sessionContext);

  // Phase progress context (actionable instructions instead of flat state dump)
  const phaseProgress = buildPhaseProgressContext(context.phase, context.phaseState);
  if (phaseProgress) {
    parts.push(phaseProgress);
  }

  // 5. Rubric context (assessment or feedback phase)
  if (
    (context.phase === "assessment" || context.phase === "feedback") &&
    context.rubricSummary
  ) {
    parts.push(`## Assessment Rubric

Use this rubric to grade the student's submission:

${context.rubricSummary}`);
  }

  // Assessment boundary block — appended LAST for end-of-prompt recency
  if (context.phase === "assessment") {
    parts.push(`## CRITICAL: ASSESSMENT BOUNDARY — READ THIS LAST

This is the INDEPENDENT WRITING phase. The student MUST write alone.

PERMITTED responses (choose ONE per turn):
1. INTRO: "Now it's your turn to write! [brief prompt]. Take your time — I'll read it when you're done."
2. ENCOURAGEMENT ONLY: "You're doing great — keep going!" or "Take your time, there's no rush."

FORBIDDEN — do NOT do ANY of these:
- Give examples, suggestions, sentence starters, or story ideas
- Ask questions about their writing approach or content
- Provide structure, outlines, or organizational hints
- Offer vocabulary, phrasing, or technique reminders
- Reference anything taught in earlier phases

If the student asks for help, say: "This is your chance to show what you've learned! Trust yourself — you've got this."

ANY other response is a violation of the assessment protocol.`);
  }

  return parts.join("\n\n---\n\n");
}

// ---------------------------------------------------------------------------
// buildPromptFromSession — convenience wrapper using SessionState
// ---------------------------------------------------------------------------
export function buildPromptFromSession(
  session: SessionState,
  lesson: { title: string; learningObjectives: string[]; tier: Tier; template?: LessonTemplate },
  studentName?: string,
  rubricSummary?: string,
  learnerContext?: string
): string {
  return buildPrompt({
    studentName,
    tier: lesson.tier,
    phase: session.phase,
    lessonId: session.lessonId,
    lessonTitle: lesson.title,
    learningObjectives: lesson.learningObjectives,
    lessonTemplate: lesson.template,
    learnerContext,
    phaseState: session.phaseState
      ? {
          instructionCompleted: session.phaseState.instructionCompleted,
          comprehensionPassed: session.phaseState.comprehensionCheckPassed,
          phase1Step: session.phaseState.phase1Step,
          guidedStage: session.phaseState.guidedStage,
          guidedAttempts: session.phaseState.guidedAttempts,
          hintsGiven: session.phaseState.hintsGiven,
          answerTypesUsed: session.phaseState.answerTypesUsed,
        }
      : undefined,
    rubricSummary,
  });
}
