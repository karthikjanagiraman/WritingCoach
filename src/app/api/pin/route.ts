import { NextResponse } from "next/server";
import bcryptjs from "bcryptjs";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

// GET /api/auth/pin — check if user has a PIN set
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.userId },
      select: { parentPin: true },
    });

    return NextResponse.json({ hasPin: !!user?.parentPin });
  } catch (error) {
    console.error("GET /api/auth/pin error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST /api/auth/pin — set up or verify PIN
// body: { action: "setup" | "verify", pin: string }
export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { action, pin } = await req.json();

    if (!pin || typeof pin !== "string" || !/^\d{4}$/.test(pin)) {
      return NextResponse.json(
        { error: "PIN must be exactly 4 digits" },
        { status: 400 }
      );
    }

    if (action === "setup") {
      const hash = await bcryptjs.hash(pin, 10);
      await prisma.user.update({
        where: { id: session.user.userId },
        data: { parentPin: hash },
      });
      return NextResponse.json({ success: true });
    }

    if (action === "verify") {
      const user = await prisma.user.findUnique({
        where: { id: session.user.userId },
        select: { parentPin: true },
      });

      if (!user?.parentPin) {
        return NextResponse.json(
          { error: "No PIN set" },
          { status: 404 }
        );
      }

      const isValid = await bcryptjs.compare(pin, user.parentPin);
      if (!isValid) {
        return NextResponse.json(
          { error: "Wrong PIN" },
          { status: 403 }
        );
      }

      return NextResponse.json({ success: true });
    }

    return NextResponse.json(
      { error: "Invalid action. Use 'setup' or 'verify'" },
      { status: 400 }
    );
  } catch (error) {
    console.error("POST /api/auth/pin error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
