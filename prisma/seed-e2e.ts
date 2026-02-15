/**
 * E2E seed script — extends the base seed with data needed for browser tests.
 *
 * Run: npx tsx prisma/seed-e2e.ts
 *
 * Idempotent: uses upsert/deleteMany so it can be run repeatedly.
 * Calls the base seed first, then layers on assessment/submission/feedback data.
 */

import { PrismaClient } from "@prisma/client";
import bcryptjs from "bcryptjs";

const prisma = new PrismaClient();

async function seedBase() {
  console.log("── Base seed ──");

  const parent = await prisma.user.upsert({
    where: { email: "parent@example.com" },
    update: {},
    create: {
      id: "parent-001",
      email: "parent@example.com",
      passwordHash: await bcryptjs.hash("password123", 12),
      name: "Demo Parent",
      role: "PARENT",
    },
  });
  console.log(`  Parent: ${parent.name} (${parent.id})`);

  const maya = await prisma.childProfile.upsert({
    where: { id: "child-maya-001" },
    update: {},
    create: {
      id: "child-maya-001",
      parentId: parent.id,
      name: "Maya",
      age: 8,
      tier: 1,
      avatarEmoji: "\u{1F989}",
    },
  });
  console.log(`  Child: ${maya.name} (${maya.id})`);

  const ethan = await prisma.childProfile.upsert({
    where: { id: "child-ethan-001" },
    update: {},
    create: {
      id: "child-ethan-001",
      parentId: parent.id,
      name: "Ethan",
      age: 11,
      tier: 2,
      avatarEmoji: "\u{1F98A}",
    },
  });
  console.log(`  Child: ${ethan.name} (${ethan.id})`);

  return { parent, maya, ethan };
}

async function seedLessonProgress(childId: string) {
  console.log("── Lesson progress ──");

  // N1.1.1 — completed, high score
  await prisma.lessonProgress.upsert({
    where: { childId_lessonId: { childId, lessonId: "N1.1.1" } },
    update: { status: "completed", currentPhase: "feedback" },
    create: {
      childId,
      lessonId: "N1.1.1",
      status: "completed",
      currentPhase: "feedback",
      startedAt: new Date("2026-02-01T10:00:00Z"),
      completedAt: new Date("2026-02-01T10:30:00Z"),
    },
  });
  console.log("  N1.1.1: completed (high score)");

  // N1.1.2 — needs_improvement, low score
  await prisma.lessonProgress.upsert({
    where: { childId_lessonId: { childId, lessonId: "N1.1.2" } },
    update: { status: "needs_improvement", currentPhase: "feedback" },
    create: {
      childId,
      lessonId: "N1.1.2",
      status: "needs_improvement",
      currentPhase: "feedback",
      startedAt: new Date("2026-02-03T10:00:00Z"),
      completedAt: new Date("2026-02-03T10:25:00Z"),
    },
  });
  console.log("  N1.1.2: needs_improvement (low score)");

  // N1.1.3 — in_progress
  await prisma.lessonProgress.upsert({
    where: { childId_lessonId: { childId, lessonId: "N1.1.3" } },
    update: {},
    create: {
      childId,
      lessonId: "N1.1.3",
      status: "in_progress",
      currentPhase: "guided",
      startedAt: new Date("2026-02-08T14:00:00Z"),
    },
  });
  console.log("  N1.1.3: in_progress (guided phase)");
}

