import { PrismaClient } from "@prisma/client";
import bcryptjs from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  // Create default parent user
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
  console.log(`Created parent: ${parent.name} (${parent.id})`);

  // Create child profile: Maya, age 8, Tier 1
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
  console.log(`Created child: ${maya.name} (${maya.id})`);

  // Create child profile: Ethan, age 11, Tier 2
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
  console.log(`Created child: ${ethan.name} (${ethan.id})`);

  // ============================================
  // Lesson Progress for Maya
  // ============================================

  // N1.1.1 — completed with high score (3.2)
  await prisma.lessonProgress.upsert({
    where: { childId_lessonId: { childId: maya.id, lessonId: "N1.1.1" } },
    update: {},
    create: {
      childId: maya.id,
      lessonId: "N1.1.1",
      status: "completed",
      currentPhase: "feedback",
      startedAt: new Date("2026-02-01T10:00:00Z"),
      completedAt: new Date("2026-02-01T10:30:00Z"),
    },
  });
  console.log(`  Lesson N1.1.1: completed`);

  // N1.1.2 — needs_improvement (low score 1.0)
  await prisma.lessonProgress.upsert({
    where: { childId_lessonId: { childId: maya.id, lessonId: "N1.1.2" } },
    update: { status: "needs_improvement" },
    create: {
      childId: maya.id,
      lessonId: "N1.1.2",
      status: "needs_improvement",
      currentPhase: "feedback",
      startedAt: new Date("2026-02-03T10:00:00Z"),
      completedAt: new Date("2026-02-03T10:25:00Z"),
    },
  });
  console.log(`  Lesson N1.1.2: needs_improvement`);

  // N1.1.3 — in_progress (guided phase)
  await prisma.lessonProgress.upsert({
    where: { childId_lessonId: { childId: maya.id, lessonId: "N1.1.3" } },
    update: {},
    create: {
      childId: maya.id,
      lessonId: "N1.1.3",
      status: "in_progress",
      currentPhase: "guided",
      startedAt: new Date("2026-02-08T14:00:00Z"),
    },
  });
  console.log(`  Lesson N1.1.3: in_progress (guided phase)`);

  // D1.1.1 — completed (descriptive lesson for badge test)
  await prisma.lessonProgress.upsert({
    where: { childId_lessonId: { childId: maya.id, lessonId: "D1.1.1" } },
    update: {},
    create: {
      childId: maya.id,
      lessonId: "D1.1.1",
      status: "completed",
      currentPhase: "feedback",
      startedAt: new Date("2026-02-18T10:00:00Z"),
      completedAt: new Date("2026-02-18T10:30:00Z"),
    },
  });
  console.log(`  Lesson D1.1.1: completed`);

  // ============================================
  // Sessions for Maya's completed lessons
  // ============================================

  // Session for N1.1.1
  const session1 = await prisma.session.upsert({
    where: { id: "session-n111" },
    update: {},
    create: {
      id: "session-n111",
      childId: maya.id,
      lessonId: "N1.1.1",
      phase: "feedback",
      phaseState: JSON.stringify({ instructionCompleted: true, comprehensionCheckPassed: true, guidedComplete: true }),
      conversationHistory: JSON.stringify([]),
    },
  });

  // Session for N1.1.2
  const session2 = await prisma.session.upsert({
    where: { id: "session-n112" },
    update: {},
    create: {
      id: "session-n112",
      childId: maya.id,
      lessonId: "N1.1.2",
      phase: "feedback",
      phaseState: JSON.stringify({ instructionCompleted: true, comprehensionCheckPassed: true, guidedComplete: true }),
      conversationHistory: JSON.stringify([]),
    },
  });

  // Note: No session seeded for N1.1.3 — lesson/start creates it fresh

  // Session for D1.1.1
  const sessionD = await prisma.session.upsert({
    where: { id: "session-d111" },
    update: {},
    create: {
      id: "session-d111",
      childId: maya.id,
      lessonId: "D1.1.1",
      phase: "feedback",
      phaseState: JSON.stringify({ instructionCompleted: true, comprehensionCheckPassed: true, guidedComplete: true }),
      conversationHistory: JSON.stringify([]),
    },
  });

  console.log("  Created sessions");

  // ============================================
  // Writing Submissions + AI Feedback
  // ============================================

  // Submission for N1.1.1 (score 3.2)
  const sub1 = await prisma.writingSubmission.upsert({
    where: { id: "sub-n111" },
    update: {},
    create: {
      id: "sub-n111",
      sessionId: session1.id,
      childId: maya.id,
      lessonId: "N1.1.1",
      rubricId: "narrative-t1-basic",
      submissionText: "Once upon a time there was a clever fox named Ruby who lived in a cozy den under the old oak tree. One morning, Ruby woke up to find golden leaves falling from the sky. She followed the trail of leaves through the forest, past the singing birds and the whispering wind. At the end of the trail, she found a secret garden full of wildflowers and butterflies. Ruby knew she had found the most magical place in the whole forest.",
      wordCount: 78,
      timeSpentSec: 420,
      revisionNumber: 0,
      createdAt: new Date("2026-02-01T10:25:00Z"),
    },
  });

  await prisma.aIFeedback.upsert({
    where: { submissionId: sub1.id },
    update: {},
    create: {
      submissionId: sub1.id,
      scores: JSON.stringify({ story_structure: 3, voice: 4, details: 3, conventions: 3 }),
      overallScore: 3.2,
      strength: "Great use of descriptive language! The golden leaves and singing birds really paint a picture.",
      growthArea: "Try adding more dialogue between characters to bring your story to life.",
      encouragement: "You're a wonderful storyteller, Maya! Keep using those beautiful descriptions.",
      model: "claude-sonnet-4-5-20250929",
    },
  });

  // Submission for N1.1.2 (score 1.0 — needs improvement)
  const sub2 = await prisma.writingSubmission.upsert({
    where: { id: "sub-n112" },
    update: {},
    create: {
      id: "sub-n112",
      sessionId: session2.id,
      childId: maya.id,
      lessonId: "N1.1.2",
      rubricId: "narrative-t1-basic",
      submissionText: "The cat sat on the mat. It was a nice day. The end.",
      wordCount: 14,
      timeSpentSec: 60,
      revisionNumber: 0,
      createdAt: new Date("2026-02-03T10:20:00Z"),
    },
  });

  await prisma.aIFeedback.upsert({
    where: { submissionId: sub2.id },
    update: {},
    create: {
      submissionId: sub2.id,
      scores: JSON.stringify({ story_structure: 1, voice: 1, details: 1, conventions: 1 }),
      overallScore: 1.0,
      strength: "You started your story with a character — that's a good beginning!",
      growthArea: "Try to develop your story more. What happens to the cat? Where does the cat go? Add more details!",
      encouragement: "Every writer starts somewhere. Next time, try to write a bit more and add some adventure!",
      model: "claude-sonnet-4-5-20250929",
    },
  });

  // Submission for D1.1.1 (score 2.0)
  const subD = await prisma.writingSubmission.upsert({
    where: { id: "sub-d111" },
    update: {},
    create: {
      id: "sub-d111",
      sessionId: sessionD.id,
      childId: maya.id,
      lessonId: "D1.1.1",
      rubricId: "descriptive-t1-basic",
      submissionText: "The beach is really cool. I like the sand and the waves. The sun is warm and the water is blue. I can hear the seagulls. It smells like salt.",
      wordCount: 30,
      timeSpentSec: 180,
      revisionNumber: 0,
      createdAt: new Date("2026-02-18T10:25:00Z"),
    },
  });

  await prisma.aIFeedback.upsert({
    where: { submissionId: subD.id },
    update: {},
    create: {
      submissionId: subD.id,
      scores: JSON.stringify({ sensory_details: 2, figurative_language: 1, organization: 2, conventions: 3 }),
      overallScore: 2.0,
      strength: "Great job using all five senses in your description!",
      growthArea: "Try using more specific, vivid words instead of general ones like 'cool' and 'really'.",
      encouragement: "You're getting the hang of descriptive writing! Keep painting pictures with your words.",
      model: "claude-sonnet-4-5-20250929",
    },
  });

  console.log("  Created writing submissions + AI feedback");

  // ============================================
  // Assessments (for report page)
  // ============================================

  await prisma.assessment.upsert({
    where: { id: "assess-n111" },
    update: {},
    create: {
      id: "assess-n111",
      sessionId: session1.id,
      childId: maya.id,
      lessonId: "N1.1.1",
      rubricId: "narrative-t1-basic",
      submissionText: sub1.submissionText,
      scores: JSON.stringify({ story_structure: 3, voice: 4, details: 3, conventions: 3 }),
      overallScore: 3.2,
      feedback: JSON.stringify({
        strength: "Great use of descriptive language! The golden leaves and singing birds really paint a picture.",
        growth: "Try adding more dialogue between characters to bring your story to life.",
        encouragement: "You're a wonderful storyteller, Maya! Keep using those beautiful descriptions.",
      }),
      createdAt: new Date("2026-02-01T10:28:00Z"),
    },
  });

  await prisma.assessment.upsert({
    where: { id: "assess-n112" },
    update: {},
    create: {
      id: "assess-n112",
      sessionId: session2.id,
      childId: maya.id,
      lessonId: "N1.1.2",
      rubricId: "narrative-t1-basic",
      submissionText: sub2.submissionText,
      scores: JSON.stringify({ story_structure: 1, voice: 1, details: 1, conventions: 1 }),
      overallScore: 1.0,
      feedback: JSON.stringify({
        strength: "You started your story with a character — that's a good beginning!",
        growth: "Try to develop your story more with additional details and events.",
        encouragement: "Every writer starts somewhere. Next time, try adding more adventure!",
      }),
      createdAt: new Date("2026-02-03T10:22:00Z"),
    },
  });

  await prisma.assessment.upsert({
    where: { id: "assess-d111" },
    update: {},
    create: {
      id: "assess-d111",
      sessionId: sessionD.id,
      childId: maya.id,
      lessonId: "D1.1.1",
      rubricId: "descriptive-t1-basic",
      submissionText: subD.submissionText,
      scores: JSON.stringify({ sensory_details: 2, figurative_language: 1, organization: 2, conventions: 3 }),
      overallScore: 2.0,
      feedback: JSON.stringify({
        strength: "Great job using all five senses in your description!",
        growth: "Try using more specific, vivid words instead of general ones.",
        encouragement: "You're getting the hang of descriptive writing!",
      }),
      createdAt: new Date("2026-02-18T10:28:00Z"),
    },
  });

  console.log("  Created assessments");

  // ============================================
  // Streak for Maya
  // ============================================

  const today = new Date();
  const dayOfWeekForStreak = today.getDay();
  const daysSinceMondayForStreak = dayOfWeekForStreak === 0 ? 6 : dayOfWeekForStreak - 1;
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - daysSinceMondayForStreak);
  weekStart.setHours(0, 0, 0, 0);

  await prisma.streak.upsert({
    where: { childId: maya.id },
    update: { currentStreak: 1, weeklyCompleted: 2, weekStartDate: weekStart, lastActiveDate: today },
    create: {
      childId: maya.id,
      currentStreak: 1,
      longestStreak: 3,
      lastActiveDate: today,
      weeklyGoal: 3,
      weeklyCompleted: 2,
      weekStartDate: weekStart,
    },
  });
  console.log("  Created streak (1 day, 2/3 weekly)");

  // ============================================
  // Skill Progress for Maya
  // ============================================

  const skillData = [
    { skillCategory: "narrative", skillName: "story_structure", score: 2.4, totalAttempts: 2 },
    { skillCategory: "narrative", skillName: "voice", score: 2.5, totalAttempts: 2 },
    { skillCategory: "descriptive", skillName: "sensory_details", score: 2.0, totalAttempts: 1 },
    { skillCategory: "descriptive", skillName: "figurative_language", score: 1.0, totalAttempts: 1 },
  ];

  for (const skill of skillData) {
    await prisma.skillProgress.upsert({
      where: {
        childId_skillCategory_skillName: {
          childId: maya.id,
          skillCategory: skill.skillCategory,
          skillName: skill.skillName,
        },
      },
      update: { score: skill.score, totalAttempts: skill.totalAttempts },
      create: {
        childId: maya.id,
        ...skill,
        level: skill.score >= 3 ? "PROFICIENT" : skill.score >= 2 ? "DEVELOPING" : "EMERGING",
        lastAssessedAt: new Date(),
      },
    });
  }
  console.log("  Created skill progress");

  // ============================================
  // Placement & Curriculum for Maya
  // ============================================

  // Clean up existing placement/curriculum data for idempotency
  await prisma.curriculumWeek.deleteMany({
    where: { curriculum: { childId: maya.id } },
  });
  await prisma.curriculumRevision.deleteMany({
    where: { curriculum: { childId: maya.id } },
  });
  await prisma.curriculum.deleteMany({ where: { childId: maya.id } });
  await prisma.placementResult.deleteMany({ where: { childId: maya.id } });

  // PlacementResult for Maya
  const placementResult = await prisma.placementResult.create({
    data: {
      childId: maya.id,
      prompts: JSON.stringify([
        "Write a short story about an animal who goes on an adventure.",
        "Describe your favorite place using all five senses.",
        "Convince your teacher to let the class have a pet.",
      ]),
      responses: JSON.stringify([
        "Once upon a time there was a bunny named Flop. Flop wanted to find the rainbow. He hopped and hopped over the big hill. He found a river and swam across it. Then he saw the rainbow! It was so pretty with all the colors. Flop was very happy.",
        "My favorite place is grandma's kitchen. It smells like cookies and cinnamon. The floor is warm on my feet. I can hear the clock ticking and birds outside. Everything is yellow and sunny. The cookies taste so good and the milk is cold.",
        "I think our class should get a hamster. Hamsters are small and easy to take care of. We could take turns feeding it. It would teach us to be responsible. Also hamsters are really cute and fluffy. Please can we get one?",
      ]),
      aiAnalysis: JSON.stringify({
        strengths: [
          "Creative story ideas",
          "Enthusiastic voice",
          "Good use of sensory details",
        ],
        gaps: [
          "Sentence variety needed",
          "Basic punctuation errors",
          "Could develop ideas more",
        ],
        reasoning:
          "Maya shows strong creative instincts and enthusiasm typical of Tier 1 writers. Her writing demonstrates age-appropriate skills with room for growth in sentence structure.",
      }),
      recommendedTier: 1,
      assignedTier: 1,
      confidence: 0.85,
    },
  });
  console.log(`Created placement result for Maya (confidence: ${placementResult.confidence})`);

  // Calculate most recent Monday for curriculum start date
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0 = Sunday, 1 = Monday, ...
  const daysSinceMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const mostRecentMonday = new Date(now);
  mostRecentMonday.setDate(now.getDate() - daysSinceMonday);
  mostRecentMonday.setHours(0, 0, 0, 0);

  // Curriculum for Maya
  const curriculum = await prisma.curriculum.create({
    data: {
      childId: maya.id,
      status: "ACTIVE",
      weekCount: 8,
      lessonsPerWeek: 3,
      focusAreas: JSON.stringify(["narrative", "descriptive"]),
      startDate: mostRecentMonday,
    },
  });
  console.log(`Created curriculum for Maya (${curriculum.weekCount} weeks, starting ${mostRecentMonday.toISOString().split("T")[0]})`);

  // CurriculumWeeks for Maya
  const weeksData = [
    {
      weekNumber: 1,
      theme: "Story Beginnings",
      lessonIds: JSON.stringify(["N1.1.1", "N1.1.2", "N1.1.3"]),
      status: "in_progress",
    },
    {
      weekNumber: 2,
      theme: "Story Middles",
      lessonIds: JSON.stringify(["N1.2.1", "N1.2.2", "N1.2.3"]),
      status: "pending",
    },
    {
      weekNumber: 3,
      theme: "Describing with Senses",
      lessonIds: JSON.stringify(["D1.1.1", "D1.1.2", "D1.1.3"]),
      status: "pending",
    },
    {
      weekNumber: 4,
      theme: "Story Endings & Descriptive Places",
      lessonIds: JSON.stringify(["N1.3.1", "N1.3.2", "D1.1.4"]),
      status: "pending",
    },
  ];

  for (const week of weeksData) {
    await prisma.curriculumWeek.create({
      data: {
        curriculumId: curriculum.id,
        ...week,
      },
    });
    console.log(`  Week ${week.weekNumber}: ${week.theme} (${week.status})`);
  }

  console.log("Seed complete!");
}

main()
  .catch((e) => {
    console.error("Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
