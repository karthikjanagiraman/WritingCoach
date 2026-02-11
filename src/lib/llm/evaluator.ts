import type { AssessmentResult, Rubric, Tier } from "@/types";
import { sendMessage } from "./client";
import { formatRubricForPrompt } from "./rubrics";
import { TIER_INSERTS } from "./prompt-builder";

// ---------------------------------------------------------------------------
// evaluateWriting — sends student writing + rubric to Claude for scoring
// (keeps the original export name the backend expects)
// ---------------------------------------------------------------------------
export async function evaluateWriting(
  submissionText: string,
  rubric: Rubric,
  studentName: string,
  tier: number
): Promise<AssessmentResult> {
  return evaluateSubmission(submissionText, rubric, tier as Tier);
}

// ---------------------------------------------------------------------------
// evaluateSubmission — core evaluation logic
// ---------------------------------------------------------------------------
export async function evaluateSubmission(
  studentText: string,
  rubric: Rubric,
  tier: Tier
): Promise<AssessmentResult> {
  const rubricText = formatRubricForPrompt(rubric);

  const systemPrompt = `You are an expert writing assessor for young student writers.

${TIER_INSERTS[tier]}

TASK: Evaluate the student's writing against the rubric below. Be fair, encouraging, and constructive.

${rubricText}

RESPONSE FORMAT — you MUST respond with valid JSON and nothing else:
{
  "scores": {
    "<criterion_name>": <score 1-4>,
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
- 4 = Exceeds Expectations
- 3 = Meets Expectations
- 2 = Approaching Expectations
- 1 = Beginning
- Be generous with young writers — give credit for genuine attempts.
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
  lessonTitle: string
): Promise<AssessmentResult> {
  const systemPrompt = `You are an expert writing assessor for young student writers.

${TIER_INSERTS[tier]}

TASK: Evaluate the student's writing for the lesson "${lessonTitle}". This is a practice exercise, not a formal assessment. Be encouraging and constructive.

RESPONSE FORMAT — you MUST respond with valid JSON and nothing else:
{
  "scores": {
    "creativity": <score 1-4>,
    "effort": <score 1-4>,
    "skill_practice": <score 1-4>
  },
  "overallScore": <average rounded to nearest integer>,
  "feedback": {
    "strength": "<1-2 sentences about what the student did well, referencing their actual writing>",
    "growth": "<1-2 sentences about one area for improvement, with a concrete suggestion>",
    "encouragement": "<1 warm sentence celebrating their effort and looking forward>"
  }
}

SCORING GUIDELINES:
- 4 = Exceeds Expectations
- 3 = Meets Expectations
- 2 = Approaching Expectations
- 1 = Beginning
- Be generous with young writers — give credit for genuine attempts.
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
    for (const key of ["creativity", "effort", "skill_practice"]) {
      const score = parsed.scores?.[key];
      scores[key] = typeof score === "number" ? Math.min(4, Math.max(1, Math.round(score))) : 2;
    }

    let overallScore = parsed.overallScore;
    if (typeof overallScore !== "number" || overallScore < 1 || overallScore > 4) {
      overallScore = Math.round((scores.creativity + scores.effort + scores.skill_practice) / 3);
    }

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
      scores: { creativity: 2, effort: 3, skill_practice: 2 },
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
          ? Math.min(4, Math.max(1, Math.round(score)))
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
      overallScore = Math.round(overallScore * 10) / 10;
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
