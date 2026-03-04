import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getStripe, getOrCreateStripeCustomer } from "@/lib/stripe";

export async function POST() {
  try {
    const session = await auth();
    if (!session?.user?.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const customerId = await getOrCreateStripeCustomer(session.user.userId);
    const stripe = getStripe();

    const baseUrl = process.env.AUTH_URL ?? "http://localhost:3000";

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${baseUrl}/dashboard`,
    });

    return NextResponse.json({ url: portalSession.url });
  } catch (error) {
    console.error("POST /api/subscriptions/portal error:", error);
    return NextResponse.json(
      { error: "Failed to create portal session" },
      { status: 500 }
    );
  }
}
