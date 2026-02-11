"use client";

import { Fragment } from "react";
import type { Phase } from "@/types";

interface PhaseIndicatorProps {
  currentPhase: Phase;
}

const phases: { key: Phase; label: string; number: number }[] = [
  { key: "instruction", label: "Learn", number: 1 },
  { key: "guided", label: "Practice", number: 2 },
  { key: "assessment", label: "Write", number: 3 },
];

const phaseOrder: Phase[] = ["instruction", "guided", "assessment", "feedback"];

function getPhaseIndex(phase: Phase): number {
  return phaseOrder.indexOf(phase);
}

export default function PhaseIndicator({ currentPhase }: PhaseIndicatorProps) {
  const currentIndex = getPhaseIndex(currentPhase);

  return (
    <div className="flex items-center gap-1.5 justify-center">
      {phases.map((phase, index) => {
        const phaseIdx = getPhaseIndex(phase.key);
        const isActive = phaseIdx === currentIndex;
        const isCompleted = phaseIdx < currentIndex;

        return (
          <Fragment key={phase.key}>
            {index > 0 && (
              <div
                className={`w-5 h-0.5 rounded-full ${
                  isCompleted ? "bg-active-secondary" : "bg-[#e0dcd5]"
                }`}
              />
            )}
            <div className="flex items-center gap-[5px]">
              <span
                className={`w-[22px] h-[22px] rounded-full flex items-center justify-center text-[0.6rem] font-extrabold text-white ${
                  isCompleted
                    ? "bg-active-secondary"
                    : isActive
                      ? "bg-active-primary shadow-[0_0_0_3px_rgba(255,107,107,0.25)]"
                      : "bg-[#b2bec3]"
                }`}
              >
                {isCompleted ? (
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                ) : (
                  phase.number
                )}
              </span>
              <span
                className={`text-[0.7rem] font-bold uppercase tracking-wide hidden sm:inline ${
                  isCompleted
                    ? "text-[#3dbdb5]"
                    : isActive
                      ? "text-active-primary"
                      : "text-[#b2bec3]"
                }`}
              >
                {phase.label}
              </span>
            </div>
          </Fragment>
        );
      })}
    </div>
  );
}
