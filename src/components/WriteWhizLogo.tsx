"use client";

/**
 * WriteWhiz wordmark component — "Ink in Motion" brand identity.
 *
 * Renders: [ink-splash icon] Write Whiz [z-flourish dots]
 *
 * - "Write" in Literata SemiBold (serif), charcoal #2D3436
 * - "Whiz"  in Nunito Black (sans), purple #6C5CE7 (tier-adaptive)
 * - Z-flourish: 2-3 colored ink dots trailing from the z
 */

interface WriteWhizLogoProps {
  /** sm = nav bars, md = headers, lg = auth/hero */
  size?: "sm" | "md" | "lg";
  /** Show the favicon ink-splash icon before the text */
  showIcon?: boolean;
  /** Tier-adaptive: shifts "Whiz" color and dot palette */
  tier?: 1 | 2 | 3;
  /** Reversed mode for dark backgrounds */
  reversed?: boolean;
}

const TIER_COLORS: Record<number, { whiz: string; dots: string[] }> = {
  1: { whiz: "#FF6B6B", dots: ["#4ECDC4", "#FFE66D", "#6C5CE7"] },
  2: { whiz: "#6C5CE7", dots: ["#FF6B6B", "#4ECDC4", "#0984E3"] },
  3: { whiz: "#2D3436", dots: ["#0984E3", "#E17055", "#636E72"] },
};

const DEFAULT_COLORS = { whiz: "#6C5CE7", dots: ["#FF6B6B", "#4ECDC4", "#0984E3"] };

const SIZE_CONFIG = {
  sm: { text: "text-lg", icon: 24, dotSizes: [5, 4, 3.5], dotGap: 2, dotOffset: 1 },
  md: { text: "text-xl", icon: 30, dotSizes: [6, 5, 4], dotGap: 2.5, dotOffset: 1 },
  lg: { text: "text-4xl", icon: 44, dotSizes: [9, 7, 5.5], dotGap: 3, dotOffset: 2 },
};

export default function WriteWhizLogo({
  size = "sm",
  showIcon = true,
  tier,
  reversed = false,
}: WriteWhizLogoProps) {
  const colors = tier ? TIER_COLORS[tier] : DEFAULT_COLORS;
  const config = SIZE_CONFIG[size];

  const writeColor = reversed ? "#FFFFFF" : "#2D3436";
  const whizColor = reversed ? "#A29BFE" : colors.whiz;
  const dotColors = reversed
    ? ["rgba(255,255,255,0.5)", "rgba(255,255,255,0.35)", "rgba(255,255,255,0.2)"]
    : colors.dots;

  const iconGap = size === "lg" ? "gap-3" : "gap-2";

  return (
    <span className={`inline-flex items-center ${iconGap}`}>
      {showIcon && (
        <img
          src="/brand/favicon.svg"
          alt=""
          width={config.icon}
          height={config.icon}
          className="flex-shrink-0"
        />
      )}
      <span className={`${config.text} tracking-tight leading-none`}>
        <span
          className="font-semibold"
          style={{ fontFamily: "'Literata', serif", color: writeColor }}
        >
          Write
        </span>
        <span
          className="font-black"
          style={{ fontFamily: "'Nunito', sans-serif", color: whizColor }}
        >
          Whiz
        </span>
        {/* Z-flourish: ink splash dots */}
        <span
          className="inline-flex items-end"
          style={{ marginLeft: `${config.dotOffset}px`, gap: `${config.dotGap}px` }}
          aria-hidden="true"
        >
          {dotColors.map((color, i) => (
            <span
              key={i}
              className="inline-block"
              style={{
                transform: `translateY(-${(i + 1) * (size === "lg" ? 3 : 1.5)}px)`,
              }}
            >
              <span
                className="block"
                style={{
                  width: config.dotSizes[i],
                  height: config.dotSizes[i],
                  backgroundColor: color,
                  borderRadius: "50% 50% 50% 50% / 40% 40% 60% 60%",
                  animation: "zDotBounce 2s ease-in-out infinite",
                  animationDelay: `${i * 0.15}s`,
                }}
              />
            </span>
          ))}
        </span>
      </span>
    </span>
  );
}
