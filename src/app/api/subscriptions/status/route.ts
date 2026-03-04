import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getSubscriptionInfo } from "@/lib/subscription";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const info = await getSubscriptionInfo(session.user.userId);

    if (!info) {
      return NextResponse.json({ subscription: null });
    }

    return NextResponse.json({ subscription: info });
  } catch (error) {
    console.error("GET /api/subscriptions/status error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
