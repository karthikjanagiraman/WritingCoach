"use client";

import { useState } from "react";
import { QuestCharacter } from "./QuestCharacters";
import type { TrialConfig } from "./QuestCharacters";
import type { AgeMode } from "./PlacementTheme";

type SaveStatus = "idle" | "saving" | "saved" | "error";

const TEEN_TYPE_LABELS = [
  "Narrative Writing",
  "Descriptive Writing",
  "Persuasive Writing",
];

const MIDDLE_OLLIE_SAYS = [
  "Here's your first activity -- a storytelling challenge. Write whatever comes to mind. There are no wrong answers!",
  "Now try describing something using your senses. Help the reader see, hear, and feel what you're writing about.",
  "Last one! Write something to convince the reader of your opinion. Make your argument strong.",
];

const MIDDLE_LABELS = [
  "Activity 1 of 3",
  "Activity 2 of 3",
  "Final Activity",
];

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
  ageMode?: AgeMode;
  wordMinimum?: number;
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
  ageMode = "young",
  wordMinimum = 20,
}: QuestCardProps) {
  const inkPercent = Math.min(wordCount / wordMinimum, 1);
  const isReady = inkPercent >= 1;
  const isLastTrial = trialIndex === 2;
  const [teenSubmitting, setTeenSubmitting] = useState(false);

  // Teen mode: completely different card
  if (ageMode === "teen") {
    const typeLabel = TEEN_TYPE_LABELS[trialIndex];
    const submitLabel = isLastTrial ? "Submit Assessment" : "Continue";

    return (
      <div
        style={{
          maxWidth: 680,
          margin: "32px auto",
          background: "#FFFFFF",
          border: "1px solid #E2E8F0",
          borderRadius: 12,
          boxShadow:
            "0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)",
          transition: "opacity 0.2s ease-out, transform 0.2s ease-out",
          ...(isTransitioning
            ? { opacity: 0, transform: "translateY(4px)" }
            : { opacity: 1, transform: "translateY(0)" }),
        }}
      >
        {/* Card header */}
        <div
          style={{
            padding: "20px 24px 16px",
            borderBottom: "1px solid #F1F5F9",
          }}
        >
          <div
            style={{
              fontFamily: "'Sora', sans-serif",
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: "1px",
              textTransform: "uppercase",
              color: "#0984E3",
              marginBottom: 4,
            }}
          >
            {typeLabel}
          </div>
          <div
            style={{
              fontFamily: "'Sora', sans-serif",
              fontSize: 18,
              fontWeight: 600,
              color: "#2D3436",
            }}
          >
            Section {trialIndex + 1} of 3 — {typeLabel}
          </div>
        </div>

        {/* Prompt area */}
        <div
          style={{
            margin: "20px 24px 0",
            padding: "16px 20px",
            background: "#F8FAFC",
            border: "1px solid #E2E8F0",
            borderRadius: 8,
          }}
        >
          <p
            style={{
              fontFamily: "'Sora', sans-serif",
              fontSize: 14,
              fontWeight: 400,
              lineHeight: 1.7,
              color: "#334155",
              margin: 0,
            }}
          >
            {prompt}
          </p>
        </div>

        {/* Writing area */}
        <div style={{ margin: "16px 24px 0" }}>
          <textarea
            value={response}
            onChange={(e) => onResponseChange(e.target.value)}
            placeholder="Write your response here..."
            className="w-full outline-none resize-y writing-area"
            style={{
              minHeight: 300,
              padding: "20px 24px",
              fontFamily: "'Literata', Georgia, serif",
              fontSize: 15,
              lineHeight: 1.75,
              color: "#2D3436",
              background: "#FFFFFF",
              border: "1px solid #E2E8F0",
              borderRadius: 8,
              transition: "border-color 0.2s, box-shadow 0.2s",
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = "#0984E3";
              e.currentTarget.style.boxShadow =
                "0 0 0 3px rgba(9, 132, 227, 0.1)";
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = "#E2E8F0";
              e.currentTarget.style.boxShadow = "none";
            }}
          />
        </div>

        {/* Save status */}
        <div style={{ margin: "4px 24px 0" }}>
          <p
            className={`text-xs font-medium transition-opacity duration-300 ${
              saveStatus === "idle" ? "opacity-0" : "opacity-100"
            }`}
            style={{
              fontFamily: "'Sora', sans-serif",
              fontSize: 12,
              fontWeight: 500,
              color:
                saveStatus === "saving"
                  ? "#94A3B8"
                  : saveStatus === "saved"
                    ? "#0984E3"
                    : saveStatus === "error"
                      ? "#EF4444"
                      : "#94A3B8",
            }}
          >
            {saveStatus === "saving" && "Saving..."}
            {saveStatus === "saved" && (
              <>
                <svg
                  width={12}
                  height={12}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={3}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{
                    display: "inline",
                    verticalAlign: "middle",
                    marginRight: 4,
                  }}
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                Saved
              </>
            )}
            {saveStatus === "error" && "Could not save"}
          </p>
        </div>

        {/* Footer */}
        <div
          style={{
            padding: "16px 24px 20px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          {/* Word count text */}
          <span
            style={{
              fontFamily: "'Sora', sans-serif",
              fontSize: 13,
              fontWeight: 500,
              color: isReady ? "#0984E3" : "#94A3B8",
              transition: "color 0.3s ease",
            }}
          >
            {isReady ? (
              <>
                {wordCount} words{" "}
                <svg
                  width={16}
                  height={16}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#0984E3"
                  strokeWidth={2.5}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{
                    display: "inline",
                    verticalAlign: "middle",
                    opacity: 1,
                    transition: "opacity 0.3s",
                  }}
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </>
            ) : (
              `${wordCount} / ${wordMinimum} words (minimum)`
            )}
          </span>

          {/* Submit button */}
          <button
            type="button"
            onClick={() => {
              if (isLastTrial) {
                setTeenSubmitting(true);
              }
              onSubmit();
            }}
            disabled={!canSubmit || teenSubmitting}
            style={{
              padding: "12px 24px",
              borderRadius: 8,
              fontFamily: "'Sora', sans-serif",
              fontSize: 14,
              fontWeight: 600,
              border: "none",
              transition: "background 0.2s, transform 0.15s",
              ...(canSubmit && !teenSubmitting
                ? {
                    background: "#2D3436",
                    color: "#FFFFFF",
                    cursor: "pointer",
                    boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
                  }
                : {
                    background: "#E2E8F0",
                    color: "#94A3B8",
                    cursor: "not-allowed",
                  }),
            }}
            onMouseEnter={(e) => {
              if (canSubmit && !teenSubmitting) {
                e.currentTarget.style.background = "#3D4E50";
                e.currentTarget.style.transform = "translateY(-1px)";
              }
            }}
            onMouseLeave={(e) => {
              if (canSubmit && !teenSubmitting) {
                e.currentTarget.style.background = "#2D3436";
                e.currentTarget.style.transform = "";
              }
            }}
          >
            {teenSubmitting ? (
              <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                <span
                  style={{
                    width: 16,
                    height: 16,
                    border: "2px solid rgba(255,255,255,0.3)",
                    borderTopColor: "white",
                    borderRadius: "50%",
                    animation: "spin 0.8s linear infinite",
                    display: "inline-block",
                  }}
                />
                Submitting...
              </span>
            ) : (
              submitLabel
            )}
          </button>
        </div>
      </div>
    );
  }

  // Middle / Young modes share the scenic card layout
  const effectiveOllie =
    ageMode === "middle" ? MIDDLE_OLLIE_SAYS[trialIndex] : ollieSays;
  const effectiveLabel =
    ageMode === "middle" ? MIDDLE_LABELS[trialIndex] : trial.label;
  const submitLabel =
    ageMode === "middle"
      ? isLastTrial
        ? "Finish Assessment"
        : "Submit"
      : isLastTrial
        ? "Complete the Trial!"
        : "Prove It!";

  const inkMeterGradientFull =
    ageMode === "middle"
      ? "linear-gradient(90deg, #00B894, #6C5CE7)"
      : "linear-gradient(90deg, #4ECDC4, #FFE66D)";
  const inkLabelReadyColor = ageMode === "middle" ? "#00B894" : "#4ECDC4";
  const cardBorderRadius = ageMode === "middle" ? "20px" : "28px";
  const cardShadow =
    ageMode === "middle"
      ? "0 4px 24px rgba(0,0,0,0.04), 0 1px 3px rgba(0,0,0,0.02)"
      : "0 8px 40px rgba(0,0,0,0.05), 0 1px 4px rgba(0,0,0,0.02)";
  const buttonBorderRadius = ageMode === "middle" ? 14 : 50;
  const showShine = ageMode !== "middle";
  const showMarginLine = ageMode !== "middle";
  const writingBg =
    ageMode === "middle"
      ? "#FAFBFF"
      : "linear-gradient(180deg, #FFF8F0, #FFF3E8)";
  const writingMinHeight = ageMode === "middle" ? 260 : 220;
  const writingPadding =
    ageMode === "middle" ? "20px 24px" : "18px 20px 18px 28px";

  return (
    <div
      className="overflow-hidden bg-white"
      style={{
        borderRadius: cardBorderRadius,
        boxShadow: cardShadow,
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
                animationName: "orbFloat",
                animationDuration: "4s",
                animationTimingFunction: "ease-in-out",
                animationIterationCount: "infinite",
                animationDelay: orb.delay,
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
                {effectiveLabel}
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
              {effectiveOllie}
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
          style={{ background: writingBg }}
        >
          {/* Left margin line (young only) */}
          {showMarginLine && (
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
          )}
          <textarea
            value={response}
            onChange={(e) => onResponseChange(e.target.value)}
            placeholder="Start writing here..."
            className="w-full border-none rounded-none outline-none resize-none writing-area"
            style={{
              minHeight: writingMinHeight,
              padding: writingPadding,
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
          <div
            className="flex items-center gap-[10px]"
            role="progressbar"
            aria-valuenow={wordCount}
            aria-valuemin={0}
            aria-valuemax={wordMinimum}
            aria-label={`${wordCount} of ${wordMinimum} words written`}
          >
            <div
              className="overflow-hidden"
              style={{
                width: 120,
                height: ageMode === "middle" ? 8 : 10,
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
                  background: isReady ? inkMeterGradientFull : "#2D343610",
                }}
              />
            </div>
            <span
              className="text-[12.5px] font-bold"
              style={{ color: isReady ? inkLabelReadyColor : "#2D343640" }}
            >
              {ageMode === "middle"
                ? `${wordCount} / ${wordMinimum} words`
                : isReady
                  ? `${wordCount} words \u2713`
                  : `${wordCount} / ${wordMinimum} words`}
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
              borderRadius: buttonBorderRadius,
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
                if (ageMode !== "middle") {
                  e.currentTarget.style.transform =
                    "translateY(-2px) scale(1.04)";
                  e.currentTarget.style.boxShadow = `0 8px 32px ${trial.accent}40`;
                } else {
                  e.currentTarget.style.transform = "translateY(-2px)";
                }
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "";
              if (canSubmit) {
                e.currentTarget.style.boxShadow = `0 4px 20px ${trial.glow}`;
              }
            }}
          >
            {/* Shine effect (young only) */}
            {canSubmit && showShine && (
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
            <span className="relative z-[1]">{submitLabel}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
