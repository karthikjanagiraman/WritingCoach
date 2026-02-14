"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import type { Message } from "@/types";
import { useTier } from "@/contexts/TierContext";
import { ChatBubble, CoachAvatar, TypingIndicator, QuickAnswerCardActive, QuickAnswerCardCompleted } from "./shared";

// ─── Types ───────────────────────────────────────────────────────────────────

interface GuidedPracticePhaseProps {
  onComplete: () => void;
  messages?: Message[];
  onSendMessage?: (text: string) => Promise<Message | null>;
}

type InteractionState = "WAITING_FOR_COACH" | "ANSWER_ACTIVE" | "WRITING_ACTIVE" | "CONTINUE_ACTIVE";

type ChatItem =
  | { type: "coach"; id: string; message: Message; writingPrompt: string | null }
  | { type: "quick-answer"; id: string; answer: string; completed: boolean }
  | { type: "writing-response"; id: string; prompt: string; answer: string; completed: boolean };

// ─── Helpers ─────────────────────────────────────────────────────────────────

function parseWritingPrompt(content: string): {
  text: string;
  writingPrompt: string | null;
} {
  const match = content.match(/\[WRITING_PROMPT:\s*"([^"]+)"\]/);
  if (match) {
    return {
      text: content.replace(match[0], "").trim(),
      writingPrompt: match[1],
    };
  }
  return { text: content, writingPrompt: null };
}

function parseExpectsResponse(content: string): {
  text: string;
  expectsResponse: boolean;
} {
  const marker = /\[EXPECTS_RESPONSE\]\s*/gi;
  if (marker.test(content)) {
    return { text: content.replace(/\[EXPECTS_RESPONSE\]\s*/gi, "").trim(), expectsResponse: true };
  }
  return { text: content, expectsResponse: false };
}

