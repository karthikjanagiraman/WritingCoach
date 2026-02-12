import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getLessonById } from "@/lib/curriculum";

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

    const submissions = await prisma.writingSubmission.findMany({
      where: { childId },
      include: { feedback: true },
      orderBy: { createdAt: "asc" },
    });

    const rows = submissions.map((s) => {
      const lesson = getLessonById(s.lessonId);
      return [
        new Date(s.createdAt).toLocaleDateString(),
        lesson?.title ?? "Unknown Lesson",
        lesson?.type ?? "unknown",
        s.wordCount,
        s.feedback?.overallScore ?? "",
        s.feedback?.strength ?? "",
        s.feedback?.growthArea ?? "",
      ]
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(",");
    });

    const csv = [
      "Date,Lesson,Type,Word Count,Score,Strength,Growth Area",
      ...rows,
    ].join("\n");

    const safeName = child.name.replace(/[^a-zA-Z0-9]/g, "-");

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="portfolio-${safeName}.csv"`,
      },
    });
  } catch (error) {
    console.error("GET /api/children/[id]/portfolio/export error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
