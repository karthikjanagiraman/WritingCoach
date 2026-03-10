import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { llmSend } from "@/lib/llm/provider";
import { sendMessageWithMeta } from "@/lib/llm";
import { logLLMInteraction } from "@/lib/event-logger";
import { scoreToLevel } from "@/lib/skill-map";
import placementRubric from "@/lib/llm/content/rubrics/placement.json";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PlacementPromptScores {
  narrative: { story_structure: number; character_voice: number; language_mechanics: number };
  descriptive: { sensory_detail: number; word_choice: number; imagery_figurative: number };
  persuasive: { argument_clarity: number; evidence_reasoning: number; persuasive_voice: number };
}

interface PlacementAnalysis {
  promptScores: PlacementPromptScores;
  promptAverages: { narrative: number; descriptive: number; persuasive: number };
  promptFlags: { narrative: string[]; descriptive: string[]; persuasive: string[] };
  overallAverage: number;
  recommendedTier: number;
  confidence: number;
  strengths: string[];
  gaps: string[];
  reasoning: string;
  isFallback?: boolean;
}

class PlacementParseError extends Error {
  rawText: string;
  constructor(rawText: string, cause: unknown) {
    super(`Failed to parse placement analysis JSON: ${cause}`);
    this.name = "PlacementParseError";
    this.rawText = rawText;
  }
}

// ---------------------------------------------------------------------------
// Prompt Assembly
// ---------------------------------------------------------------------------

const PLACEMENT_EVAL_ROLE = `You are a placement assessment evaluator for WriteWhiz, an AI writing coach for children ages 7-15. Your job is to evaluate three writing samples from a child to determine their writing skill level and recommend an appropriate instructional tier.

YOUR ROLE:
- You are a diagnostic evaluator, NOT a teacher or coach. Your audience is the system, not the child.
- Your evaluation directly determines what curriculum this child receives. Over-placement means frustration; under-placement means boredom. Both cause the child to disengage.
- Be calibrated, honest, and evidence-based. Score what you SEE in the writing, not what you hope the child can do.

CRITICAL CALIBRATION RULE:
- A score of 2 ("Approaching") is the EXPECTED baseline for a child at their age band attempting unfamiliar prompts. This is not a failing grade -- it means the child is developing normally.
- A score of 3 ("Meets Expectations") means the child demonstrates solid competence in that dimension for their age.
- A score of 4 ("Exceeds Expectations") should be rare -- it means genuinely exceptional work for a child of that age.
- A score of 1 ("Beginning") means significant gaps that require foundational instruction.
- Do NOT grade on an adult scale. A 7-year-old who writes three connected sentences with a character and a setting is performing well.`;

function buildAgeAnchorSection(ageBand: string, ageTier: number, childAge: number): string {
  return `## Age-Calibrated Expectations

This child is ${childAge} years old (age band: ${ageBand}, typical tier: ${ageTier}).

WHAT TO EXPECT FROM A CHILD IN THIS AGE BAND:

### Writing Length Expectations
- Ages 7-9: 20-80 words per response is NORMAL. 100+ words is above average.
- Ages 10-12: 40-150 words per response is NORMAL. 200+ words is above average.
- Ages 13-15: 60-250 words per response is NORMAL. 300+ words is above average.

### Developmental Norms
- Ages 7-9: Invented spelling is normal. Sentence fragments happen. Story = "first this happened, then this happened." Persuasion = "I think X because Y." Descriptions use basic adjectives. ALL of this is developmentally appropriate and should NOT lower scores.
- Ages 10-12: Spelling is mostly conventional. Paragraphs may be present. Stories have beginnings, middles, endings. Arguments have reasons. Descriptions start using figurative language. Some grammatical errors are normal.
- Ages 13-15: Writing should show some sophistication in structure and vocabulary. Errors are fewer but still acceptable. Voice should be emerging. Arguments should have evidence. Narrative should have intentional structure.

### Score Interpretation for This Age Band
When you score, use the age-anchored descriptors provided with each dimension below. A "3" for a 7-year-old is VERY DIFFERENT from a "3" for a 14-year-old. You MUST use the correct age-band anchor.`;
}

