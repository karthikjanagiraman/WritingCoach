import { prisma } from "@/lib/db";
import { getLessonsByTier } from "@/lib/curriculum";
import { sendMessageWithMeta } from "@/lib/llm";
import { logLLMInteraction } from "@/lib/event-logger";
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

  // 2. Get placement result and child profile for additional context
  const [placement, child] = await Promise.all([
    prisma.placementResult.findUnique({ where: { childId } }),
    prisma.childProfile.findUnique({
      where: { id: childId },
      select: { isEsl: true, homeLanguage: true, name: true },
    }),
  ]);

  // 3. Build a summary of available lessons for Claude
  const lessonSummary = lessons
    .map((l) => `${l.id}: "${l.title}" (${l.type}, ${l.unit})`)
    .join("\n");

  // 4. Build rich placement context for the LLM
  let placementContext = "";
  if (placement) {
    try {
      const analysis = JSON.parse(placement.aiAnalysis);

      // Per-type averages (if available)
      if (analysis.promptAverages) {
        const avgs = analysis.promptAverages;
        const avgEntries = Object.entries(avgs as Record<string, number>)
          .map(([type, score]) => `${type}: ${(score as number).toFixed(1)}/4`)
          .join(", ");
        placementContext += `\nPer-type placement scores: ${avgEntries}`;

        // Identify weakest and strongest types
        const sorted = Object.entries(avgs as Record<string, number>).sort(
          (a, b) => (a[1] as number) - (b[1] as number)
        );
        if (sorted.length > 0) {
          placementContext += `\nWeakest writing type: ${sorted[0][0]} (${(sorted[0][1] as number).toFixed(1)}/4)`;
          placementContext += `\nStrongest writing type: ${sorted[sorted.length - 1][0]} (${(sorted[sorted.length - 1][1] as number).toFixed(1)}/4)`;
        }
      }

      if (analysis.strengths?.length) {
        placementContext += `\nStudent strengths: ${analysis.strengths.join(", ")}`;
      }
      if (analysis.gaps?.length) {
        placementContext += `\nStudent gaps: ${analysis.gaps.join(", ")}`;
      }

      // Confidence level
      const confidence = placement.confidence;
      const confidenceLabel =
        confidence >= 0.8 ? "high" : confidence >= 0.5 ? "medium" : "low";
      placementContext += `\nPlacement confidence: ${confidenceLabel} (${Math.round(confidence * 100)}%)`;

      // Tier clamping info
      if (placement.assignedTier !== placement.recommendedTier) {
        placementContext += `\nNote: AI recommended tier ${placement.recommendedTier} but parent chose tier ${placement.assignedTier}`;
      }
    } catch {
      // Ignore malformed placement data
    }
  }

  // ESL context
  if (child?.isEsl) {
    placementContext += `\nESL student: yes${child.homeLanguage ? ` (home language: ${child.homeLanguage})` : ""}`;
  }

  const systemPrompt = `You are a curriculum planning assistant for a children's writing program.
Given a list of available lessons, create a ${weekCount}-week curriculum plan with ${lessonsPerWeek} lessons per week.

Rules:
- Each week needs a theme that ties the lessons together
- Start with foundational lessons before advanced ones
- Mix writing types for variety (unless focus areas are specified)
- Lessons within the same unit should be kept in order
- Only use lesson IDs from the provided list
- ${focusAreas?.length ? `Focus on these writing types: ${focusAreas.join(", ")}` : "Balance all writing types"}
${placementContext ? `\nPlacement data:\n${placementContext}\n\nUse this placement data to personalize the curriculum:\n- Front-load lessons addressing the student's weakest writing type in weeks 1-3\n- Interleave strong types with weak types to maintain confidence while building skills\n- If placement confidence is low, start with more foundational/introductory lessons\n- If the student is an ESL learner, begin with narrative writing (most accessible for L2 learners) before introducing persuasive writing (most language-demanding)` : ""}

Return ONLY valid JSON: an array of objects with { "weekNumber": number, "theme": "string", "lessonIds": ["id1", "id2", "id3"] }`;

  const userMsg = `Available lessons:\n${lessonSummary}\n\nGenerate the ${weekCount}-week plan.`;
  const { text, llmMeta } = await sendMessageWithMeta(
    systemPrompt,
    [{ role: "user", content: userMsg }],
    2048
  );

  logLLMInteraction({
    childId,
    requestType: "curriculum_generate",
    systemPrompt,
    userMessage: userMsg,
    rawResponse: text,
    llmResult: { text, ...llmMeta },
  });

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
