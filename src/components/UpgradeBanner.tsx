"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface UpgradeBannerProps {
  variant: "trial_expiring" | "lessons_used" | "child_limit" | "expired";
  daysRemaining?: number | null;
  lessonsRemaining?: number | null;
  childLimit?: number;
}

const VARIANT_CONFIG = {
  trial_expiring: {
    bg: "bg-gradient-to-r from-[#FDCB6E]/10 to-[#FFE66D]/10",
    border: "border-[#FDCB6E]/30",
    icon: "\u23F3",
    title: (props: UpgradeBannerProps) =>
      `Your free trial ends in ${props.daysRemaining ?? 0} day${(props.daysRemaining ?? 0) === 1 ? "" : "s"}`,
    subtitle: "Subscribe to keep your child's writing progress going.",
    cta: "See Plans",
  },
  lessons_used: {
    bg: "bg-gradient-to-r from-[#FF6B6B]/5 to-[#FF6B6B]/10",
    border: "border-[#FF6B6B]/20",
    icon: "\uD83D\uDCDD",
    title: (props: UpgradeBannerProps) =>
      props.lessonsRemaining === 0
        ? "You've used all your free trial lessons"
        : `${props.lessonsRemaining} free lesson${(props.lessonsRemaining ?? 0) === 1 ? "" : "s"} remaining`,
    subtitle: "Unlock unlimited writing adventures for your family.",
    cta: "Upgrade Now",
  },
  child_limit: {
    bg: "bg-gradient-to-r from-[#6C5CE7]/5 to-[#6C5CE7]/10",
    border: "border-[#6C5CE7]/20",
    icon: "\uD83D\uDC68\u200D\uD83D\uDC69\u200D\uD83D\uDC67\u200D\uD83D\uDC66",
    title: (_props: UpgradeBannerProps) => "Need more child profiles?",
    subtitle: "Upgrade to Family Plus for up to 4 children.",
    cta: "Upgrade Plan",
  },
  expired: {
    bg: "bg-gradient-to-r from-[#2D3436]/5 to-[#2D3436]/10",
    border: "border-[#2D3436]/15",
    icon: "\uD83D\uDD12",
    title: () => "Your trial has ended",
    subtitle: "Subscribe to continue your child's writing journey.",
    cta: "Subscribe Now",
  },
};

export default function UpgradeBanner(props: UpgradeBannerProps) {
  const [dismissed, setDismissed] = useState(false);
  const router = useRouter();

  if (dismissed) return null;

  const config = VARIANT_CONFIG[props.variant];

  return (
    <div className={`relative rounded-2xl p-4 border ${config.bg} ${config.border} animate-fade-in`}>
      <button
        onClick={() => setDismissed(true)}
        className="absolute top-3 right-3 p-1 rounded-lg text-[#2D3436]/30 hover:text-[#2D3436]/60 hover:bg-[#2D3436]/5 transition-colors"
        aria-label="Dismiss"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      <div className="flex items-start gap-3 pr-8">
        <span className="text-2xl flex-shrink-0">{config.icon}</span>
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-bold text-[#2D3436]">
            {config.title(props)}
          </h4>
          <p className="text-xs text-[#2D3436]/50 mt-0.5">
            {config.subtitle}
          </p>
        </div>
        <button
          onClick={() => router.push("/pricing")}
          className="flex-shrink-0 px-4 py-2 bg-[#6C5CE7] text-white text-xs font-bold rounded-xl hover:bg-[#5A4BD1] transition-colors shadow-sm"
        >
          {config.cta}
        </button>
      </div>
    </div>
  );
}