function buildPerPromptScoringSection(ageBand: string): string {
  const rubric = placementRubric.prompt_types;
  const sections: string[] = [`## Scoring Dimensions by Prompt Type

For each writing sample, score on the dimensions listed below. Use the ${ageBand} descriptors.`];

  const promptOrder: Array<{ key: keyof typeof rubric; label: string; promptNum: number }> = [
    { key: "narrative", label: "Narrative (Story Writing)", promptNum: 1 },
    { key: "descriptive", label: "Descriptive (Sensory Writing)", promptNum: 2 },
    { key: "persuasive", label: "Persuasive (Argument Writing)", promptNum: 3 },
  ];

  for (const { key, label, promptNum } of promptOrder) {
    const promptType = rubric[key];
    const dimLines: string[] = [`\n### Prompt ${promptNum}: ${label}`];

    for (const dim of promptType.dimensions) {
      const weightPct = Math.round(dim.weight * 100);
      dimLines.push(`\n**${dim.name}** (${weightPct}% weight) -- ${dim.display_name}`);
      const anchors = dim.age_anchors[ageBand as keyof typeof dim.age_anchors];
      if (anchors) {
        for (const level of ["4", "3", "2", "1"]) {
          dimLines.push(`  ${level}: ${anchors[level as keyof typeof anchors]}`);
        }
      }
    }
    sections.push(dimLines.join("\n"));
  }

  return sections.join("\n");
}

const PLACEMENT_EVAL_EFFORT = `## Effort and Engagement Assessment

After scoring each prompt's dimensions, assess the overall effort level:

SIGNS OF GENUINE EFFORT (even if quality is low):
- The child wrote about the topic
- They used their own ideas and words
- The response length is within normal range for their age
- Errors look developmental (misspellings of hard words, comma confusion) rather than careless (random characters)

SIGNS OF LOW EFFORT:
- Response is dramatically shorter than expected for age (< 10 words for any age)
- Content is off-topic or unrelated to the prompt
- Obvious filler text (repeated words/sentences, "I don't know I don't know I don't know")
- Copy-pasted prompt text as the response

HOW EFFORT AFFECTS YOUR EVALUATION:
- DO score the dimensions based on what is written, even if effort is low
- DO lower your confidence score (0.3-0.5 range) if effort is clearly low
- DO note effort concerns in your reasoning
- DO NOT inflate dimension scores to compensate for low effort
- DO NOT refuse to score -- always provide your best assessment of what the writing demonstrates`;

const PLACEMENT_EVAL_QUALITY_DETECTION = `## Content Quality Detection

GIBBERISH DETECTION:
If a response contains primarily random characters, keyboard mashing (e.g., "asdfghjkl"), or nonsensical text:
- Score all dimensions for that prompt at 1
- Note "gibberish_detected" in promptFlags for that prompt
- This does NOT automatically mean the child should be placed at Tier 1 -- the other two responses may demonstrate real ability

COPIED/REPEATED TEXT:
If a response is a near-copy of the prompt itself, or repeats the same sentence multiple times:
- Score based on whatever original content exists
- Note "copied_text" or "repetitive" in promptFlags
- Lower confidence for that prompt

EMPTY OR NEAR-EMPTY RESPONSES:
If a response is empty, whitespace only, or under 5 words:
- Score all dimensions at 1 for that prompt
- Note "insufficient_content" in promptFlags
- DO NOT let one empty response drag the overall recommendation down if the other two responses show ability
- Confidence should be lower (0.4-0.6) because you have less data

POTENTIALLY AI-GENERATED TEXT:
If a response seems unnaturally sophisticated for the child's age (adult vocabulary, perfectly structured paragraphs from a 7-year-old, essay-style formatting from a young child):
- Score what you see, but note "potentially_ai_assisted" in promptFlags
- Set confidence lower (0.4-0.6)
- The tier recommendation should reflect the WRITING ABILITY demonstrated, even if it may not be the child's own work -- the parent can retake later`;

