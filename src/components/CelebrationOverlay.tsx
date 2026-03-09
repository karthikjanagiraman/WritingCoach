"use client";

import { useEffect, useState, useRef } from "react";
import confetti from "canvas-confetti";
import { type BadgeRarity, RARITY_CONFIG } from "@/lib/badges";

interface CelebrationBadge {
  id: string;
  name: string;
  emoji: string;
  description: string;
  rarity?: BadgeRarity;
}

interface CelebrationOverlayProps {
  badges: CelebrationBadge[];
  onDismiss: () => void;
}

function fireConfetti(rarity: BadgeRarity) {
  const config = RARITY_CONFIG[rarity];

  // First burst — center
  confetti({
    particleCount: config.confettiParticles,
    spread: 70,
    origin: { y: 0.6 },
    colors: [config.color, "#FFFFFF", "#FFE66D"],
  });

  // Additional bursts for higher rarities
  if (config.confettiBursts >= 2) {
    setTimeout(() => {
      confetti({
        particleCount: Math.floor(config.confettiParticles * 0.6),
        spread: 100,
        origin: { y: 0.5 },
        colors: [config.color, "#FFFFFF"],
      });
    }, 300);
  }

  if (config.confettiBursts >= 3) {
    // Side cannons for epic+
    setTimeout(() => {
      confetti({
        particleCount: Math.floor(config.confettiParticles * 0.4),
        angle: 60,
        spread: 55,
        origin: { x: 0, y: 0.6 },
        colors: [config.color, "#FFE66D"],
      });
      confetti({
        particleCount: Math.floor(config.confettiParticles * 0.4),
        angle: 120,
        spread: 55,
        origin: { x: 1, y: 0.6 },
        colors: [config.color, "#FFE66D"],
      });
    }, 600);
  }

  if (config.confettiBursts >= 5) {
    // Sustained cascade for legendary
    for (let i = 1; i <= 3; i++) {
      setTimeout(() => {
        confetti({
          particleCount: Math.floor(config.confettiParticles * 0.3),
          spread: 120,
          origin: { x: Math.random(), y: 0.3 },
          colors: ["#FECA57", "#FF6B6B", "#6C5CE7", "#4ECDC4", "#FFFFFF"],
        });
      }, 800 + i * 400);
    }
  }
}

const RARITY_LABEL_STYLES: Record<BadgeRarity, string> = {
  common: "bg-[#FF6B6B]/15 text-[#FF6B6B] border-[#FF6B6B]/20",
  rare: "bg-[#6C5CE7]/15 text-[#6C5CE7] border-[#6C5CE7]/20",
  epic: "bg-[#4ECDC4]/15 text-[#00897B] border-[#4ECDC4]/20",
  legendary: "bg-[#FECA57]/20 text-[#F57F17] border-[#FECA57]/30",
};

const RARITY_CARD_STYLES: Record<BadgeRarity, string> = {
  common: "from-[#FF6B6B]/15 to-[#FFB8B8]/10 border-[#FF6B6B]/20",
  rare: "from-[#6C5CE7]/15 to-[#A29BFE]/10 border-[#6C5CE7]/20",
  epic: "from-[#4ECDC4]/15 to-[#A7F3D0]/10 border-[#4ECDC4]/20",
  legendary: "from-[#FECA57]/20 to-[#FFF9C4]/15 border-[#FECA57]/30",
};