function generateId(): string {
  return `item-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

// ─── Fallback data ───────────────────────────────────────────────────────────

const INITIAL_COACH_MESSAGE: Message = {
  id: "1",
  role: "coach",
  content:
    "Now it's time to practice! Let's work on writing a story beginning together. I'll help you along the way. First, think of a character for your story. Who will your story be about?",
  timestamp: new Date().toISOString(),
};

const fallbackResponses = [
  "That's a great idea! Now let's think about where your story takes place. What does your character see around them?",
  'Wonderful! You\'re building a really interesting setting. Let\'s practice writing it:\n\n[WRITING_PROMPT: "Write 1-2 sentences describing the setting. Use at least two senses."]',
  "I love how creative you're being! Now let's hook the reader:\n\n[WRITING_PROMPT: \"Write an opening line that makes the reader curious about what happens next.\"]",
  "Amazing work! You've practiced all the key elements. You're ready to write your full story beginning!",
];

// Escape hatch: show "I'm ready to write" after this many completed exchanges
const ESCAPE_HATCH_EXCHANGES = 5;

// ─── Sub-components ──────────────────────────────────────────────────────────

function WritingCardCompleted({
  prompt,
  answer,
}: {
  prompt: string;
  answer: string;
}) {
  return (
    <div className="w-full rounded-2xl bg-[#e6f9f3] border-2 border-[#00b894] p-5 animate-fade-in">
      <div className="text-[0.82rem] font-extrabold uppercase tracking-wider text-[#00b894] mb-2 flex items-center gap-1">
        ✏️ Your turn to write!
        <span className="bg-[#00b894] text-white px-2 py-0.5 rounded-[10px] text-[0.72rem] font-bold ml-1.5 normal-case tracking-normal">
          Completed
        </span>
      </div>
      <div className="text-active-text font-semibold text-[0.95rem] leading-relaxed mb-3.5">
        {prompt}
      </div>
      <textarea
        readOnly
        className="w-full writing-area writing-lined min-h-[80px] px-3.5 py-3 rounded-lg border-[1.5px] border-[#00b894] bg-[#f0faf5] text-[0.95rem] leading-[30px] text-active-text resize-vertical outline-none cursor-default"
        value={answer}
      />
      <div className="flex justify-end mt-3">
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

function WritingCardActive({
  prompt,
  onSubmit,
}: {
  prompt: string;
  onSubmit: (answer: string) => void;
}) {
  const [value, setValue] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => textareaRef.current?.focus(), 100);
    return () => clearTimeout(timer);
  }, []);

  const handleSubmit = () => {
    const trimmed = value.trim();
    if (!trimmed) return;
    onSubmit(trimmed);
  };

  return (
    <div className="w-full rounded-2xl bg-gradient-to-br from-active-accent/10 to-active-accent/5 border-2 border-dashed border-active-accent p-5 animate-fade-in animate-pulse-border">
      <div className="text-[0.82rem] font-extrabold uppercase tracking-wider text-[#c5a31d] mb-2 flex items-center gap-1">
        ✏️ Your turn to write!
      </div>
      <div className="text-active-text font-semibold text-[0.95rem] leading-relaxed mb-3.5">
        {prompt}
      </div>
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="w-full writing-area writing-lined min-h-[100px] px-3.5 py-3 rounded-lg border-[1.5px] border-[#e0dcd5] bg-white text-[0.95rem] leading-[30px] text-active-text resize-vertical outline-none transition-all focus:border-active-accent focus:shadow-[0_0_0_3px_rgba(255,230,109,0.25)] placeholder:text-[#b2bec3] placeholder:italic placeholder:font-[Literata,serif]"
        placeholder="Start writing here..."
      />
      <div className="flex items-center justify-between mt-3">
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

function LockedCard() {
  return (
    <div className="w-full rounded-2xl bg-[#f5f3ef] border-2 border-dashed border-[#d5d0c8] opacity-70 p-5 animate-fade-in">
      <div className="text-center py-3 text-active-text/50 font-semibold text-[0.9rem]">
        <span className="text-[1.3rem] block mb-1">&#x1F512;</span>
        One more writing challenge coming up!
      </div>
    </div>
  );
}

function BottomProgressBar({ writingsDone, practiceComplete }: { writingsDone: number; practiceComplete: boolean }) {
  const total = 3;
  const pct = practiceComplete ? 100 : Math.min((writingsDone / total) * 100, 100);

  return (
    <div className="fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-[#e0dcd5] shadow-[0_-2px_12px_rgba(0,0,0,0.05)]">
      <div className="max-w-[640px] mx-auto px-4 py-3">
        <div className="flex items-center justify-center gap-1.5 text-[0.78rem] font-bold text-active-text/50">
          <span>&#x270F;&#xFE0F;</span>
          <span>
            {practiceComplete
              ? "Practice complete!"
              : `${writingsDone} of ${total} writing challenges done`}
          </span>
          <div className="flex-1 max-w-[140px] h-1.5 bg-[#eae6df] rounded-full overflow-hidden">
            <div
              className="h-full bg-active-primary rounded-full transition-all duration-500"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function GuidedPracticePhase({
  onComplete,
  messages: externalMessages,
  onSendMessage,
}: GuidedPracticePhaseProps) {
  const router = useRouter();
  const { coachName } = useTier();
  const [chatItems, setChatItems] = useState<ChatItem[]>([]);
  const [interactionState, setInteractionState] = useState<InteractionState>("WAITING_FOR_COACH");
  const [isTyping, setIsTyping] = useState(false);
  const [isLoadingFirstQuestion, setIsLoadingFirstQuestion] = useState(false);
  const [fallbackIndex, setFallbackIndex] = useState(0);

  const scrollEndRef = useRef<HTMLDivElement>(null);
  const initializedRef = useRef(false);
  const needsAutoFetch = useRef(false);

  // ─── Derived counts ──────────────────────────────────────────────────────

  const writingsDone = chatItems.filter(
    (item) => item.type === "writing-response" && item.completed
  ).length;

  const totalExchanges = chatItems.filter(
    (item) =>
      (item.type === "quick-answer" && item.completed) ||
      (item.type === "writing-response" && item.completed)
  ).length;

  // ─── Auto-scroll ─────────────────────────────────────────────────────────

  useEffect(() => {
    scrollEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatItems, isTyping]);

  // ─── Process a coach message into chat items ─────────────────────────────

  const addCoachMessage = useCallback(
    (msg: Message): { writingPrompt: string | null } => {
      const { text: textAfterWriting, writingPrompt } = parseWritingPrompt(msg.content);
      const { text, expectsResponse } = parseExpectsResponse(textAfterWriting);

      const cleanMessage: Message = { ...msg, content: text };

      const coachItem: ChatItem = {
        type: "coach",
        id: generateId(),
        message: cleanMessage,
        writingPrompt,
      };

      setChatItems((prev) => [...prev, coachItem]);

      if (writingPrompt) {
        const writingItem: ChatItem = {
          type: "writing-response",
          id: generateId(),
          prompt: writingPrompt,
          answer: "",
          completed: false,
        };
        setChatItems((prev) => [...prev, writingItem]);
        setInteractionState("WRITING_ACTIVE");
      } else if (expectsResponse) {
        // Coach asked a question — show QuickAnswerCard
        const answerItem: ChatItem = {
          type: "quick-answer",
          id: generateId(),
          answer: "",
          completed: false,
        };
        setChatItems((prev) => [...prev, answerItem]);
        setInteractionState("ANSWER_ACTIVE");
      } else {
        // Statement with no question — show Continue button
        setInteractionState("CONTINUE_ACTIVE");
      }

      return { writingPrompt };
    },
    []
  );

  // ─── Initialize from external messages or fallback ───────────────────────

  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    const sourceMessages =
      externalMessages && externalMessages.length > 0
        ? externalMessages
        : [INITIAL_COACH_MESSAGE];

    const items: ChatItem[] = [];
    let lastCoachWritingPrompt: string | null = null;

    for (let i = 0; i < sourceMessages.length; i++) {
      const msg = sourceMessages[i];

      if (msg.role === "coach") {
        const { text: textAfterWriting, writingPrompt } = parseWritingPrompt(msg.content);
        const { text } = parseExpectsResponse(textAfterWriting);
        const cleanMessage: Message = { ...msg, content: text };
        items.push({
          type: "coach",
          id: generateId(),
          message: cleanMessage,
          writingPrompt,
        });
        lastCoachWritingPrompt = writingPrompt;
      } else if (msg.role === "student") {
        if (lastCoachWritingPrompt) {
          items.push({
            type: "writing-response",
            id: generateId(),
            prompt: lastCoachWritingPrompt,
            answer: msg.content,
            completed: true,
          });
          lastCoachWritingPrompt = null;
        } else {
          items.push({
            type: "quick-answer",
            id: generateId(),
            answer: msg.content,
            completed: true,
          });
        }
      }
    }

    const lastMsg = sourceMessages[sourceMessages.length - 1];
    if (lastMsg.role === "coach") {
      const lastCoachItem = items[items.length - 1];
      if (lastCoachItem.type === "coach" && lastCoachItem.writingPrompt) {
        items.push({
          type: "writing-response",
          id: generateId(),
          prompt: lastCoachItem.writingPrompt,
          answer: "",
          completed: false,
        });
        setInteractionState("WRITING_ACTIVE");
      } else {
        // Check if the last coach message has an [EXPECTS_RESPONSE] marker
        const { expectsResponse } = parseExpectsResponse(lastMsg.content);
        if (expectsResponse) {
          items.push({
            type: "quick-answer",
            id: generateId(),
            answer: "",
            completed: false,
          });
          setInteractionState("ANSWER_ACTIVE");
        } else {
          // No marker — auto-fetch first guided question
          setInteractionState("WAITING_FOR_COACH");
          needsAutoFetch.current = true;
          setIsLoadingFirstQuestion(true);
        }
      }
    } else {
      setInteractionState("WAITING_FOR_COACH");
    }

    setChatItems(items);
  }, [externalMessages]);

  // ─── Auto-fetch first guided practice question if transition had no question ─
  useEffect(() => {
    if (!needsAutoFetch.current || !onSendMessage) return;
    needsAutoFetch.current = false;

    // Send a nudge to the coach so it asks the first guided practice question
    setIsTyping(true);
    onSendMessage("I'm ready to practice!").then((coachResponse) => {
      setIsTyping(false);
      setIsLoadingFirstQuestion(false);
      if (coachResponse) {
        addCoachMessage(coachResponse);
      }
    }).catch(() => {
      setIsTyping(false);
      setIsLoadingFirstQuestion(false);
    });
  }, [onSendMessage, addCoachMessage]);

  // ─── Submit handler (both card types) ────────────────────────────────────

  const handleSubmit = useCallback(
    async (text: string) => {
      setChatItems((prev) => {
        const updated = [...prev];
        for (let i = updated.length - 1; i >= 0; i--) {
          const item = updated[i];
          if (
            (item.type === "quick-answer" || item.type === "writing-response") &&
            !item.completed
          ) {
            updated[i] = { ...item, answer: text, completed: true };
            break;
          }
        }
        return updated;
      });

      setInteractionState("WAITING_FOR_COACH");
      setIsTyping(true);

      if (onSendMessage) {
        try {
          const coachResponse = await onSendMessage(text);
          setIsTyping(false);
          if (coachResponse) {
            addCoachMessage(coachResponse);
          }
        } catch (err) {
          console.error("Failed to get coach response:", err);
          setIsTyping(false);
          const errorMsg: Message = {
            id: `err-${Date.now()}`,
            role: "coach",
            content:
              "Hmm, I had a little trouble there! Could you try saying that again?",
            timestamp: new Date().toISOString(),
          };
          addCoachMessage(errorMsg);
        }
      } else {
        const responseIndex = Math.min(fallbackIndex, fallbackResponses.length - 1);
        const responseText = fallbackResponses[responseIndex];
        setFallbackIndex((prev) => prev + 1);

        setTimeout(() => {
          setIsTyping(false);
          const coachMsg: Message = {
            id: `msg-${Date.now()}`,
            role: "coach",
            content: responseText,
            timestamp: new Date().toISOString(),
          };
          addCoachMessage(coachMsg);
        }, 1500);
      }
    },
    [onSendMessage, fallbackIndex, addCoachMessage]
  );

  // ─── Continue handler (no-question coach statements) ────────────────────

  const handleContinue = useCallback(async () => {
    setInteractionState("WAITING_FOR_COACH");
    setIsTyping(true);
    if (onSendMessage) {
      try {
        const coachResponse = await onSendMessage("Continue");
        setIsTyping(false);
        if (coachResponse) addCoachMessage(coachResponse);
      } catch {
        setIsTyping(false);
      }
    }
  }, [onSendMessage, addCoachMessage]);

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-[var(--content-height)]">
      {isLoadingFirstQuestion ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center text-center px-6">
            <CoachAvatar size="lg" animate />
            <p className="mt-4 text-active-text/60 font-semibold animate-fade-in">
              {coachName} is setting up your practice...
            </p>
          </div>
        </div>
      ) : (
        <>
          {/* Scrollable chat flow */}
          <div className="flex-1 overflow-y-auto px-4 pt-4 pb-20 bg-active-bg/30">
            <div className="max-w-[640px] mx-auto flex flex-col gap-2">
              {chatItems.map((item) => {
                switch (item.type) {
                  case "coach":
                    return (
                      <div key={item.id} className="mb-2">
                        <ChatBubble message={item.message} />
                      </div>
                    );

                  case "quick-answer":
                    return item.completed ? (
                      <div key={item.id} className="mb-2">
                        <QuickAnswerCardCompleted answer={item.answer} />
                      </div>
                    ) : (
                      <div key={item.id} className="mb-2">
                        <QuickAnswerCardActive onSubmit={handleSubmit} />
                      </div>
                    );

                  case "writing-response":
                    return item.completed ? (
                      <div key={item.id} className="my-2">
                        <WritingCardCompleted prompt={item.prompt} answer={item.answer} />
                      </div>
                    ) : (
                      <div key={item.id} className="my-2">
                        <WritingCardActive prompt={item.prompt} onSubmit={handleSubmit} />
                      </div>
                    );

                  default:
                    return null;
                }
              })}

              {isTyping && (
                <div className="mb-2">
                  <TypingIndicator />
                </div>
              )}

              {/* Continue button for non-question coach statements */}
              {interactionState === "CONTINUE_ACTIVE" && !isTyping && (
                <div className="flex justify-center py-4 animate-fade-in">
                  <button
                    onClick={handleContinue}
                    className="bg-active-primary text-white px-8 py-3 rounded-2xl font-bold text-base shadow-md hover:bg-active-primary/90 transition-colors"
                  >
                    Continue &rarr;
                  </button>
                </div>
              )}

              {/* Escape hatch: subtle option after 5+ exchanges */}
              {totalExchanges >= ESCAPE_HATCH_EXCHANGES && (
                <div className="flex justify-center py-2 animate-fade-in">
                  <button
                    onClick={onComplete}
                    className="text-active-text/40 text-sm font-semibold hover:text-active-primary transition-colors"
                  >
                    I&rsquo;m ready to write on my own &rarr;
                  </button>
                </div>
              )}

              <div ref={scrollEndRef} />
            </div>
          </div>

          {/* Fixed bottom progress bar */}
          <BottomProgressBar writingsDone={writingsDone} practiceComplete={false} />
        </>
      )}
    </div>
  );
}
