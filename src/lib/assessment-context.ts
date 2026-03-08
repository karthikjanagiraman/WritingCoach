import type {
  AssessmentContext,
  Message,
  PhaseState,
  Rubric,
  Tier,
  WritingType,
} from "@/types";
import { extractTeachingContext } from "@/lib/llm/evaluator";
import { sendMessageWithMeta } from "@/lib/llm/client";
import { TIER_INSERTS } from "@/lib/llm/prompt-builder";

// ---------------------------------------------------------------------------
// generateAssessmentContext — LLM call at guided→assessment transition
// ---------------------------------------------------------------------------

export async function generateAssessmentContext(
  conversationHistory: Message[],
  phaseState: PhaseState,
  lesson: {
    title: string;
    type: WritingType;
    learningObjectives: string[];
    template?: string;
  },
  rubric: Rubric | undefined,
  tier: Tier,
  childName?: string
): Promise<AssessmentContext> {
  const selfCheckItems = generateSelfCheckItems(
    rubric,
    tier,
    lesson.learningObjectives
  );
  const wordRange: [number, number] = rubric?.word_range ?? getDefaultWordRange(tier);

  try {
    const teachingContext = extractTeachingContext(
      conversationHistory,
      phaseState,
      lesson.template
    );

    const systemPrompt = `You generate a brief, encouraging writing prompt for a student who just finished learning and practicing writing techniques. Respond with valid JSON only.

${TIER_INSERTS[tier]}

The student${childName ? ` (${childName})` : ""} just completed instruction and guided practice for the lesson "${lesson.title}" (${lesson.type} writing).

Learning objectives: ${lesson.learningObjectives.join("; ")}

${teachingContext ?? ""}

Generate a JSON response with exactly these fields:
{
  "writingPrompt": "<2-3 sentence writing prompt that references the techniques they practiced. Frame it as creative expression, not a test. ${tier === 1 ? "Use simple, concrete language a 7-9 year old understands." : tier === 2 ? "Use clear, encouraging language for a 10-12 year old." : "Use direct, mature language for a 13-15 year old."}>",
  "encouragement": "<1 sentence of warm transition encouragement referencing what they practiced>",
  "techniquesLearned": [<2-4 short technique names they practiced, e.g. "similes", "sensory detail">]
}`;

    const { text } = await sendMessageWithMeta(systemPrompt, [
      {
        role: "user",
        content: "Generate the assessment context now.",
      },
    ]);

    let jsonStr = text.trim();
    const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1].trim();
    }

    const parsed = JSON.parse(jsonStr);

    return {
      writingPrompt:
        typeof parsed.writingPrompt === "string"
          ? parsed.writingPrompt
          : getFallbackPrompt(lesson, tier),
      encouragement:
        typeof parsed.encouragement === "string"
          ? parsed.encouragement
          : "You've been doing great work! Now it's time to show what you can do.",
      techniquesLearned: Array.isArray(parsed.techniquesLearned)
        ? parsed.techniquesLearned.filter(
            (t: unknown) => typeof t === "string"
          )
        : lesson.learningObjectives.slice(0, 3),
      selfCheckItems,
      wordRange,
      tier,
    };
  } catch (err) {
    console.error("Failed to generate assessment context via LLM:", err);
    return buildFallbackAssessmentContext(lesson, rubric, tier);
  }
}

// ---------------------------------------------------------------------------
// generateSelfCheckItems — deterministic, no LLM
// ---------------------------------------------------------------------------