function buildESLSection(homeLanguage?: string | null): string {
  const lang = homeLanguage?.trim() || "unspecified";
  return `## ESL/Multilingual Writer Considerations

This child is an English Language Learner (home language: ${lang}).

EVALUATION ADJUSTMENTS:
1. GRAMMAR AND MECHANICS: ESL students often demonstrate writing ability that exceeds their grammatical accuracy. Common ESL patterns (article omission, preposition confusion, tense inconsistency, word order variation) should NOT automatically lower the language_mechanics score. Focus on whether meaning is clear DESPITE grammatical patterns.

2. VOCABULARY: ESL writers may use simpler vocabulary not because of limited writing ability but because of limited English vocabulary. If the IDEAS are sophisticated but the words are simple, score the IDEAS, not the vocabulary level. A child who writes "The dog was very very happy and jumped so high" is demonstrating descriptive ability through repetition and action even if the vocabulary is basic.

3. WHAT TO SCORE NORMALLY (no ESL adjustment):
   - Story structure and ideas
   - Argument clarity and reasoning
   - Sensory detail (concept, not just word choice)
   - Character and voice (the attempt to create voice, not the polish)
   - Persuasive intent and evidence

4. WHAT TO SCORE WITH ESL AWARENESS (weight ideas over execution):
   - Word choice -- score the INTENT of word choice, not just the vocabulary level
   - Language mechanics -- focus on meaning clarity, not grammatical correctness
   - Imagery/figurative language -- credit attempts even if phrasing is awkward

5. ANTI-PATRONIZING RULE: ESL students should NOT be automatically placed lower. A child who writes a well-structured story with ESL grammar patterns may still be a Tier 2 or Tier 3 writer. The tier reflects WRITING ABILITY, not English proficiency. Conversely, do not inflate scores out of sympathy -- score honestly, then let the tier recommendation reflect actual writing skill.

6. REASONING: If ESL factors are relevant to your scoring, note this in your reasoning: "ESL patterns observed in grammar/mechanics, but story structure and ideas demonstrate [Tier X] writing ability."`;
}

const PLACEMENT_EVAL_ANTI_GAMING = `## Anti-Gaming Rules

DO NOT reward:
- Word count alone. A 200-word response that repeats the same idea is NOT better than a 50-word response with a clear story arc.
- Vocabulary showing off. Big words used incorrectly or inappropriately for the child's age should not inflate scores.
- Formulaic structure. "First, Second, Third, In conclusion" without substance is template writing, not skilled writing.
- Copying from the prompt. Reusing prompt language doesn't demonstrate writing ability.

DO reward:
- Originality of ideas, even in simple language
- Genuine voice, even if imperfect
- Attempt at structure, even if incomplete
- Risk-taking (trying figurative language even if it doesn't land, attempting dialogue even if the punctuation is wrong)
- Specificity (concrete details over vague statements)`;

const PLACEMENT_EVAL_REASONING_RULES = `## Reasoning and Language Rules

Your reasoning and feedback text (strengths, gaps) will be shown to PARENTS, not to the child. Write accordingly:

LANGUAGE RULES:
- Use "Your child" not "The student" or "The writer"
- Use plain language: "Your child showed a talent for..." not "The student demonstrates proficiency in..."
- Be specific: "Your child created a vivid character by describing what they wore and how they talked" not "Good character development"
- Be honest but kind: "Your child is still developing their persuasive writing skills" not "Your child failed to construct an argument"
- Never use educational jargon without explanation: say "putting thoughts in a logical order" not "demonstrating organizational coherence"

GOOD REASONING EXAMPLES:
- "Your child wrote a story with a clear beginning, a problem, and a resolution -- that's strong story structure for an 8-year-old. Their character felt real because they described what the character was wearing and feeling."
- "Your child's persuasive writing shows they can state an opinion clearly, but they need practice supporting their opinion with specific reasons and examples."
- "Your child's descriptions focus mainly on what things look like. Encouraging them to describe sounds, smells, and textures will help make their writing more vivid."

BAD REASONING EXAMPLES (do not write like this):
- "The student demonstrates emerging proficiency in narrative construction." (jargon, impersonal)
- "Good writing." (too vague, useless)
- "Your child cannot write persuasively." (discouraging, absolute)
- "The narrative exhibits structural deficiencies in the exposition and rising action." (academic language inappropriate for a parent audience)

STRENGTHS AND GAPS:
- strengths: List 2-4 specific things the child did well ACROSS the three writing samples. Quote or reference their actual writing.
- gaps: List 1-3 specific areas for growth. Frame as "next steps" not "failures". Connect each gap to what it means for their learning path.`;

