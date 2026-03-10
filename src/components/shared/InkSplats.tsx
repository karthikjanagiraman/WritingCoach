"use client";

interface InkSplatsProps {
  /** Number of blobs (2-5) */
  count?: number;
  /** Opacity range */
  opacity?: number;
  /** Colors to use (defaults to brand palette) */
  colors?: string[];
}

const DEFAULT_COLORS = [
  "var(--color-active-primary)",
  "var(--color-active-secondary)",
  "#FF6B6B",
];

const BLOB_SHAPES = [
  "40% 60% 55% 45% / 50% 40% 60% 50%",
  "55% 45% 40% 60% / 45% 55% 50% 50%",
  "45% 55% 50% 50% / 60% 40% 55% 45%",
  "50% 50% 45% 55% / 40% 60% 50% 50%",
  "60% 40% 50% 50% / 55% 45% 40% 60%",
];

const BLOB_POSITIONS: { className: string; size: string }[] = [
  { className: "absolute -top-6 -right-6", size: "w-20 h-20" },
  { className: "absolute -bottom-4 -left-4", size: "w-14 h-14" },
  { className: "absolute top-8 left-6", size: "w-4 h-4" },
  { className: "absolute -bottom-6 right-10", size: "w-10 h-10" },
  { className: "absolute top-4 -right-3", size: "w-6 h-6" },
];

const BLOB_OPACITIES = [0.06, 0.05, 0.08, 0.04, 0.06];
const BLOB_DELAYS = [0, 1.5, 0, 2, 1];

export default function InkSplats({
  count = 3,
  opacity,
  colors = DEFAULT_COLORS,
}: InkSplatsProps) {
  const blobCount = Math.max(2, Math.min(5, count));

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      {Array.from({ length: blobCount }).map((_, i) => {
        const pos = BLOB_POSITIONS[i % BLOB_POSITIONS.length];
        const baseOpacity = opacity ?? BLOB_OPACITIES[i % BLOB_OPACITIES.length];
        const delay = BLOB_DELAYS[i % BLOB_DELAYS.length];
        const color = colors[i % colors.length];
        const shape = BLOB_SHAPES[i % BLOB_SHAPES.length];
        // Only the larger blobs (first two) get the pulse animation
        const animated = i < 2;

        return (
          <div
            key={i}
            className={`${pos.className} ${pos.size} ${animated ? "animate-ink-blob-pulse" : ""}`}
            style={{
              background: color,
              borderRadius: shape,
              opacity: baseOpacity,
              ...(delay > 0 ? { animationDelay: `${delay}s` } : {}),
            }}
          />
        );
      })}
    </div>
  );
}
