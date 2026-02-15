"use client";

import { useState } from "react";
import { CoachAvatar } from "./shared";
import { useTier } from "@/contexts/TierContext";

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
}

const defaultTask = {
  prompt:
    "Write a story beginning that introduces a character, describes a setting, and hooks the reader with something interesting or surprising.",
  requirements: [
    "Introduce your main character",
    "Describe where the story takes place",
    "Start with something that grabs attention",
  ],
  wordRange: { min: 50, max: 100 },
  minimumToSubmit: 30,
};

export default function AssessmentPhase({
  lessonTitle,
  onSubmit,
  submitting = false,
  qualityError,
  rubric,
}: AssessmentPhaseProps) {
  const { coachName } = useTier();
  const [writingText, setWritingText] = useState("");
  const [showConfirm, setShowConfirm] = useState(false);
  const [checkedItems, setCheckedItems] = useState<Record<number, boolean>>({});

  // Use rubric data if available, otherwise fall back to defaults
  const requirements =
    rubric?.criteria.map((c) => c.displayName) || defaultTask.requirements;
  const wordRange = rubric
    ? { min: rubric.wordRange[0], max: rubric.wordRange[1] }
    : defaultTask.wordRange;

  const wordCount = writingText
    .trim()
    .split(/\s+/)
    .filter((w) => w.length > 0).length;

  const canSubmit = wordCount >= defaultTask.minimumToSubmit;

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
        text: "Nice! You're in the sweet spot!",
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

  return (
    <div className="flex flex-col h-[var(--content-height)]">
      {/* Coach Header with Checklist */}
      <div className="flex-shrink-0 bg-white border-b border-gray-100">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-start gap-3">
            <CoachAvatar size="sm" />
            <div className="flex-1 min-w-0">
              <p className="font-bold text-active-text text-sm leading-snug">
                Time to write your story!
              </p>
              <p className="text-active-text/60 text-sm mt-0.5">
                Remember what we learned:
              </p>
              <div className="mt-3 flex flex-col gap-1.5">
                {requirements.map((req, i) => (
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
                      {req}
                    </span>
                  </label>
                ))}
              </div>
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

      {/* Writing Area */}
      <div className="flex-1 min-h-0 overflow-y-auto bg-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 h-full">
          <textarea
            value={writingText}
            onChange={(e) => setWritingText(e.target.value)}
            placeholder="Start writing here... Take your time and do your best work!"
            className="w-full h-full writing-area writing-lined text-active-text text-base leading-[1.8] resize-none outline-none placeholder:text-gray-300"
            autoFocus
          />
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="flex-shrink-0 bg-white border-t border-gray-100 h-16">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 h-full flex items-center justify-between gap-4">
          {/* Natural language word count */}
          <span className={`text-sm font-bold ${wordCountMessage.color}`}>
            {wordCountMessage.text}
          </span>

          {/* Submit */}
          <button
            onClick={handleSubmit}
            disabled={!canSubmit || submitting}
            className="bg-active-primary text-white px-6 py-2.5 rounded-xl font-bold text-sm hover:bg-active-primary/90 transition-colors shadow-sm disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {submitting ? `${coachName} is reading your story...` : `Show ${coachName}!`}
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
