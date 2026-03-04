/**
 * Send a test lesson report email using REAL data from the database.
 *
 * Usage:
 *   npx tsx scripts/send-test-email.ts                          # send to parent's email
 *   npx tsx scripts/send-test-email.ts karthikjanagiraman@gmail.com  # override recipient
 *   npx tsx scripts/send-test-email.ts --preview                # write HTML to /tmp and open
 *   npx tsx scripts/send-test-email.ts --no-llm                 # skip LLM generation (template-only)
 *   npx tsx scripts/send-test-email.ts --preview --no-llm       # preview without LLM
 *
 * Requires RESEND_API_KEY in .env (unless --preview).
 * Requires ANTHROPIC_API_KEY in .env for LLM report generation.
 */

import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { getLessonById } from "../src/lib/curriculum";
import { getBadgeById } from "../src/lib/badges";
import { SKILL_DEFINITIONS } from "../src/lib/skill-map";
import { extractTeachingContext } from "../src/lib/llm/evaluator";
import {
  buildLessonReportHtml,
  generateParentReport,
  sendLessonCompleteEmail,
  isEmailConfigured,
  type LessonReportEmailData,
  type ParentReportSections,
} from "../src/lib/email";
import { writeFileSync } from "fs";
import { execSync } from "child_process";
import type { Message, PhaseState, LearnerProfile } from "../src/types";

const prisma = new PrismaClient();