const PLACEMENT_EVAL_OUTPUT_FORMAT = `## Required JSON Output Format

You MUST respond with ONLY valid JSON. No markdown, no explanation, no preamble. The JSON must match this exact structure:

{
  "promptScores": {
    "narrative": {
      "story_structure": <1|2|3|4>,
      "character_voice": <1|2|3|4>,
      "language_mechanics": <1|2|3|4>
    },
    "descriptive": {
      "sensory_detail": <1|2|3|4>,
      "word_choice": <1|2|3|4>,
      "imagery_figurative": <1|2|3|4>
    },
    "persuasive": {
      "argument_clarity": <1|2|3|4>,
      "evidence_reasoning": <1|2|3|4>,
      "persuasive_voice": <1|2|3|4>
    }
  },
  "promptAverages": {
    "narrative": <weighted average, 1 decimal>,
    "descriptive": <weighted average, 1 decimal>,
    "persuasive": <weighted average, 1 decimal>
  },
  "promptFlags": {
    "narrative": [],
    "descriptive": [],
    "persuasive": []
  },
  "overallAverage": <grand average of promptAverages, 1 decimal>,
  "recommendedTier": <1|2|3>,
  "confidence": <0.0-1.0, 1 decimal>,
  "strengths": [
    "<specific strength with reference to child's writing>",
    "<another specific strength>"
  ],
  "gaps": [
    "<specific growth area framed as next step>",
    "<another growth area>"
  ],
  "reasoning": "<2-4 sentence parent-facing explanation of why this tier was recommended, referencing what you observed in the writing>"
}

SCORING RULES:
- promptScores: Integer scores only (1, 2, 3, or 4). No half-scores for placement -- we need clean tier signals.
- promptAverages: Computed from promptScores using the weights defined above, rounded to 1 decimal.
- promptFlags: Array of strings for each prompt. Valid flags: "gibberish_detected", "copied_text", "repetitive", "insufficient_content", "potentially_ai_assisted", "esl_patterns_noted". Empty array [] if no flags.
- overallAverage: Average of the three promptAverages, rounded to 1 decimal.
- recommendedTier: Your recommended tier (1, 2, or 3) based on the scoring and your professional judgment. See tier recommendation guidelines below.
- confidence: How confident you are in this recommendation. 0.8-1.0 = high confidence (clear signal), 0.5-0.7 = moderate (mixed signals), 0.3-0.5 = low (insufficient data or contradictory signals).
- strengths: 2-4 items. Each MUST reference specific writing the child produced.
- gaps: 1-3 items. Each MUST be framed as a growth opportunity, not a deficit.
- reasoning: 2-4 sentences. Parent-facing. Plain language. Must justify the tier recommendation.

TIER RECOMMENDATION GUIDELINES:
- overallAverage >= 3.0 AND at least 2 prompts with average >= 3.0 -> Recommend Tier 3 (if age permits)
- overallAverage >= 2.0 AND at least 2 prompts with average >= 2.0 -> Recommend Tier 2 (if age permits)
- overallAverage < 2.0 OR majority of prompts flagged -> Recommend Tier 1
- IMPORTANT: Your recommendation is a SUGGESTION that will be constrained by the child's age. A 14-year-old can never be placed at Tier 1 regardless of scores. You should still recommend what you observe -- the system handles clamping.`;

function buildPlacementEvalPrompt(
  child: { name: string; age: number; isEsl?: boolean; homeLanguage?: string | null },
): string {
  const ageBand = child.age <= 9 ? "7-9" : child.age <= 12 ? "10-12" : "13-15";
  const ageTier = child.age <= 9 ? 1 : child.age <= 12 ? 2 : 3;

  const sections: string[] = [];

  sections.push(PLACEMENT_EVAL_ROLE);
  sections.push(buildAgeAnchorSection(ageBand, ageTier, child.age));
  sections.push(buildPerPromptScoringSection(ageBand));
  sections.push(PLACEMENT_EVAL_EFFORT);
  sections.push(PLACEMENT_EVAL_QUALITY_DETECTION);

  if (child.isEsl) {
    sections.push(buildESLSection(child.homeLanguage));
  }

  sections.push(PLACEMENT_EVAL_ANTI_GAMING);
  sections.push(PLACEMENT_EVAL_REASONING_RULES);
  sections.push(PLACEMENT_EVAL_OUTPUT_FORMAT);

  return sections.join("\n\n---\n\n");
}

