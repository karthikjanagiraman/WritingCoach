import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getLessonById, getLessonsByTier, getAllLessons } from "@/lib/curriculum";
import type { Tier } from "@/types";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: studentId } = await params;

    // Verify student exists
    const student = await prisma.student.findUnique({
      where: { id: studentId },
    });
    if (!student) {
      return NextResponse.json(
        { error: "Student not found" },
        { status: 404 }
      );
    }

    // Get all lesson progress for this student
    const progressRecords = await prisma.lessonProgress.findMany({
      where: { studentId },
      orderBy: { startedAt: "desc" },
    });

    // Get recent assessments
    const assessments = await prisma.assessment.findMany({
      where: { studentId },
      orderBy: { createdAt: "desc" },
      take: 10,
    });

    // Categorize progress
    const completedLessons = progressRecords
      .filter((p) => p.status === "completed")
      .map((p) => {
        const lesson = getLessonById(p.lessonId);
        return {
          lessonId: p.lessonId,
          title: lesson?.title ?? "Unknown Lesson",
          completedAt: p.completedAt,
        };
      });

    const currentLesson = progressRecords.find(
      (p) => p.status === "in_progress"
    );

    // Available lessons for student's tier
    const tierLessons = getLessonsByTier(student.tier as Tier);
    const completedIds = new Set(
      completedLessons.map((l) => l.lessonId)
    );
    const availableLessons = tierLessons
      .filter((l) => !completedIds.has(l.id))
      .map((l) => ({
        id: l.id,
        title: l.title,
        unit: l.unit,
        type: l.type,
      }));

    // Build assessment summary
    const assessmentSummary = assessments.map((a) => ({
      lessonId: a.lessonId,
      overallScore: a.overallScore,
      createdAt: a.createdAt,
    }));

    // Calculate per-writing-type stats
    const allLessons = getAllLessons();
    const completedProgress = progressRecords.filter((p) => p.status === "completed");
    const typeStats: Record<string, { completed: number; total: number; avgScore: number | null }> = {};
    for (const type of ["narrative", "persuasive", "expository", "descriptive"]) {
      const typeLessons = allLessons.filter((l) => l.type === type && l.tier === student.tier);
      const typeCompleted = completedProgress.filter((p) => {
        const lesson = getLessonById(p.lessonId);
        return lesson?.type === type;
      });
      const typeAssessments = assessments.filter((a) => {
        const lesson = getLessonById(a.lessonId);
        return lesson?.type === type;
      });
      const avgScore =
        typeAssessments.length > 0
          ? Math.round(
              (typeAssessments.reduce((sum, a) => sum + a.overallScore, 0) /
                typeAssessments.length) *
                10
            ) / 10
          : null;
      typeStats[type] = {
        completed: typeCompleted.length,
        total: typeLessons.length,
        avgScore,
      };
    }

    return NextResponse.json({
      student: {
        id: student.id,
        name: student.name,
        age: student.age,
        tier: student.tier,
      },
      completedLessons,
      currentLesson: currentLesson
        ? {
            lessonId: currentLesson.lessonId,
            title:
              getLessonById(currentLesson.lessonId)?.title ??
              "Unknown Lesson",
            currentPhase: currentLesson.currentPhase,
            startedAt: currentLesson.startedAt,
          }
        : null,
      availableLessons,
      assessments: assessmentSummary,
      typeStats,
      stats: {
        totalCompleted: completedLessons.length,
        totalAvailable: tierLessons.length,
        averageScore:
          assessments.length > 0
            ? Math.round(
                (assessments.reduce((s, a) => s + a.overallScore, 0) /
                  assessments.length) *
                  10
              ) / 10
            : null,
      },
    });
  } catch (error) {
    console.error("GET /api/students/[id]/progress error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
