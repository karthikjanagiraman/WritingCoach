"use client";

import { useMemo } from "react";
import { QuestCharacter, TRIAL_CONFIG } from "./QuestCharacters";

interface QuestFinaleProps {
  visible: boolean;
  childName: string;
}

export function QuestFinale({ visible, childName }: QuestFinaleProps) {
  const stars = useMemo(() => {
    return Array.from({ length: 30 }, (_, i) => ({
      key: i,
      left: `${Math.random() * 100}%`,
      top: `${Math.random() * 100}%`,
      delay: `${Math.random() * 3}s`,
      duration: `${1.5 + Math.random() * 1.5}s`,
      size: 2 + Math.random() * 4,
    }));
  }, []);

  const finalChars = [
    {
      config: TRIAL_CONFIG[0],
      color: "#FF6B6B",
      colorLight: "#FF8E8E",
    },
    {
      config: TRIAL_CONFIG[1],
      color: "#6C5CE7",
      colorLight: "#A29BFE",
    },
    {
      config: TRIAL_CONFIG[2],
      color: "#E17055",
      colorLight: "#FAB1A0",
    },
  ];

  return (
    <div
      className="fixed inset-0 flex flex-col items-center justify-center overflow-hidden"
      style={{
        zIndex: 200,
        padding: 32,
        opacity: visible ? 1 : 0,
        pointerEvents: visible ? "auto" : "none",
        transition: "opacity 0.8s",
      }}
    >
      {/* Background */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(170deg, #FFF9F0, #FFE8D6, #FFF0E0)",
        }}
      />

      {/* Twinkling stars */}
      <div className="absolute inset-0 pointer-events-none">
        {stars.map((s) => (
          <div
            key={s.key}
            className="absolute rounded-full"
            style={{
              width: s.size,
              height: s.size,
              background: "#FFD54F",
              left: s.left,
              top: s.top,
              animation: `starTwinkle ${s.duration} ease-in-out infinite`,
              animationDelay: s.delay,
            }}
          />
        ))}
      </div>

      {/* Content */}
      <div className="relative z-[2] text-center">
        {/* Ollie */}
        <div
          className="mx-auto mb-2"
          style={{
            width: 80,
            height: 80,
            fontSize: 56,
            lineHeight: "80px",
            animation:
              "ollieJump 0.8s cubic-bezier(0.34,1.56,0.64,1)",
          }}
        >
          &#x1F989;
        </div>

        <div
          className="text-[28px] font-black mb-2"
          style={{
            color: "#2D3436",
            animation: "fadeUp 0.5s 0.2s both",
          }}
        >
          You&apos;ve proven yourself worthy!
        </div>

        <div
          className="text-[15px] font-semibold mx-auto mb-8 leading-relaxed text-center"
          style={{
            color: "#2D3436aa",
            maxWidth: 380,
            animation: "fadeUp 0.5s 0.3s both",
          }}
        >
          Welcome to the quest, <strong>{childName}</strong>. Ollie is
          preparing your personal adventure path...
        </div>

        {/* Character circles */}
        <div className="flex gap-8 mb-8 justify-center">
          {finalChars.map((fc, i) => (
            <div
              key={i}
              className="text-center"
              style={{
                opacity: 0,
                animation: `charReveal 0.6s cubic-bezier(0.34,1.56,0.64,1) forwards`,
                animationDelay: `${0.5 + i * 0.2}s`,
              }}
            >
              <div
                className="relative rounded-full flex items-center justify-center mx-auto"
                style={{
                  width: 96,
                  height: 96,
                  border: `3px solid ${fc.color}`,
                  background: `radial-gradient(circle, rgba(255,255,255,0.9), ${fc.color}08)`,
                  boxShadow: `0 4px 24px ${fc.color}25, 0 0 0 6px ${fc.color}0A`,
                }}
              >
                <QuestCharacter
                  id={fc.config.charId}
                  width={64}
                  height={64}
                />
                {/* Checkmark overlay */}
                <div
                  className="absolute flex items-center justify-center"
                  style={{
                    top: -6,
                    right: -6,
                    width: 28,
                    height: 28,
                    borderRadius: "50%",
                    background: `linear-gradient(135deg, ${fc.color}, ${fc.colorLight})`,
                    boxShadow: `0 2px 8px ${fc.color}50`,
                  }}
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="white"
                  >
                    <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                  </svg>
                </div>
              </div>
              <div
                className="text-xs font-extrabold mt-[10px]"
                style={{ color: "#2D3436aa" }}
              >
                {fc.config.sidebarName}
              </div>
            </div>
          ))}
        </div>

        {/* Loading spinner */}
        <div
          className="inline-flex items-center gap-3 rounded-xl"
          style={{
            padding: "12px 24px",
            background: "rgba(255,255,255,0.6)",
            backdropFilter: "blur(4px)",
            animation: "fadeUp 0.5s 1.2s both",
          }}
        >
          <div
            className="rounded-full"
            style={{
              width: 22,
              height: 22,
              border: "3px solid #FF6B6B15",
              borderTopColor: "#FF6B6B",
              animation: "spin 0.8s linear infinite",
            }}
          />
          <span
            className="text-sm font-bold"
            style={{ color: "#FF6B6Bcc" }}
          >
            Crafting your curriculum...
          </span>
        </div>
      </div>
    </div>
  );
}
