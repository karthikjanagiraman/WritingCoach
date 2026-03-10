import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { sendMessageWithMeta } from "@/lib/llm";
import { logLLMInteraction } from "@/lib/event-logger";

// ---------------------------------------------------------------------------
// Fallback prompts per age band (used when LLM call fails)
// ---------------------------------------------------------------------------

const FALLBACK_PROMPTS: Record<string, string[]> = {
  "7-9": [
    "Write the beginning of a story about a kid who finds something unexpected on the way to school.",
    "Describe your favorite place to be. Help me see it, hear it, and feel what it's like to be there.",
    "What's the best game to play at recess? Write to convince your friend that your choice is the best one.",
  ],
  "10-12": [
    "Write a story about a character who discovers something hidden that changes their day completely.",
    "Describe a storm -- not just what it looks like, but what it sounds like, smells like, and how it makes you feel.",
    "Should students have a say in what they learn at school? Argue for your position with specific reasons.",
  ],
  "13-15": [
    "Write a scene where a character has to make a difficult choice, and show how they think through it.",
    "Describe a place at two different times of day, showing how the atmosphere completely changes.",
    "Some argue that technology makes people more creative. Others say it makes people less creative. Take a position and defend it.",
  ],
};

// ---------------------------------------------------------------------------
// Prompt Generation System Prompt
// ---------------------------------------------------------------------------

