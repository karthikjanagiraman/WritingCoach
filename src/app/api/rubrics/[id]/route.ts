import { NextRequest, NextResponse } from "next/server";
import { getRubricById, getRubricMetadata } from "@/lib/rubrics";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: rubricId } = await params;

    const rubric = getRubricById(rubricId);
    if (!rubric) {
      return NextResponse.json(
        { error: "Rubric not found" },
        { status: 404 }
      );
    }

    const metadata = getRubricMetadata();

    return NextResponse.json({
      rubric,
      scoringScale: metadata.scoring_scale,
    });
  } catch (error) {
    console.error("GET /api/rubrics/[id] error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