async function seedAssessmentData(childId: string) {
  console.log("── Assessment data ──");

  // Clean up existing assessment-related data for idempotency
  await prisma.aIFeedback.deleteMany({
    where: { submission: { childId } },
  });
  await prisma.writingSubmission.deleteMany({ where: { childId } });
  await prisma.assessment.deleteMany({ where: { childId } });
  await prisma.session.deleteMany({ where: { childId } });

  // ── N1.1.1: Completed, HIGH score (3.2) ──

  const session1 = await prisma.session.create({
    data: {
      id: "e2e-session-n111",
      childId,
      lessonId: "N1.1.1",
      phase: "feedback",
      phaseState: JSON.stringify({
        instructionCompleted: true,
        comprehensionCheckPassed: true,
        guidedAttempts: 3,
        hintsGiven: 1,
        guidedComplete: true,
      }),
      conversationHistory: JSON.stringify([
        { role: "assistant", content: "Welcome! Today we're learning about story beginnings." },
        { role: "user", content: "I think hooks grab your attention!" },
        { role: "assistant", content: "Great thinking! Let's practice together." },
      ]),
    },
  });

  const assessment1 = await prisma.assessment.create({
    data: {
      id: "e2e-assessment-n111",
      sessionId: session1.id,
      childId,
      lessonId: "N1.1.1",
      rubricId: "N1_story_beginning",
      submissionText:
        "Once upon a time, a little fox named Ruby found a magical map in her grandmother's attic. The map glowed with golden light and showed a path through the Whispering Woods. Ruby felt her heart beat faster with excitement. She packed her favorite snacks and her bravest smile, and set off on the greatest adventure of her life.",
      scores: JSON.stringify({
        hook_opening: 3.5,
        character_intro: 3.0,
        setting: 3.0,
        voice: 3.5,
      }),
      overallScore: 3.2,
      feedback: JSON.stringify({
        strength:
          "You created such a vivid opening! The detail about the map glowing with golden light really draws the reader in.",
        growth:
          "Try adding more sensory details about the Whispering Woods to help your reader picture the setting.",
        encouragement:
          "You're becoming a wonderful storyteller, Maya! Your creativity shines through every sentence.",
      }),
    },
  });

  const submission1 = await prisma.writingSubmission.create({
    data: {
      id: "e2e-submission-n111",
      sessionId: session1.id,
      childId,
      lessonId: "N1.1.1",
      rubricId: "N1_story_beginning",
      submissionText:
        "Once upon a time, a little fox named Ruby found a magical map in her grandmother's attic. The map glowed with golden light and showed a path through the Whispering Woods. Ruby felt her heart beat faster with excitement. She packed her favorite snacks and her bravest smile, and set off on the greatest adventure of her life.",
      wordCount: 55,
      revisionNumber: 0,
    },
  });

  await prisma.aIFeedback.create({
    data: {
      submissionId: submission1.id,
      scores: JSON.stringify({
        hook_opening: 3.5,
        character_intro: 3.0,
        setting: 3.0,
        voice: 3.5,
      }),
      overallScore: 3.2,
      strength:
        "You created such a vivid opening! The detail about the map glowing with golden light really draws the reader in.",
      growthArea:
        "Try adding more sensory details about the Whispering Woods to help your reader picture the setting.",
      encouragement:
        "You're becoming a wonderful storyteller, Maya! Your creativity shines through every sentence.",
      model: "claude-sonnet-4-5-20250929",
    },
  });
  console.log("  N1.1.1: session + assessment (3.2) + submission + feedback");

  // ── N1.1.2: needs_improvement, LOW score (1.0) ──

  const session2 = await prisma.session.create({
    data: {
      id: "e2e-session-n112",
      childId,
      lessonId: "N1.1.2",
      phase: "feedback",
      phaseState: JSON.stringify({
        instructionCompleted: true,
        comprehensionCheckPassed: true,
        guidedAttempts: 3,
        hintsGiven: 2,
        guidedComplete: true,
      }),
      conversationHistory: JSON.stringify([
        { role: "assistant", content: "Today we'll explore story middles!" },
        { role: "user", content: "Ok" },
      ]),
    },
  });

  const assessment2 = await prisma.assessment.create({
    data: {
      id: "e2e-assessment-n112",
      sessionId: session2.id,
      childId,
      lessonId: "N1.1.2",
      rubricId: "N1_story_beginning",
      submissionText: "The cat sat. It was ok.",
      scores: JSON.stringify({
        hook_opening: 1.0,
        character_intro: 1.0,
        setting: 1.0,
        voice: 1.0,
      }),
      overallScore: 1.0,
      feedback: JSON.stringify({
        strength: "You started writing, which is the most important step!",
        growth:
          "Try to add more details and description to help your reader understand the story.",
        encouragement:
          "Every writer starts somewhere. Let's try again and add more to your story!",
      }),
    },
  });

  const submission2 = await prisma.writingSubmission.create({
    data: {
      id: "e2e-submission-n112",
      sessionId: session2.id,
      childId,
      lessonId: "N1.1.2",
      rubricId: "N1_story_beginning",
      submissionText: "The cat sat. It was ok.",
      wordCount: 6,
      revisionNumber: 0,
    },
  });

  await prisma.aIFeedback.create({
    data: {
      submissionId: submission2.id,
      scores: JSON.stringify({
        hook_opening: 1.0,
        character_intro: 1.0,
        setting: 1.0,
        voice: 1.0,
      }),
      overallScore: 1.0,
      strength: "You started writing, which is the most important step!",
      growthArea:
        "Try to add more details and description to help your reader understand the story.",
      encouragement:
        "Every writer starts somewhere. Let's try again and add more to your story!",
      model: "claude-sonnet-4-5-20250929",
    },
  });
  console.log("  N1.1.2: session + assessment (1.0) + submission + feedback");
}

async function seedSkillProgress(childId: string) {
  console.log("── Skill progress ──");

  const skillData = [
    { skillCategory: "narrative", skillName: "story_structure", score: 3.0, level: "PROFICIENT" as const },
    { skillCategory: "narrative", skillName: "setting_description", score: 2.5, level: "DEVELOPING" as const },
    { skillCategory: "narrative", skillName: "voice_style", score: 3.2, level: "PROFICIENT" as const },
    { skillCategory: "narrative", skillName: "character_development", score: 2.0, level: "DEVELOPING" as const },
    { skillCategory: "narrative", skillName: "plot_pacing", score: 1.5, level: "EMERGING" as const },
  ];

  for (const skill of skillData) {
    await prisma.skillProgress.upsert({
      where: {
        childId_skillCategory_skillName: {
          childId,
          skillCategory: skill.skillCategory,
          skillName: skill.skillName,
        },
      },
      update: { score: skill.score, level: skill.level, totalAttempts: 2 },
      create: {
        childId,
        ...skill,
        totalAttempts: 2,
        lastAssessedAt: new Date("2026-02-03T10:25:00Z"),
      },
    });
  }
  console.log("  5 narrative skill records upserted");
}

