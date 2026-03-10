"use client";

import { CoachAvatar, InkSplats } from "@/components/shared";
import { useTier } from "@/contexts/TierContext";
import type { AssessmentContext } from "@/types";

interface PhaseTransitionProps {
  fromPhase: "instruction" | "guided" | "assessment";
  onContinue: () => void;
  assessmentContext?: AssessmentContext;
  childName?: string;
}

const transitionContent = {
  instruction: {
    emoji: "\uD83C\uDFAF",
    title: "Learning Complete!",
    quote: "Great job! Now let\u2019s practice together!",
    button: "Let\u2019s Practice!",
    completedIndex: 0,
    nextLabel: "Practice",
  },
  guided: {
    emoji: "\u2728",
    title: "Practice Complete!",
    quote: "You\u2019re ready to write on your own! Show me what you\u2019ve learned!",
    button: "Time to Write!",
    completedIndex: 1,
    nextLabel: "Write",
  },
  assessment: {
    emoji: "\uD83D\uDE80",
    title: "Writing Complete!",
    quote: null, // dynamic — uses coach name
    button: null,
    completedIndex: 2,
    nextLabel: "Feedback",
  },
} as const;

const phaseLabels = ["Learn", "Practice", "Write"];

const TIER_TITLES: Record<1 | 2 | 3, string> = {
  1: "You\u2019re ready!",
  2: "Time to shine!",
  3: "Time to write.",
};

const TIER_BUTTON_LABELS: Record<1 | 2 | 3, string> = {
  1: "Start Writing!",
  2: "Start Writing!",
  3: "Begin Writing",
};

/** Ink-blob progress dot — organic shape instead of plain circle */
function InkDot({ active, next, delay }: { active: boolean; next: boolean; delay: number }) {
  return (
    <div
      className={`animate-dot-fill transition-colors ${
        active
          ? "bg-active-secondary"
          : next
            ? "bg-active-primary ring-2 ring-active-primary/30"
            : "bg-gray-200"
      }`}
      style={{
        width: 13,
        height: 13,
        borderRadius: "50% 50% 50% 50% / 40% 40% 60% 60%",
        animationDelay: `${delay}s`,
      }}
    />
  );
}

