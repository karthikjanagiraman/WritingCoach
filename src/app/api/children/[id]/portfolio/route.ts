import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getLessonById } from "@/lib/curriculum";

const TYPE_PREFIX_MAP: Record<string, string> = {
  narrative: "N",
  persuasive: "P",
  expository: "E",
  descriptive: "D",
};

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: childId } = await params;

    const child = await prisma.childProfile.findFirst({
      where: { id: childId, parentId: session.user.userId },
    });
    if (!child) {
      return NextResponse.json({ error: "Child not found" }, { status: 404 });
    }

    const { searchParams } = request.nextUrl;
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") || "10", 10)));
    const type = searchParams.get("type");
    const sort = searchParams.get("sort") || "newest";
    const includeRevisions = searchParams.get("includeRevisions") === "true";

    // Build where clause
    const where: Record<string, unknown> = { childId };

    if (type && TYPE_PREFIX_MAP[type]) {
      where.lessonId = { startsWith: TYPE_PREFIX_MAP[type] };
    }

    if (!includeRevisions) {
      where.revisionNumber = 0;
    }

    // Build orderBy
    let orderBy: Record<string, string> | { feedback: Record<string, string> };
    if (sort === "oldest") {
      orderBy = { createdAt: "asc" };
    } else if (sort === "highest") {
      orderBy = { feedback: { overallScore: "desc" } };
    } else {
      orderBy = { createdAt: "desc" };
    }

    const [submissions, total] = await Promise.all([
      prisma.writingSubmission.findMany({
        where,
        include: {
          feedback: true,
        },
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.writingSubmission.count({ where }),
    ]);

    // If includeRevisions, also fetch revisions for each original submission
    let revisionsMap: Record<string, unknown[]> = {};
    if (includeRevisions) {
      const originalIds = submissions
        .filter((s) => s.revisionNumber === 0)
        .map((s) => s.id);
      if (originalIds.length > 0) {
        const revisions = await prisma.writingSubmission.findMany({
          where: {
            revisionOf: { in: originalIds },
          },
          include: { feedback: true },
          orderBy: { revisionNumber: "asc" },
        });
        for (const rev of revisions) {
          if (rev.revisionOf) {
            if (!revisionsMap[rev.revisionOf]) {
              revisionsMap[rev.revisionOf] = [];
            }
            revisionsMap[rev.revisionOf].push(formatSubmission(rev));
          }
        }
      }
    }

    const formattedSubmissions = submissions.map((s) => {
      const formatted = formatSubmission(s);
      if (includeRevisions && s.revisionNumber === 0 && revisionsMap[s.id]) {
        return { ...formatted, revisions: revisionsMap[s.id] };
      }
      return formatted;
    });

    return NextResponse.json({
      submissions: formattedSubmissions,
      total,
      page,
      limit,
    });
  } catch (error) {
    console.error("GET /api/children/[id]/portfolio error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

function formatSubmission(s: {
  id: string;
  lessonId: string;
  submissionText: string;
  wordCount: number;
  revisionNumber: number;
  createdAt: Date;
  feedback: {
    scores: string;
    overallScore: number;
    strength: string;
    growthArea: string;
    encouragement: string;
  } | null;
}) {
  const lesson = getLessonById(s.lessonId);
  return {
    id: s.id,
    lessonId: s.lessonId,
    lessonTitle: lesson?.title ?? "Unknown Lesson",
    lessonType: lesson?.type ?? "unknown",
    lessonUnit: lesson?.unit ?? "",
    submissionText: s.submissionText,
    wordCount: s.wordCount,
    revisionNumber: s.revisionNumber,
    createdAt: s.createdAt.toISOString(),
    feedback: s.feedback
      ? {
          scores: JSON.parse(s.feedback.scores) as Record<string, number>,
          overallScore: s.feedback.overallScore,
          strength: s.feedback.strength,
          growthArea: s.feedback.growthArea,
          encouragement: s.feedback.encouragement,
        }
      : null,
  };
}
