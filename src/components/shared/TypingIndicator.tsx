"use client";

import CoachAvatar from "./CoachAvatar";

export default function TypingIndicator() {
  return (
    <div className="flex items-end gap-2 max-w-[85%] animate-fade-in">
      <CoachAvatar size="xs" />
      <div className="bg-white border border-[#e0dcd5] rounded-2xl rounded-tl-[4px] px-5 py-3.5 shadow-sm">
        <div className="flex gap-[5px]">
          {[0, 0.15, 0.3].map((delay, i) => (
            <span
              key={i}
              className="w-[7px] h-[7px] bg-active-text/30 rounded-full animate-typing-dot"
              style={{ animationDelay: `${delay}s` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
