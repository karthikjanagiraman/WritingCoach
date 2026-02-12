import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getLessonById } from "@/lib/curriculum";
import { getRubricById } from "@/lib/rubrics";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: lessonId } = await params;

    const lesson = getLessonById(lessonId);
    if (!lesson) {
      return NextResponse.json(
        { error: "Lesson not found" },
        { status: 404 }
      );
    }

    // Include rubric summary if the lesson has one
    let rubricSummary = null;
    if (lesson.rubricId) {
      const rubric = getRubricById(lesson.rubricId);
      if (rubric) {
        rubricSummary = {
          id: rubric.id,
          description: rubric.description,
          wordRange: rubric.word_range,
          criteriaCount: rubric.criteria.length,
          criteria: rubric.criteria.map((c) => ({
            name: c.name,
            displayName: c.display_name,
            weight: c.weight,
          })),
        };
      }
    }

    return NextResponse.json({
      lesson: {
        id: lesson.id,
        title: lesson.title,
        unit: lesson.unit,
        type: lesson.type,
        tier: lesson.tier,
        learningObjectives: lesson.learningObjectives,
        rubricId: lesson.rubricId ?? null,
      },
      rubric: rubricSummary,
    });
  } catch (error) {
    console.error("GET /api/lessons/[id] error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