function buildUserMessage(
  child: { name: string; age: number },
  prompts: string[],
  responses: string[],
  wordCounts: number[],
): string {
  const ageBand = child.age <= 9 ? "7-9" : child.age <= 12 ? "10-12" : "13-15";
  const minWords = ageBand === "7-9" ? 20 : ageBand === "10-12" ? 40 : 60;

  return `Evaluate these writing samples from ${child.name} (age ${child.age}).

RESPONSE WORD COUNTS:
- Narrative: ${wordCounts[0]} words
- Descriptive: ${wordCounts[1]} words
- Persuasive: ${wordCounts[2]} words

AGE-APPROPRIATE WORD MINIMUMS:
- This child's age band (${ageBand}): minimum ${minWords} words per response

---

PROMPT 1 (Narrative): ${prompts[0]}

RESPONSE 1:
${responses[0]}

---

PROMPT 2 (Descriptive): ${prompts[1]}

RESPONSE 2:
${responses[1]}

---

PROMPT 3 (Persuasive): ${prompts[2]}

RESPONSE 3:
${responses[2]}`;
}

// ---------------------------------------------------------------------------
// JSON Parsing
// ---------------------------------------------------------------------------

function parsePlacementAnalysis(rawText: string): PlacementAnalysis {
  let jsonStr = rawText.trim();

  // Strip markdown code fences
  const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonMatch) {
    jsonStr = jsonMatch[1].trim();
  }

  // Try to extract JSON from mixed content (LLM sometimes adds preamble)
  if (!jsonStr.startsWith("{")) {
    const objectStart = jsonStr.indexOf("{");
    const objectEnd = jsonStr.lastIndexOf("}");
    if (objectStart !== -1 && objectEnd !== -1) {
      jsonStr = jsonStr.slice(objectStart, objectEnd + 1);
    }
  }

  try {
    const parsed = JSON.parse(jsonStr);
    return validateAndNormalizePlacementAnalysis(parsed);
  } catch (parseError) {
    throw new PlacementParseError(rawText, parseError);
  }
}

function validateAndNormalizePlacementAnalysis(
  parsed: Record<string, unknown>,
): PlacementAnalysis {
  // Validate required fields exist
  if (!parsed.promptScores || typeof parsed.promptScores !== "object") {
    throw new Error("Missing or invalid promptScores");
  }
  if (!parsed.promptAverages || typeof parsed.promptAverages !== "object") {
    throw new Error("Missing or invalid promptAverages");
  }
  if (typeof parsed.overallAverage !== "number") {
    throw new Error("Missing or invalid overallAverage");
  }
  if (typeof parsed.recommendedTier !== "number" || parsed.recommendedTier < 1 || parsed.recommendedTier > 3) {
    throw new Error("Missing or invalid recommendedTier");
  }
  if (typeof parsed.confidence !== "number" || parsed.confidence < 0 || parsed.confidence > 1) {
    throw new Error("Missing or invalid confidence");
  }
  if (!Array.isArray(parsed.strengths)) {
    throw new Error("Missing or invalid strengths");
  }
  if (!Array.isArray(parsed.gaps)) {
    throw new Error("Missing or invalid gaps");
  }
  if (typeof parsed.reasoning !== "string") {
    throw new Error("Missing or invalid reasoning");
  }

  // Validate promptScores structure
  const ps = parsed.promptScores as Record<string, Record<string, number>>;
  for (const type of ["narrative", "descriptive", "persuasive"]) {
    if (!ps[type] || typeof ps[type] !== "object") {
      throw new Error(`Missing promptScores.${type}`);
    }
  }

  // Ensure promptFlags defaults
  const rawFlags = (parsed.promptFlags as Record<string, string[]>) || {};
  const promptFlags: { narrative: string[]; descriptive: string[]; persuasive: string[] } = {
    narrative: rawFlags.narrative || [],
    descriptive: rawFlags.descriptive || [],
    persuasive: rawFlags.persuasive || [],
  };

  return {
    promptScores: parsed.promptScores as PlacementPromptScores,
    promptAverages: parsed.promptAverages as { narrative: number; descriptive: number; persuasive: number },
    promptFlags,
    overallAverage: parsed.overallAverage as number,
    recommendedTier: parsed.recommendedTier as number,
    confidence: parsed.confidence as number,
    strengths: parsed.strengths as string[],
    gaps: parsed.gaps as string[],
    reasoning: parsed.reasoning as string,
  };
}

// ---------------------------------------------------------------------------
// Tier Clamping & Validation
// ---------------------------------------------------------------------------

