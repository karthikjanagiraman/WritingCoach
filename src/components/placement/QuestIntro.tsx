"use client";

import { useState, useCallback } from "react";
import { QuestCharacter } from "./QuestCharacters";

interface NarrationStep {
  text: string;
  highlights: { word: string; type: "name" | "highlight" }[];
  btn: string;
}

function buildNarrations(childName: string): NarrationStep[] {
  return [
    {
      text: `Psst... ${childName}! Over here! I'm Ollie, keeper of the Story Realm — a world made entirely of words, where every tale ever told lives and breathes.`,
      highlights: [
        { word: childName, type: "name" },
        { word: "Ollie", type: "highlight" },
      ],
      btn: "Tell me more...",
    },
    {
      text: `But the Story Realm is in trouble. Its pages are fading, and I need a new writer to join my quest and bring them back to life. I've been searching for someone with real writing magic...`,
      highlights: [{ word: "fading", type: "highlight" }],
      btn: "Could that be me?",
    },
    {
      text: `I think it could! But first, every writer who joins the quest must pass three trials — to prove they have the spark of storytelling, the eye of a sense weaver, and the voice to move mountains.`,
      highlights: [{ word: "three trials", type: "highlight" }],
      btn: "What kind of trials?",
    },
    {
      text: `Don't worry — there are no wrong answers, and this isn't a test. I just need to see how you write so I can plan the perfect adventure for you. Ready to show me what you've got?`,
      highlights: [{ word: "how you write", type: "highlight" }],
      btn: "I'm ready! Let's go!",
    },
  ];
}

function buildCondensedNarrations(childName: string): NarrationStep[] {
  return [
    {
      text: `Hi ${childName}! I'm Ollie, and I'm going to help you become a better writer. Before we start, I need to see how you write right now — that way I can plan lessons that are just right for you.`,
      highlights: [
        { word: childName, type: "name" },
        { word: "Ollie", type: "highlight" },
        { word: "just right for you", type: "highlight" },
      ],
      btn: "Sounds good!",
    },
    {
      text: `You'll do three short writing activities — a story, a description, and a persuasive piece. There are no wrong answers! Just do your best and have fun.`,
      highlights: [
        { word: "three short writing activities", type: "highlight" },
        { word: "no wrong answers", type: "highlight" },
      ],
      btn: "Let's start!",
    },
  ];
}

function renderNarrationText(text: string, highlights: NarrationStep["highlights"]) {
  let result = text;
  for (const h of highlights) {
    const cls = h.type === "name" ? "intro-name" : "intro-highlight";
    result = result.replace(h.word, `<span class="${cls}">${h.word}</span>`);
  }
  return result;
}

interface QuestIntroProps {
  childName: string;
  onComplete: () => void;
  condensed?: boolean;
}

