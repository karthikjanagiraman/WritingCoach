import { Resend } from "resend";
import { prisma } from "@/lib/db";
import { getBadgeById } from "@/lib/badges";
import { SKILL_DEFINITIONS } from "@/lib/skill-map";
import { sendMessageWithMeta } from "@/lib/llm/client";
import { extractTeachingContext } from "@/lib/llm/evaluator";
import type { Lesson, Message, PhaseState, LearnerProfile } from "@/types";

// ---------------------------------------------------------------------------
// Resend client singleton
// ---------------------------------------------------------------------------

let resendClient: Resend | null = null;

function getResend(): Resend | null {
  if (!process.env.RESEND_API_KEY) return null;
  if (!resendClient) {
    resendClient = new Resend(process.env.RESEND_API_KEY);
  }
  return resendClient;
}

export function isEmailConfigured(): boolean {
  return !!process.env.RESEND_API_KEY;
}

// ---------------------------------------------------------------------------
// Data interfaces
// ---------------------------------------------------------------------------

export interface LessonReportEmailData {
  parentName: string;
  parentEmail: string;
  childName: string;
  childId: string;
  lessonTitle: string;
  lessonType: string; // "Narrative", "Persuasive", etc.
  wordCount: number;
  scores: Record<string, number>;
  overallScore: number;
  feedback: { strength: string; growth: string; encouragement: string };
  skills: Array<{
    category: string;
    displayName: string;
    level: string;
    score: number;
  }>;
  streak: { current: number; weeklyGoal: number; weeklyCompleted: number };
  totalLessons: number;
  curriculum: {
    currentWeek: number;
    totalWeeks: number;
    currentTheme: string;
  } | null;
  newBadges: Array<{ name: string; emoji: string; description: string }>;
  // Fields for LLM report generation
  conversationHistory: Message[];
  phaseState: PhaseState;
  submissionText: string;
  learningObjectives: string[];
  lessonTemplate: string;
  childAge: number;
  childTier: number;
  teachingContext?: string;
  learnerProfile: LearnerProfile | null;
}

export interface ParentReportSections {
  lessonJourney: string;
  effortAssessment: string;
  coachingHighlights: string;
  writingAnalysis: string;
  strengthsDeepDive: string;
  growthPlan: string;
}

// ---------------------------------------------------------------------------
// Data gathering
// ---------------------------------------------------------------------------

