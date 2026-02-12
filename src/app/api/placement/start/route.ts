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
    const { childId } = body;

    if (!childId || typeof childId !== "string") {
      return NextResponse.json(
        { error: "childId is required" },
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
      return NextResponse.json({
        prompts: JSON.parse(existingResult.prompts),
        existingResult: true,
        placementId: existingResult.id,
      });
    }

    // Generate 3 age-appropriate writing prompts via Claude
    const systemPrompt = `You are generating writing assessment prompts for a ${child.age}-year-old child. Create exactly 3 short, engaging writing prompts:
1. A NARRATIVE prompt (tell a story)
2. A DESCRIPTIVE prompt (describe something using senses)
3. A PERSUASIVE prompt (argue for or convince someone)
Each prompt should be 1-2 sentences, age-appropriate, and fun. Return ONLY a JSON array of 3 strings, no other text.`;

    const response = await client.messages.create({
      model: "claude-sonnet-4-5-20250929",
      max_tokens: 1024,
      system: systemPrompt,
      messages: [
        {
          role: "user",
          content: `Generate 3 writing prompts for a ${child.age}-year-old named ${child.name}.`,
        },
      ],
    });

    const text =
      response.content.find((b) => b.type === "text")?.text || "";

    let prompts: string[];
    try {
      prompts = JSON.parse(text);
      if (!Array.isArray(prompts) || prompts.length !== 3) {
        throw new Error("Expected array of 3 prompts");
      }
    } catch {
      console.error("Failed to parse Claude prompts response:", text);
      return NextResponse.json(
        { error: "Failed to generate writing prompts" },
        { status: 500 }
      );
    }

    return NextResponse.json({ prompts });
  } catch (error) {
    console.error("POST /api/placement/start error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
