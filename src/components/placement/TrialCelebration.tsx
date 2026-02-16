"use client";

import { useEffect, useMemo, useRef } from "react";
import { QuestCharacter } from "./QuestCharacters";

const CONFETTI_COLORS = [
  "#FF6B6B",
  "#4ECDC4",
  "#FFE66D",
  "#6C5CE7",
  "#00B894",
  "#E17055",
  "#FFD54F",
  "#A29BFE",
];

interface TrialCelebrationProps {
  visible: boolean;
  charId: string;
  title: string;
  subtitle: string;
  onComplete: () => void;
}

export function TrialCelebration({
  visible,
  charId,
  title,
  subtitle,
  onComplete,
}: TrialCelebrationProps) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (visible) {
      timerRef.current = setTimeout(onComplete, 2500);
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [visible, onComplete]);

  const confetti = useMemo(() => {
    if (!visible) return [];
    return Array.from({ length: 50 }, (_, i) => {
      const s = Math.random() * 10 + 4;
      const isRound = Math.random() > 0.4;
      return {
        key: i,
        width: s,
        height: s * (Math.random() * 0.5 + 0.5),
        borderRadius: isRound ? "50%" : Math.random() > 0.5 ? "2px" : "0",
        color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
        left: `${25 + Math.random() * 50}%`,
        top: `${20 + Math.random() * 15}%`,
        fd: `${250 + Math.random() * 450}px`,
        rot: `${(Math.random() - 0.5) * 1440}deg`,
        tx: `${(Math.random() - 0.5) * 600}px`,
        duration: `${1.2 + Math.random() * 1.5}s`,
        delay: `${Math.random() * 0.5}s`,
      };
    });
  }, [visible]);

  return (
    <div
      className="fixed inset-0 flex flex-col items-center justify-center"
      style={{
        zIndex: 200,
        opacity: visible ? 1 : 0,
        pointerEvents: visible ? "auto" : "none",
        transition: "opacity 0.6s",
      }}
    >
      {/* Background */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at 50% 40%, rgba(255,249,240,0.98), rgba(255,249,240,0.96))",
        }}
      />

      {/* Confetti */}
      {confetti.map((c) => (
        <div
          key={c.key}
          className="absolute"
          style={{
            zIndex: 1,
            width: c.width,
            height: c.height,
            borderRadius: c.borderRadius,
            background: c.color,
            left: c.left,
            top: c.top,
            ["--fd" as string]: c.fd,
            ["--rot" as string]: c.rot,
            transform: `translateX(${c.tx})`,
            animation: `confettiFall linear forwards`,
            animationDuration: c.duration,
            animationDelay: c.delay,
          }}
        />
      ))}

      {/* Content */}
      <div className="relative z-[2] text-center">
        <div
          className="mx-auto mb-3 rounded-full flex items-center justify-center"
          style={{
            width: 120,
            height: 120,
            background:
              "radial-gradient(circle, rgba(255,255,255,0.9), rgba(255,249,240,0.6))",
            boxShadow: "0 0 40px rgba(78,205,196,0.2)",
            animation:
              "celebBounce 0.6s cubic-bezier(0.34,1.56,0.64,1)",
          }}
        >
          <QuestCharacter id={charId} width={80} height={80} />
        </div>
        <div
          className="text-[26px] font-black my-2"
          style={{
            color: "#2D3436",
            animation: "fadeUp 0.4s 0.2s both",
          }}
        >
          {title}
        </div>
        <div
          className="text-[15px] font-semibold mx-auto leading-relaxed"
          style={{
            color: "#2D3436aa",
            maxWidth: 340,
            animation: "fadeUp 0.4s 0.3s both",
          }}
        >
          {subtitle}
        </div>
      </div>
    </div>
  );
}