export default function PhaseTransition({
  fromPhase,
  onContinue,
  assessmentContext,
  childName,
}: PhaseTransitionProps) {
  const { coachName, tier } = useTier();
  const content = transitionContent[fromPhase];

  // Enhanced guided→assessment transition with assessment context
  if (fromPhase === "guided" && assessmentContext) {
    return (
      <div className="h-[var(--content-height)] flex items-center justify-center bg-active-bg relative">
        <InkSplats />
        <div className="flex flex-col items-center text-center px-6 max-w-lg relative z-10">
          {/* Ink splash icon instead of emoji */}
          <div className="animate-emoji-pop mb-5" aria-hidden="true">
            <img src="/brand/favicon.svg" alt="" width={56} height={56} className="opacity-80" />
          </div>

          {/* Tier-specific title */}
          <h2 className="animate-fade-in text-2xl sm:text-3xl font-extrabold text-active-text mb-4">
            {TIER_TITLES[tier]}
          </h2>

          {/* Coach encouragement — AI-generated, lesson-specific */}
          <div className="animate-fade-in stagger-1 flex items-start gap-3 mb-5">
            <CoachAvatar size="md" />
            <p className="italic text-active-text/70 text-base sm:text-lg text-left pt-2">
              &ldquo;{assessmentContext.encouragement}&rdquo;
            </p>
          </div>

          {/* Techniques learned pills */}
          {assessmentContext.techniquesLearned.length > 0 && (
            <div className="animate-fade-in stagger-2 flex flex-wrap justify-center gap-2 mb-5">
              {assessmentContext.techniquesLearned.map((technique) => (
                <span
                  key={technique}
                  className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-active-secondary/15 text-active-secondary"
                >
                  {technique}
                </span>
              ))}
            </div>
          )}

          {/* Writing prompt preview card */}
          <div className="animate-fade-in stagger-2 w-full rounded-xl border border-active-primary/15 bg-white/80 px-5 py-4 mb-6 text-left">
            <p className="text-xs font-bold uppercase tracking-wider text-active-primary/60 mb-1.5">
              Your writing prompt
            </p>
            <p className="text-sm text-active-text/80 leading-relaxed">
              {assessmentContext.writingPrompt.length > 120
                ? assessmentContext.writingPrompt.slice(0, 120) + "\u2026"
                : assessmentContext.writingPrompt}
            </p>
          </div>

          {/* Ink-blob progress dots */}
          <div className="animate-fade-in stagger-2 flex items-center gap-2 mb-6">
            {phaseLabels.map((label, index) => {
              const isCompleted = index <= 1;
              const isNext = index === 2;
              return (
                <div key={label} className="flex items-center gap-2">
                  {index > 0 && (
                    <span className="text-active-text/30 text-xs font-bold mx-0.5">&rarr;</span>
                  )}
                  <div className="flex flex-col items-center gap-1">
                    <InkDot active={isCompleted} next={isNext} delay={0.3 + index * 0.15} />
                    <span
                      className={`text-[10px] font-bold ${
                        isCompleted
                          ? "text-active-secondary"
                          : isNext
                            ? "text-active-primary"
                            : "text-gray-400"
                      }`}
                    >
                      {label}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* CTA button with wet-ink effect */}
          <button
            onClick={onContinue}
            className="btn-wet-ink animate-fade-in stagger-3 bg-active-primary text-white px-8 py-3 rounded-2xl font-bold text-base shadow-md hover:bg-active-primary/90 active:scale-95 transition-all"
          >
            {TIER_BUTTON_LABELS[tier]}
          </button>
        </div>
      </div>
    );
  }

  // Default transition (instruction→guided, assessment→feedback, or guided without context)
  const showButton = content.button !== null;
  const quote = content.quote ?? `${coachName} is reading your work...`;

  return (
    <div className="h-[var(--content-height)] flex items-center justify-center bg-active-bg relative">
      <InkSplats />
      <div className="flex flex-col items-center text-center px-6 max-w-md relative z-10">
        {/* Ink splash icon instead of generic emoji */}
        <div className="animate-emoji-pop mb-6" aria-hidden="true">
          <img src="/brand/favicon.svg" alt="" width={56} height={56} className="opacity-80" />
        </div>

        {/* Title */}
        <h2 className="animate-fade-in text-2xl sm:text-3xl font-extrabold text-active-text mb-6">
          {content.title}
        </h2>

        {/* Coach quote */}
        <div className="animate-fade-in stagger-1 flex items-start gap-3 mb-8">
          <CoachAvatar size="md" />
          <p className="italic text-active-text/70 text-base sm:text-lg text-left pt-2">
            &ldquo;{quote}&rdquo;
          </p>
        </div>

        {/* Ink-blob progress dots */}
        <div className="animate-fade-in stagger-2 flex items-center gap-2 mb-8">
          {phaseLabels.map((label, index) => {
            const isCompleted = index <= content.completedIndex;
            const isNext = index === content.completedIndex + 1;

            return (
              <div key={label} className="flex items-center gap-2">
                {index > 0 && (
                  <span className="text-active-text/30 text-xs font-bold mx-0.5">&rarr;</span>
                )}
                <div className="flex flex-col items-center gap-1">
                  <InkDot active={isCompleted} next={isNext} delay={0.3 + index * 0.15} />
                  <span
                    className={`text-[10px] font-bold ${
                      isCompleted
                        ? "text-active-secondary"
                        : isNext
                          ? "text-active-primary"
                          : "text-gray-400"
                    }`}
                  >
                    {label}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* CTA button with wet-ink effect (fades in last) */}
        {showButton && (
          <button
            onClick={onContinue}
            className="btn-wet-ink animate-fade-in stagger-3 bg-active-primary text-white px-8 py-3 rounded-2xl font-bold text-base shadow-md hover:bg-active-primary/90 active:scale-95 transition-all"
          >
            {content.button}
          </button>
        )}
      </div>
    </div>
  );
}
