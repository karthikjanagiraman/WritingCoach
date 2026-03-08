"use client";

import { useState, useEffect } from "react";
import { CoachAvatar } from "./shared";
import { useTier } from "@/contexts/TierContext";
import { useAutoSave, useDraftRecovery } from "@/hooks/useAutoSave";
import type { AssessmentContext } from "@/types";

interface AssessmentPhaseProps {
  lessonTitle: string;
  onSubmit: (text: string) => void | Promise<void>;
  submitting?: boolean;
  qualityError?: string | null;
  rubric?: {
    description: string;
    wordRange: [number, number];
    criteria: { name: string; displayName: string; weight: number }[];
  } | null;
  assessmentContext?: AssessmentContext;
  sessionId?: string;
  initialDraft?: string;
}

const TIER_PLACEHOLDERS: Record<1 | 2 | 3, string> = {
  1: "Once upon a time...",
  2: "Start writing here...",
  3: "Begin your piece...",
};

const TIER_SUBMIT_LABELS: Record<1 | 2 | 3, (coachName: string) => string> = {
  1: (name) => `Show ${name}!`,
  2: (name) => `Show ${name}!`,
  3: () => "Submit",
};

const TIER_FONT_STYLES: Record<1 | 2 | 3, string> = {
  1: "text-lg leading-[2.0]",
  2: "text-base leading-[1.8]",
  3: "text-[15px] leading-[1.7]",
};

const defaultTask = {
  prompt:
    "Write a story beginning that introduces a character, describes a setting, and hooks the reader with something interesting or surprising.",
  requirements: [
    "Introduce your main character",
    "Describe where the story takes place",
    "Start with something that grabs attention",
  ],
  wordRange: { min: 50, max: 100 },
};