const CRITERION_LABELS: Record<Tier, Record<string, string>> = {
  1: {
    hook: "Did I start with something exciting?",
    character_intro: "Did I tell readers about my character?",
    setting: "Did I describe where my story happens?",
    sensory_detail: "Did I use my five senses?",
    descriptive_language: "Did I use describing words?",
    organization: "Does my writing make sense in order?",
    ideas_content: "Did I share interesting ideas?",
    voice_style: "Does it sound like me?",
    exposition: "Did I set up my story at the beginning?",
    rising_action: "Did the problem get bigger?",
    climax: "Did I write the most exciting part?",
    falling_action_resolution: "Did I finish my story?",
    pacing: "Did I tell the story at a good speed?",
    opinion_statement: "Did I say what I think?",
    reasons: "Did I give reasons for my opinion?",
    closing: "Did I write a good ending?",
    topic_clarity: "Is my topic easy to understand?",
    detail: "Did I add details?",
    structure: "Is my writing organized?",
    word_choice: "Did I pick good words?",
    figurative_language: "Did I use fun comparisons?",
    mood: "Does my writing create a feeling?",
    person_description: "Did I describe the person well?",
    place_description: "Did I describe the place well?",
    pov_consistency: "Did I keep the same point of view?",
    dialogue: "Did I write good talking parts?",
    show_dont_tell: "Did I show instead of tell?",
    suspense: "Did I keep readers wanting more?",
  },
  2: {
    hook: "Does my opening create curiosity?",
    character_intro: "Did I introduce my character with interesting details?",
    setting: "Did I include specific setting details?",
    sensory_detail: "Did I include specific sensory details?",
    descriptive_language: "Did I use descriptive and precise language?",
    organization: "Is my writing well-organized with clear flow?",
    ideas_content: "Are my ideas developed and supported?",
    voice_style: "Does my writing have a clear voice?",
    exposition: "Does my exposition engage readers?",
    rising_action: "Does my rising action build tension?",
    climax: "Is the climax a clear turning point?",
    falling_action_resolution: "Is my resolution satisfying?",
    pacing: "Is the pacing effective throughout?",
    opinion_statement: "Is my opinion clear and well-stated?",
    reasons: "Did I support my opinion with strong reasons?",
    evidence: "Did I include convincing evidence?",
    counterargument: "Did I address the other side?",
    closing: "Does my conclusion tie everything together?",
    topic_clarity: "Is my topic clearly defined?",
    detail: "Did I include specific, relevant details?",
    structure: "Is my writing logically structured?",
    word_choice: "Did I choose precise, effective words?",
    figurative_language: "Did I use figurative language effectively?",
    mood: "Does my writing create the intended mood?",
    person_description: "Did I describe the person vividly?",
    place_description: "Did I bring the place to life?",
    pov_consistency: "Is my point of view consistent?",
    dialogue: "Does my dialogue sound natural and advance the story?",
    show_dont_tell: "Did I show emotions and actions rather than telling?",
    suspense: "Did I use pacing to build suspense?",
    persuasive_techniques: "Did I use persuasive techniques effectively?",
  },
  3: {
    hook: "Does my opening compel the reader forward?",
    character_intro: "Does my characterization feel authentic and layered?",
    setting: "Does my setting contribute to the overall atmosphere?",
    sensory_detail: "Does my sensory imagery create atmosphere?",
    descriptive_language: "Is my language precise and evocative?",
    organization: "Does my structure serve my purpose effectively?",
    ideas_content: "Are my ideas nuanced and well-developed?",
    voice_style: "Is my voice distinctive and intentional?",
    exposition: "Does my exposition balance engagement with context?",
    rising_action: "Does my rising action create meaningful complications?",
    climax: "Is the climax emotionally resonant and structurally sound?",
    falling_action_resolution: "Does my resolution feel earned?",
    pacing: "Does the pacing serve the narrative's needs?",
    opinion_statement: "Is my thesis precise and arguable?",
    reasons: "Are my arguments well-reasoned and substantiated?",
    evidence: "Is my evidence compelling and well-integrated?",
    counterargument: "Do I address counterarguments effectively?",
    closing: "Does my conclusion synthesize rather than just summarize?",
    topic_clarity: "Is my focus sharp and purposeful?",
    detail: "Are my details specific and purposefully chosen?",
    structure: "Does my organizational structure enhance my argument?",
    word_choice: "Is my diction sophisticated and intentional?",
    figurative_language: "Does my figurative language deepen meaning?",
    mood: "Does my writing sustain a deliberate tone?",
    person_description: "Does my character portrait feel three-dimensional?",
    place_description: "Does my sense of place serve the larger piece?",
    pov_consistency: "Is my narrative perspective deliberately chosen?",
    dialogue: "Does my dialogue reveal character and advance narrative?",
    show_dont_tell: "Do I trust the reader to interpret rather than explaining?",
    suspense: "Does my pacing create genuine tension?",
    persuasive_techniques: "Do I deploy rhetorical strategies deliberately?",
    thesis_statement: "Is my thesis specific and defensible?",
    rhetorical_analysis: "Do I analyze rhetoric rather than summarize?",
    research_integration: "Is my research seamlessly integrated?",
  },
};

