import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getLessonById } from "@/lib/curriculum";

function escapeCsvValue(value: string | number | null | undefined): string {
  const str = String(value ?? "");
  // If the value contains commas, quotes, or newlines, wrap in quotes and escape internal quotes
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

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

    // Verify child exists and belongs to this parent
    const child = await prisma.childProfile.findFirst({
      where: { id: childId, parentId: session.user.userId },
    });
    if (!child) {
      return NextResponse.json(
        { error: "Child not found or access denied" },
        { status: 403 }
      );
    }

    // Query all writing submissions with their AI feedback
    const submissions = await prisma.writingSubmission.findMany({
      where: { childId },
      include: { feedback: true },
      orderBy: { createdAt: "desc" },
    });

    // Build CSV header
    const headers = [
      "Date",
      "Lesson",
      "Type",
      "Score",
      "Word Count",
      "Strength",
      "Growth Area",
    ];

    // Build CSV rows
    const rows = submissions.map((s) => {
      const lesson = getLessonById(s.lessonId);
      const date = s.createdAt.toISOString().split("T")[0];
      const lessonTitle = lesson?.title ?? "Unknown Lesson";
      const lessonType = lesson?.type ?? "unknown";
      const score = s.feedback?.overallScore ?? "";
      const wordCount = s.wordCount;
      const strength = s.feedback?.strength ?? "";
      const growthArea = s.feedback?.growthArea ?? "";

      return [date, lessonTitle, lessonType, score, wordCount, strength, growthArea]
        .map(escapeCsvValue)
        .join(",");
    });

    const csv = [headers.join(","), ...rows].join("\n");

    // Build safe filename
    const safeName = child.name.replace(/[^a-zA-Z0-9]/g, "-");
    const dateStr = new Date().toISOString().split("T")[0];

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="report-${safeName}-${dateStr}.csv"`,
      },
    });
  } catch (error) {
    console.error("GET /api/children/[id]/report/export error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