export async function gatherLessonReportData(
  childId: string,
  lessonId: string,
  lesson: Lesson,
  result: {
    scores: Record<string, number>;
    overallScore: number;
    feedback: { strength: string; growth: string; encouragement: string };
  },
  wordCount: number,
  newBadgeIds: string[],
  session: { conversationHistory: string; phaseState: string },
  submissionText: string
): Promise<LessonReportEmailData | null> {
  try {
    // 1. Child + parent
    const child = await prisma.childProfile.findUnique({
      where: { id: childId },
      include: { parent: { select: { name: true, email: true } } },
    });
    if (!child || !child.parent?.email) return null;

    // 2. Parse session data
    let conversationHistory: Message[] = [];
    let phaseState: PhaseState = {};
    try {
      conversationHistory = JSON.parse(session.conversationHistory);
      phaseState = JSON.parse(session.phaseState);
    } catch {
      console.error("[Email] Failed to parse session data");
    }

    // 3. Extract teaching context (pure string extraction, no LLM)
    let teachingContext: string | undefined;
    try {
      teachingContext = extractTeachingContext(
        conversationHistory,
        phaseState,
        lesson.template
      );
    } catch {
      // Non-critical
    }

    // 4. Load learner profile snapshot
    let learnerProfile: LearnerProfile | null = null;
    try {
      const snapshot = await prisma.learnerProfileSnapshot.findUnique({
        where: { childId },
      });
      if (snapshot) {
        learnerProfile = JSON.parse(snapshot.profileData as string);
      }
    } catch {
      // Non-critical
    }

    // 5. Skill progress, streak, curriculum, total lessons (parallel)
    const [skillRecords, streak, curriculum, totalLessons] = await Promise.all([
      prisma.skillProgress.findMany({ where: { childId } }),
      prisma.streak.findUnique({ where: { childId } }),
      prisma.curriculum.findFirst({
        where: { childId, status: "ACTIVE" },
        include: { weeks: { orderBy: { weekNumber: "asc" } } },
      }),
      prisma.lessonProgress.count({
        where: { childId, status: "completed" },
      }),
    ]);

    // Build skills summary
    const skillsByCategory: Record<string, { level: string; score: number }> =
      {};
    for (const rec of skillRecords) {
      const existing = skillsByCategory[rec.skillCategory];
      if (!existing || rec.score > existing.score) {
        skillsByCategory[rec.skillCategory] = {
          level: rec.level,
          score: rec.score,
        };
      }
    }
    const skills = Object.entries(SKILL_DEFINITIONS).map(([cat, def]) => ({
      category: cat,
      displayName: def.displayName,
      level: skillsByCategory[cat]?.level ?? "EMERGING",
      score: skillsByCategory[cat]?.score ?? 0,
    }));

    // Curriculum progress
    let curriculumInfo: LessonReportEmailData["curriculum"] = null;
    if (curriculum && curriculum.weeks.length > 0) {
      const completedWeeks = curriculum.weeks.filter(
        (w) => w.status === "completed"
      ).length;
      const currentWeekNum = completedWeeks + 1;
      const currentWeek =
        curriculum.weeks.find((w) => w.weekNumber === currentWeekNum) ??
        curriculum.weeks[0];
      curriculumInfo = {
        currentWeek: currentWeekNum,
        totalWeeks: curriculum.weeks.length,
        currentTheme: currentWeek.theme,
      };
    }

    // Resolve badge IDs
    const newBadges = newBadgeIds
      .map((id) => getBadgeById(id))
      .filter((b): b is NonNullable<typeof b> => !!b)
      .map((b) => ({ name: b.name, emoji: b.emoji, description: b.description }));

    // Writing type display name
    const typeMap: Record<string, string> = {
      narrative: "Narrative",
      persuasive: "Persuasive",
      expository: "Expository",
      descriptive: "Descriptive",
    };

    return {
      parentName: child.parent.name ?? "Parent",
      parentEmail: child.parent.email,
      childName: child.name,
      childId,
      lessonTitle: lesson.title,
      lessonType: typeMap[lesson.type] ?? lesson.type,
      wordCount,
      scores: result.scores,
      overallScore: result.overallScore,
      feedback: result.feedback,
      skills,
      streak: {
        current: streak?.currentStreak ?? 0,
        weeklyGoal: streak?.weeklyGoal ?? 3,
        weeklyCompleted: streak?.weeklyCompleted ?? 0,
      },
      totalLessons,
      curriculum: curriculumInfo,
      newBadges,
      conversationHistory,
      phaseState,
      submissionText,
      learningObjectives: lesson.learningObjectives ?? [],
      lessonTemplate: lesson.template,
      childAge: child.age,
      childTier: child.tier,
      teachingContext,
      learnerProfile,
    };
  } catch (err) {
    console.error("[Email] Failed to gather report data:", err);
    return null;
  }
}

// ---------------------------------------------------------------------------
// LLM report generation — 2 parallel calls
// ---------------------------------------------------------------------------

export async function generateParentReport(
  data: LessonReportEmailData
): Promise<ParentReportSections | null> {
  try {
    const [journeyResult, writingResult] = await Promise.all([
      generateLessonJourney(data),
      generateWritingAssessment(data),
    ]);

    return { ...journeyResult, ...writingResult };
  } catch (err) {
    console.error("[Email] LLM report generation failed:", err);
    return null;
  }
}

// -- LLM Call 1: Lesson Journey & Effort Analysis --