export function generateSelfCheckItems(
  rubric: Rubric | undefined,
  tier: Tier,
  learningObjectives: string[]
): string[] {
  const tierLabels = CRITERION_LABELS[tier];

  if (rubric && rubric.criteria.length > 0) {
    const items = rubric.criteria
      .map((c) => tierLabels[c.name])
      .filter((label): label is string => !!label);

    if (items.length > 0) {
      return items.slice(0, 5);
    }
  }

  // Fallback: use learning objectives rephrased as questions
  return learningObjectives.slice(0, 4).map((obj) => {
    const cleaned = obj.replace(/^(Students will |Learn to |Understand )/i, "");
    return `Did I ${cleaned.charAt(0).toLowerCase()}${cleaned.slice(1)}${cleaned.endsWith("?") ? "" : "?"}`;
  });
}

// ---------------------------------------------------------------------------
// buildFallbackAssessmentContext — no LLM
// ---------------------------------------------------------------------------

export function buildFallbackAssessmentContext(
  lesson: {
    title: string;
    type: WritingType;
    learningObjectives: string[];
  },
  rubric: Rubric | undefined,
  tier: Tier
): AssessmentContext {
  return {
    writingPrompt: getFallbackPrompt(lesson, tier),
    selfCheckItems: generateSelfCheckItems(
      rubric,
      tier,
      lesson.learningObjectives
    ),
    encouragement:
      tier === 1
        ? "You've been practicing so well! Now show me what you can do!"
        : tier === 2
          ? "Great practice! Time to put your skills to work."
          : "You've built a strong foundation. Time to write.",
    techniquesLearned: lesson.learningObjectives.slice(0, 3),
    wordRange: rubric?.word_range ?? getDefaultWordRange(tier),
    tier,
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getFallbackPrompt(
  lesson: { title: string; type: WritingType; learningObjectives: string[] },
  tier: Tier
): string {
  const typeLabels: Record<WritingType, Record<Tier, string>> = {
    narrative: {
      1: `Write a short story using what you learned about ${lesson.title.toLowerCase()}. Have fun with your characters and setting!`,
      2: `Write a story that demonstrates your understanding of ${lesson.title.toLowerCase()}. Focus on the techniques we practiced.`,
      3: `Compose a narrative piece that showcases your command of ${lesson.title.toLowerCase()}. Be intentional with your craft choices.`,
    },
    persuasive: {
      1: `Write about something you feel strongly about! Use what you learned about ${lesson.title.toLowerCase()} to convince your reader.`,
      2: `Write a persuasive piece using the techniques from ${lesson.title.toLowerCase()}. Support your opinion with strong reasons.`,
      3: `Craft a persuasive argument applying the strategies from ${lesson.title.toLowerCase()}. Build a compelling case.`,
    },
    expository: {
      1: `Write about a topic you know about! Use what you learned about ${lesson.title.toLowerCase()} to teach your reader.`,
      2: `Write an informational piece using the skills from ${lesson.title.toLowerCase()}. Help your reader understand your topic clearly.`,
      3: `Compose an expository piece demonstrating the techniques from ${lesson.title.toLowerCase()}. Prioritize clarity and depth.`,
    },
    descriptive: {
      1: `Use your describing words to paint a picture! Show what you learned about ${lesson.title.toLowerCase()}.`,
      2: `Write a descriptive piece using the techniques from ${lesson.title.toLowerCase()}. Help your reader see, hear, and feel what you're describing.`,
      3: `Craft a descriptive piece that employs the strategies from ${lesson.title.toLowerCase()}. Create a vivid, purposeful portrait.`,
    },
  };

  return typeLabels[lesson.type]?.[tier] ?? typeLabels.narrative[tier];
}

function getDefaultWordRange(tier: Tier): [number, number] {
  switch (tier) {
    case 1:
      return [30, 75];
    case 2:
      return [100, 250];
    case 3:
      return [200, 400];
  }
}
