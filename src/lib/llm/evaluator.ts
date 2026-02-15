import type { AssessmentResult, Rubric, Tier } from "@/types";
import { sendMessage } from "./client";
import { formatRubricForPrompt } from "./rubrics";
import { TIER_INSERTS } from "./prompt-builder";

export interface LessonContext {
  title: string;
  learningObjectives: string[];
}

// ---------------------------------------------------------------------------
// evaluateWriting — sends student writing + rubric to Claude for scoring
// (keeps the original export name the backend expects)
// ---------------------------------------------------------------------------
export async function evaluateWriting(
  submissionText: string,
  rubric: Rubric,
  studentName: string,
  tier: number,
  lessonContext?: LessonContext
): Promise<AssessmentResult> {
  return evaluateSubmission(submissionText, rubric, tier as Tier, lessonContext);
}

// ---------------------------------------------------------------------------
// evaluateSubmission — core evaluation logic
// ---------------------------------------------------------------------------
export async function evaluateSubmission(
  studentText: string,
  rubric: Rubric,
  tier: Tier,
  lessonContext?: LessonContext
): Promise<AssessmentResult> {
  const rubricText = formatRubricForPrompt(rubric);

  // Build feedback stems section from rubric criteria
  const feedbackStemsText = rubric.criteria
    .map(
      (c) =>
        `- ${c.display_name}: strength stem: "${c.feedback_stems.strength}" / growth stem: "${c.feedback_stems.growth}"`
    )
    .join("\n");

  const lessonSection = lessonContext
    ? `\nLESSON: "${lessonContext.title}"\nLEARNING OBJECTIVES:\n${lessonContext.learningObjectives.map((o) => `- ${o}`).join("\n")}\n`
    : "";

  const systemPrompt = `You are an expert writing assessor for young student writers.

${TIER_INSERTS[tier]}
${lessonSection}
TASK: Evaluate the student's writing against the rubric below.

${rubricText}

FEEDBACK STEMS (use these as starting points for your feedback):
${feedbackStemsText}

RESPONSE FORMAT — you MUST respond with valid JSON and nothing else:
{
  "scores": {
    "<criterion_name>": <score: 1, 1.5, 2, 2.5, 3, 3.5, or 4>,
    ...one entry per criterion in the rubric
  },
  "overallScore": <weighted average rounded to 1 decimal>,
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
- The "strength" feedback MUST quote or reference specific parts of the student's writing.
- The "growth" feedback should focus on the MOST impactful single improvement.
- The "encouragement" should be warm and age-appropriate for the tier.`;

  const messages: Array<{ role: "user" | "assistant"; content: string }> = [
    {
      role: "user",
      content: `Please evaluate this student writing:\n\n---\n${studentText}\n---`,
    },
  ];

  const responseText = await sendMessage(systemPrompt, messages);

  return parseEvaluationResponse(responseText, rubric);
}

// ---------------------------------------------------------------------------
// evaluateWritingGeneral — evaluate without a rubric (for non-capstone lessons)
// ---------------------------------------------------------------------------
export async function evaluateWritingGeneral(
  studentText: string,
  tier: Tier,
  lessonTitle: string,
  lessonContext?: LessonContext
): Promise<AssessmentResult> {
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
  "overallScore": <average rounded to 1 decimal>,
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

  const responseText = await sendMessage(systemPrompt, messages);

  return parseGeneralEvaluationResponse(responseText);
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
function parseGeneralEvaluationResponse(responseText: string): AssessmentResult {
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
      scores[key] = typeof score === "number" ? Math.min(4, Math.max(1, roundToHalf(score))) : 2;
    }

    let overallScore = parsed.overallScore;
    if (typeof overallScore !== "number" || overallScore < 1 || overallScore > 4) {
      overallScore = (scores.ideas_content + scores.organization + scores.voice_style) / 3;
    }
    overallScore = Math.round(overallScore * 10) / 10;

    return {
      scores,
      overallScore,
      feedback: {
        strength: parsed.feedback?.strength ?? "Great effort on this writing piece!",
        growth: parsed.feedback?.growth ?? "Keep practicing and try adding more details next time.",
        encouragement: parsed.feedback?.encouragement ?? "You're becoming a stronger writer every day!",
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

    // Calculate weighted overall score if not provided or invalid
    let overallScore = parsed.overallScore;
    if (
      typeof overallScore !== "number" ||
      overallScore < 1 ||
      overallScore > 4
    ) {
      overallScore = 0;
      for (const criterion of rubric.criteria) {
        overallScore += scores[criterion.name] * criterion.weight;
      }
    }
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
