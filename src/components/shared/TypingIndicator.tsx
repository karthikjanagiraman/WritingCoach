"use client";

import CoachAvatar from "./CoachAvatar";

/**
 * TypingIndicator — "Ink in Motion" variant.
 *
 * Three ink-drop shaped dots with staggered drip animation
 * in brand accent colors (coral, teal, blue).
 */

const INK_DOTS = [
  { color: "#FF6B6B", delay: 0 },
  { color: "#4ECDC4", delay: 0.18 },
  { color: "#0984E3", delay: 0.36 },
];

export default function TypingIndicator() {
  return (
    <div data-testid="typing-indicator" className="flex items-end gap-2 max-w-[85%] animate-fade-in">
      <CoachAvatar size="xs" />
      <div className="bg-white border border-[#e0dcd5] rounded-2xl rounded-tl-[4px] px-5 py-3.5 shadow-sm">
        <div className="flex gap-[6px] items-end">
          {INK_DOTS.map((dot, i) => (
            <span
              key={i}
              className="inline-block animate-ink-typing"
              style={{
                width: 7,
                height: 9,
                backgroundColor: dot.color,
                borderRadius: "50% 50% 50% 50% / 35% 35% 65% 65%",
                animationDelay: `${dot.delay}s`,
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
