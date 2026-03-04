import { prisma } from "@/lib/db";
import type { SubscriptionPlan, SubscriptionStatus, Subscription } from "@prisma/client";

// ---------------------------------------------------------------------------
// Plan limits
// ---------------------------------------------------------------------------

export const PLAN_LIMITS: Record<
  SubscriptionPlan,
  { maxChildren: number; maxLessons: number | null; trialDays: number | null }
> = {
  TRIAL: { maxChildren: 2, maxLessons: 2, trialDays: 7 },
  FAMILY_2: { maxChildren: 2, maxLessons: null, trialDays: null },
  FAMILY_4: { maxChildren: 4, maxLessons: null, trialDays: null },
};

// ---------------------------------------------------------------------------
// Subscription lookup
// ---------------------------------------------------------------------------

export async function getSubscription(userId: string): Promise<Subscription | null> {
  return prisma.subscription.findUnique({ where: { userId } });
}

// ---------------------------------------------------------------------------
// Effective status — computes real status accounting for trial expiry
// ---------------------------------------------------------------------------

export function getEffectiveStatus(sub: Subscription): SubscriptionStatus {
  if (sub.status === "TRIALING") {
    if (isTrialExpired(sub)) return "EXPIRED";
    return "TRIALING";
  }
  return sub.status;
}

export function isTrialExpired(sub: Subscription): boolean {
  if (sub.plan !== "TRIAL" || sub.status !== "TRIALING") return false;
  // Expired if past trial end date
  if (sub.trialEndsAt && new Date() > sub.trialEndsAt) return true;
  // Expired if used all trial lessons
  if (sub.trialLessonsUsed >= (PLAN_LIMITS.TRIAL.maxLessons ?? 2)) return true;
  return false;
}

// ---------------------------------------------------------------------------
// Gate: can this user create another child?
// ---------------------------------------------------------------------------

export async function canCreateChild(userId: string): Promise<{
  allowed: boolean;
  reason?: string;
  currentCount?: number;
  limit?: number;
}> {
  const sub = await getSubscription(userId);

  // No subscription at all — shouldn't happen, but block just in case
  if (!sub) {
    return { allowed: false, reason: "NO_SUBSCRIPTION" };
  }

  const effectiveStatus = getEffectiveStatus(sub);

  // Expired trial — can't create children
  if (effectiveStatus === "EXPIRED") {
    return { allowed: false, reason: "TRIAL_EXPIRED" };
  }

  // Canceled subscription — can't create children
  if (effectiveStatus === "CANCELED") {
    return { allowed: false, reason: "SUBSCRIPTION_CANCELED" };
  }

  const limits = PLAN_LIMITS[sub.plan];
  const childCount = await prisma.childProfile.count({ where: { parentId: userId } });

  if (childCount >= limits.maxChildren) {
    return {
      allowed: false,
      reason: "CHILD_LIMIT",
      currentCount: childCount,
      limit: limits.maxChildren,
    };
  }

  return { allowed: true, currentCount: childCount, limit: limits.maxChildren };
}

// ---------------------------------------------------------------------------
// Gate: can this user start a lesson?
// ---------------------------------------------------------------------------

export async function canStartLesson(userId: string): Promise<{
  allowed: boolean;
  reason?: string;
  lessonsUsed?: number;
  lessonsLimit?: number | null;
}> {
  const sub = await getSubscription(userId);

  if (!sub) {
    return { allowed: false, reason: "NO_SUBSCRIPTION" };
  }

  const effectiveStatus = getEffectiveStatus(sub);

  if (effectiveStatus === "EXPIRED") {
    return { allowed: false, reason: "TRIAL_EXPIRED" };
  }

  if (effectiveStatus === "CANCELED") {
    return { allowed: false, reason: "SUBSCRIPTION_CANCELED" };
  }

  if (effectiveStatus === "PAST_DUE") {
    // Allow past_due users to continue for grace period
    return { allowed: true };
  }

  // Trial: check lesson limit
  if (sub.plan === "TRIAL" && effectiveStatus === "TRIALING") {
    const limit = PLAN_LIMITS.TRIAL.maxLessons!;
    if (sub.trialLessonsUsed >= limit) {
      return {
        allowed: false,
        reason: "LESSON_LIMIT",
        lessonsUsed: sub.trialLessonsUsed,
        lessonsLimit: limit,
      };
    }
    return {
      allowed: true,
      lessonsUsed: sub.trialLessonsUsed,
      lessonsLimit: limit,
    };
  }

  // Active paid plan — unlimited
  return { allowed: true, lessonsUsed: undefined, lessonsLimit: null };
}

// ---------------------------------------------------------------------------
// Increment trial lesson counter (call after a new lesson session is created)
// ---------------------------------------------------------------------------

export async function incrementTrialLessonCount(userId: string): Promise<void> {
  const sub = await getSubscription(userId);
  if (!sub || sub.plan !== "TRIAL") return;

  await prisma.subscription.update({
    where: { userId },
    data: { trialLessonsUsed: { increment: 1 } },
  });
}

// ---------------------------------------------------------------------------
// Create trial subscription for a new user
// ---------------------------------------------------------------------------

export async function createTrialSubscription(userId: string): Promise<Subscription> {
  const trialEndsAt = new Date();
  trialEndsAt.setDate(trialEndsAt.getDate() + 7);

  return prisma.subscription.create({
    data: {
      userId,
      plan: "TRIAL",
      status: "TRIALING",
      trialEndsAt,
      trialLessonsUsed: 0,
    },
  });
}

// ---------------------------------------------------------------------------
// Subscription info for the client (safe to expose)
// ---------------------------------------------------------------------------

export interface SubscriptionInfo {
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
  effectiveStatus: SubscriptionStatus;
  trialEndsAt: string | null;
  trialLessonsUsed: number;
  trialLessonsLimit: number;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  maxChildren: number;
  maxLessons: number | null;
  daysRemaining: number | null;
}

export async function getSubscriptionInfo(userId: string): Promise<SubscriptionInfo | null> {
  const sub = await getSubscription(userId);
  if (!sub) return null;

  const effectiveStatus = getEffectiveStatus(sub);
  const limits = PLAN_LIMITS[sub.plan];

  let daysRemaining: number | null = null;
  if (sub.trialEndsAt && effectiveStatus === "TRIALING") {
    const diff = sub.trialEndsAt.getTime() - Date.now();
    daysRemaining = Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  }

  return {
    plan: sub.plan,
    status: sub.status,
    effectiveStatus,
    trialEndsAt: sub.trialEndsAt?.toISOString() ?? null,
    trialLessonsUsed: sub.trialLessonsUsed,
    trialLessonsLimit: PLAN_LIMITS.TRIAL.maxLessons!,
    currentPeriodEnd: sub.currentPeriodEnd?.toISOString() ?? null,
    cancelAtPeriodEnd: sub.cancelAtPeriodEnd,
    maxChildren: limits.maxChildren,
    maxLessons: limits.maxLessons,
    daysRemaining,
  };
}