async function seedStreak(childId: string) {
  console.log("── Streak ──");

  await prisma.streak.upsert({
    where: { childId },
    update: {
      currentStreak: 2,
      longestStreak: 5,
      weeklyGoal: 3,
      weeklyCompleted: 2,
      lastActiveDate: new Date("2026-02-13T10:00:00Z"),
    },
    create: {
      childId,
      currentStreak: 2,
      longestStreak: 5,
      weeklyGoal: 3,
      weeklyCompleted: 2,
      lastActiveDate: new Date("2026-02-13T10:00:00Z"),
      weekStartDate: new Date("2026-02-10T00:00:00Z"),
    },
  });
  console.log("  Streak: 2 days current, 5 longest, 2/3 weekly");
}

async function seedAchievement(childId: string) {
  console.log("── Achievement ──");

  await prisma.achievement.upsert({
    where: { childId_badgeId: { childId, badgeId: "first_lesson" } },
    update: {},
    create: {
      childId,
      badgeId: "first_lesson",
      unlockedAt: new Date("2026-02-01T10:30:00Z"),
      seen: true,
    },
  });
  console.log("  Badge: first_lesson");
}

async function seedPlacementAndCurriculum(childId: string) {
  console.log("── Placement & Curriculum ──");

  // Clean up existing
  await prisma.curriculumWeek.deleteMany({
    where: { curriculum: { childId } },
  });
  await prisma.curriculumRevision.deleteMany({
    where: { curriculum: { childId } },
  });
  await prisma.curriculum.deleteMany({ where: { childId } });
  await prisma.placementResult.deleteMany({ where: { childId } });

  await prisma.placementResult.create({
    data: {
      childId,
      prompts: JSON.stringify([
        "Write a short story about an animal who goes on an adventure.",
        "Describe your favorite place using all five senses.",
        "Convince your teacher to let the class have a pet.",
      ]),
      responses: JSON.stringify([
        "Once upon a time there was a bunny named Flop...",
        "My favorite place is grandma's kitchen...",
        "I think our class should get a hamster...",
      ]),
      aiAnalysis: JSON.stringify({
        strengths: ["Creative story ideas", "Enthusiastic voice"],
        gaps: ["Sentence variety needed", "Basic punctuation errors"],
        reasoning: "Maya shows strong creative instincts typical of Tier 1.",
      }),
      recommendedTier: 1,
      assignedTier: 1,
      confidence: 0.85,
    },
  });

  const now = new Date();
  const dayOfWeek = now.getDay();
  const daysSinceMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const mostRecentMonday = new Date(now);
  mostRecentMonday.setDate(now.getDate() - daysSinceMonday);
  mostRecentMonday.setHours(0, 0, 0, 0);

  const curriculum = await prisma.curriculum.create({
    data: {
      childId,
      status: "ACTIVE",
      weekCount: 8,
      lessonsPerWeek: 3,
      focusAreas: JSON.stringify(["narrative", "descriptive"]),
      startDate: mostRecentMonday,
    },
  });

  const weeks = [
    { weekNumber: 1, theme: "Story Beginnings", lessonIds: JSON.stringify(["N1.1.1", "N1.1.2", "N1.1.3"]), status: "in_progress" },
    { weekNumber: 2, theme: "Story Middles", lessonIds: JSON.stringify(["N1.2.1", "N1.2.2", "N1.2.3"]), status: "pending" },
    { weekNumber: 3, theme: "Describing with Senses", lessonIds: JSON.stringify(["D1.1.1", "D1.1.2", "D1.1.3"]), status: "pending" },
    { weekNumber: 4, theme: "Story Endings & Descriptive Places", lessonIds: JSON.stringify(["N1.3.1", "N1.3.2", "D1.1.4"]), status: "pending" },
  ];

  for (const week of weeks) {
    await prisma.curriculumWeek.create({
      data: { curriculumId: curriculum.id, ...week },
    });
  }
  console.log("  Placement + Curriculum (4 weeks)");
}

async function main() {
  console.log("=== E2E Seed Start ===\n");

  const { maya } = await seedBase();
  await seedLessonProgress(maya.id);
  await seedAssessmentData(maya.id);
  await seedSkillProgress(maya.id);
  await seedStreak(maya.id);
  await seedAchievement(maya.id);
  await seedPlacementAndCurriculum(maya.id);

  console.log("\n=== E2E Seed Complete ===");
}

main()
  .catch((e) => {
    console.error("E2E seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