function clampTier(
  recommendedTier: number,
  childAge: number,
): { assignedTier: number; wasClamped: boolean; clampReason?: string } {
  const ageTier = childAge <= 9 ? 1 : childAge <= 12 ? 2 : 3;
  const minTier = Math.max(1, ageTier - 1);
  const maxTier = Math.min(3, ageTier + 1);

  if (recommendedTier < minTier) {
    return {
      assignedTier: minTier,
      wasClamped: true,
      clampReason: `Recommended Tier ${recommendedTier} was below the minimum (Tier ${minTier}) for a ${childAge}-year-old. Adjusted to Tier ${minTier}.`,
    };
  }
  if (recommendedTier > maxTier) {
    return {
      assignedTier: maxTier,
      wasClamped: true,
      clampReason: `Recommended Tier ${recommendedTier} was above the maximum (Tier ${maxTier}) for a ${childAge}-year-old. Adjusted to Tier ${maxTier}.`,
    };
  }
  return { assignedTier: recommendedTier, wasClamped: false };
}

function validateTierRecommendation(analysis: PlacementAnalysis): PlacementAnalysis {
  const { overallAverage, recommendedTier } = analysis;

  if (overallAverage >= 3.0 && recommendedTier === 1) {
    analysis.recommendedTier = 2;
    analysis.reasoning += " (System note: tier adjusted upward to match scores.)";
  }

  if (overallAverage < 1.5 && recommendedTier === 3) {
    analysis.recommendedTier = 1;
    analysis.reasoning += " (System note: tier adjusted downward to match scores.)";
  }

  return analysis;
}

// ---------------------------------------------------------------------------
// Fallback
// ---------------------------------------------------------------------------

function ageBasedFallbackPlacement(child: { name: string; age: number }): PlacementAnalysis {
  const ageTier = child.age <= 9 ? 1 : child.age <= 12 ? 2 : 3;

  return {
    promptScores: {
      narrative: { story_structure: 2, character_voice: 2, language_mechanics: 2 },
      descriptive: { sensory_detail: 2, word_choice: 2, imagery_figurative: 2 },
      persuasive: { argument_clarity: 2, evidence_reasoning: 2, persuasive_voice: 2 },
    },
    promptAverages: { narrative: 2.0, descriptive: 2.0, persuasive: 2.0 },
    promptFlags: { narrative: [], descriptive: [], persuasive: [] },
    overallAverage: 2.0,
    recommendedTier: ageTier,
    confidence: 0.3,
    strengths: [
      "We weren't able to fully evaluate the writing samples due to a technical issue.",
    ],
    gaps: [
      "We've placed your child at the age-appropriate starting tier. Their curriculum will adapt based on lesson performance.",
    ],
    reasoning: `We experienced a technical issue evaluating ${child.name}'s writing. We've placed them at Tier ${ageTier}, which is the standard starting point for their age group. The system will automatically adjust their tier based on how they perform in their first few lessons.`,
    isFallback: true,
  };
}

function isContentPolicyRefusal(text: string): boolean {
  const refusalPhrases = ["I cannot evaluate", "I'm not able to", "content policy", "I can't assess", "I'm unable to"];
  const hasRefusal = refusalPhrases.some((phrase) => text.toLowerCase().includes(phrase.toLowerCase()));
  const hasJson = text.includes("{") && text.includes("}");
  return hasRefusal && !hasJson;
}

// ---------------------------------------------------------------------------
// Retry Logic
// ---------------------------------------------------------------------------

const MAX_RETRIES = 2;
const RETRY_DELAYS = [0, 1000];