export function QuestIntro({ childName, onComplete, condensed = false }: QuestIntroProps) {
  const [narrationStep, setNarrationStep] = useState(0);
  const [fading, setFading] = useState(false);

  const narrations = condensed
    ? buildCondensedNarrations(childName)
    : buildNarrations(childName);
  const current = narrations[narrationStep];

  const handleNext = useCallback(() => {
    setFading(true);

    setTimeout(() => {
      const next = narrationStep + 1;
      if (next >= narrations.length) {
        onComplete();
        return;
      }
      setNarrationStep(next);
      setFading(false);
    }, 350);
  }, [narrationStep, narrations.length, onComplete]);

  // Condensed mode uses tier-2 styling
  const bgGradient = condensed
    ? "linear-gradient(170deg, #F8F9FD 0%, #EEF0FB 40%, #F5F3FF 100%)"
    : "linear-gradient(170deg, #FFF9F0 0%, #FFE8D6 40%, #FFF0E6 100%)";
  const glowBg = condensed
    ? "radial-gradient(circle, #6C5CE715 0%, transparent 70%)"
    : "radial-gradient(circle, #FF6B6B15 0%, transparent 70%)";
  const btnGradient = condensed
    ? "linear-gradient(135deg, #6C5CE7, #A29BFE)"
    : "linear-gradient(135deg, #FF6B6B, #FF8E8E)";
  const btnShadow = condensed
    ? "0 4px 20px #6C5CE735"
    : "0 4px 20px #FF6B6B35";
  const btnHoverShadow = condensed
    ? "0 8px 28px #6C5CE745"
    : "0 8px 28px #FF6B6B45";
  const dotCompletedColor = condensed ? "#00B894" : "#4ECDC4";
  const dotActiveColor = condensed ? "#6C5CE7" : "#FF6B6B";
  const dotActiveShadow = condensed
    ? "0 0 12px #6C5CE760"
    : "0 0 12px #FF6B6B60";
  const mascotShadow = condensed
    ? "drop-shadow(0 8px 24px rgba(108,92,231,0.2))"
    : "drop-shadow(0 8px 24px rgba(255,107,107,0.2))";
  const narrationFontSize = condensed ? 16 : 18;
  const narrationFontWeight = condensed ? 600 : 700;
  const narrationFontFamily = condensed
    ? "'DM Sans', sans-serif"
    : "inherit";

  return (
    <div
      className="fixed inset-0 flex flex-col items-center justify-center"
      style={{
        background: bgGradient,
        padding: 24,
        zIndex: 100,
        transition: "opacity 0.8s, transform 0.6s",
      }}
    >
      {/* Background glow */}
      <div
        style={{
          position: "absolute",
          width: 400,
          height: 400,
          borderRadius: "50%",
          background: glowBg,
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -55%)",
          animation: "introGlowPulse 3s ease-in-out infinite",
        }}
      />

      {/* Ollie mascot */}
      <div
        style={{
          position: "relative",
          zIndex: 2,
          animation:
            "introMascotEntrance 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) both",
        }}
      >
        <div
          style={{
            animation: "introFloat 2.5s ease-in-out infinite",
            filter: mascotShadow,
          }}
        >
          <QuestCharacter id="ollie" width={80} height={80} />
        </div>
      </div>

      {/* Narration dots */}
      <div
        style={{
          display: "flex",
          gap: 8,
          margin: "16px 0 24px",
          position: "relative",
          zIndex: 2,
        }}
        role="progressbar"
        aria-valuenow={narrationStep + 1}
        aria-valuemax={narrations.length}
      >
        {narrations.map((_, i) => (
          <div
            key={i}
            style={{
              width: 10,
              height: 10,
              borderRadius: "50%",
              background:
                i < narrationStep
                  ? dotCompletedColor
                  : i === narrationStep
                    ? dotActiveColor
                    : "#2D343612",
              transform:
                i < narrationStep
                  ? "scale(1.1)"
                  : i === narrationStep
                    ? "scale(1.4)"
                    : "scale(1)",
              boxShadow:
                i === narrationStep ? dotActiveShadow : "none",
              transition: "all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)",
            }}
          />
        ))}
      </div>

      {/* Narration box */}
      <div
        aria-live="polite"
        style={{
          maxWidth: 440,
          textAlign: "center",
          minHeight: 200,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
          zIndex: 2,
        }}
      >
        <div
          style={{
            fontSize: narrationFontSize,
            fontWeight: narrationFontWeight,
            fontFamily: narrationFontFamily,
            color: "#2D3436cc",
            lineHeight: 1.75,
            marginBottom: 28,
            minHeight: 120,
            opacity: fading ? 0 : 1,
            transform: fading ? "translateY(8px)" : "translateY(0)",
            transition: "opacity 0.35s, transform 0.35s",
          }}
          dangerouslySetInnerHTML={{
            __html: renderNarrationText(current.text, current.highlights),
          }}
        />

        <button
          onClick={handleNext}
          style={{
            background: btnGradient,
            color: "white",
            border: "none",
            padding: "15px 44px",
            borderRadius: 16,
            fontSize: 16,
            fontWeight: 800,
            cursor: "pointer",
            fontFamily: condensed ? "'DM Sans', sans-serif" : "inherit",
            boxShadow: btnShadow,
            position: "relative",
            overflow: "hidden",
            opacity: fading ? 0 : 1,
            transform: fading ? "translateY(8px)" : "translateY(0)",
            transition:
              "opacity 0.3s, transform 0.3s, box-shadow 0.25s",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = "translateY(-2px) scale(1.02)";
            e.currentTarget.style.boxShadow = btnHoverShadow;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = fading
              ? "translateY(8px)"
              : "translateY(0)";
            e.currentTarget.style.boxShadow = btnShadow;
          }}
        >
          {current.btn}
        </button>
      </div>

      {/* Condensed mode: override highlight colors via inline style tag */}
      {condensed && (
        <style>{`
          .intro-highlight { color: #6C5CE7 !important; }
          .intro-name { color: #6C5CE7 !important; }
        `}</style>
      )}
    </div>
  );
}
