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

  // Add some lesson progress for Maya
  const completedLesson = await prisma.lessonProgress.upsert({
    where: {
      childId_lessonId: {
        childId: maya.id,
        lessonId: "N1.1.1",
      },
    },
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

  const completedLesson2 = await prisma.lessonProgress.upsert({
    where: {
      childId_lessonId: {
        childId: maya.id,
        lessonId: "N1.1.2",
      },
    },
    update: {},
    create: {
      childId: maya.id,
      lessonId: "N1.1.2",
      status: "completed",
      currentPhase: "feedback",
      startedAt: new Date("2026-02-03T10:00:00Z"),
      completedAt: new Date("2026-02-03T10:25:00Z"),
    },
  });
  console.log(`  Lesson N1.1.2: completed`);

  const inProgressLesson = await prisma.lessonProgress.upsert({
    where: {
      childId_lessonId: {
        childId: maya.id,
        lessonId: "N1.1.3",
      },
    },
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
      status: "completed",
    },
    {
      weekNumber: 2,
      theme: "Story Middles",
      lessonIds: JSON.stringify(["N1.2.1", "N1.2.2", "N1.2.3"]),
      status: "in_progress",
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
