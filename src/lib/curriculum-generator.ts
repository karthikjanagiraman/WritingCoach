import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "@/lib/db";
import { getLessonsByTier } from "@/lib/curriculum";
import type { Lesson, Tier } from "@/types";

interface GenerateCurriculumOptions {
  childId: string;
  tier: number;
  focusAreas?: string[];
  lessonsPerWeek?: number;
  weekCount?: number;
}

interface WeekPlan {
  weekNumber: number;
  theme: string;
  lessonIds: string[];
}

export async function generateCurriculum(options: GenerateCurriculumOptions) {
  const {
    childId,
    tier,
    focusAreas,
    lessonsPerWeek = 3,
    weekCount = 8,
  } = options;

  // 1. Get available lessons for this tier
  const lessons = getLessonsByTier(tier as Tier);

  // 2. Get placement result for additional context (optional)
  const placement = await prisma.placementResult.findUnique({
    where: { childId },
  });

  // 3. Build a summary of available lessons for Claude
  const lessonSummary = lessons
    .map((l) => `${l.id}: "${l.title}" (${l.type}, ${l.unit})`)
    .join("\n");

  // 4. Ask Claude to generate a week-by-week plan
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  let placementContext = "";
  if (placement) {
    try {
      const analysis = JSON.parse(placement.aiAnalysis);
      if (analysis.strengths?.length) {
        placementContext += `\nStudent strengths: ${analysis.strengths.join(", ")}`;
      }
      if (analysis.gaps?.length) {
        placementContext += `\nStudent gaps: ${analysis.gaps.join(", ")}`;
      }
    } catch {
      // Ignore malformed placement data
    }
  }

  const systemPrompt = `You are a curriculum planning assistant for a children's writing program.
Given a list of available lessons, create a ${weekCount}-week curriculum plan with ${lessonsPerWeek} lessons per week.

Rules:
- Each week needs a theme that ties the lessons together
- Start with foundational lessons before advanced ones
- Mix writing types for variety (unless focus areas are specified)
- Lessons within the same unit should be kept in order
- Only use lesson IDs from the provided list
- ${focusAreas?.length ? `Focus on these writing types: ${focusAreas.join(", ")}` : "Balance all writing types"}${placementContext}

Return ONLY valid JSON: an array of objects with { "weekNumber": number, "theme": "string", "lessonIds": ["id1", "id2", "id3"] }`;

  const response = await client.messages.create({
    model: "claude-sonnet-4-5-20250929",
    max_tokens: 2048,
    system: systemPrompt,
    messages: [
      {
        role: "user",
        content: `Available lessons:\n${lessonSummary}\n\nGenerate the ${weekCount}-week plan.`,
      },
    ],
  });

  const text = response.content.find((b) => b.type === "text")?.text || "[]";
  let weekPlans: WeekPlan[];
  try {
    const cleaned = text
      .replace(/```json\n?/g, "")
      .replace(/```\n?/g, "")
      .trim();
    weekPlans = JSON.parse(cleaned);
  } catch {
    // Fallback: generate a simple sequential plan without AI
    weekPlans = generateFallbackPlan(
      lessons,
      weekCount,
      lessonsPerWeek,
      focusAreas
    );
  }

  // Validate lesson IDs — remove any that don't exist in this tier
  const validIds = new Set(lessons.map((l) => l.id));
  weekPlans = weekPlans.map((w) => ({
    ...w,
    lessonIds: w.lessonIds.filter((id) => validIds.has(id)),
  }));

  // 5. Create Curriculum and CurriculumWeek records
  const curriculum = await prisma.curriculum.create({
    data: {
      childId,
      status: "ACTIVE",
      weekCount,
      lessonsPerWeek,
      focusAreas: focusAreas ? JSON.stringify(focusAreas) : null,
      startDate: getNextMonday(),
      weeks: {
        create: weekPlans.map((w) => ({
          weekNumber: w.weekNumber,
          theme: w.theme,
          lessonIds: JSON.stringify(w.lessonIds),
          status: "pending",
        })),
      },
    },
    include: { weeks: { orderBy: { weekNumber: "asc" } } },
  });

  return curriculum;
}

function generateFallbackPlan(
  lessons: Lesson[],
  weekCount: number,
  lessonsPerWeek: number,
  focusAreas?: string[]
): WeekPlan[] {
  const filtered = focusAreas?.length
    ? lessons.filter((l) => focusAreas.includes(l.type))
    : lessons;
  const plans: WeekPlan[] = [];
  for (let w = 0; w < weekCount; w++) {
    const start = w * lessonsPerWeek;
    const weekLessons = filtered.slice(start, start + lessonsPerWeek);
    if (weekLessons.length === 0) break;
    plans.push({
      weekNumber: w + 1,
      theme: weekLessons[0]?.unit || `Week ${w + 1}`,
      lessonIds: weekLessons.map((l) => l.id),
    });
  }
  return plans;
}

function getNextMonday(): Date {
  const d = new Date();
  const day = d.getDay();
  const diff = day === 0 ? 1 : 8 - day; // if Sunday, tomorrow; otherwise next Monday
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}