async function evaluateWithRetry(
  systemPrompt: string,
  userMsg: string,
  child: { name: string; age: number },
): Promise<{ analysis: PlacementAnalysis; llmResult: { text: string; provider: string; model: string; inputTokens: number | null; outputTokens: number | null; cacheReadTokens: number | null; cacheWriteTokens: number | null; latencyMs: number } }> {
  let lastError: Error | undefined;
  const judgeModel = process.env.LLM_JUDGE_MODEL;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    if (attempt > 0) {
      await new Promise((r) => setTimeout(r, RETRY_DELAYS[attempt - 1]));
    }

    try {
      let text: string;
      let llmResult: { text: string; provider: string; model: string; inputTokens: number | null; outputTokens: number | null; cacheReadTokens: number | null; cacheWriteTokens: number | null; latencyMs: number };

      if (judgeModel) {
        const result = await llmSend({
          systemPrompt,
          messages: [{ role: "user", content: userMsg }],
          maxTokens: 2048,
          model: judgeModel,
        });
        text = result.text;
        llmResult = result;
      } else {
        const result = await sendMessageWithMeta(
          systemPrompt,
          [{ role: "user", content: userMsg }],
          2048,
        );
        text = result.text;
        llmResult = {
          text: result.text,
          provider: result.llmMeta.provider,
          model: result.llmMeta.model,
          inputTokens: result.llmMeta.inputTokens,
          outputTokens: result.llmMeta.outputTokens,
          cacheReadTokens: result.llmMeta.cacheReadTokens,
          cacheWriteTokens: result.llmMeta.cacheWriteTokens,
          latencyMs: result.llmMeta.latencyMs,
        };
      }

      // Check for content policy refusal
      if (isContentPolicyRefusal(text)) {
        const fallbackAnalysis = ageBasedFallbackPlacement(child);
        return { analysis: fallbackAnalysis, llmResult };
      }

      const analysis = parsePlacementAnalysis(text);
      return { analysis, llmResult };
    } catch (error) {
      lastError = error as Error;

      if (error instanceof PlacementParseError && attempt < MAX_RETRIES) {
        // Try JSON repair
        try {
          const repairPrompt = `The following text was supposed to be valid JSON but failed to parse. Extract the JSON object and return ONLY the corrected JSON, nothing else:\n\n${error.rawText}`;
          let repairedText: string;
          if (judgeModel) {
            const repairResult = await llmSend({
              systemPrompt: "You are a JSON repair tool. Return only valid JSON.",
              messages: [{ role: "user", content: repairPrompt }],
              maxTokens: 2048,
              model: judgeModel,
            });
            repairedText = repairResult.text;
          } else {
            const repairResult = await sendMessageWithMeta(
              "You are a JSON repair tool. Return only valid JSON.",
              [{ role: "user", content: repairPrompt }],
              2048,
            );
            repairedText = repairResult.text;
          }
          const analysis = parsePlacementAnalysis(repairedText);
          // Use the original attempt's LLM metadata (repair is a secondary call)
          const fallbackLlmResult = {
            text: repairedText,
            provider: "anthropic",
            model: judgeModel || "unknown",
            inputTokens: null,
            outputTokens: null,
            cacheReadTokens: null,
            cacheWriteTokens: null,
            latencyMs: 0,
          };
          return { analysis, llmResult: fallbackLlmResult };
        } catch {
          // Repair also failed, continue to next retry
          continue;
        }
      }

      // Non-parse errors (network, API) -- retry directly
      if (attempt < MAX_RETRIES) continue;
    }
  }

  // All retries exhausted -- fall back
  const fallbackAnalysis = ageBasedFallbackPlacement(child);
  console.error("Placement evaluation failed after all retries, using fallback:", lastError);
  return {
    analysis: fallbackAnalysis,
    llmResult: {
      text: "FALLBACK",
      provider: "none",
      model: "none",
      inputTokens: null,
      outputTokens: null,
      cacheReadTokens: null,
      cacheWriteTokens: null,
      latencyMs: 0,
    },
  };
}

// ---------------------------------------------------------------------------
// SkillProgress Seeding
// ---------------------------------------------------------------------------

async function seedSkillProgressFromPlacement(
  childId: string,
  promptScores: PlacementPromptScores,
): Promise<void> {
  const seedMappings = [
    // Narrative
    { category: "narrative", skill: "story_structure", score: promptScores.narrative.story_structure },
    { category: "narrative", skill: "voice_style", score: promptScores.narrative.character_voice },
    { category: "narrative", skill: "setting_description", score: promptScores.narrative.language_mechanics },
    // Descriptive
    { category: "descriptive", skill: "sensory_detail", score: promptScores.descriptive.sensory_detail },
    { category: "descriptive", skill: "word_choice", score: promptScores.descriptive.word_choice },
    { category: "descriptive", skill: "figurative_language", score: promptScores.descriptive.imagery_figurative },
    // Persuasive
    { category: "persuasive", skill: "argument_structure", score: promptScores.persuasive.argument_clarity },
    { category: "persuasive", skill: "evidence_support", score: promptScores.persuasive.evidence_reasoning },
    { category: "persuasive", skill: "persuasive_language", score: promptScores.persuasive.persuasive_voice },
  ];

  for (const { category, skill, score } of seedMappings) {
    const level = scoreToLevel(score);

    await prisma.skillProgress.upsert({
      where: {
        childId_skillCategory_skillName: {
          childId,
          skillCategory: category,
          skillName: skill,
        },
      },
      update: {
        score,
        level,
        totalAttempts: 1,
        lastAssessedAt: new Date(),
      },
      create: {
        childId,
        skillCategory: category,
        skillName: skill,
        score,
        level,
        totalAttempts: 1,
        lastAssessedAt: new Date(),
      },
    });
  }
}

