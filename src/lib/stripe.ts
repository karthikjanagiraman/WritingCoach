import Stripe from "stripe";
import { prisma } from "@/lib/db";

// ---------------------------------------------------------------------------
// Stripe client singleton
// ---------------------------------------------------------------------------

let stripeClient: Stripe | null = null;

export function getStripe(): Stripe {
  if (!stripeClient) {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error("STRIPE_SECRET_KEY is not configured");
    }
    stripeClient = new Stripe(process.env.STRIPE_SECRET_KEY);
  }
  return stripeClient;
}

// ---------------------------------------------------------------------------
// Price IDs — set via env vars, mapped to plan + billing interval
// ---------------------------------------------------------------------------

export const STRIPE_PRICES = {
  FAMILY_2_MONTHLY: process.env.STRIPE_PRICE_FAMILY_2_MONTHLY ?? "",
  FAMILY_2_ANNUAL: process.env.STRIPE_PRICE_FAMILY_2_ANNUAL ?? "",
  FAMILY_4_MONTHLY: process.env.STRIPE_PRICE_FAMILY_4_MONTHLY ?? "",
  FAMILY_4_ANNUAL: process.env.STRIPE_PRICE_FAMILY_4_ANNUAL ?? "",
} as const;

export type StripePriceKey = keyof typeof STRIPE_PRICES;

// Map price ID back to plan
export function planFromPriceId(priceId: string): "FAMILY_2" | "FAMILY_4" | null {
  if (
    priceId === STRIPE_PRICES.FAMILY_2_MONTHLY ||
    priceId === STRIPE_PRICES.FAMILY_2_ANNUAL
  ) {
    return "FAMILY_2";
  }
  if (
    priceId === STRIPE_PRICES.FAMILY_4_MONTHLY ||
    priceId === STRIPE_PRICES.FAMILY_4_ANNUAL
  ) {
    return "FAMILY_4";
  }
  return null;
}

// ---------------------------------------------------------------------------
// Get or create a Stripe customer for a user
// ---------------------------------------------------------------------------

export async function getOrCreateStripeCustomer(userId: string): Promise<string> {
  // Check if user already has a Stripe customer ID in their subscription
  const sub = await prisma.subscription.findUnique({ where: { userId } });
  if (sub?.stripeCustomerId) return sub.stripeCustomerId;

  // Fetch user email for Stripe
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true, name: true },
  });
  if (!user) throw new Error("User not found");

  const stripe = getStripe();
  const customer = await stripe.customers.create({
    email: user.email,
    name: user.name,
    metadata: { userId },
  });

  // Save customer ID to subscription row
  if (sub) {
    await prisma.subscription.update({
      where: { userId },
      data: { stripeCustomerId: customer.id },
    });
  }

  return customer.id;
}
