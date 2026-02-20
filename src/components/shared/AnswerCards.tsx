"use client";

import { useState, useRef, useEffect } from "react";
import type { AnswerMeta } from "@/types";

/* ─────────────────────────────────────────────
   Shared: inline text-input escape hatch
   ───────────────────────────────────────────── */

function TypeOwnAnswerToggle({
  onSubmit,
}: {
  onSubmit: (answer: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      const t = setTimeout(() => inputRef.current?.focus(), 100);
      return () => clearTimeout(t);
    }
  }, [open]);

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

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-2 text-[0.75rem] font-semibold text-active-text/40 hover:text-active-text/60 transition-colors underline underline-offset-2 cursor-pointer"
      >
        Type my own answer
      </button>
    );
  }

  return (
    <div className="mt-3 animate-fade-in">
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        className="w-full h-[42px] px-3.5 rounded-lg border-[1.5px] border-[#e0dcd5] bg-white text-[0.95rem] text-active-text outline-none transition-all focus:border-active-accent focus:shadow-[0_0_0_3px_rgba(255,230,109,0.25)] placeholder:text-[#b2bec3]"
        placeholder="Type your answer..."
      />
      <div className="flex justify-end mt-2 items-center gap-3">
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-[0.75rem] font-semibold text-active-text/40 hover:text-active-text/60 transition-colors cursor-pointer"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!value.trim()}
          className="inline-flex items-center gap-1.5 px-5 py-2 border-none rounded-full bg-active-primary text-white font-bold text-[0.85rem] cursor-pointer transition-all shadow-sm hover:opacity-90 hover:-translate-y-px hover:shadow-md active:translate-y-0 disabled:bg-gray-300 disabled:cursor-not-allowed disabled:translate-y-0 disabled:shadow-none"
        >
          Send
        </button>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   Shared: completed-card wrapper
   ───────────────────────────────────────────── */

function CompletedCardWrapper({
  headerEmoji,
  headerLabel,
  children,
}: {
  headerEmoji: string;
  headerLabel: string;
  children: React.ReactNode;
}) {
  return (
    <div className="w-full rounded-2xl bg-[#e6f9f3] border-2 border-[#00b894] px-[18px] py-3.5 animate-fade-in">
      <div className="text-[0.72rem] font-extrabold uppercase tracking-wider text-[#00b894] mb-2 flex items-center gap-1">
        {headerEmoji} {headerLabel}
        <span className="bg-[#00b894] text-white px-2 py-0.5 rounded-[10px] text-[0.72rem] font-bold ml-1.5 normal-case tracking-normal">
          Completed
        </span>
      </div>
      {children}
      <div className="flex justify-end mt-1.5">
        <span className="text-[#00b894] text-[0.85rem] font-bold flex items-center gap-1">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            width="18"
            height="18"
          >
            <circle cx="12" cy="12" r="10" />
            <polyline points="16 9 10.5 14.5 8 12" />
          </svg>
          Done
        </span>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   Shared: active-card wrapper
   ───────────────────────────────────────────── */

function ActiveCardWrapper({
  headerEmoji,
  headerLabel,
  children,
}: {
  headerEmoji: string;
  headerLabel: string;
  children: React.ReactNode;
}) {
  return (
    <div className="w-full rounded-2xl bg-gradient-to-br from-active-accent/10 to-active-accent/5 border-2 border-dashed border-active-accent px-[18px] py-3.5 animate-fade-in animate-pulse-border">
      <div className="text-[0.82rem] font-extrabold uppercase tracking-wider text-[#c5a31d] mb-2 flex items-center gap-1">
        {headerEmoji} {headerLabel}
      </div>
      {children}
    </div>
  );
}

/* ═════════════════════════════════════════════
   1. CHOICE — Single choice buttons
   ═════════════════════════════════════════════ */

export function ChoiceCardActive({
  options,
  onSubmit,
  prompt,
}: {
  options: string[];
  onSubmit: (answer: string) => void;
  prompt?: string;
}) {
  const [tapped, setTapped] = useState<string | null>(null);

  const handleTap = (option: string) => {
    setTapped(option);
    // Brief highlight before submitting
    setTimeout(() => onSubmit(option), 180);
  };

  const gridCols = options.length <= 2 ? "grid-cols-1" : "grid-cols-2";

  return (
    <ActiveCardWrapper headerEmoji="👆" headerLabel={prompt || "Pick one"}>
      <div className={`grid ${gridCols} gap-2`}>
        {options.map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => handleTap(option)}
            disabled={tapped !== null}
            className={`rounded-xl border-2 px-4 py-3 font-bold text-[0.95rem] text-left transition-all cursor-pointer
              ${
                tapped === option
                  ? "bg-active-primary text-white border-active-primary scale-[0.97]"
                  : "bg-white border-active-primary/10 text-active-text hover:border-active-primary/40 hover:bg-active-primary/5 active:bg-active-primary active:text-white active:border-active-primary"
              }
              disabled:cursor-default`}
          >
            {option}
          </button>
        ))}
      </div>
      <TypeOwnAnswerToggle onSubmit={onSubmit} />
    </ActiveCardWrapper>
  );
}