async function generateLessonJourney(
  data: LessonReportEmailData
): Promise<Pick<ParentReportSections, "lessonJourney" | "effortAssessment" | "coachingHighlights">> {
  const objectivesList = data.learningObjectives
    .map((o) => `- ${o}`)
    .join("\n");

  const msgCount = data.conversationHistory.length;

  const systemPrompt = `ROLE: You are a senior writing coach drafting a concise lesson debrief for a parent. Write like a favorite teacher's note home — short, specific, evidence-backed, and genuinely encouraging. Every sentence must earn its place. No filler, no fluff, no essays.

CHILD: ${data.childName}, age ${data.childAge} (Tier ${data.childTier})
LESSON: "${data.lessonTitle}" (${data.lessonType}, template: ${data.lessonTemplate})
OBJECTIVES: ${objectivesList}

PHASE DATA:
- Comprehension check: ${data.phaseState.comprehensionCheckPassed ? "passed" : "not passed"} | Steps: ${data.phaseState.phase1Step ?? 0}/3 | Guided stages: ${data.phaseState.guidedStage ?? 0}/3 | Hints: ${data.phaseState.hintsGiven ?? 0} | Guided complete: ${data.phaseState.guidedComplete ? "yes" : "no"} | Messages: ${msgCount}

Read the full conversation below, then produce these THREE sections:

1. LESSON JOURNEY — A short narrative (4-6 sentences max) covering:
   - How ${data.childName} handled instruction (engaged? struggled?)
   - How guided practice went (improved across stages? recurring issues?)
   - One specific quoted moment that captures the session

2. EFFORT & ENGAGEMENT — 2-3 sentences. Describe how the child participated.
   Reference specific moments: Did they ask questions? Try hard tasks? Persist after mistakes?
   Focus on observable behaviors, not judgments about attitude.

3. STANDOUT MOMENTS — Exactly 2-3 bullet points. Each bullet:
   one sentence + one direct quote from the child. That's it.

HARD RULES:
- Total output under 350 words across all 3 fields
- Use <p> tags for paragraphs, <ul><li> for bullets
- Quote the child's actual words with <em> tags. Choose quotes that show the child's thinking or personality, not just errors.
- No generic praise. Every claim needs evidence from the conversation.
- Address the parent directly ("Your son/daughter...")

JSON ONLY:
{
  "lessonJourney": "<4-6 sentences in <p> tags>",
  "effortAssessment": "<2-3 sentences in <p> tags>",
  "coachingHighlights": "<ul> with 2-3 <li> bullets>"
}`;

  // Format conversation as [COACH]/[CHILD] transcript
  const transcript = data.conversationHistory
    .map((m) => {
      const role =
        m.role === "coach" ? "COACH" : data.childName.toUpperCase();
      return `[${role}] ${m.content}`;
    })
    .join("\n\n");

  const { text } = await sendMessageWithMeta(
    systemPrompt,
    [{ role: "user", content: `Here is the complete lesson conversation:\n\n${transcript}` }],
    1024
  );

  return parseLLMJson(text, {
    lessonJourney: "",
    effortAssessment: "",
    coachingHighlights: "",
  });
}

// -- LLM Call 2: Writing Assessment & Growth Plan --

