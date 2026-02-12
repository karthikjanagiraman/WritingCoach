/**
 * Migration script: Copy Assessment records → WritingSubmission + AIFeedback
 * Run with: npx tsx prisma/migrate-assessments.ts
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const assessments = await prisma.assessment.findMany();
  console.log(`Found ${assessments.length} assessments to migrate`);

  let migrated = 0;
  let skipped = 0;

  for (const assessment of assessments) {
    // Check if already migrated (matching sessionId + submissionText)
    const existing = await prisma.writingSubmission.findFirst({
      where: {
        sessionId: assessment.sessionId,
        submissionText: assessment.submissionText,
      },
    });

    if (existing) {
      skipped++;
      continue;
    }

    // Parse feedback JSON
    let strength = "";
    let growthArea = "";
    let encouragement = "";
    try {
      const feedback = JSON.parse(assessment.feedback);
      strength = feedback.strength || "";
      growthArea = feedback.growth || feedback.growthArea || "";
      encouragement = feedback.encouragement || "";
    } catch {
      console.warn(`  Could not parse feedback for assessment ${assessment.id}`);
    }

    // Calculate word count
    const wordCount = assessment.submissionText.trim().split(/\s+/).length;

    // Create WritingSubmission + AIFeedback
    await prisma.writingSubmission.create({
      data: {
        sessionId: assessment.sessionId,
        childId: assessment.childId,
        lessonId: assessment.lessonId,
        rubricId: assessment.rubricId,
        submissionText: assessment.submissionText,
        wordCount,
        revisionNumber: 0,
        feedback: {
          create: {
            scores: assessment.scores,
            overallScore: assessment.overallScore,
            strength,
            growthArea,
            encouragement,
            model: "claude-sonnet-4-5-20250929",
          },
        },
      },
    });

    migrated++;
    console.log(`  Migrated assessment ${assessment.id} (${wordCount} words)`);
  }

  console.log(`\nMigration complete: ${migrated} migrated, ${skipped} skipped (already exist)`);
}

main()
  .catch((e) => {
    console.error("Migration failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
