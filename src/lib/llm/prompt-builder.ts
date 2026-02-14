import fs from "fs";
import path from "path";
import type { SessionState, Tier, Phase } from "@/types";

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
export const PHASE_PROMPTS: Record<Phase, string> = {
  instruction: extractSection(
    skillContent.phasePrompts,
    "## Instruction Phase"
  ),
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
  phaseState?: {
    instructionCompleted?: boolean;
    comprehensionPassed?: boolean;
    phase1Step?: number;
    guidedAttempts?: number;
    hintsGiven?: number;
    assessmentSubmitted?: boolean;
  };
  rubricSummary?: string;
}

export function buildPrompt(context: PromptContext): string {
  const parts: string[] = [];

  // 1. Core skill instructions
  parts.push(CORE_SYSTEM_PROMPT);

  // 2. Tier adaptation
  parts.push(TIER_INSERTS[context.tier]);

  // 3. Phase behavior
  parts.push(PHASE_PROMPTS[context.phase]);

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

  if (context.phaseState) {
    sessionContext += `

Phase State:
- Instruction completed: ${context.phaseState.instructionCompleted ?? false}
- Comprehension check passed: ${context.phaseState.comprehensionPassed ?? false}
- Phase 1 current step: ${context.phaseState.phase1Step ?? 1}
- Guided practice attempts: ${context.phaseState.guidedAttempts ?? 0}
- Hints given: ${context.phaseState.hintsGiven ?? 0}
- Assessment submitted: ${context.phaseState.assessmentSubmitted ?? false}`;
  }

  parts.push(sessionContext);

  // 5. Rubric context (assessment or feedback phase)
  if (
    (context.phase === "assessment" || context.phase === "feedback") &&
    context.rubricSummary
  ) {
    parts.push(`## Assessment Rubric

Use this rubric to grade the student's submission:

${context.rubricSummary}`);
  }

  return parts.join("\n\n---\n\n");
}

// ---------------------------------------------------------------------------
// buildPromptFromSession — convenience wrapper using SessionState
// ---------------------------------------------------------------------------
export function buildPromptFromSession(
  session: SessionState,
  lesson: { title: string; learningObjectives: string[]; tier: Tier },
  studentName?: string,
  rubricSummary?: string
): string {
  return buildPrompt({
    studentName,
    tier: lesson.tier,
    phase: session.phase,
    lessonId: session.lessonId,
    lessonTitle: lesson.title,
    learningObjectives: lesson.learningObjectives,
    phaseState: session.phaseState
      ? {
          instructionCompleted: session.phaseState.instructionCompleted,
          comprehensionPassed: session.phaseState.comprehensionCheckPassed,
          phase1Step: session.phaseState.phase1Step,
          guidedAttempts: session.phaseState.guidedAttempts,
          hintsGiven: session.phaseState.hintsGiven,
        }
      : undefined,
    rubricSummary,
  });
}