function buildPromptGenerationPrompt(childAge: number): string {
  return `You are generating writing assessment prompts for WriteWhiz, an AI writing coach for children ages 7-15. You must generate exactly 3 prompts in a specific order:

1. A NARRATIVE prompt (tell or start a story)
2. A DESCRIPTIVE prompt (describe something using senses and details)
3. A PERSUASIVE prompt (argue for something or convince someone)

## Age-Calibrated Prompt Complexity

The child is ${childAge} years old. Use the appropriate complexity level:

### Ages 7-9 (Young Writers):
- Prompts should be 1 sentence, max 20 words
- Use concrete, familiar scenarios (pets, family, school, playground, favorite things)
- Narrative: Ask them to START a story (not write a whole one) -- "Write the beginning of a story about..."
- Descriptive: Ask them to describe something they KNOW (their bedroom, their pet, their favorite place)
- Persuasive: Ask them to convince someone of something simple and fun (best ice cream flavor, why recess should be longer)
- Use "you" directly: "Write about a time YOU..." not "Write about a character who..."
- Avoid: abstract concepts, hypotheticals they can't relate to, multi-part instructions

EXAMPLE PROMPTS (ages 7-9):
- Narrative: "Write the beginning of a story about a kid who finds something surprising in their backyard."
- Descriptive: "Describe your favorite place to go. Help me see it, hear it, and feel what it's like to be there."
- Persuasive: "What's the best pet to have? Write to convince your friend that your choice is the best one."

MORE EXAMPLES (ages 7-9):
- Narrative: "Start a story about a day when everything went backwards."
- Descriptive: "Describe what it's like at your school during lunchtime. Use your five senses."
- Persuasive: "Should kids get to pick their own bedtime? Write to convince a grown-up."

### Ages 10-12 (Developing Writers):
- Prompts should be 1-2 sentences, 15-30 words
- Scenarios can be more imaginative or thought-provoking
- Narrative: Can involve more complex setups (discovery, challenge, change)
- Descriptive: Can describe abstract-adjacent things (a season, an emotion-linked place, an event)
- Persuasive: Can tackle real issues they care about (school policies, screen time, fairness)
- Can use "imagine" scenarios but keep them relatable
- Avoid: heavily academic prompts, prompts requiring specialized knowledge

EXAMPLE PROMPTS (ages 10-12):
- Narrative: "Write a story about a character who discovers they have an unusual ability on an ordinary day at school."
- Descriptive: "Describe a thunderstorm from the perspective of someone experiencing one for the first time."
- Persuasive: "Should students be allowed to use phones during lunch? Write a convincing argument for your position."

MORE EXAMPLES (ages 10-12):
- Narrative: "Write about a character who finds a mysterious note in a library book that changes their plans."
- Descriptive: "Describe a busy marketplace or fair so vividly that someone who's never been there can picture it."
- Persuasive: "Your town is deciding whether to build a new skatepark or a community garden. Argue for the one you think is better."

### Ages 13-15 (Advanced Writers):
- Prompts should be 1-2 sentences, may include a brief context-setting clause
- Scenarios should be thought-provoking, nuanced, or have real-world resonance
- Narrative: Can involve moral complexity, multiple perspectives, or thematic depth
- Descriptive: Can involve mood, atmosphere, symbolic settings, or emotional resonance
- Persuasive: Should address genuine debates with legitimate multiple sides
- Treat them with respect -- no childish framing
- Avoid: prompts that have one "right" answer, prompts that require specialized academic knowledge, prompts that could be traumatic

EXAMPLE PROMPTS (ages 13-15):
- Narrative: "Write a scene where two people have a conversation about something important, but neither says exactly what they mean."
- Descriptive: "Describe a place that used to matter to you but has changed. Show both what it was and what it's become."
- Persuasive: "Some people argue that social media has made teenagers more connected than ever. Others say it has made them lonelier. Take a position and defend it."

MORE EXAMPLES (ages 13-15):
- Narrative: "Write a story that begins with an ending -- start with the last moment and work backward to show how it happened."
- Descriptive: "Describe the moments just before something big happens -- the tension, the atmosphere, the small details that feel significant."
- Persuasive: "Should high school students be required to complete community service hours to graduate? Argue your position with specific reasoning."

## Cultural Neutrality Guidelines

YOUR PROMPTS MUST:
- Use universal experiences (weather, food, school, friendship, family, discovery, change)
- Avoid gender-specific scenarios or assumptions about family structure
- Avoid US-centric cultural references (specific holidays, sports, institutions)
- Avoid scenarios requiring wealth or specific living situations (own bedroom, vacation, car)
- Avoid food-specific references that exclude dietary/cultural practices
- Use "your friend" or "your family" instead of "your mom/dad" or "your brother/sister"

YOUR PROMPTS MUST NOT:
- Reference specific religions, political parties, or cultural practices
- Assume the child celebrates specific holidays
- Assume the child lives in a house, has siblings, or has two parents
- Reference specific brands, TV shows, or franchises
- Touch on potentially traumatic topics (death, divorce, bullying, illness) even if age-appropriate -- this is a placement assessment, not therapy

## Variety Rules

- Each of the 3 prompts MUST be a clearly DIFFERENT writing type (narrative, descriptive, persuasive) in that exact order
- Topics across the 3 prompts should be varied (don't make all three about school, or all three about nature)
- At least one prompt should involve imagination/creativity
- At least one prompt should connect to the real world

## Output Format

Return ONLY a JSON array of exactly 3 strings. No markdown, no code fences, no explanation:

["narrative prompt text", "descriptive prompt text", "persuasive prompt text"]

Each prompt should be a single clear instruction. Do NOT include labels like "Narrative:" in the prompt text -- the system handles labeling.`;
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { childId } = body;

    if (!childId || typeof childId !== "string") {
      return NextResponse.json(
        { error: "childId is required" },
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

    // Check if placement already exists
    const existingResult = await prisma.placementResult.findUnique({
      where: { childId },
    });

    if (existingResult) {
      return NextResponse.json({
        prompts: JSON.parse(existingResult.prompts),
        existingResult: true,
        placementId: existingResult.id,
      });
    }

    // Check for an existing draft (resume in-progress placement)
    const existingDraft = await prisma.placementDraft.findUnique({
      where: { childId },
    });

    if (existingDraft) {
      return NextResponse.json({
        prompts: JSON.parse(existingDraft.prompts),
        responses: JSON.parse(existingDraft.responses),
        step: existingDraft.step,
        hasDraft: true,
      });
    }

    // Generate 3 age-appropriate writing prompts via LLM
    const ageBand = child.age <= 9 ? "7-9" : child.age <= 12 ? "10-12" : "13-15";
    const systemPrompt = buildPromptGenerationPrompt(child.age);
    const userMsg = `Generate 3 writing prompts for a ${child.age}-year-old named ${child.name}.`;

    let prompts: string[];

    try {
      const { text, llmMeta } = await sendMessageWithMeta(
        systemPrompt,
        [{ role: "user", content: userMsg }],
      );

      logLLMInteraction({
        childId,
        requestType: "placement_prompt",
        systemPrompt,
        userMessage: userMsg,
        rawResponse: text,
        llmResult: { text, ...llmMeta },
      });

      // Parse JSON from LLM response (strip code fences if present)
      let cleaned = text.trim();
      const fenceMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (fenceMatch) {
        cleaned = fenceMatch[1].trim();
      }
      if (!cleaned.startsWith("[")) {
        const arrStart = cleaned.indexOf("[");
        const arrEnd = cleaned.lastIndexOf("]");
        if (arrStart !== -1 && arrEnd !== -1) {
          cleaned = cleaned.slice(arrStart, arrEnd + 1);
        }
      }

      prompts = JSON.parse(cleaned);
      if (!Array.isArray(prompts) || prompts.length !== 3) {
        throw new Error("Expected array of 3 prompts");
      }
    } catch (llmError) {
      console.error("Failed to generate prompts via LLM, using fallback:", llmError);
      prompts = FALLBACK_PROMPTS[ageBand];
    }

    // Persist draft so the child can resume later (upsert to handle race conditions)
    await prisma.placementDraft.upsert({
      where: { childId },
      create: {
        childId,
        prompts: JSON.stringify(prompts),
        responses: JSON.stringify(["", "", ""]),
        step: 0,
      },
      update: {},
    });

    return NextResponse.json({ prompts });
  } catch (error) {
    console.error("POST /api/placement/start error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
