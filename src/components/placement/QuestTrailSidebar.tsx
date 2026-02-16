"use client";

import { QuestCharacter, TRIAL_CONFIG } from "./QuestCharacters";

interface QuestTrailSidebarProps {
  currentTrial: number;
  completedTrials: Set<number>;
}

const TRAIL_OFFSETS = [220, 110, 0];

export function QuestTrailSidebar({
  currentTrial,
  completedTrials,
}: QuestTrailSidebarProps) {
  // Determine how far the trail line has filled
  // After completing trial N, fill to the offset for N
  const lastCompleted = Math.max(...Array.from(completedTrials), -1);
  const strokeDashoffset =
    lastCompleted >= 0 ? TRAIL_OFFSETS[lastCompleted] : 220;

  return (
    <div className="w-[200px] shrink-0 pt-1">
      <div
        className="text-[11px] font-extrabold uppercase tracking-[2px] text-center mb-6"
        style={{ color: "#2D343650" }}
      >
        Your Quest
      </div>

      <div className="relative pl-0">
        {/* SVG connecting trail path */}
        <svg
          className="absolute pointer-events-none"
          style={{ left: 44, top: 50, width: 6, overflow: "visible" }}
          width="6"
          height="240"
        >
          <line
            x1="3"
            y1="0"
            x2="3"
            y2="220"
            stroke="#2D343618"
            strokeWidth="3"
            strokeDasharray="6 6"
            fill="none"
          />
          <line
            x1="3"
            y1="0"
            x2="3"
            y2="220"
            stroke="url(#trailGrad)"
            strokeWidth="3"
            fill="none"
            strokeLinecap="round"
            strokeDasharray="220"
            strokeDashoffset={strokeDashoffset}
            style={{
              transition:
                "stroke-dashoffset 1.2s cubic-bezier(0.4, 0, 0.2, 1)",
            }}
          />
        </svg>

        {TRIAL_CONFIG.map((trial, i) => {
          const isDone = completedTrials.has(i);
          const isActive = i === currentTrial && !isDone;
          const isLocked = i > currentTrial && !isDone;
          const isVisible = i <= currentTrial || isDone;

          return (
            <div
              key={i}
              className="flex items-center gap-[14px] relative"
              style={{
                zIndex: 2,
                transition: "all 0.6s cubic-bezier(0.4, 0, 0.2, 1)",
                ...(isVisible
                  ? {
                      opacity: 1,
                      height: "auto",
                      padding: "8px 0",
                      transform: "translateX(0) scale(1)",
                    }
                  : {
                      opacity: 0,
                      height: 0,
                      padding: 0,
                      overflow: "hidden",
                      transform: "translateX(-20px) scale(0.8)",
                    }),
              }}
            >
              {/* Character Medallion */}
              <div
                className="relative overflow-hidden shrink-0"
                style={{
                  width: 88,
                  height: 88,
                  borderRadius: "50%",
                  transition: "all 0.5s",
                  background: isDone
                    ? "radial-gradient(circle at 50% 60%, #E0F7FA, #F0FFFC)"
                    : trial.medallionBg,
                  border: isDone
                    ? "3px solid #4ECDC4"
                    : isLocked
                      ? `3px dashed ${trial.medallionBorder}`
                      : `3px solid ${isActive ? trial.accent : trial.medallionBorder}`,
                  boxShadow: isDone
                    ? "0 4px 16px #4ECDC420"
                    : isActive
                      ? `0 0 0 4px ${trial.accent}12, 0 0 24px ${trial.accent}18, 0 8px 32px ${trial.accent}15`
                      : `0 4px 16px ${trial.medallionShadow}`,
                  ...(isActive
                    ? {
                        animation: `glowPulse 3s ease-in-out infinite`,
                        ["--glow-color" as string]: trial.accent,
                      }
                    : {}),
                  ...(isDone ? { animation: "none" } : {}),
                  ...(isLocked
                    ? {
                        opacity: 0.25,
                        filter: "grayscale(0.7) blur(0.5px)",
                      }
                    : {}),
                }}
              >
                <div className="absolute inset-0 flex items-center justify-center rounded-full">
                  <QuestCharacter id={trial.charId} width={70} height={70} />
                </div>

                {/* Done badge */}
                {isDone && (
                  <div
                    className="absolute flex items-center justify-center text-white text-[13px] font-black"
                    style={{
                      top: -2,
                      right: -2,
                      width: 26,
                      height: 26,
                      borderRadius: "50%",
                      background:
                        "linear-gradient(135deg, #4ECDC4, #26D0CE)",
                      zIndex: 3,
                      boxShadow: "0 2px 12px #4ECDC460",
                      animation:
                        "badgePop 0.5s cubic-bezier(0.34,1.56,0.64,1)",
                    }}
                  >
                    &#x2713;
                  </div>
                )}
              </div>

              {/* Node info */}
              <div className="min-w-0">
                <div
                  className="text-[9px] font-extrabold uppercase tracking-[1.5px]"
                  style={{
                    color: isDone ? "#4ECDC4" : trial.accent,
                  }}
                >
                  {isDone ? "Passed!" : trial.sidebarLabel}
                </div>
                <div
                  className="text-[12.5px] font-extrabold leading-tight mt-[1px]"
                  style={{ color: "#2D3436" }}
                >
                  {trial.sidebarName}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
