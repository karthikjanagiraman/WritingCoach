"use client";

import { useEffect, useState } from "react";
import confetti from "canvas-confetti";

interface CelebrationOverlayProps {
  badges: { id: string; name: string; emoji: string; description: string }[];
  onDismiss: () => void;
}

export default function CelebrationOverlay({
  badges,
  onDismiss,
}: CelebrationOverlayProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Fire confetti on mount
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
    });

    // Second burst for extra celebration
    const timer = setTimeout(() => {
      confetti({
        particleCount: 50,
        spread: 100,
        origin: { y: 0.5 },
      });
    }, 300);

    // Trigger entrance animation
    requestAnimationFrame(() => setVisible(true));

    return () => clearTimeout(timer);
  }, []);

  const handleDismiss = () => {
    setVisible(false);
    setTimeout(onDismiss, 200);
  };

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
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Celebration header */}
        <div className="text-5xl mb-2">
          <span className="inline-block animate-bounce">🎉</span>
        </div>
        <h2 className="text-2xl font-extrabold text-active-text mb-1">
          {badges.length === 1 ? "Badge Unlocked!" : "Badges Unlocked!"}
        </h2>
        <p className="text-active-text/60 text-sm mb-6">
          {badges.length === 1
            ? "You earned a new badge!"
            : `You earned ${badges.length} new badges!`}
        </p>

        {/* Badge cards */}
        <div className="space-y-4 mb-6">
          {badges.map((badge, index) => (
            <div
              key={badge.id}
              className="bg-gradient-to-br from-active-accent/20 to-active-accent/10 rounded-2xl p-5 border border-active-accent/30"
              style={{
                animationDelay: `${index * 150}ms`,
                animation: "badgePop 0.4s ease-out both",
              }}
            >
              <div className="text-4xl mb-2">{badge.emoji}</div>
              <h3 className="font-bold text-active-text text-lg">
                {badge.name}
              </h3>
              <p className="text-active-text/70 text-sm mt-1">
                {badge.description}
              </p>
            </div>
          ))}
        </div>

        {/* Continue button */}
        <button
          onClick={handleDismiss}
          className="w-full bg-active-primary text-white px-6 py-3 rounded-xl font-bold text-base hover:bg-active-primary/90 transition-colors shadow-sm"
        >
          Continue
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