async function main() {
  const args = process.argv.slice(2);
  const previewOnly = args.includes("--preview");
  const noLLM = args.includes("--no-llm");
  const emailOverride = args.find((a) => a.includes("@"));

  // 1. Find Maya's best completed assessment
  const assessment = await prisma.assessment.findFirst({
    where: {
      child: { name: "Maya" },
      overallScore: { gt: 1 },
    },
    orderBy: { overallScore: "desc" },
    include: {
      child: { include: { parent: { select: { name: true, email: true } } } },
      session: { select: { conversationHistory: true, phaseState: true } },
    },
  });

  if (!assessment) {
    console.error("No completed assessment found for Maya");
    process.exit(1);
  }

  const lesson = getLessonById(assessment.lessonId);
  if (!lesson) {
    console.error(`Lesson ${assessment.lessonId} not found in catalog`);
    process.exit(1);
  }

  const scores: Record<string, number> = JSON.parse(
    assessment.scores as string
  );
  const feedback = JSON.parse(assessment.feedback as string);
  const child = assessment.child;

  // 2. Parse conversation history and phase state from session
  let conversationHistory: Message[] = [];
  let phaseState: PhaseState = {};
  if (assessment.session) {
    try {
      conversationHistory = JSON.parse(assessment.session.conversationHistory);
      phaseState = JSON.parse(assessment.session.phaseState);
    } catch {
      console.warn("Failed to parse session data, using empty defaults");
    }
  }

  // 3. Extract teaching context
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
      where: { childId: child.id },
    });
    if (snapshot) {
      learnerProfile = JSON.parse(snapshot.profileData as string);
    }
  } catch {
    // Non-critical
  }

  // 5. Get real skill data
  const skillRecords = await prisma.skillProgress.findMany({
    where: { childId: child.id },
  });
  const skillsByCategory: Record<string, { level: string; score: number }> = {};
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

  // 6. Get streak
  const streak = await prisma.streak.findUnique({
    where: { childId: child.id },
  });

  // 7. Get curriculum
  const curriculum = await prisma.curriculum.findFirst({
    where: { childId: child.id, status: "ACTIVE" },
    include: { weeks: { orderBy: { weekNumber: "asc" } } },
  });

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

  // 8. Total lessons + badges
  const totalLessons = await prisma.lessonProgress.count({
    where: { childId: child.id, status: "completed" },
  });

  const achievements = await prisma.achievement.findMany({
    where: { childId: child.id },
    orderBy: { unlockedAt: "desc" },
    take: 2,
  });
  const newBadges = achievements
    .map((a) => getBadgeById(a.badgeId))
    .filter((b): b is NonNullable<typeof b> => !!b)
    .map((b) => ({ name: b.name, emoji: b.emoji, description: b.description }));

  // 9. Get real submission text
  const submission = await prisma.writingSubmission.findFirst({
    where: { childId: child.id, lessonId: assessment.lessonId },
    orderBy: { wordCount: "desc" },
  });

  const typeMap: Record<string, string> = {
    narrative: "Narrative",
    persuasive: "Persuasive",
    expository: "Expository",
    descriptive: "Descriptive",
  };

  const data: LessonReportEmailData = {
    parentName: child.parent?.name ?? "Parent",
    parentEmail: emailOverride ?? "karthikjanagiraman@gmail.com",
    childName: child.name,
    childId: child.id,
    lessonTitle: lesson.title,
    lessonType: typeMap[lesson.type] ?? lesson.type,
    wordCount: submission?.wordCount ?? 150,
    scores,
    overallScore: assessment.overallScore,
    feedback: {
      strength: feedback.strength ?? "Great effort!",
      growth: feedback.growth ?? "Keep practicing.",
      encouragement: feedback.encouragement ?? "You're doing wonderfully!",
    },
    skills,
    streak: {
      current: streak?.currentStreak ?? 0,
      weeklyGoal: streak?.weeklyGoal ?? 3,
      weeklyCompleted: streak?.weeklyCompleted ?? 0,
    },
    totalLessons,
    curriculum: curriculumInfo,
    newBadges,
    // New fields for LLM generation
    conversationHistory,
    phaseState,
    submissionText: submission?.submissionText ?? "",
    learningObjectives: lesson.learningObjectives ?? [],
    lessonTemplate: lesson.template,
    childAge: child.age,
    childTier: child.tier,
    teachingContext,
    learnerProfile,
  };

  // 10. Generate LLM report sections (unless --no-llm)
  let reportSections: ParentReportSections | null = null;
  if (!noLLM && conversationHistory.length > 0) {
    console.log("\nGenerating LLM report sections (2 parallel calls)...");
    try {
      reportSections = await generateParentReport(data);
      if (reportSections) {
        console.log("  LLM report generated successfully");
      } else {
        console.log("  LLM returned empty results, using template-only");
      }
    } catch (err) {
      console.error("  LLM generation failed:", err);
    }
  } else if (noLLM) {
    console.log("\n--no-llm flag set, skipping LLM generation");
  } else {
    console.log("\nNo conversation history found, skipping LLM generation");
  }

  const html = buildLessonReportHtml(data, reportSections);

  if (previewOnly) {
    const path = "/tmp/lesson-report-preview.html";
    writeFileSync(path, html);
    console.log(`\nHTML preview written to ${path}`);
    try {
      execSync(`open ${path}`);
    } catch {
      console.log("Open it in your browser to preview.");
    }
    await prisma.$disconnect();
    return;
  }

  // Send email
  if (!isEmailConfigured()) {
    console.error("\nRESEND_API_KEY is not set in .env");
    console.log(
      "To preview without sending, run: npx tsx scripts/send-test-email.ts --preview"
    );
    // Still write the HTML preview as a fallback
    const path = "/tmp/lesson-report-preview.html";
    writeFileSync(path, html);
    console.log(`\nHTML preview written to ${path} (open in browser to see)`);
    try {
      execSync(`open ${path}`);
    } catch {}
    await prisma.$disconnect();
    process.exit(1);
  }

  console.log(`\nSending lesson report email to ${data.parentEmail}...`);
  console.log(`  Child: ${data.childName}`);
  console.log(`  Lesson: ${data.lessonTitle} (${data.lessonType})`);
  console.log(`  Score: ${data.overallScore}/4`);
  console.log(`  LLM analysis: ${reportSections ? "yes" : "no"}`);
  console.log(`  Conversation messages: ${conversationHistory.length}`);

  // Use the standalone send since we already generated the report
  const { Resend } = await import("resend");
  const resend = new Resend(process.env.RESEND_API_KEY);
  const fromAddress =
    process.env.RESEND_FROM_EMAIL ??
    "WriteWise Kids <onboarding@resend.dev>";

  try {
    await resend.emails.send({
      from: fromAddress,
      to: data.parentEmail,
      subject: `Lesson Report: ${data.childName} \u2014 "${data.lessonTitle}" (${data.overallScore.toFixed(1)}/4)`,
      html,
    });
    console.log(`\nEmail sent successfully to ${data.parentEmail}`);
  } catch (err) {
    console.error("\nFailed to send email:", err);
    process.exit(1);
  }

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