export default function CelebrationOverlay({
  badges,
  onDismiss,
}: CelebrationOverlayProps) {
  const [visible, setVisible] = useState(false);
  const autoDismissRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Determine the highest rarity among all badges
  const rarityOrder: BadgeRarity[] = ["common", "rare", "epic", "legendary"];
  const highestRarity = badges.reduce<BadgeRarity>((max, b) => {
    const r = b.rarity ?? "common";
    return rarityOrder.indexOf(r) > rarityOrder.indexOf(max) ? r : max;
  }, "common");

  useEffect(() => {
    // Fire confetti scaled to highest rarity
    fireConfetti(highestRarity);

    // Trigger entrance animation
    requestAnimationFrame(() => setVisible(true));

    // Auto-dismiss for common badges only
    const config = RARITY_CONFIG[highestRarity];
    if (config.autoDismissMs) {
      autoDismissRef.current = setTimeout(() => {
        handleDismiss();
      }, config.autoDismissMs);
    }

    return () => {
      if (autoDismissRef.current) clearTimeout(autoDismissRef.current);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleDismiss = () => {
    if (autoDismissRef.current) clearTimeout(autoDismissRef.current);
    setVisible(false);
    setTimeout(onDismiss, 200);
  };

  const isLegendary = highestRarity === "legendary";
  const isEpicOrAbove = highestRarity === "epic" || isLegendary;

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-all duration-300 ${
        visible ? "bg-black/50" : "bg-black/0"
      }`}
      onClick={handleDismiss}
    >
      <div
        className={`bg-white rounded-3xl shadow-2xl max-w-sm w-full p-8 text-center transition-all duration-300 ${
          visible ? "scale-100 opacity-100" : "scale-75 opacity-0"
        } ${isLegendary ? "ring-2 ring-[#FECA57]/50" : ""}`}
        style={isLegendary ? {
          boxShadow: "0 0 40px rgba(254, 202, 87, 0.3), 0 25px 50px -12px rgba(0, 0, 0, 0.25)",
        } : undefined}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Celebration header */}
        <div className="text-5xl mb-2">
          <span className={`inline-block ${isEpicOrAbove ? "animate-bounce" : "animate-bounce"}`}>
            {isLegendary ? "👑" : isEpicOrAbove ? "✨" : "🎉"}
          </span>
        </div>
        <h2 className="text-2xl font-extrabold text-active-text mb-1">
          {isLegendary
            ? "LEGENDARY Sticker!"
            : badges.length === 1
              ? "Sticker Unlocked!"
              : "Stickers Unlocked!"}
        </h2>
        <p className="text-active-text/60 text-sm mb-6">
          {badges.length === 1
            ? "You earned a new sticker for your collection!"
            : `You earned ${badges.length} new stickers!`}
        </p>

        {/* Badge cards */}
        <div className="space-y-4 mb-6">
          {badges.map((badge, index) => {
            const rarity = badge.rarity ?? "common";
            const rarityConfig = RARITY_CONFIG[rarity];

            return (
              <div
                key={badge.id}
                className={`bg-gradient-to-br ${RARITY_CARD_STYLES[rarity]} rounded-2xl p-5 border relative overflow-hidden`}
                style={{
                  animationDelay: `${index * 150}ms`,
                  animation: "badgePop 0.4s ease-out both",
                }}
              >
                {/* Rarity label */}
                <div className="flex justify-center mb-3">
                  <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${RARITY_LABEL_STYLES[rarity]}`}>
                    {rarityConfig.label}
                  </span>
                </div>
                <div className="text-4xl mb-2">{badge.emoji}</div>
                <h3 className="font-bold text-active-text text-lg">
                  {badge.name}
                </h3>
                <p className="text-active-text/70 text-sm mt-1">
                  {badge.description}
                </p>
              </div>
            );
          })}
        </div>

        {/* Continue button */}
        <button
          onClick={handleDismiss}
          className="w-full bg-active-primary text-white px-6 py-3 rounded-xl font-bold text-base hover:bg-active-primary/90 transition-colors shadow-sm"
        >
          {highestRarity === "common" ? "Nice!" : "Awesome!"}
        </button>
      </div>

      {/* Keyframe for badge pop-in */}
      <style jsx>{`
        @keyframes badgePop {
          0% {
            transform: scale(0.5);
            opacity: 0;
          }
          70% {
            transform: scale(1.05);
          }
          100% {
            transform: scale(1);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}
