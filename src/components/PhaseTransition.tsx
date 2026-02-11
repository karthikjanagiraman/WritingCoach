"use client";

import { CoachAvatar } from "@/components/shared";
import { useTier } from "@/contexts/TierContext";

interface PhaseTransitionProps {
  fromPhase: "instruction" | "guided" | "assessment";
  onContinue: () => void;
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

export default function PhaseTransition({ fromPhase, onContinue }: PhaseTransitionProps) {
  const { coachName } = useTier();
  const content = transitionContent[fromPhase];
  const showButton = content.button !== null;
  const quote = content.quote ?? `${coachName} is reading your work...`;

  return (
    <div className="h-[var(--content-height)] flex items-center justify-center bg-active-bg">
      <div className="flex flex-col items-center text-center px-6 max-w-md">
        {/* Big emoji with pop-in animation */}
        <div className="animate-emoji-pop text-6xl sm:text-7xl mb-6" aria-hidden="true">
          {content.emoji}
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

        {/* Mini progress dots */}
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
                  <div
                    className={`animate-dot-fill w-3 h-3 rounded-full transition-colors ${
                      isCompleted
                        ? "bg-active-secondary"
                        : isNext
                          ? "bg-active-primary ring-2 ring-active-primary/30"
                          : "bg-gray-200"
                    }`}
                    style={{ animationDelay: `${0.3 + index * 0.15}s` }}
                  />
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

        {/* CTA button (fades in last) */}
        {showButton && (
          <button
            onClick={onContinue}
            className="animate-fade-in stagger-3 bg-active-primary text-white px-8 py-3 rounded-2xl font-bold text-base shadow-md hover:bg-active-primary/90 active:scale-95 transition-all"
          >
            {content.button}
          </button>
        )}
      </div>
    </div>
  );
}
