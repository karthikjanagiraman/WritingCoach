"use client";

import { QuestCharacter } from "./QuestCharacters";
import type { TrialConfig } from "./QuestCharacters";

type SaveStatus = "idle" | "saving" | "saved" | "error";

interface QuestCardProps {
  trial: TrialConfig;
  trialIndex: number;
  ollieSays: string;
  prompt: string;
  response: string;
  onResponseChange: (value: string) => void;
  onSubmit: () => void;
  canSubmit: boolean;
  wordCount: number;
  saveStatus: SaveStatus;
  isTransitioning: boolean;
}

export function QuestCard({
  trial,
  trialIndex,
  ollieSays,
  prompt,
  response,
  onResponseChange,
  onSubmit,
  canSubmit,
  wordCount,
  saveStatus,
  isTransitioning,
}: QuestCardProps) {
  const inkPercent = Math.min(wordCount / 20, 1);
  const isReady = inkPercent >= 1;
  const isLastTrial = trialIndex === 2;

  return (
    <div
      className="rounded-[28px] overflow-hidden bg-white"
      style={{
        boxShadow:
          "0 8px 40px rgba(0,0,0,0.05), 0 1px 4px rgba(0,0,0,0.02)",
        ["--trial-accent" as string]: trial.accent,
        ["--trial-accent-light" as string]: trial.accentLight,
        ["--trial-accent-soft" as string]: trial.accentSoft,
        ["--trial-glow" as string]: trial.glow,
        ["--tag-color" as string]: trial.tagColor,
        ["--prompt-bg" as string]: trial.promptBg,
        transition: "opacity 0.3s, transform 0.3s",
        ...(isTransitioning
          ? { opacity: 0, transform: "translateY(8px)" }
          : { opacity: 1, transform: "translateY(0)" }),
      }}
    >
      {/* Scenic header */}
      <div className="relative overflow-hidden" style={{ minHeight: 180 }}>
        {/* Backdrop gradient */}
        <div
          className="absolute inset-0 overflow-hidden"
          style={{ background: trial.sceneBg }}
        >
          {/* Scene orbs */}
          {trial.sceneOrbs.map((orb, i) => (
            <div
              key={i}
              className="absolute rounded-full"
              style={{
                width: orb.w,
                height: orb.h,
                background: `radial-gradient(circle, ${orb.bg}, transparent)`,
                top: orb.top,
                bottom: orb.bottom,
                left: orb.left,
                animationDelay: orb.delay,
                animation: "orbFloat 4s ease-in-out infinite",
              }}
            />
          ))}
        </div>

        {/* Ghost character */}
        <div
          className="absolute pointer-events-none"
          style={{
            right: 16,
            bottom: 12,
            opacity: 0.35,
            animation: "headerCharBreathe 4s ease-in-out infinite",
          }}
        >
          <QuestCharacter id={trial.charId} width={160} height={160} />
        </div>

        {/* Content */}
        <div className="relative z-[2] px-7 pt-6 pb-5">
          {/* Char row */}
          <div className="flex items-center gap-4 mb-4">
            <div
              className="shrink-0 rounded-full flex items-center justify-center"
              style={{
                width: 72,
                height: 72,
                background: "rgba(255,255,255,0.85)",
                backdropFilter: "blur(8px)",
                boxShadow: "0 4px 20px rgba(0,0,0,0.06)",
                border: "2px solid rgba(255,255,255,0.6)",
              }}
            >
              <QuestCharacter id={trial.charId} />
            </div>
            <div className="flex-1">
              <div
                className="text-[10px] font-extrabold uppercase tracking-[1.8px]"
                style={{
                  color: trial.tagColor,
                  textShadow: "0 1px 4px rgba(255,255,255,0.8)",
                }}
              >
                {trial.label}
              </div>
              <div
                className="text-[22px] font-black mt-[2px]"
                style={{
                  color: "#2D3436",
                  textShadow: "0 1px 8px rgba(255,255,255,0.5)",
                }}
              >
                {trial.name}
              </div>
            </div>
          </div>

          {/* Ollie speech bubble */}
          <div
            className="flex items-start gap-3 rounded-[20px]"
            style={{
              padding: "14px 18px",
              background: "rgba(255,255,255,0.7)",
              backdropFilter: "blur(8px)",
              boxShadow: "0 2px 10px rgba(0,0,0,0.03)",
            }}
          >
            <span
              className="shrink-0 leading-none"
              style={{ fontSize: 28 }}
            >
              &#x1F989;
            </span>
            <p
              className="text-[13.5px] font-semibold italic leading-relaxed"
              style={{ color: "#2D3436aa" }}
            >
              {ollieSays}
            </p>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="px-7 pt-6 pb-7">
        {/* Prompt bubble */}
        <div
          className="relative text-[15.5px] font-bold leading-[1.65] rounded-[20px] mb-5"
          style={{
            color: "#2D3436",
            padding: "16px 20px",
            background: trial.promptBg,
          }}
        >
          {/* Speech bubble tail */}
          <div
            className="absolute"
            style={{
              top: -8,
              left: 32,
              width: 16,
              height: 16,
              borderRadius: 3,
              background: trial.promptBg,
              transform: "rotate(45deg)",
            }}
          />
          {prompt}
        </div>

        {/* Notebook writing area */}
        <div
          className="relative rounded-[22px] overflow-hidden"
          style={{
            background: "linear-gradient(180deg, #FFF8F0, #FFF3E8)",
          }}
        >
          {/* Left margin line */}
          <div
            className="absolute rounded-[2px]"
            style={{
              left: 16,
              top: 12,
              bottom: 12,
              width: 2,
              background: trial.accent,
              opacity: 0.25,
              zIndex: 2,
            }}
          />
          <textarea
            value={response}
            onChange={(e) => onResponseChange(e.target.value)}
            placeholder="Start writing here..."
            className="w-full border-none rounded-none outline-none resize-none writing-area"
            style={{
              minHeight: 220,
              padding: "18px 20px 18px 28px",
              fontSize: 15,
              color: "#2D3436",
              lineHeight: 2,
              background: "transparent",
              backgroundImage:
                "repeating-linear-gradient(to bottom, transparent, transparent calc(2em - 1px), rgba(0,0,0,0.07) calc(2em - 1px), transparent 2em)",
              backgroundSize: "100% 2em",
              backgroundPosition: "0 18px",
              backgroundAttachment: "local",
            }}
          />
        </div>

        {/* Save status */}
        <div className="mt-1 px-1">
          <p
            className={`text-xs font-medium transition-opacity duration-300 ${
              saveStatus === "idle" ? "opacity-0" : "opacity-100"
            } ${
              saveStatus === "saving"
                ? "text-[#2D3436]/40"
                : saveStatus === "saved"
                  ? "text-[#4ECDC4]"
                  : saveStatus === "error"
                    ? "text-red-400"
                    : ""
            }`}
          >
            {saveStatus === "saving" && "Saving..."}
            {saveStatus === "saved" && "Saved"}
            {saveStatus === "error" && "Could not save"}
          </p>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between mt-3 px-1">
          {/* Ink meter */}
          <div className="flex items-center gap-[10px]">
            <div
              className="overflow-hidden"
              style={{
                width: 120,
                height: 10,
                background: "#2D343608",
                borderRadius: 10,
              }}
            >
              <div
                style={{
                  height: "100%",
                  borderRadius: 10,
                  transition: "width 0.4s, background 0.4s",
                  width: `${inkPercent * 100}%`,
                  background: isReady
                    ? "linear-gradient(90deg, #4ECDC4, #FFE66D)"
                    : "#2D343610",
                }}
              />
            </div>
            <span
              className="text-[12.5px] font-bold"
              style={{ color: isReady ? "#4ECDC4" : "#2D343640" }}
            >
              {isReady ? `${wordCount} words \u2713` : `${wordCount} / 20 words`}
            </span>
          </div>

          {/* Submit button */}
          <button
            type="button"
            onClick={onSubmit}
            disabled={!canSubmit}
            className="relative overflow-hidden border-none font-extrabold text-sm"
            style={{
              padding: "14px 32px",
              borderRadius: 50,
              fontFamily: "inherit",
              transition: "all 0.4s",
              ...(canSubmit
                ? {
                    background: `linear-gradient(135deg, ${trial.accent}, ${trial.accentLight})`,
                    color: "white",
                    cursor: "pointer",
                    boxShadow: `0 4px 20px ${trial.glow}`,
                  }
                : {
                    background: "#e8e2da",
                    color: "white",
                    cursor: "not-allowed",
                  }),
            }}
            onMouseEnter={(e) => {
              if (canSubmit) {
                e.currentTarget.style.transform = "translateY(-2px) scale(1.04)";
                e.currentTarget.style.boxShadow = `0 8px 32px ${trial.accent}40`;
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "";
              if (canSubmit) {
                e.currentTarget.style.boxShadow = `0 4px 20px ${trial.glow}`;
              }
            }}
          >
            {/* Shine effect */}
            {canSubmit && (
              <span
                className="absolute"
                style={{
                  top: "-50%",
                  left: "-50%",
                  width: "200%",
                  height: "200%",
                  background:
                    "linear-gradient(transparent, rgba(255,255,255,0.15), transparent)",
                  animation: "btnShine 3s ease-in-out infinite",
                }}
              />
            )}
            <span className="relative z-[1]">
              {isLastTrial ? "Complete the Trial!" : "Prove It!"}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
