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
}

export function QuestIntro({ childName, onComplete }: QuestIntroProps) {
  const [narrationStep, setNarrationStep] = useState(0);
  const [fading, setFading] = useState(false);

  const narrations = buildNarrations(childName);
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

  return (
    <div
      className="fixed inset-0 flex flex-col items-center justify-center"
      style={{
        background: "linear-gradient(170deg, #FFF9F0 0%, #FFE8D6 40%, #FFF0E6 100%)",
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
          background: "radial-gradient(circle, #FF6B6B15 0%, transparent 70%)",
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
          animation: "introMascotEntrance 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) both",
        }}
      >
        <div
          style={{
            animation: "introFloat 2.5s ease-in-out infinite",
            filter: "drop-shadow(0 8px 24px rgba(255,107,107,0.2))",
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
                  ? "#4ECDC4"
                  : i === narrationStep
                    ? "#FF6B6B"
                    : "#2D343612",
              transform:
                i < narrationStep
                  ? "scale(1.1)"
                  : i === narrationStep
                    ? "scale(1.4)"
                    : "scale(1)",
              boxShadow:
                i === narrationStep ? "0 0 12px #FF6B6B60" : "none",
              transition: "all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)",
            }}
          />
        ))}
      </div>

      {/* Narration box */}
      <div
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
            fontSize: 18,
            fontWeight: 700,
            color: "#2D3436cc",
            lineHeight: 1.75,
            marginBottom: 28,
            minHeight: 100,
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
            background: "linear-gradient(135deg, #FF6B6B, #FF8E8E)",
            color: "white",
            border: "none",
            padding: "15px 44px",
            borderRadius: 16,
            fontSize: 16,
            fontWeight: 800,
            cursor: "pointer",
            fontFamily: "inherit",
            boxShadow: "0 4px 20px #FF6B6B35",
            position: "relative",
            overflow: "hidden",
            opacity: fading ? 0 : 1,
            transform: fading ? "translateY(8px)" : "translateY(0)",
            transition: "opacity 0.3s, transform 0.3s, box-shadow 0.25s",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = "translateY(-2px) scale(1.02)";
            e.currentTarget.style.boxShadow = "0 8px 28px #FF6B6B45";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = fading
              ? "translateY(8px)"
              : "translateY(0)";
            e.currentTarget.style.boxShadow = "0 4px 20px #FF6B6B35";
          }}
        >
          {current.btn}
        </button>
      </div>
    </div>
  );
}