export function ChoiceCardCompleted({
  options,
  answer,
}: {
  options: string[];
  answer: string;
}) {
  return (
    <CompletedCardWrapper headerEmoji="👆" headerLabel="Your answer">
      <div className="flex flex-col gap-1.5">
        {options.map((option) => {
          const isSelected = option === answer;
          return (
            <div
              key={option}
              className={`rounded-xl border-2 px-4 py-2.5 text-[0.95rem] flex items-center gap-2 transition-colors
                ${
                  isSelected
                    ? "bg-[#00b894]/10 border-[#00b894] text-active-text font-bold"
                    : "bg-white/50 border-gray-200 text-active-text/40"
                }`}
            >
              {isSelected && (
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#00b894"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  width="18"
                  height="18"
                  className="shrink-0"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              )}
              {option}
            </div>
          );
        })}
      </div>
    </CompletedCardWrapper>
  );
}

/* ═════════════════════════════════════════════
   2. MULTISELECT — Multiple selection with checkboxes
   ═════════════════════════════════════════════ */

export function MultiSelectCardActive({
  options,
  onSubmit,
  prompt,
}: {
  options: string[];
  onSubmit: (answer: string) => void;
  prompt?: string;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const toggle = (option: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(option)) {
        next.delete(option);
      } else {
        next.add(option);
      }
      return next;
    });
  };

  const handleDone = () => {
    // Preserve original option order in the joined string
    const ordered = options.filter((o) => selected.has(o));
    onSubmit(ordered.join(", "));
  };

  const gridCols = options.length <= 2 ? "grid-cols-1" : "grid-cols-2";

  return (
    <ActiveCardWrapper headerEmoji="✅" headerLabel={prompt || "Select all that apply"}>
      <div className={`grid ${gridCols} gap-2`}>
        {options.map((option) => {
          const isSelected = selected.has(option);
          return (
            <button
              key={option}
              type="button"
              onClick={() => toggle(option)}
              className={`rounded-xl border-2 px-4 py-3 font-bold text-[0.95rem] text-left transition-all cursor-pointer flex items-center gap-2.5
                ${
                  isSelected
                    ? "bg-active-primary/10 border-active-primary text-active-text"
                    : "bg-white border-active-primary/10 text-active-text hover:border-active-primary/40 hover:bg-active-primary/5"
                }`}
            >
              {/* Checkbox indicator */}
              <span
                className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all
                  ${
                    isSelected
                      ? "bg-active-primary border-active-primary"
                      : "border-gray-300 bg-white"
                  }`}
              >
                {isSelected && (
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="white"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    width="12"
                    height="12"
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                )}
              </span>
              {option}
            </button>
          );
        })}
      </div>

      {selected.size > 0 && (
        <div className="flex justify-end mt-3 animate-fade-in">
          <button
            type="button"
            onClick={handleDone}
            className="inline-flex items-center gap-1.5 px-7 py-2.5 border-none rounded-full bg-active-primary text-white font-bold text-[0.92rem] cursor-pointer transition-all shadow-sm hover:opacity-90 hover:-translate-y-px hover:shadow-md active:translate-y-0"
          >
            Done ✓
          </button>
        </div>
      )}

      <TypeOwnAnswerToggle onSubmit={onSubmit} />
    </ActiveCardWrapper>
  );
}

export function MultiSelectCardCompleted({
  options,
  answer,
}: {
  options: string[];
  answer: string;
}) {
  const selectedSet = new Set(answer.split(", ").map((s) => s.trim()));

  return (
    <CompletedCardWrapper headerEmoji="✅" headerLabel="Your answer">
      <div className="flex flex-col gap-1.5">
        {options.map((option) => {
          const isSelected = selectedSet.has(option);
          return (
            <div
              key={option}
              className={`rounded-xl border-2 px-4 py-2.5 text-[0.95rem] flex items-center gap-2 transition-colors
                ${
                  isSelected
                    ? "bg-[#00b894]/10 border-[#00b894] text-active-text font-bold"
                    : "bg-white/50 border-gray-200 text-active-text/40"
                }`}
            >
              <span
                className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0
                  ${
                    isSelected
                      ? "bg-[#00b894] border-[#00b894]"
                      : "border-gray-300 bg-white"
                  }`}
              >
                {isSelected && (
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="white"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    width="12"
                    height="12"
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                )}
              </span>
              {option}
            </div>
          );
        })}
      </div>
    </CompletedCardWrapper>
  );
}

