"use client";

import { useState, useRef, useEffect } from "react";

export function QuickAnswerCardCompleted({ answer }: { answer: string }) {
  return (
    <div className="w-full rounded-2xl bg-[#e6f9f3] border-2 border-[#00b894] px-[18px] py-3.5 animate-fade-in">
      <div className="text-[0.72rem] font-extrabold uppercase tracking-wider text-[#00b894] mb-1 flex items-center gap-1">
        💬 Your answer
        <span className="bg-[#00b894] text-white px-2 py-0.5 rounded-[10px] text-[0.72rem] font-bold ml-1.5 normal-case tracking-normal">
          Completed
        </span>
      </div>
      <div className="text-active-text font-semibold text-[0.95rem] leading-relaxed">{answer}</div>
      <div className="flex justify-end mt-1.5">
        <span className="text-[#00b894] text-[0.85rem] font-bold flex items-center gap-1">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
            <circle cx="12" cy="12" r="10" />
            <polyline points="16 9 10.5 14.5 8 12" />
          </svg>
          Done
        </span>
      </div>
    </div>
  );
}

export function QuickAnswerCardActive({
  onSubmit,
}: {
  onSubmit: (answer: string) => void;
}) {
  const [value, setValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => inputRef.current?.focus(), 100);
    return () => clearTimeout(timer);
  }, []);

  const handleSubmit = () => {
    const trimmed = value.trim();
    if (!trimmed) return;
    onSubmit(trimmed);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="w-full rounded-2xl bg-gradient-to-br from-active-accent/10 to-active-accent/5 border-2 border-dashed border-active-accent px-[18px] py-3.5 animate-fade-in animate-pulse-border">
      <div className="text-[0.82rem] font-extrabold uppercase tracking-wider text-[#c5a31d] mb-2 flex items-center gap-1">
        💬 Your answer
      </div>
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        className="w-full h-[42px] px-3.5 rounded-lg border-[1.5px] border-[#e0dcd5] bg-white text-[0.95rem] text-active-text outline-none transition-all focus:border-active-accent focus:shadow-[0_0_0_3px_rgba(255,230,109,0.25)] placeholder:text-[#b2bec3]"
        placeholder="Type your answer..."
      />
      <div className="flex justify-end mt-3 items-center gap-3">
        <span className="text-[0.75rem] font-semibold text-active-text/40">
          {value.length} characters
        </span>
        <button
          onClick={handleSubmit}
          disabled={!value.trim()}
          className="inline-flex items-center gap-1.5 px-7 py-2.5 border-none rounded-full bg-active-primary text-white font-bold text-[0.92rem] cursor-pointer transition-all shadow-sm hover:bg-[#e85d5d] hover:-translate-y-px hover:shadow-md active:translate-y-0 disabled:bg-gray-300 disabled:cursor-not-allowed disabled:translate-y-0 disabled:shadow-none"
        >
          Done ✓
        </button>
      </div>
    </div>
  );
}
