"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import type { Message } from "@/types";
import { ChatBubble, TypingIndicator, QuickAnswerCardActive, QuickAnswerCardCompleted } from "./shared";
import { useTier } from "@/contexts/TierContext";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------
interface InstructionPhaseProps {
  lessonTitle: string;
  messages?: Message[];
  onSendMessage?: (text: string) => Promise<Message | null>;
  onComplete: () => void;
}

// ---------------------------------------------------------------------------
// Internal types
// ---------------------------------------------------------------------------
type ChatItem =
  | { type: "coach"; id: string; message: Message }
  | { type: "quick-answer"; id: string; answer: string; completed: boolean }
  | { type: "step-divider"; id: string; step: number; label: string };

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const STEP_LABELS: Record<number, string> = {
  1: "Intro",
  2: "Learn",
  3: "Read",
  4: "Compare",
  5: "Check",
};

const TOTAL_STEPS = 5;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function parseStepMarker(content: string): { text: string; step: number | null } {
  const match = content.match(/\[STEP:\s*(\d)\]/i);
  if (match) {
    return {
      text: content.replace(match[0], "").trim(),
      step: parseInt(match[1], 10),
    };
  }
  return { text: content, step: null };
}

function generateId(): string {
  return `item-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/** Parse and strip [EXPECTS_RESPONSE] marker from content */
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

// ---------------------------------------------------------------------------
// StepProgressBar — 5 dots with connector lines
// ---------------------------------------------------------------------------
function StepProgressBar({ currentStep }: { currentStep: number }) {
  return (
    <div className="flex flex-col items-center gap-1.5 py-3">
      <div className="flex items-center gap-0">
        {Array.from({ length: TOTAL_STEPS }).map((_, i) => {
          const step = i + 1;
          const isCompleted = step < currentStep;
          const isCurrent = step === currentStep;
          return (
            <div key={step} className="flex items-center">
              {/* Connector line (before dot, except first) */}
              {i > 0 && (
                <div
                  className={`w-6 sm:w-8 h-0.5 transition-colors duration-300 ${
                    step <= currentStep ? "bg-active-primary" : "bg-gray-200"
                  }`}
                />
              )}
              {/* Step dot */}
              <div
                className={`flex items-center justify-center rounded-full transition-all duration-300 font-bold text-[0.65rem] ${
                  isCompleted
                    ? "w-7 h-7 bg-active-secondary text-white"
                    : isCurrent
                      ? "w-8 h-8 bg-active-primary text-white ring-4 ring-active-primary/20 scale-110"
                      : "w-7 h-7 bg-gray-100 text-gray-300"
                }`}
                title={STEP_LABELS[step]}
              >
                {isCompleted ? (
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  step
                )}
              </div>
            </div>
          );
        })}
      </div>
      <div className="flex items-center gap-0.5 text-xs font-bold text-active-text/40 tracking-wide">
        <span>{STEP_LABELS[currentStep] ?? `Step ${currentStep}`}</span>
        <span className="text-active-text/20 mx-0.5">·</span>
        <span>Step {currentStep} of {TOTAL_STEPS}</span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// StepDivider — thin line between step segments
// ---------------------------------------------------------------------------
function StepDivider({ step, label }: { step: number; label: string }) {
  return (
    <div className="flex items-center gap-3 py-2" role="separator">
      <div className="flex-1 h-px bg-active-primary/10" />
      <span className="text-[0.7rem] font-bold uppercase tracking-wider text-active-primary/50 whitespace-nowrap">
        Step {step}: {label}
      </span>
      <div className="flex-1 h-px bg-active-primary/10" />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------
export default function InstructionPhase({
  lessonTitle,
  messages: externalMessages,
  onSendMessage,
  onComplete,
}: InstructionPhaseProps) {
  const { coachName } = useTier();
  const [chatItems, setChatItems] = useState<ChatItem[]>([]);
  const [currentStep, setCurrentStep] = useState(1);
  const [isTyping, setIsTyping] = useState(false);
  const [showAskQuestion, setShowAskQuestion] = useState(false);
  const [questionInput, setQuestionInput] = useState("");

  const scrollEndRef = useRef<HTMLDivElement>(null);
  const initializedRef = useRef(false);

  // Auto-scroll on new items
  useEffect(() => {
    scrollEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatItems, isTyping]);

  // ── Process a coach message into chat items ────────────────────────────
  const addCoachMessage = useCallback(
    (msg: Message, items?: ChatItem[], step?: number): { newItems: ChatItem[]; newStep: number } => {
      const { text: textAfterStep, step: parsedStep } = parseStepMarker(msg.content);
      const { text, expectsResponse } = parseExpectsResponse(textAfterStep);
      const effectiveStep = parsedStep ?? step ?? currentStep;
      const result: ChatItem[] = items ? [...items] : [];

      // Insert step divider if step changed
      if (parsedStep && parsedStep !== (step ?? currentStep)) {
        result.push({
          type: "step-divider",
          id: generateId(),
          step: parsedStep,
          label: STEP_LABELS[parsedStep] ?? `Step ${parsedStep}`,
        });
      }

      // Add coach message (with markers stripped)
      const cleanMessage: Message = { ...msg, content: text };
      result.push({
        type: "coach",
        id: generateId(),
        message: cleanMessage,
      });

      // Add quick-answer card if coach expects a response
      if (expectsResponse) {
        result.push({
          type: "quick-answer",
          id: generateId(),
          answer: "",
          completed: false,
        });
      }

      return { newItems: result, newStep: effectiveStep };
    },
    [currentStep]
  );

  // ── Initialize from external messages (handles session resume) ────────
  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    if (!externalMessages || externalMessages.length === 0) return;

    const items: ChatItem[] = [];
    let step = 1;

    for (const msg of externalMessages) {
      if (msg.role === "coach") {
        const { text: textAfterStep, step: parsedStep } = parseStepMarker(msg.content);
        const { text } = parseExpectsResponse(textAfterStep);

        // Insert step divider on step change
        if (parsedStep && parsedStep !== step) {
          items.push({
            type: "step-divider",
            id: generateId(),
            step: parsedStep,
            label: STEP_LABELS[parsedStep] ?? `Step ${parsedStep}`,
          });
          step = parsedStep;
        }

        const cleanMessage: Message = { ...msg, content: text };
        items.push({
          type: "coach",
          id: generateId(),
          message: cleanMessage,
        });
      } else if (msg.role === "student") {
        items.push({
          type: "quick-answer",
          id: generateId(),
          answer: msg.content,
          completed: true,
        });
      }
    }

    // If the last message is from the coach and has [EXPECTS_RESPONSE], add active quick-answer
    const lastMsg = externalMessages[externalMessages.length - 1];
    if (lastMsg.role === "coach") {
      const { expectsResponse } = parseExpectsResponse(lastMsg.content);
      if (expectsResponse) {
        items.push({
          type: "quick-answer",
          id: generateId(),
          answer: "",
          completed: false,
        });
      }
    }

    setChatItems(items);
    setCurrentStep(step);
  }, [externalMessages]);

  // ── Submit handler (quick-answer card) ────────────────────────────────
  const handleSubmit = useCallback(
    async (text: string) => {
      // Mark latest quick-answer as completed
      setChatItems((prev) => {
        const updated = [...prev];
        for (let i = updated.length - 1; i >= 0; i--) {
          const item = updated[i];
          if (item.type === "quick-answer" && !item.completed) {
            updated[i] = { ...item, answer: text, completed: true };
            break;
          }
        }
        return updated;
      });

      setIsTyping(true);

      if (onSendMessage) {
        try {
          const coachResponse = await onSendMessage(text);
          setIsTyping(false);
          if (coachResponse) {
            const { text: textAfterStep, step: parsedStep } = parseStepMarker(coachResponse.content);
            const { text: cleanText, expectsResponse } = parseExpectsResponse(textAfterStep);
            const newStep = parsedStep ?? currentStep;

            setChatItems((prev) => {
              const added: ChatItem[] = [];

              if (parsedStep && parsedStep !== currentStep) {
                added.push({
                  type: "step-divider",
                  id: generateId(),
                  step: parsedStep,
                  label: STEP_LABELS[parsedStep] ?? `Step ${parsedStep}`,
                });
              }

              const cleanMessage: Message = { ...coachResponse, content: cleanText };
              added.push({
                type: "coach",
                id: generateId(),
                message: cleanMessage,
              });

              if (expectsResponse) {
                added.push({
                  type: "quick-answer",
                  id: generateId(),
                  answer: "",
                  completed: false,
                });
              }

              return [...prev, ...added];
            });

            setCurrentStep(newStep);
          }
        } catch (err) {
          console.error("Failed to get coach response:", err);
          setIsTyping(false);
          const errorMsg: Message = {
            id: `err-${Date.now()}`,
            role: "coach",
            content: "Hmm, I had a little trouble there! Could you try saying that again?",
            timestamp: new Date().toISOString(),
          };
          setChatItems((prev) => [
            ...prev,
            { type: "coach", id: generateId(), message: errorMsg },
          ]);
        }
      } else {
        setIsTyping(false);
      }
    },
    [onSendMessage, currentStep]
  );

  // ── "Ask a question" handler (free-form input) ────────────────────────
  const handleAskQuestion = useCallback(async () => {
    if (!questionInput.trim() || !onSendMessage) return;
    const text = questionInput.trim();
    setQuestionInput("");
    setShowAskQuestion(false);

    // Add student message
    const studentItem: ChatItem = {
      type: "quick-answer",
      id: generateId(),
      answer: text,
      completed: true,
    };
    setChatItems((prev) => [...prev, studentItem]);
    setIsTyping(true);

    try {
      const coachResponse = await onSendMessage(text);
      setIsTyping(false);
      if (coachResponse) {
        const { text: textAfterStep, step: parsedStep } = parseStepMarker(coachResponse.content);
        const { text: cleanText, expectsResponse } = parseExpectsResponse(textAfterStep);
        const newStep = parsedStep ?? currentStep;

        setChatItems((prev) => {
          const added: ChatItem[] = [];

          if (parsedStep && parsedStep !== currentStep) {
            added.push({
              type: "step-divider",
              id: generateId(),
              step: parsedStep,
              label: STEP_LABELS[parsedStep] ?? `Step ${parsedStep}`,
            });
          }

          const cleanMessage: Message = { ...coachResponse, content: cleanText };
          added.push({
            type: "coach",
            id: generateId(),
            message: cleanMessage,
          });

          if (expectsResponse) {
            added.push({
              type: "quick-answer",
              id: generateId(),
              answer: "",
              completed: false,
            });
          }

          return [...prev, ...added];
        });

        setCurrentStep(newStep);
      }
    } catch (err) {
      console.error("Failed to get coach response:", err);
      setIsTyping(false);
    }
  }, [questionInput, onSendMessage, currentStep]);

  // Check if there's an active (unanswered) quick-answer card
  const hasActiveCard = chatItems.some(
    (item) => item.type === "quick-answer" && !item.completed
  );

  // Show continue button when there are chat items, no active card, and not typing
  const showContinue = chatItems.length > 0 && !hasActiveCard && !isTyping;

  // ── "Continue" handler — sends a nudge to the AI to keep going ────────
  const handleContinue = useCallback(async () => {
    if (!onSendMessage || isTyping) return;

    const text = "I understand, please continue!";
    const studentItem: ChatItem = {
      type: "quick-answer",
      id: generateId(),
      answer: text,
      completed: true,
    };
    setChatItems((prev) => [...prev, studentItem]);
    setIsTyping(true);

    try {
      const coachResponse = await onSendMessage(text);
      setIsTyping(false);
      if (coachResponse) {
        const { text: textAfterStep, step: parsedStep } = parseStepMarker(coachResponse.content);
        const { text: cleanText, expectsResponse } = parseExpectsResponse(textAfterStep);
        const newStep = parsedStep ?? currentStep;

        setChatItems((prev) => {
          const added: ChatItem[] = [];

          if (parsedStep && parsedStep !== currentStep) {
            added.push({
              type: "step-divider",
              id: generateId(),
              step: parsedStep,
              label: STEP_LABELS[parsedStep] ?? `Step ${parsedStep}`,
            });
          }

          const cleanMessage: Message = { ...coachResponse, content: cleanText };
          added.push({
            type: "coach",
            id: generateId(),
            message: cleanMessage,
          });

          if (expectsResponse) {
            added.push({
              type: "quick-answer",
              id: generateId(),
              answer: "",
              completed: false,
            });
          }

          return [...prev, ...added];
        });

        setCurrentStep(newStep);
      }
    } catch (err) {
      console.error("Failed to get coach response:", err);
      setIsTyping(false);
    }
  }, [onSendMessage, isTyping, currentStep]);

  return (
    <div className="flex flex-col h-[var(--content-height)] bg-active-bg">
      {/* ── Step Progress Bar (sticky top) ── */}
      <div className="flex-shrink-0 bg-white/80 backdrop-blur-sm border-b border-active-primary/5">
        <StepProgressBar currentStep={currentStep} />
      </div>

      {/* ── Scrollable Conversation Area ── */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6 flex flex-col gap-2">
          {chatItems.map((item) => {
            switch (item.type) {
              case "coach":
                return (
                  <div key={item.id} className="mb-2 animate-fade-in">
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

              case "step-divider":
                return (
                  <StepDivider
                    key={item.id}
                    step={item.step}
                    label={item.label}
                  />
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

          <div ref={scrollEndRef} />
        </div>
      </div>

      {/* ── Bottom Bar ── */}
      <div className="flex-shrink-0 border-t border-active-primary/5 bg-white">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 py-3">
          {showAskQuestion ? (
            /* ── Expanded free-form input ── */
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={questionInput}
                onChange={(e) => setQuestionInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleAskQuestion();
                  }
                }}
                className="flex-1 h-[42px] px-3.5 rounded-lg border-[1.5px] border-[#e0dcd5] bg-white text-[0.95rem] text-active-text outline-none transition-all focus:border-active-primary focus:shadow-[0_0_0_3px_rgba(99,102,241,0.1)] placeholder:text-[#b2bec3]"
                placeholder={`Ask ${coachName} a question...`}
                autoFocus
              />
              <button
                onClick={handleAskQuestion}
                disabled={!questionInput.trim() || isTyping}
                className="px-4 py-2.5 rounded-lg bg-active-primary text-white font-bold text-sm transition-colors hover:bg-active-primary/90 disabled:bg-gray-300 disabled:cursor-not-allowed"
                aria-label="Send question"
              >
                Send
              </button>
              <button
                onClick={() => { setShowAskQuestion(false); setQuestionInput(""); }}
                className="px-3 py-2.5 text-active-text/40 hover:text-active-text/60 font-semibold text-sm transition-colors"
              >
                Cancel
              </button>
            </div>
          ) : hasActiveCard ? (
            /* ── When there's an active QuickAnswerCard, just show subtle ask-a-question ── */
            <button
              onClick={() => setShowAskQuestion(true)}
              disabled={isTyping}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold text-active-text/50 hover:text-active-primary hover:bg-active-bg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Ask a question
            </button>
          ) : (
            /* ── Default: Continue button + Ask a question link ── */
            <div className="flex items-center gap-3">
              <button
                onClick={handleContinue}
                disabled={isTyping || !onSendMessage}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-bold text-sm text-white bg-active-primary transition-colors hover:bg-active-primary/90 shadow-sm disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                {isTyping ? "Thinking..." : "Continue"}
                {!isTyping && (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                )}
              </button>
              <button
                onClick={() => setShowAskQuestion(true)}
                disabled={isTyping}
                className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-sm font-semibold text-active-text/40 hover:text-active-primary transition-colors disabled:opacity-40"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Ask
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