export default function AssessmentPhase({
  lessonTitle,
  onSubmit,
  submitting = false,
  qualityError,
  rubric,
  assessmentContext,
  sessionId,
  initialDraft,
}: AssessmentPhaseProps) {
  const { coachName, tier } = useTier();

  // Draft recovery
  const { recoveredDraft, clearRecoveredDraft } = useDraftRecovery(
    sessionId,
    initialDraft
  );
  const [writingText, setWritingText] = useState("");
  const [showConfirm, setShowConfirm] = useState(false);
  const [checkedItems, setCheckedItems] = useState<Record<number, boolean>>({});
  const [showDraftToast, setShowDraftToast] = useState(false);

  // Apply recovered draft
  useEffect(() => {
    if (recoveredDraft && !writingText) {
      setWritingText(recoveredDraft);
      setShowDraftToast(true);
      clearRecoveredDraft();
      const timer = setTimeout(() => setShowDraftToast(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [recoveredDraft, writingText, clearRecoveredDraft]);

  // Auto-save
  const { saveStatus } = useAutoSave(sessionId, writingText);

  // Determine checklist items and word range from assessment context or rubric fallback
  const selfCheckItems = assessmentContext?.selfCheckItems
    ?? rubric?.criteria.map((c) => c.displayName)
    ?? defaultTask.requirements;

  const wordRange = assessmentContext
    ? { min: assessmentContext.wordRange[0], max: assessmentContext.wordRange[1] }
    : rubric
      ? { min: rubric.wordRange[0], max: rubric.wordRange[1] }
      : defaultTask.wordRange;

  const wordCount = writingText
    .trim()
    .split(/\s+/)
    .filter((w) => w.length > 0).length;

  const canSubmit = wordCount >= wordRange.min;

  const toggleCheck = (index: number) => {
    setCheckedItems((prev) => ({ ...prev, [index]: !prev[index] }));
  };

  // Natural-language word count message
  const wordCountMessage = (() => {
    if (wordCount < wordRange.min) {
      const remaining = wordRange.min - wordCount;
      return {
        text: `Write ${remaining} more word${remaining === 1 ? "" : "s"}!`,
        color: "text-active-text/50",
      };
    }
    if (wordCount <= wordRange.max) {
      return {
        text: "Nice! You\u2019re in the sweet spot!",
        color: "text-active-secondary",
      };
    }
    return {
      text: "Wow, you wrote a lot! Try to wrap up.",
      color: "text-active-primary",
    };
  })();

  const handleSubmit = () => {
    if (!showConfirm) {
      setShowConfirm(true);
    }
  };

  const confirmSubmit = () => {
    setShowConfirm(false);
    onSubmit(writingText);
  };

  const submitLabel = submitting
    ? `${coachName} is reading your ${tier === 3 ? "piece" : "story"}...`
    : TIER_SUBMIT_LABELS[tier](coachName);

  return (
    <div className="flex flex-col h-[var(--content-height)]">
      {/* Writing Prompt + Checklist Header */}
      <div className="flex-shrink-0 bg-white border-b border-gray-100">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-4">
          {/* Writing prompt card */}
          {assessmentContext ? (
            <div className="mb-3">
              {/* Tier 1: Warm card with coach avatar */}
              {tier === 1 && (
                <div className="flex items-start gap-3 bg-[var(--tier1-bg)] rounded-xl p-4">
                  <CoachAvatar size="sm" />
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-active-text text-sm leading-snug mb-1">
                      Your writing adventure!
                    </p>
                    <p className="text-active-text/80 text-sm leading-relaxed">
                      {assessmentContext.writingPrompt}
                    </p>
                  </div>
                </div>
              )}
              {/* Tier 2: Clean card */}
              {tier === 2 && (
                <div className="bg-white rounded-xl border border-active-primary/10 p-4">
                  <p className="text-xs font-bold uppercase tracking-wider text-active-primary/50 mb-1.5">
                    Writing prompt
                  </p>
                  <p className="text-active-text/80 text-sm leading-relaxed">
                    {assessmentContext.writingPrompt}
                  </p>
                </div>
              )}
              {/* Tier 3: Minimal accent border */}
              {tier === 3 && (
                <div className="border-l-3 border-active-secondary pl-4 py-1">
                  <p className="text-active-text/80 text-sm leading-relaxed">
                    {assessmentContext.writingPrompt}
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-start gap-3 mb-3">
              <CoachAvatar size="sm" />
              <div className="flex-1 min-w-0">
                <p className="font-bold text-active-text text-sm leading-snug">
                  Time to write your story!
                </p>
              </div>
            </div>
          )}

          {/* Self-check items */}
          <div>
            <p className="text-active-text/60 text-xs font-semibold mb-2">
              {tier === 1 ? "Remember what we learned:" : tier === 2 ? "Check as you go:" : "Self-check:"}
            </p>
            <div className="flex flex-col gap-1.5">
              {selfCheckItems.map((item, i) => (
                <label
                  key={i}
                  className="flex items-center gap-2 cursor-pointer select-none group"
                >
                  <span
                    onClick={() => toggleCheck(i)}
                    className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                      checkedItems[i]
                        ? "bg-active-secondary border-active-secondary text-white"
                        : "border-active-primary/20 text-transparent group-hover:border-active-primary/40"
                    }`}
                  >
                    <svg
                      className="w-3 h-3"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={3}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  </span>
                  <span
                    className={`text-sm transition-colors ${
                      checkedItems[i]
                        ? "text-active-text/40 line-through"
                        : "text-active-text/70"
                    }`}
                  >
                    {item}
                  </span>
                </label>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Quality Gate Error */}
      {qualityError && (
        <div className="flex-shrink-0 bg-active-accent/10 border-b border-active-accent/20">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 py-3 flex items-center gap-3">
            <CoachAvatar size="sm" />
            <p className="text-sm font-semibold text-active-text/80">{qualityError}</p>
          </div>
        </div>
      )}

      {/* Draft recovered toast */}
      {showDraftToast && (
        <div className="flex-shrink-0 bg-active-secondary/10 border-b border-active-secondary/20">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 py-2 text-center">
            <p className="text-xs font-semibold text-active-secondary">
              Draft recovered! Your previous writing has been restored.
            </p>
          </div>
        </div>
      )}

      {/* Writing Area */}
      <div className="flex-1 min-h-0 overflow-y-auto bg-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 h-full">
          <textarea
            value={writingText}
            onChange={(e) => setWritingText(e.target.value)}
            placeholder={TIER_PLACEHOLDERS[tier]}
            className={`w-full h-full writing-area writing-lined text-active-text ${TIER_FONT_STYLES[tier]} resize-none outline-none placeholder:text-gray-300`}
            autoFocus
          />
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="flex-shrink-0 bg-white border-t border-gray-100 h-16">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 h-full flex items-center justify-between gap-4">
          {/* Word count + save status */}
          <div className="flex items-center gap-3">
            <span className={`text-sm font-bold ${wordCountMessage.color}`}>
              {wordCountMessage.text}
            </span>
            {sessionId && writingText.length > 0 && (
              <span className="text-[10px] font-semibold text-active-text/30">
                {saveStatus === "saving"
                  ? "Saving..."
                  : saveStatus === "saved"
                    ? "Saved"
                    : saveStatus === "error"
                      ? "Save failed"
                      : ""}
              </span>
            )}
          </div>

          {/* Submit */}
          <button
            onClick={handleSubmit}
            disabled={!canSubmit || submitting}
            className="bg-active-primary text-white px-6 py-2.5 rounded-xl font-bold text-sm hover:bg-active-primary/90 transition-colors shadow-sm disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {submitLabel}
          </button>
        </div>
      </div>

      {/* Confirmation Modal */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-6 max-w-sm mx-4 shadow-xl text-center animate-fade-in">
            <div className="flex justify-center mb-3">
              <CoachAvatar size="md" />
            </div>
            <h3 className="text-lg font-bold text-active-text mb-2">
              Ready to show {coachName}?
            </h3>
            <p className="text-sm text-active-text/60 mb-5">
              {coachName} will read your writing and give you helpful feedback!
            </p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => setShowConfirm(false)}
                className="px-5 py-2.5 rounded-xl border-2 border-active-primary/20 text-active-primary font-bold text-sm hover:bg-active-primary/5 transition-colors"
              >
                Keep Writing
              </button>
              <button
                onClick={confirmSubmit}
                className="px-5 py-2.5 rounded-xl bg-active-secondary text-white font-bold text-sm hover:bg-active-secondary/90 transition-colors shadow-sm"
              >
                Yes, Show {coachName}!
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
