import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  // Create sample student: Maya, age 8, Tier 1
  const maya = await prisma.student.upsert({
    where: { id: "student-maya-001" },
    update: {},
    create: {
      id: "student-maya-001",
      name: "Maya",
      age: 8,
      tier: 1,
    },
  });
  console.log(`Created student: ${maya.name} (${maya.id})`);

  // Add some lesson progress for Maya
  const completedLesson = await prisma.lessonProgress.upsert({
    where: {
      studentId_lessonId: {
        studentId: maya.id,
        lessonId: "N1.1.1",
      },
    },
    update: {},
    create: {
      studentId: maya.id,
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
      studentId_lessonId: {
        studentId: maya.id,
        lessonId: "N1.1.2",
      },
    },
    update: {},
    create: {
      studentId: maya.id,
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
      studentId_lessonId: {
        studentId: maya.id,
        lessonId: "N1.1.3",
      },
    },
    update: {},
    create: {
      studentId: maya.id,
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
