import { NextRequest, NextResponse } from "next/server";
import { getStripe, planFromPriceId } from "@/lib/stripe";
import { prisma } from "@/lib/db";

// Stripe webhook event data shapes vary by API version.
// Use a lightweight type for the fields we access.
interface StripeSubData {
  id: string;
  status: string;
  cancel_at_period_end: boolean;
  items: { data: Array<{ price: { id: string }; current_period_end?: number }> };
  // May or may not exist depending on API version
  current_period_end?: number;
}

function getPeriodEnd(sub: StripeSubData): Date | null {
  // Try top-level first (older API versions), then item-level (newer)
  const ts = sub.current_period_end ?? sub.items?.data?.[0]?.current_period_end;
  return ts ? new Date(ts * 1000) : null;
}

export async function POST(request: NextRequest) {
  const stripe = getStripe();
  const body = await request.text();
  const sig = request.headers.get("stripe-signature");

  if (!sig || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  let event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    // Cast event data through unknown for webhook flexibility — Stripe types
    // don't always match what the webhook actually sends at runtime.
    const obj = event.data.object as unknown as Record<string, unknown>;

    switch (event.type) {
      case "checkout.session.completed": {
        const userId = (obj.metadata as Record<string, string>)?.userId;
        const subscriptionId = obj.subscription as string;

        if (!userId || !subscriptionId) break;

        const stripeSub = await stripe.subscriptions.retrieve(subscriptionId) as unknown as StripeSubData;
        const priceId = stripeSub.items.data[0]?.price.id;
        const plan = priceId ? planFromPriceId(priceId) : null;

        if (!plan) {
          console.error("Unknown price ID from Stripe:", priceId);
          break;
        }

        const periodEnd = getPeriodEnd(stripeSub);

        await prisma.subscription.upsert({
          where: { userId },
          update: {
            plan,
            status: "ACTIVE",
            stripeCustomerId: obj.customer as string,
            stripeSubId: subscriptionId,
            stripePriceId: priceId,
            ...(periodEnd && { currentPeriodEnd: periodEnd }),
            cancelAtPeriodEnd: stripeSub.cancel_at_period_end,
            trialEndsAt: null,
          },
          create: {
            userId,
            plan,
            status: "ACTIVE",
            stripeCustomerId: obj.customer as string,
            stripeSubId: subscriptionId,
            stripePriceId: priceId,
            ...(periodEnd && { currentPeriodEnd: periodEnd }),
            cancelAtPeriodEnd: stripeSub.cancel_at_period_end,
          },
        });

        console.log(`[Stripe] Subscription activated for user ${userId}: ${plan}`);
        break;
      }

      case "invoice.paid": {
        // Extract subscription ID from invoice — field name varies by API version
        const subscriptionId = (obj.subscription ?? (obj.parent as Record<string, unknown> | undefined)?.subscription_details) as string | undefined;
        if (!subscriptionId) break;

        const stripeSub = await stripe.subscriptions.retrieve(subscriptionId) as unknown as StripeSubData;
        const sub = await prisma.subscription.findFirst({
          where: { stripeSubId: subscriptionId },
        });

        if (sub) {
          const periodEnd = getPeriodEnd(stripeSub);
          await prisma.subscription.update({
            where: { id: sub.id },
            data: {
              status: "ACTIVE",
              ...(periodEnd && { currentPeriodEnd: periodEnd }),
            },
          });
        }
        break;
      }

      case "invoice.payment_failed": {
        const subscriptionId = (obj.subscription ?? (obj.parent as Record<string, unknown> | undefined)?.subscription_details) as string | undefined;
        if (!subscriptionId) break;

        const sub = await prisma.subscription.findFirst({
          where: { stripeSubId: subscriptionId },
        });

        if (sub) {
          await prisma.subscription.update({
            where: { id: sub.id },
            data: { status: "PAST_DUE" },
          });
          console.log(`[Stripe] Payment failed for subscription ${subscriptionId}`);
        }
        break;
      }

      case "customer.subscription.updated": {
        const stripeSub = obj as unknown as StripeSubData;
        const sub = await prisma.subscription.findFirst({
          where: { stripeSubId: stripeSub.id },
        });

        if (sub) {
          const priceId = stripeSub.items.data[0]?.price.id;
          const plan = priceId ? planFromPriceId(priceId) : null;
          const periodEnd = getPeriodEnd(stripeSub);

          await prisma.subscription.update({
            where: { id: sub.id },
            data: {
              ...(plan && { plan }),
              ...(priceId && { stripePriceId: priceId }),
              status: stripeSub.status === "active" ? "ACTIVE" : stripeSub.status === "past_due" ? "PAST_DUE" : sub.status,
              ...(periodEnd && { currentPeriodEnd: periodEnd }),
              cancelAtPeriodEnd: stripeSub.cancel_at_period_end,
            },
          });
        }
        break;
      }

      case "customer.subscription.deleted": {
        const stripeSub = obj as unknown as StripeSubData;
        const sub = await prisma.subscription.findFirst({
          where: { stripeSubId: stripeSub.id },
        });

        if (sub) {
          await prisma.subscription.update({
            where: { id: sub.id },
            data: { status: "CANCELED" },
          });
          console.log(`[Stripe] Subscription canceled: ${stripeSub.id}`);
        }
        break;
      }
    }
  } catch (error) {
    console.error("Webhook handler error:", error);
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
