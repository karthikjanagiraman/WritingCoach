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