// ---------------------------------------------------------------------------
// Route Handler
// ---------------------------------------------------------------------------

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { childId, prompts, responses, retake } = body;

    if (!childId || typeof childId !== "string") {
      return NextResponse.json(
        { error: "childId is required" },
        { status: 400 },
      );
    }

    if (
      !Array.isArray(prompts) ||
      prompts.length !== 3 ||
      !Array.isArray(responses) ||
      responses.length !== 3
    ) {
      return NextResponse.json(
        { error: "Exactly 3 prompts and 3 responses are required" },
        { status: 400 },
      );
    }

    // Verify parent owns the child
    const child = await prisma.childProfile.findFirst({
      where: { id: childId, parentId: session.user.userId },
    });

    if (!child) {
      return NextResponse.json(
        { error: "Child not found" },
        { status: 404 },
      );
    }

    // Check if placement already exists (unless retake)
    const existingResult = await prisma.placementResult.findUnique({
      where: { childId },
    });

    if (existingResult && !retake) {
      return NextResponse.json(
        { error: "Placement assessment already completed for this child" },
        { status: 409 },
      );
    }

    // Compute word counts
    const wordCounts = responses.map((r: string) =>
      r.trim().split(/\s+/).filter((w: string) => w.length > 0).length,
    );

    // Build evaluation prompt
    const systemPrompt = buildPlacementEvalPrompt(child);
    const userMsg = buildUserMessage(child, prompts, responses, wordCounts);

    // Run evaluation with retry logic
    const { analysis, llmResult } = await evaluateWithRetry(systemPrompt, userMsg, child);

    // Log the LLM interaction
    logLLMInteraction({
      childId,
      requestType: "placement_analysis",
      systemPrompt,
      userMessage: userMsg,
      rawResponse: llmResult.text,
      llmResult,
    });

    // Validate and clamp
    const validatedAnalysis = validateTierRecommendation(analysis);
    const clampResult = clampTier(validatedAnalysis.recommendedTier, child.age);

    // DB transaction: create/replace PlacementResult, update child tier, clean up draft
    const placementData = {
      childId,
      prompts: JSON.stringify(prompts),
      responses: JSON.stringify(responses),
      aiAnalysis: JSON.stringify({
        promptScores: validatedAnalysis.promptScores,
        promptAverages: validatedAnalysis.promptAverages,
        promptFlags: validatedAnalysis.promptFlags,
        overallAverage: validatedAnalysis.overallAverage,
        strengths: validatedAnalysis.strengths,
        gaps: validatedAnalysis.gaps,
        reasoning: validatedAnalysis.reasoning,
        wasClamped: clampResult.wasClamped,
        clampReason: clampResult.clampReason,
      }),
      recommendedTier: validatedAnalysis.recommendedTier,
      assignedTier: clampResult.assignedTier,
      confidence: validatedAnalysis.confidence,
    };

    const placementResult = await prisma.$transaction(async (tx) => {
      // If retake, delete old result first
      if (retake && existingResult) {
        await tx.placementResult.delete({ where: { childId } });
      }

      const result = await tx.placementResult.create({ data: placementData });

      await tx.childProfile.update({
        where: { id: childId },
        data: { tier: clampResult.assignedTier },
      });

      await tx.placementDraft.deleteMany({ where: { childId } });

      return result;
    });

    // Seed SkillProgress from placement scores (outside transaction for simplicity)
    try {
      await seedSkillProgressFromPlacement(childId, validatedAnalysis.promptScores);
    } catch (seedError) {
      console.error("Failed to seed SkillProgress from placement:", seedError);
      // Non-fatal: the child can still proceed
    }

    return NextResponse.json({
      placementId: placementResult.id,
      recommendedTier: validatedAnalysis.recommendedTier,
      assignedTier: clampResult.assignedTier,
      confidence: validatedAnalysis.confidence,
      analysis: {
        promptScores: validatedAnalysis.promptScores,
        promptAverages: validatedAnalysis.promptAverages,
        promptFlags: validatedAnalysis.promptFlags,
        overallAverage: validatedAnalysis.overallAverage,
        strengths: validatedAnalysis.strengths,
        gaps: validatedAnalysis.gaps,
        reasoning: validatedAnalysis.reasoning,
      },
    });
  } catch (error) {
    console.error("POST /api/placement/submit error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
