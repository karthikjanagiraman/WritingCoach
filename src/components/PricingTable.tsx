"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

interface PricingTableProps {
  compact?: boolean;
}

const PLANS = [
  {
    key: "FAMILY_2",
    name: "Family",
    monthlyPrice: 5.99,
    annualPrice: 49.99,
    annualMonthly: 4.17,
    children: 2,
    features: [
      "Up to 2 children",
      "Unlimited lessons",
      "AI writing coach",
      "Progress reports",
      "Skill tracking & badges",
    ],
    priceKeyMonthly: "FAMILY_2_MONTHLY" as const,
    priceKeyAnnual: "FAMILY_2_ANNUAL" as const,
  },
  {
    key: "FAMILY_4",
    name: "Family Plus",
    monthlyPrice: 7.99,
    annualPrice: 74.99,
    annualMonthly: 6.25,
    children: 4,
    popular: true,
    features: [
      "Up to 4 children",
      "Unlimited lessons",
      "AI writing coach",
      "Progress reports",
      "Skill tracking & badges",
      "Priority support",
    ],
    priceKeyMonthly: "FAMILY_4_MONTHLY" as const,
    priceKeyAnnual: "FAMILY_4_ANNUAL" as const,
  },
];

export default function PricingTable({ compact }: PricingTableProps) {
  const [annual, setAnnual] = useState(false);
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [selectedPlan, setSelectedPlan] = useState("FAMILY_4");
  const { data: session } = useSession();
  const router = useRouter();

  async function handleSubscribe(priceKey: string) {
    if (!session?.user) {
      router.push("/auth/signup");
      return;
    }

    setLoadingPlan(priceKey);
    try {
      const res = await fetch("/api/subscriptions/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ priceKey }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch {
      // Fallback
    } finally {
      setLoadingPlan(null);
    }
  }

  return (
    <div className={compact ? "" : "py-8"}>
      {/* Billing Toggle */}
      <div className="flex items-center justify-center gap-3 mb-8">
        <span className={`text-sm font-semibold transition-colors ${!annual ? "text-[#2D3436]" : "text-[#2D3436]/40"}`}>
          Monthly
        </span>
        <button
          onClick={() => setAnnual(!annual)}
          className={`relative w-14 h-7 rounded-full transition-colors ${annual ? "bg-[#6C5CE7]" : "bg-[#2D3436]/20"}`}
          aria-label="Toggle annual billing"
        >
          <span
            className="absolute top-0.5 left-0.5 w-6 h-6 bg-white rounded-full shadow-md transition-all duration-200"
            style={{ transform: annual ? "translateX(28px)" : "translateX(0)" }}
          />
        </button>
        <span className={`text-sm font-semibold transition-colors ${annual ? "text-[#2D3436]" : "text-[#2D3436]/40"}`}>
          Annual
        </span>
        {annual && (
          <span className="px-2.5 py-1 bg-[#00B894]/10 text-[#00B894] text-xs font-bold rounded-full">
            Save 30%
          </span>
        )}
      </div>

      {/* Plan Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-2xl mx-auto">
        {PLANS.map((plan) => {
          const price = annual ? plan.annualMonthly : plan.monthlyPrice;
          const priceKey = annual ? plan.priceKeyAnnual : plan.priceKeyMonthly;
          const isLoading = loadingPlan === priceKey;

          const isSelected = selectedPlan === plan.key;

          return (
            <div
              key={plan.key}
              onClick={() => setSelectedPlan(plan.key)}
              className={`relative bg-white rounded-2xl p-6 shadow-sm border-2 transition-all hover:shadow-md flex flex-col cursor-pointer ${
                isSelected
                  ? "border-[#6C5CE7] ring-1 ring-[#6C5CE7]/20"
                  : "border-[#2D3436]/10 hover:border-[#6C5CE7]/30"
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-[#6C5CE7] text-white text-xs font-bold rounded-full">
                  Most Popular
                </div>
              )}

              <h3 className="text-lg font-extrabold text-[#2D3436] mb-1">{plan.name}</h3>
              <p className="text-sm text-[#2D3436]/50 mb-4">
                Up to {plan.children} children
              </p>

              <div className="mb-6">
                <span className="text-4xl font-extrabold text-[#2D3436]">
                  ${price.toFixed(2)}
                </span>
                <span className="text-sm text-[#2D3436]/50">/mo</span>
                {annual && (
                  <p className="text-xs text-[#2D3436]/40 mt-1">
                    ${plan.annualPrice.toFixed(2)}/year &middot; billed annually
                  </p>
                )}
              </div>

              <ul className="space-y-2.5 mb-6 flex-1">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-center gap-2.5 text-sm text-[#2D3436]/70">
                    <svg className="w-4 h-4 text-[#00B894] flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                    {feature}
                  </li>
                ))}
              </ul>

              <button
                onClick={() => handleSubscribe(priceKey)}
                disabled={isLoading}
                className={`w-full py-3 rounded-xl text-sm font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed mt-auto ${
                  isSelected
                    ? "bg-[#6C5CE7] text-white hover:bg-[#5A4BD1] shadow-sm"
                    : "bg-[#6C5CE7]/10 text-[#6C5CE7] hover:bg-[#6C5CE7] hover:text-white"
                }`}
              >
                {isLoading ? "Redirecting..." : session?.user ? "Subscribe" : "Start Free Trial"}
              </button>
            </div>
          );
        })}
      </div>

      {/* Trust signals */}
      {!compact && (
        <div className="flex flex-wrap items-center justify-center gap-6 mt-8 text-sm text-[#2D3436]/40">
          <span className="flex items-center gap-1.5">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            7-day free trial
          </span>
          <span className="flex items-center gap-1.5">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
            Cancel anytime
          </span>
          <span className="flex items-center gap-1.5">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
            </svg>
            No credit card for trial
          </span>
        </div>
      )}
    </div>
  );
}
