"use client";
import { createContext, useContext, useEffect, type ReactNode } from "react";
import type { Tier } from "@/types";

interface TierConfig {
  tier: Tier;
  coachEmoji: string;
  coachName: string;
  coachLabel: string;
}

const TIER_CONFIGS: Record<Tier, TierConfig> = {
  1: { tier: 1, coachEmoji: "\u{1F989}", coachName: "Ollie", coachLabel: "Ollie the Owl" },
  2: { tier: 2, coachEmoji: "\u{1F98A}", coachName: "Felix", coachLabel: "Felix the Fox" },
  3: { tier: 3, coachEmoji: "\u{1F43A}", coachName: "Sage", coachLabel: "Sage the Wolf" },
};

const TierContext = createContext<TierConfig>(TIER_CONFIGS[1]);

export function TierProvider({ tier, children }: { tier: Tier; children: ReactNode }) {
  useEffect(() => {
    document.body.classList.remove("tier-1", "tier-2", "tier-3");
    document.body.classList.add(`tier-${tier}`);
    return () => document.body.classList.remove(`tier-${tier}`);
  }, [tier]);

  return (
    <TierContext.Provider value={TIER_CONFIGS[tier]}>
      {children}
    </TierContext.Provider>
  );
}

export function useTier() {
  return useContext(TierContext);
}
