"use client";

import { useTier } from "@/contexts/TierContext";

interface CoachAvatarProps {
  size?: "xs" | "sm" | "md" | "lg";
  animate?: boolean;
}

const sizes = {
  xs: "w-[34px] h-[34px] text-[1.1rem]",
  sm: "w-10 h-10 text-lg",
  md: "w-14 h-14 text-2xl",
  lg: "w-20 h-20 text-4xl",
};

export default function CoachAvatar({ size = "xs", animate = false }: CoachAvatarProps) {
  const { coachEmoji, coachLabel } = useTier();
  return (
    <div
      className={`${sizes[size]} rounded-full bg-active-accent flex items-center justify-center flex-shrink-0 shadow-sm ${
        animate ? "animate-bounce-slow shadow-lg" : ""
      }`}
    >
      <span role="img" aria-label={coachLabel}>
        {coachEmoji}
      </span>
    </div>
  );
}