/* ═════════════════════════════════════════════
   3. POLL — Opinion / confidence poll
   ═════════════════════════════════════════════ */

function splitEmojiFromLabel(text: string): { emoji: string; label: string } {
  // Match a leading emoji (including compound emojis with ZWJ, skin-tone modifiers, etc.)
  const emojiRegex = /^(\p{Emoji_Presentation}|\p{Emoji}\uFE0F)(\u200D(\p{Emoji_Presentation}|\p{Emoji}\uFE0F))*/u;
  const match = text.match(emojiRegex);
  if (match) {
    return {
      emoji: match[0],
      label: text.slice(match[0].length).trim(),
    };
  }
  // Fallback: no emoji found
  return { emoji: "", label: text };
}

export function PollCardActive({
  options,
  onSubmit,
  prompt,
}: {
  options: string[];
  onSubmit: (answer: string) => void;
  prompt?: string;
}) {
  const [tapped, setTapped] = useState<string | null>(null);

  const handleTap = (option: string) => {
    setTapped(option);
    setTimeout(() => onSubmit(option), 180);
  };

  const gridCols = options.length === 4 ? "grid-cols-2" : options.length <= 2 ? "grid-cols-1" : `grid-cols-${options.length}`;

  return (
    <div className="w-full rounded-2xl bg-gradient-to-br from-active-accent/5 to-transparent px-[18px] py-3.5 animate-fade-in">
      <div className="text-[0.82rem] font-extrabold uppercase tracking-wider text-active-text/50 mb-2 flex items-center gap-1">
        💭 {prompt || "What do you think?"}
      </div>
      <div className={`grid ${gridCols} gap-2`}>
        {options.map((option) => {
          const { emoji, label } = splitEmojiFromLabel(option);
          const isActive = tapped === option;
          return (
            <button
              key={option}
              type="button"
              onClick={() => handleTap(option)}
              disabled={tapped !== null}
              className={`rounded-2xl px-3 py-4 flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer
                ${
                  isActive
                    ? "bg-active-primary/15 scale-[0.97]"
                    : "bg-white/60 hover:bg-active-accent/10 active:bg-active-primary/15"
                }
                disabled:cursor-default`}
            >
              {emoji && (
                <span className="text-[1.8rem] leading-none">{emoji}</span>
              )}
              <span className="text-[0.82rem] font-semibold text-active-text/70 text-center leading-tight">
                {label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function PollCardCompleted({
  options,
  answer,
}: {
  options: string[];
  answer: string;
}) {
  return (
    <div className="w-full rounded-2xl bg-[#f0eeff] border-2 border-[#6C5CE7]/30 px-[18px] py-3.5 animate-fade-in">
      <div className="text-[0.72rem] font-extrabold uppercase tracking-wider text-[#6C5CE7] mb-2 flex items-center gap-1">
        💭 Your response
        <span className="bg-[#6C5CE7] text-white px-2 py-0.5 rounded-[10px] text-[0.72rem] font-bold ml-1.5 normal-case tracking-normal">
          Shared
        </span>
      </div>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => {
          const { emoji, label } = splitEmojiFromLabel(option);
          const isSelected = option === answer;
          return (
            <div
              key={option}
              className={`rounded-2xl px-3 py-3 flex flex-col items-center justify-center gap-1 transition-colors min-w-[70px]
                ${
                  isSelected
                    ? "bg-[#6C5CE7]/10 ring-2 ring-[#6C5CE7]/40"
                    : "bg-white/40 opacity-40"
                }`}
            >
              {emoji && (
                <span className="text-[1.5rem] leading-none">{emoji}</span>
              )}
              <span className="text-[0.78rem] font-semibold text-active-text/70 text-center leading-tight">
                {label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ═════════════════════════════════════════════
   4. ORDER — Tap to sequence
   ═════════════════════════════════════════════ */

export function OrderCardActive({
  options,
  onSubmit,
  prompt,
}: {
  options: string[];
  onSubmit: (answer: string) => void;
  prompt?: string;
}) {
  // Track the ordered sequence as an array of option strings
  const [sequence, setSequence] = useState<string[]>([]);

  const handleTap = (option: string) => {
    setSequence((prev) => {
      if (prev.includes(option)) {
        // Remove this item and all items after it (renumber)
        return prev.filter((o) => o !== option);
      } else {
        return [...prev, option];
      }
    });
  };

  const getNumber = (option: string): number | null => {
    const idx = sequence.indexOf(option);
    return idx >= 0 ? idx + 1 : null;
  };

  const allNumbered = sequence.length === options.length;

  const handleDone = () => {
    onSubmit(sequence.join(", "));
  };

  return (
    <ActiveCardWrapper headerEmoji="📝" headerLabel={prompt || "Put in order"}>
      <div className="flex flex-col gap-2">
        {options.map((option) => {
          const num = getNumber(option);
          const isNumbered = num !== null;
          return (
            <button
              key={option}
              type="button"
              onClick={() => handleTap(option)}
              className={`rounded-xl border-2 px-4 py-3 font-bold text-[0.95rem] text-left transition-all cursor-pointer flex items-center gap-3 relative
                ${
                  isNumbered
                    ? "bg-active-primary/10 border-active-primary text-active-text"
                    : "bg-white border-active-primary/10 text-active-text hover:border-active-primary/40 hover:bg-active-primary/5"
                }`}
            >
              {/* Number badge */}
              <span
                className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-[0.8rem] font-extrabold transition-all
                  ${
                    isNumbered
                      ? "bg-active-primary text-white"
                      : "bg-gray-100 text-gray-400 border border-gray-200"
                  }`}
              >
                {isNumbered ? num : "?"}
              </span>
              {option}
            </button>
          );
        })}
      </div>

      {allNumbered && (
        <div className="flex justify-end mt-3 animate-fade-in">
          <button
            type="button"
            onClick={handleDone}
            className="inline-flex items-center gap-1.5 px-7 py-2.5 border-none rounded-full bg-active-primary text-white font-bold text-[0.92rem] cursor-pointer transition-all shadow-sm hover:opacity-90 hover:-translate-y-px hover:shadow-md active:translate-y-0"
          >
            Done ✓
          </button>
        </div>
      )}

      <TypeOwnAnswerToggle onSubmit={onSubmit} />
    </ActiveCardWrapper>
  );
}

export function OrderCardCompleted({
  options,
  answer,
}: {
  options: string[];
  answer: string;
}) {
  // Show items in the submitted order
  const orderedItems = answer.split(", ").map((s) => s.trim());
  // Suppress unused variable lint — options kept in props for API consistency
  void options;

  return (
    <CompletedCardWrapper headerEmoji="📝" headerLabel="Your answer">
      <div className="flex flex-col gap-1.5">
        {orderedItems.map((item, idx) => (
          <div
            key={item}
            className="rounded-xl border-2 border-[#00b894] bg-[#00b894]/5 px-4 py-2.5 text-[0.95rem] flex items-center gap-3 text-active-text font-bold"
          >
            <span className="w-7 h-7 rounded-full bg-[#00b894] text-white flex items-center justify-center shrink-0 text-[0.8rem] font-extrabold">
              {idx + 1}
            </span>
            {item}
          </div>
        ))}
      </div>
    </CompletedCardWrapper>
  );
}

/* ═════════════════════════════════════════════
   5. HIGHLIGHT — Tap words in passage
   ═════════════════════════════════════════════ */

export function HighlightCardActive({
  passage,
  onSubmit,
  prompt,
}: {
  passage: string;
  onSubmit: (answer: string) => void;
  prompt?: string;
}) {
  const words = passage.split(/\s+/);
  const [selected, setSelected] = useState<Set<number>>(new Set());

  const toggle = (idx: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) {
        next.delete(idx);
      } else {
        next.add(idx);
      }
      return next;
    });
  };

  const handleDone = () => {
    // Collect selected words in passage order
    const selectedWords = words.filter((_, i) => selected.has(i));
    onSubmit(selectedWords.join(", "));
  };

  return (
    <ActiveCardWrapper headerEmoji="🔍" headerLabel={prompt || "Tap the words"}>
      <div className="flex flex-wrap gap-1.5 leading-relaxed">
        {words.map((word, idx) => {
          const isSelected = selected.has(idx);
          return (
            <button
              key={idx}
              type="button"
              onClick={() => toggle(idx)}
              className={`rounded-lg px-2 py-1 text-[0.95rem] font-medium transition-all cursor-pointer border
                ${
                  isSelected
                    ? "bg-active-primary text-white border-active-primary"
                    : "bg-white border-transparent text-active-text hover:bg-active-primary/10 hover:border-active-primary/20"
                }`}
            >
              {word}
            </button>
          );
        })}
      </div>

      {selected.size > 0 && (
        <div className="flex justify-end mt-3 animate-fade-in">
          <button
            type="button"
            onClick={handleDone}
            className="inline-flex items-center gap-1.5 px-7 py-2.5 border-none rounded-full bg-active-primary text-white font-bold text-[0.92rem] cursor-pointer transition-all shadow-sm hover:opacity-90 hover:-translate-y-px hover:shadow-md active:translate-y-0"
          >
            Done ✓
          </button>
        </div>
      )}

      <TypeOwnAnswerToggle onSubmit={onSubmit} />
    </ActiveCardWrapper>
  );
}

export function HighlightCardCompleted({
  passage,
  answer,
}: {
  passage: string;
  answer: string;
}) {
  const words = passage.split(/\s+/);
  const selectedSet = new Set(answer.split(", ").map((s) => s.trim()));

  return (
    <CompletedCardWrapper headerEmoji="🔍" headerLabel="Your answer">
      <div className="flex flex-wrap gap-1.5 leading-relaxed">
        {words.map((word, idx) => {
          // Strip punctuation for comparison, but display with punctuation
          const bare = word.replace(/[.,!?;:'"()[\]{}]/g, "");
          const isSelected = selectedSet.has(word) || selectedSet.has(bare);
          return (
            <span
              key={idx}
              className={`rounded-lg px-2 py-1 text-[0.95rem] font-medium
                ${
                  isSelected
                    ? "bg-[#00b894]/15 text-[#00b894] font-bold"
                    : "text-active-text/60"
                }`}
            >
              {word}
            </span>
          );
        })}
      </div>
    </CompletedCardWrapper>
  );
}

/* ═════════════════════════════════════════════
   Dispatcher components
   ═════════════════════════════════════════════ */

export function AnswerCardActive({
  answerMeta,
  onSubmit,
}: {
  answerMeta: AnswerMeta;
  onSubmit: (answer: string) => void;
}) {
  switch (answerMeta.answerType) {
    case "choice":
      return (
        <ChoiceCardActive
          options={answerMeta.options ?? []}
          onSubmit={onSubmit}
          prompt={answerMeta.prompt}
        />
      );
    case "multiselect":
      return (
        <MultiSelectCardActive
          options={answerMeta.options ?? []}
          onSubmit={onSubmit}
          prompt={answerMeta.prompt}
        />
      );
    case "poll":
      return (
        <PollCardActive
          options={answerMeta.options ?? []}
          onSubmit={onSubmit}
          prompt={answerMeta.prompt}
        />
      );
    case "order":
      return (
        <OrderCardActive
          options={answerMeta.options ?? []}
          onSubmit={onSubmit}
          prompt={answerMeta.prompt}
        />
      );
    case "highlight":
      return (
        <HighlightCardActive
          passage={answerMeta.passage ?? ""}
          onSubmit={onSubmit}
          prompt={answerMeta.prompt}
        />
      );
    case "text":
    default:
      // The caller handles text input separately
      return null;
  }
}

export function AnswerCardCompleted({
  answerMeta,
  answer,
}: {
  answerMeta: AnswerMeta;
  answer: string;
}) {
  switch (answerMeta.answerType) {
    case "choice":
      return (
        <ChoiceCardCompleted
          options={answerMeta.options ?? []}
          answer={answer}
        />
      );
    case "multiselect":
      return (
        <MultiSelectCardCompleted
          options={answerMeta.options ?? []}
          answer={answer}
        />
      );
    case "poll":
      return (
        <PollCardCompleted
          options={answerMeta.options ?? []}
          answer={answer}
        />
      );
    case "order":
      return (
        <OrderCardCompleted
          options={answerMeta.options ?? []}
          answer={answer}
        />
      );
    case "highlight":
      return (
        <HighlightCardCompleted
          passage={answerMeta.passage ?? ""}
          answer={answer}
        />
      );
    case "text":
    default:
      // The caller handles text display separately
      return null;
  }
}