async function generateWritingAssessment(
  data: LessonReportEmailData
): Promise<Pick<ParentReportSections, "writingAnalysis" | "strengthsDeepDive" | "growthPlan">> {
  const objectivesList = data.learningObjectives
    .map((o) => `- ${o}`)
    .join("\n");

  const scoresBlock = Object.entries(data.scores)
    .map(([criterion, score]) => `  ${criterion}: ${score}`)
    .join("\n");

  const teachingSection = data.teachingContext
    ? `\n${data.teachingContext}\n`
    : "";

  let crossLessonSection = "";
  if (data.learnerProfile) {
    const lp = data.learnerProfile;
    const strengths = lp.strengths
      .map((s) => `${s.criterion} (avg ${s.avgScore.toFixed(1)})`)
      .join(", ");
    const growth = lp.growthAreas
      .map((g) => `${g.criterion} (avg ${g.avgScore.toFixed(1)})`)
      .join(", ");
    crossLessonSection = `
CROSS-LESSON CONTEXT (from ${lp.totalLessons} previous lessons):
- Score trajectory: ${lp.scoreTrajectory}
- Scaffolding trend: ${lp.scaffoldingTrend}
- Top strengths: ${strengths || "none identified yet"}
- Growth areas: ${growth || "none identified yet"}
- Engagement level: ${lp.engagementLevel}`;
  }

  const systemPrompt = `ROLE: You are a writing assessment specialist drafting a concise report card for a parent. Write like a teacher's conference note — clear observations, quoted evidence from the child's work, and practical next steps. Be warm but specific. No essays. Every sentence must carry information.

CHILD: ${data.childName}, age ${data.childAge} (Tier ${data.childTier})
LESSON: "${data.lessonTitle}" (${data.lessonType})
OBJECTIVES: ${objectivesList}
${teachingSection}
SCORES (1-4, where 3 = Meets Expectations):
${scoresBlock}
Overall: ${data.overallScore}/4
${crossLessonSection}

Read the writing below, then produce these THREE sections:

1. WRITING ANALYSIS — 3-4 sentences. Explain what the scores mean for a child this age.
   Highlight what the writing demonstrates about the child's development.
   Name one specific area where growth is emerging, with a quoted example.

2. STRENGTHS IN ACTION — 2-3 bullet points. Each: quote a specific line/phrase
   from the writing + one sentence on WHY it works. No vague praise.

3. NEXT STEPS FOR HOME — Exactly 2-3 numbered action items for the parent to do at home.
   Each must be specific and doable (not "read more" — give an actual activity
   with a scenario). End with a one-sentence realistic expectation.

HARD RULES:
- Total output under 300 words across all 3 fields
- Use <p> tags for paragraphs, <ul><li> for bullet lists, <ol><li> for numbered lists
- Quote the child's writing with <em> tags. Choose quotes that show the child's thinking or personality, not just errors.
- Address the parent directly
- No filler sentences. No "Overall..." summaries that repeat what was already said.

JSON ONLY:
{
  "writingAnalysis": "<3-4 sentences in <p> tags>",
  "strengthsDeepDive": "<ul> with 2-3 <li> bullets>",
  "growthPlan": "<ol> with 2-3 <li> action items + one <p> expectation>"
}`;

  const { text } = await sendMessageWithMeta(
    systemPrompt,
    [
      {
        role: "user",
        content: `Here is ${data.childName}'s writing submission for this lesson:\n\n---\n${data.submissionText}\n---`,
      },
    ],
    1024
  );

  return parseLLMJson(text, {
    writingAnalysis: "",
    strengthsDeepDive: "",
    growthPlan: "",
  });
}

// -- Parse LLM JSON response with fallback --

function parseLLMJson<T extends Record<string, string>>(
  text: string,
  fallback: T
): T {
  let jsonStr = text.trim();
  // Strip markdown code fences if present
  const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonMatch) {
    jsonStr = jsonMatch[1].trim();
  }
  try {
    const parsed = JSON.parse(jsonStr);
    // Ensure all expected keys exist
    const result = { ...fallback };
    for (const key of Object.keys(fallback)) {
      if (typeof parsed[key] === "string" && parsed[key].length > 0) {
        (result as Record<string, string>)[key] = parsed[key];
      }
    }
    return result;
  } catch {
    console.error("[Email] Failed to parse LLM JSON response. Raw text (first 300 chars):", text.substring(0, 300));
    return fallback;
  }
}

// ---------------------------------------------------------------------------
// HTML helpers
// ---------------------------------------------------------------------------

function scoreColor(score: number): string {
  if (score >= 3.5) return "#22c55e";
  if (score >= 2.5) return "#3b82f6";
  if (score >= 1.5) return "#f59e0b";
  return "#ef4444";
}

function scoreLabel(score: number): string {
  if (score >= 3.5) return "Excellent";
  if (score >= 2.5) return "Good";
  if (score >= 1.5) return "Developing";
  return "Needs Practice";
}

