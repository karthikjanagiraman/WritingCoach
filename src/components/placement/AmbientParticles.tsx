"use client";

import { useMemo } from "react";

const PALETTES = [
  ["#FFE66D", "#FF6B6B", "#FFB347"],
  ["#A5D6A7", "#CE93D8", "#81C784"],
  ["#FFD54F", "#E17055", "#90CAF9"],
];

export function AmbientParticles({ trialIndex }: { trialIndex: number }) {
  const colors = PALETTES[trialIndex] ?? PALETTES[0];

  const particles = useMemo(() => {
    return Array.from({ length: 15 }, (_, i) => {
      const size = 4 + Math.random() * 8;
      return {
        key: `${trialIndex}-${i}`,
        size,
        color: colors[i % colors.length],
        left: `${5 + Math.random() * 90}%`,
        opacity: (0.15 + Math.random() * 0.15).toFixed(2),
        rotation: `${Math.random() * 360}deg`,
        duration: `${8 + Math.random() * 12}s`,
        delay: `${Math.random() * 10}s`,
      };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trialIndex]);

  return (
    <div
      className="fixed inset-0 pointer-events-none overflow-hidden"
      style={{ zIndex: 0 }}
      aria-hidden="true"
    >
      {particles.map((p) => (
        <div
          key={p.key}
          className="absolute rounded-full opacity-0"
          style={{
            width: p.size,
            height: p.size,
            background: p.color,
            left: p.left,
            ["--op" as string]: p.opacity,
            ["--rot" as string]: p.rotation,
            animation: `ambientFloat linear infinite`,
            animationDuration: p.duration,
            animationDelay: p.delay,
          }}
        />
      ))}
    </div>
  );
}
