import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { childId, prompts, responses } = body;

    if (!childId || typeof childId !== "string") {
      return NextResponse.json(
        { error: "childId is required" },
        { status: 400 }
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
        { status: 400 }
      );
    }

    // Verify parent owns the child
    const child = await prisma.childProfile.findFirst({
      where: { id: childId, parentId: session.user.userId },
    });

    if (!child) {
      return NextResponse.json(
        { error: "Child not found" },
        { status: 404 }
      );
    }

    // Check if placement already exists
    const existingResult = await prisma.placementResult.findUnique({
      where: { childId },
    });

    if (existingResult) {
      return NextResponse.json(
        { error: "Placement assessment already completed for this child" },
        { status: 409 }
      );
    }

    // Build the writing samples for Claude to evaluate
    const writingSamples = prompts
      .map(
        (prompt: string, i: number) =>
          `Prompt ${i + 1}: ${prompt}\nResponse ${i + 1}: ${responses[i]}`
      )
      .join("\n\n");

    const systemPrompt = `You are evaluating a ${child.age}-year-old child's writing ability to determine their skill tier.
Tier 1 (ages 7-9, Foundational): Simple sentences, basic story structure, creative ideas
Tier 2 (ages 10-12, Developing): Multi-paragraph writing, varied sentences, persuasive skills
Tier 3 (ages 13-15, Advanced): Thesis-driven writing, literary techniques, complex arguments

Evaluate these 3 writing samples and determine the appropriate tier.
Return ONLY valid JSON: { "recommendedTier": 1|2|3, "confidence": 0.0-1.0, "strengths": ["..."], "gaps": ["..."], "reasoning": "..." }`;

    const response = await client.messages.create({
      model: "claude-sonnet-4-5-20250929",
      max_tokens: 1024,
      system: systemPrompt,
      messages: [
        {
          role: "user",
          content: `Evaluate these writing samples from ${child.name} (age ${child.age}):\n\n${writingSamples}`,
        },
      ],
    });

    const text =
      response.content.find((b) => b.type === "text")?.text || "";

    let analysis: {
      recommendedTier: number;
      confidence: number;
      strengths: string[];
      gaps: string[];
      reasoning: string;
    };

    try {
      analysis = JSON.parse(text);
      if (
        typeof analysis.recommendedTier !== "number" ||
        analysis.recommendedTier < 1 ||
        analysis.recommendedTier > 3
      ) {
        throw new Error("Invalid recommendedTier");
      }
      if (
        typeof analysis.confidence !== "number" ||
        analysis.confidence < 0 ||
        analysis.confidence > 1
      ) {
        throw new Error("Invalid confidence");
      }
      if (!Array.isArray(analysis.strengths) || !Array.isArray(analysis.gaps)) {
        throw new Error("Invalid strengths or gaps");
      }
    } catch {
      console.error("Failed to parse Claude analysis response:", text);
      return NextResponse.json(
        { error: "Failed to analyze writing samples" },
        { status: 500 }
      );
    }

    // Create PlacementResult and update child tier in a transaction
    const [placementResult] = await prisma.$transaction([
      prisma.placementResult.create({
        data: {
          childId,
          prompts: JSON.stringify(prompts),
          responses: JSON.stringify(responses),
          aiAnalysis: JSON.stringify({
            strengths: analysis.strengths,
            gaps: analysis.gaps,
            reasoning: analysis.reasoning,
          }),
          recommendedTier: analysis.recommendedTier,
          assignedTier: analysis.recommendedTier,
          confidence: analysis.confidence,
        },
      }),
      prisma.childProfile.update({
        where: { id: childId },
        data: { tier: analysis.recommendedTier },
      }),
    ]);

    return NextResponse.json({
      placementId: placementResult.id,
      recommendedTier: analysis.recommendedTier,
      confidence: analysis.confidence,
      analysis: {
        strengths: analysis.strengths,
        gaps: analysis.gaps,
        reasoning: analysis.reasoning,
      },
    });
  } catch (error) {
    console.error("POST /api/placement/submit error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