function levelColor(level: string): string {
  switch (level) {
    case "ADVANCED":
      return "#22c55e";
    case "PROFICIENT":
      return "#3b82f6";
    case "DEVELOPING":
      return "#f59e0b";
    default:
      return "#94a3b8";
  }
}

function formatCriterionName(name: string): string {
  return name
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

// ---------------------------------------------------------------------------
// HTML builder
// ---------------------------------------------------------------------------

export function buildLessonReportHtml(
  data: LessonReportEmailData,
  reportSections?: ParentReportSections | null
): string {
  const {
    parentName,
    childName,
    lessonTitle,
    lessonType,
    wordCount,
    scores,
    overallScore,
    feedback,
    skills,
    streak,
    totalLessons,
    curriculum,
    newBadges,
    childId,
  } = data;

  const dashboardUrl = process.env.AUTH_URL ?? "http://localhost:3000";
  const hasLLM = reportSections && Object.values(reportSections).some((v) => v.length > 0);

  // -- Score breakdown rows --
  const scoreRows = Object.entries(scores)
    .map(([criterion, score]) => {
      const pct = Math.round((score / 4) * 100);
      const color = scoreColor(score);
      return `
        <tr>
          <td style="padding:6px 12px;font-size:14px;color:#374151;">${formatCriterionName(criterion)}</td>
          <td style="padding:6px 12px;width:50%;">
            <div style="background:#f3f4f6;border-radius:99px;height:12px;overflow:hidden;">
              <div style="background:${color};height:12px;border-radius:99px;width:${pct}%;"></div>
            </div>
          </td>
          <td style="padding:6px 12px;font-size:14px;font-weight:600;color:${color};text-align:right;">${score.toFixed(1)}/4</td>
        </tr>`;
    })
    .join("");

  // -- Skills rows --
  const skillRows = skills
    .map(
      (s) => `
        <tr>
          <td style="padding:6px 12px;font-size:14px;color:#374151;">${s.displayName}</td>
          <td style="padding:6px 12px;text-align:right;">
            <span style="display:inline-block;padding:2px 10px;border-radius:99px;font-size:12px;font-weight:600;color:#fff;background:${levelColor(s.level)};">${s.level}</span>
          </td>
        </tr>`
    )
    .join("");

  // -- Streak dots --
  const streakDots = Array.from({ length: streak.weeklyGoal }, (_, i) => {
    const done = i < streak.weeklyCompleted;
    return done
      ? `<span style="display:inline-block;width:18px;height:18px;border-radius:50%;background:#22c55e;margin-right:4px;"></span>`
      : `<span style="display:inline-block;width:18px;height:18px;border-radius:50%;border:2px solid #d1d5db;margin-right:4px;"></span>`;
  }).join("");

  // -- Curriculum progress --
  let curriculumSection = "";
  if (curriculum) {
    const pct = Math.round(
      (curriculum.currentWeek / curriculum.totalWeeks) * 100
    );
    curriculumSection = `
      <tr><td style="padding:0 24px 24px;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0fdf4;border-radius:12px;">
          <tr><td style="padding:16px;">
            <p style="margin:0 0 4px;font-size:13px;text-transform:uppercase;letter-spacing:0.5px;color:#6b7280;font-weight:600;">Curriculum Progress</p>
            <p style="margin:0 0 10px;font-size:15px;color:#374151;"><strong>Week ${curriculum.currentWeek}:</strong> ${curriculum.currentTheme}</p>
            <div style="background:#d1d5db;border-radius:99px;height:10px;overflow:hidden;">
              <div style="background:#22c55e;height:10px;border-radius:99px;width:${pct}%;"></div>
            </div>
            <p style="margin:6px 0 0;font-size:12px;color:#6b7280;">${curriculum.currentWeek} of ${curriculum.totalWeeks} weeks</p>
          </td></tr>
        </table>
      </td></tr>`;
  }

  // -- Badge celebration --
  let badgeSection = "";
  if (newBadges.length > 0) {
    const badgeCards = newBadges
      .map(
        (b) => `
          <div style="display:inline-block;text-align:center;margin:0 8px 8px 0;background:#fef3c7;border-radius:12px;padding:12px 16px;">
            <span style="font-size:28px;">${b.emoji}</span>
            <p style="margin:4px 0 0;font-size:13px;font-weight:700;color:#92400e;">${b.name}</p>
            <p style="margin:2px 0 0;font-size:11px;color:#a16207;">${b.description}</p>
          </div>`
      )
      .join("");
    badgeSection = `
      <tr><td style="padding:0 24px 24px;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background:#fffbeb;border:1px solid #fde68a;border-radius:12px;">
          <tr><td style="padding:16px;">
            <p style="margin:0 0 10px;font-size:16px;font-weight:700;color:#92400e;">&#127942; New Badge${newBadges.length > 1 ? "s" : ""} Earned!</p>
            ${badgeCards}
          </td></tr>
        </table>
      </td></tr>`;
  }

  // -- LLM-generated sections (or fallback) --
  let llmSections = "";
  if (hasLLM) {
    llmSections = `
  <!-- The Lesson at a Glance -->
  <tr><td style="padding:0 24px 24px;">
    <p style="margin:0 0 10px;font-size:16px;font-weight:700;color:#1f2937;">The Lesson at a Glance</p>
    <div style="font-size:14px;color:#374151;line-height:1.6;">${reportSections!.lessonJourney}</div>
  </td></tr>

  <!-- Effort & Engagement -->
  <tr><td style="padding:0 24px 24px;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f9ff;border-radius:12px;border-left:4px solid #3b82f6;">
      <tr><td style="padding:16px;">
        <p style="margin:0 0 8px;font-size:15px;font-weight:700;color:#1e40af;">How They Showed Up</p>
        <div style="font-size:14px;color:#374151;line-height:1.6;">${reportSections!.effortAssessment}</div>
      </td></tr>
    </table>
  </td></tr>

  <!-- Moments Worth Noting -->
  <tr><td style="padding:0 24px 24px;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#fefce8;border-radius:12px;border-left:4px solid #eab308;">
      <tr><td style="padding:16px;">
        <p style="margin:0 0 8px;font-size:15px;font-weight:700;color:#854d0e;">Standout Moments</p>
        <div style="font-size:14px;color:#374151;line-height:1.6;">${reportSections!.coachingHighlights}</div>
      </td></tr>
    </table>
  </td></tr>`;
  }

  let writingSections = "";
  if (hasLLM) {
    writingSections = `
  <!-- About the Writing -->
  <tr><td style="padding:0 24px 24px;">
    <p style="margin:0 0 10px;font-size:16px;font-weight:700;color:#1f2937;">What the Writing Shows</p>
    <div style="font-size:14px;color:#374151;line-height:1.6;">${reportSections!.writingAnalysis}</div>
  </td></tr>

  <!-- What's Working -->
  <tr><td style="padding:0 24px 24px;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#ecfdf5;border-radius:12px;border-left:4px solid #22c55e;">
      <tr><td style="padding:16px;">
        <p style="margin:0 0 8px;font-size:15px;font-weight:700;color:#166534;">Strengths in Action</p>
        <div style="font-size:14px;color:#374151;line-height:1.6;">${reportSections!.strengthsDeepDive}</div>
      </td></tr>
    </table>
  </td></tr>

  <!-- Where to Focus + How to Help at Home -->
  <tr><td style="padding:0 24px 24px;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#faf5ff;border-radius:12px;border-left:4px solid #6C5CE7;">
      <tr><td style="padding:16px;">
        <p style="margin:0 0 8px;font-size:15px;font-weight:700;color:#6C5CE7;">Next Steps for Home</p>
        <div style="font-size:14px;color:#374151;line-height:1.6;">${reportSections!.growthPlan}</div>
      </td></tr>
    </table>
  </td></tr>`;
  }

  // -- Fallback: student-facing feedback when no LLM sections --
  let fallbackFeedback = "";
  if (!hasLLM) {
    fallbackFeedback = `
  <!-- Coach Feedback (fallback) -->
  <tr><td style="padding:0 24px 24px;">
    <table width="100%" cellpadding="0" cellspacing="0" style="border-radius:12px;overflow:hidden;">
      <tr><td style="background:#ecfdf5;padding:14px 16px;border-left:4px solid #22c55e;">
        <p style="margin:0 0 2px;font-size:12px;font-weight:700;color:#166534;text-transform:uppercase;">Strength</p>
        <p style="margin:0;font-size:14px;color:#374151;line-height:1.5;">${feedback.strength}</p>
      </td></tr>
      <tr><td style="background:#eff6ff;padding:14px 16px;border-left:4px solid #3b82f6;">
        <p style="margin:0 0 2px;font-size:12px;font-weight:700;color:#1e40af;text-transform:uppercase;">Growth Area</p>
        <p style="margin:0;font-size:14px;color:#374151;line-height:1.5;">${feedback.growth}</p>
      </td></tr>
      <tr><td style="background:#fefce8;padding:14px 16px;border-left:4px solid #f59e0b;">
        <p style="margin:0 0 2px;font-size:12px;font-weight:700;color:#92400e;text-transform:uppercase;">Encouragement</p>
        <p style="margin:0;font-size:14px;color:#374151;line-height:1.5;">${feedback.encouragement}</p>
      </td></tr>
    </table>
  </td></tr>`;
  }

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;padding:24px 0;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">

  <!-- Header -->
  <tr><td style="background:linear-gradient(135deg,#6C5CE7,#a78bfa);padding:32px 24px;text-align:center;">
    <p style="margin:0;font-size:28px;">&#9997;&#65039;</p>
    <h1 style="margin:8px 0 0;font-size:22px;color:#ffffff;font-weight:700;">Lesson Report for ${childName}</h1>
    <p style="margin:6px 0 0;font-size:15px;color:#e9d5ff;">${lessonTitle}</p>
  </td></tr>

  <!-- Quick Stats Bar -->
  <tr><td style="padding:20px 24px 16px;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border-radius:12px;">
      <tr>
        <td style="padding:14px;text-align:center;width:25%;border-right:1px solid #e5e7eb;">
          <p style="margin:0;font-size:22px;font-weight:700;color:${scoreColor(overallScore)};">${overallScore.toFixed(1)}<span style="font-size:13px;color:#9ca3af;">/4</span></p>
          <p style="margin:2px 0 0;font-size:11px;color:#6b7280;text-transform:uppercase;">${scoreLabel(overallScore)}</p>
        </td>
        <td style="padding:14px;text-align:center;width:25%;border-right:1px solid #e5e7eb;">
          <p style="margin:0;font-size:22px;font-weight:700;color:#374151;">${wordCount}</p>
          <p style="margin:2px 0 0;font-size:11px;color:#6b7280;text-transform:uppercase;">Words</p>
        </td>
        <td style="padding:14px;text-align:center;width:25%;border-right:1px solid #e5e7eb;">
          <p style="margin:0;font-size:22px;font-weight:700;color:#374151;">${totalLessons}</p>
          <p style="margin:2px 0 0;font-size:11px;color:#6b7280;text-transform:uppercase;">Lessons Done</p>
        </td>
        <td style="padding:14px;text-align:center;width:25%;">
          <span style="display:inline-block;padding:4px 12px;border-radius:99px;font-size:12px;font-weight:600;color:#6C5CE7;background:#ede9fe;">${lessonType}</span>
        </td>
      </tr>
    </table>
  </td></tr>

  ${llmSections}

  <!-- Score Breakdown -->
  <tr><td style="padding:0 24px 24px;">
    <p style="margin:0 0 8px;font-size:13px;text-transform:uppercase;letter-spacing:0.5px;color:#6b7280;font-weight:600;">Score Breakdown</p>
    <table width="100%" cellpadding="0" cellspacing="0">${scoreRows}</table>
  </td></tr>

  ${writingSections}
  ${fallbackFeedback}

  <!-- Skill Snapshot -->
  <tr><td style="padding:0 24px 24px;">
    <p style="margin:0 0 8px;font-size:13px;text-transform:uppercase;letter-spacing:0.5px;color:#6b7280;font-weight:600;">Skill Snapshot</p>
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border-radius:12px;">${skillRows}</table>
  </td></tr>

  <!-- Streak & Engagement -->
  <tr><td style="padding:0 24px 24px;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#fff7ed;border-radius:12px;">
      <tr><td style="padding:16px;">
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="text-align:center;width:33%;">
              <p style="margin:0;font-size:24px;font-weight:700;color:#ea580c;">${streak.current}</p>
              <p style="margin:2px 0 0;font-size:11px;color:#9a3412;text-transform:uppercase;">Day Streak &#128293;</p>
            </td>
            <td style="text-align:center;width:33%;">
              <p style="margin:0;font-size:24px;font-weight:700;color:#ea580c;">${totalLessons}</p>
              <p style="margin:2px 0 0;font-size:11px;color:#9a3412;text-transform:uppercase;">Lessons Done</p>
            </td>
            <td style="text-align:center;width:34%;">
              <p style="margin:0 0 4px;font-size:11px;color:#9a3412;text-transform:uppercase;">Weekly Goal</p>
              <p style="margin:0;">${streakDots}</p>
            </td>
          </tr>
        </table>
      </td></tr>
    </table>
  </td></tr>

  ${curriculumSection}
  ${badgeSection}

  <!-- CTA Buttons -->
  <tr><td style="padding:0 24px 32px;text-align:center;">
    <a href="${dashboardUrl}/dashboard/children/${childId}/report" style="display:inline-block;padding:12px 24px;background:#6C5CE7;color:#ffffff;text-decoration:none;border-radius:8px;font-weight:600;font-size:14px;margin-right:8px;">View Full Report</a>
    <a href="${dashboardUrl}/dashboard" style="display:inline-block;padding:12px 24px;background:#f3f4f6;color:#374151;text-decoration:none;border-radius:8px;font-weight:600;font-size:14px;">Go to Dashboard</a>
  </td></tr>

  <!-- Footer -->
  <tr><td style="padding:16px 24px;background:#f9fafb;text-align:center;border-top:1px solid #e5e7eb;">
    <p style="margin:0;font-size:12px;color:#9ca3af;">WriteWise Kids &mdash; Helping young writers grow</p>
    <p style="margin:4px 0 0;font-size:11px;color:#d1d5db;">You received this because ${childName} completed a lesson. To unsubscribe, manage notification settings in your dashboard.</p>
  </td></tr>

</table>
</td></tr>
</table>
</body>
</html>`;
}

// ---------------------------------------------------------------------------
// Send email
// ---------------------------------------------------------------------------

export async function sendLessonCompleteEmail(
  data: LessonReportEmailData,
  preGeneratedSections?: ParentReportSections | null
): Promise<boolean> {
  const resend = getResend();
  if (!resend) return false;

  try {
    // Use pre-generated sections if provided, otherwise generate fresh
    let reportSections: ParentReportSections | null = preGeneratedSections ?? null;
    if (!reportSections) {
      try {
        reportSections = await generateParentReport(data);
      } catch (err) {
        console.error("[Email] LLM report generation failed, falling back to template-only:", err);
      }
    }

    const html = buildLessonReportHtml(data, reportSections);
    const fromAddress =
      process.env.RESEND_FROM_EMAIL ??
      "WriteWise Kids <onboarding@resend.dev>";

    await resend.emails.send({
      from: fromAddress,
      to: data.parentEmail,
      subject: `Lesson Report: ${data.childName} \u2014 "${data.lessonTitle}" (${data.overallScore.toFixed(1)}/4)`,
      html,
    });

    console.log(
      `[Email] Lesson report sent to ${data.parentEmail} for ${data.childName}` +
        (reportSections ? " (with LLM analysis)" : " (template-only fallback)")
    );
    return true;
  } catch (err) {
    console.error("[Email] Failed to send lesson report:", err);
    return false;
  }
}
