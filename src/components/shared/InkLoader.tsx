"use client";

/**
 * InkLoader — "Ink in Motion" branded loading indicator.
 *
 * Renders an ink drop that falls, splashes, and scatters colored droplets.
 * Replaces generic "Loading..." text across the app.
 */

interface InkLoaderProps {
  /** Optional message displayed below the animation */
  message?: string;
  /** Size of the animation (sm for inline, md for page-level) */
  size?: "sm" | "md";
}

export default function InkLoader({ message, size = "md" }: InkLoaderProps) {
  const isMd = size === "md";
  const dropSize = isMd ? 14 : 8;
  const containerSize = isMd ? 48 : 28;

  return (
    <div className="flex flex-col items-center gap-3">
      <div
        className="relative"
        style={{ width: containerSize, height: containerSize }}
        aria-hidden="true"
      >
        {/* Falling ink drop */}
        <div
          className="absolute left-1/2 animate-ink-drop"
          style={{
            width: dropSize,
            height: dropSize * 1.25,
            marginLeft: -dropSize / 2,
            top: 0,
            background: "var(--color-active-primary)",
            borderRadius: "50% 50% 50% 50% / 35% 35% 65% 65%",
          }}
        />

        {/* Splash ring */}
        <div
          className="absolute bottom-0 left-1/2 animate-ink-splash-ring"
          style={{
            width: dropSize * 0.8,
            height: dropSize * 0.35,
            marginLeft: -(dropSize * 0.4),
            borderRadius: "50%",
            border: "1.5px solid var(--color-active-primary)",
            opacity: 0,
          }}
        />

        {/* Scatter dots (coral, teal, blue — brand colors) */}
        {[
          { color: "#FF6B6B", dx: "-8px", dy: "-6px", delay: "0.5s", s: isMd ? 4 : 2.5 },
          { color: "#4ECDC4", dx: "9px", dy: "-8px", delay: "0.55s", s: isMd ? 3.5 : 2 },
          { color: "#0984E3", dx: "-5px", dy: "-10px", delay: "0.6s", s: isMd ? 3 : 2 },
        ].map((dot, i) => (
          <span
            key={i}
            className="absolute rounded-full"
            style={{
              width: dot.s,
              height: dot.s,
              bottom: isMd ? 8 : 4,
              left: "50%",
              marginLeft: -dot.s / 2,
              backgroundColor: dot.color,
              opacity: 0,
              "--dx": dot.dx,
              "--dy": dot.dy,
              animation: `inkSplashDot 1.6s cubic-bezier(0.22, 1, 0.36, 1) ${dot.delay} infinite`,
            } as React.CSSProperties}
          />
        ))}
      </div>

      {message && (
        <p className={`font-semibold text-active-text/50 ${isMd ? "text-sm" : "text-xs"}`}>
          {message}
        </p>
      )}
    </div>
  );
}
