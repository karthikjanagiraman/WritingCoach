"use client";

import { useState, useEffect } from "react";
import type { SubscriptionInfo } from "@/lib/subscription";

interface UseSubscriptionReturn {
  subscription: SubscriptionInfo | null;
  loading: boolean;
  isTrialing: boolean;
  isActive: boolean;
  isPaidPlan: boolean;
  isExpired: boolean;
  canCreateChild: boolean;
  canStartLesson: boolean;
  daysRemaining: number | null;
  lessonsRemaining: number | null;
  refetch: () => void;
}

export function useSubscription(): UseSubscriptionReturn {
  const [subscription, setSubscription] = useState<SubscriptionInfo | null>(null);
  const [loading, setLoading] = useState(true);

  function fetchStatus() {
    setLoading(true);
    fetch("/api/subscriptions/status")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        setSubscription(data?.subscription ?? null);
      })
      .catch(() => setSubscription(null))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    fetchStatus();
  }, []);

  const sub = subscription;
  const effectiveStatus = sub?.effectiveStatus ?? "EXPIRED";

  const isTrialing = effectiveStatus === "TRIALING";
  const isActive = effectiveStatus === "ACTIVE";
  const isPaidPlan = sub?.plan === "FAMILY_2" || sub?.plan === "FAMILY_4";
  const isExpired = effectiveStatus === "EXPIRED" || effectiveStatus === "CANCELED";

  const canStartLesson = isActive || (isTrialing && (sub?.trialLessonsUsed ?? 0) < (sub?.trialLessonsLimit ?? 2));
  const canCreateChild = !isExpired; // Detailed check happens server-side

  const daysRemaining = sub?.daysRemaining ?? null;
  const lessonsRemaining = isTrialing
    ? Math.max(0, (sub?.trialLessonsLimit ?? 2) - (sub?.trialLessonsUsed ?? 0))
    : null;

  return {
    subscription,
    loading,
    isTrialing,
    isActive,
    isPaidPlan,
    isExpired,
    canCreateChild,
    canStartLesson,
    daysRemaining,
    lessonsRemaining,
    refetch: fetchStatus,
  };
}
