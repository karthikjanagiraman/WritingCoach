"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import type { Message } from "@/types";
import CoachMessage from "./CoachMessage";
import { CoachAvatar, ChatBubble, TypingIndicator, ChatInput } from "./shared";
import { useTier } from "@/contexts/TierContext";

interface InstructionPhaseProps {
  lessonTitle: string;
  messages?: Message[];
  onSendMessage?: (text: string) => Promise<Message | null>;
  onComplete: () => void;
}

/** Split markdown content by ## headings into discrete lesson cards */
function chunkMarkdownByHeadings(markdown: string): { title: string; body: string }[] {
  const sections = markdown.split(/(?=^## )/m);
  return sections
    .map((section) => {
      const lines = section.trim().split("\n");
      const titleLine = lines[0];
      const title = titleLine.replace(/^#{1,3}\s*/, "").trim() || "Welcome";
      const body = lines.slice(1).join("\n").trim();
      return { title, body };
    })
    .filter((s) => s.body.length > 0);
}

// ---------------------------------------------------------------------------
// Progress Steps — visual step indicators for children
// ---------------------------------------------------------------------------
function ProgressSteps({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex flex-col items-center gap-1.5 py-3">
      <div className="flex items-center gap-1.5">
        {Array.from({ length: total }).map((_, i) => (
          <div
            key={i}
            className={`flex items-center justify-center rounded-full transition-all duration-300 font-bold text-xs ${i < current
                ? "w-7 h-7 bg-active-secondary text-white"
                : i === current
                  ? "w-8 h-8 bg-active-primary text-white ring-4 ring-active-primary/20 scale-110"
                  : "w-7 h-7 bg-gray-100 text-gray-300"
              }`}
          >
            {i < current ? (
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              i + 1
            )}
          </div>
        ))}
      </div>
      <span className="text-xs font-bold text-active-text/40 tracking-wide">
        Step {current + 1} of {total}
      </span>
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
  const [currentStep, setCurrentStep] = useState(0);
  const [chatInput, setChatInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [chatMessages, setChatMessages] = useState<Message[]>([]);
  const [readySent, setReadySent] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // ── Chunk the first coach message into lesson cards ──
  const firstCoachMessage = externalMessages?.find((m) => m.role === "coach");
  const chunks = useMemo(() => {
    if (!firstCoachMessage) return [{ title: lessonTitle, body: "Loading lesson content..." }];
    const result = chunkMarkdownByHeadings(firstCoachMessage.content);
    if (result.length === 0) {
      return [{ title: lessonTitle, body: firstCoachMessage.content }];
    }
    return result;
  }, [firstCoachMessage, lessonTitle]);

  // ── Follow-up messages from the external conversation ──
  const followUpMessages = useMemo(() => {
    if (!externalMessages) return [];
    return externalMessages.slice(1);
  }, [externalMessages]);

  // Derived
  const totalSteps = chunks.length;
  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep >= totalSteps - 1;
  const currentCard = chunks[currentStep];

  // Scroll chat area into view when new messages arrive
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages, isTyping]);

  // Reset scroll position when navigating between cards
  useEffect(() => {
    scrollContainerRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  }, [currentStep]);

  // ── Navigation ──
  const goBack = () => {
    if (!isFirstStep) setCurrentStep((s) => s - 1);
  };

  const goNext = async () => {
    if (isLastStep) {
      if (onSendMessage && !readySent) {
        // Route through the AI — enforce comprehension check
        setReadySent(true);
        const text = "I\u2019ve finished reading the lesson and I\u2019m ready to practice!";
        const studentMsg: Message = {
          id: `student-${Date.now()}`,
          role: "student",
          content: text,
          timestamp: new Date().toISOString(),
        };
        setChatMessages((prev) => [...prev, studentMsg]);
        setIsTyping(true);
        try {
          const response = await onSendMessage(text);
          if (response) {
            setChatMessages((prev) => [...prev, response]);
          }
        } finally {
          setIsTyping(false);
        }
      } else if (!onSendMessage) {
        onComplete();
      }
    } else {
      setCurrentStep((s) => s + 1);
    }
  };

  // ── Chat send handler ──
  const handleChatSend = async () => {
    if (!chatInput.trim() || !onSendMessage) return;
    const text = chatInput.trim();
    setChatInput("");

    const studentMsg: Message = {
      id: `student-${Date.now()}`,
      role: "student",
      content: text,
      timestamp: new Date().toISOString(),
    };
    setChatMessages((prev) => [...prev, studentMsg]);
    setIsTyping(true);

    try {
      const response = await onSendMessage(text);
      if (response) {
        setChatMessages((prev) => [...prev, response]);
      }
    } finally {
      setIsTyping(false);
    }
  };

  // Merge follow-up + local chat messages, deduplicating by ID
  const localIds = new Set(chatMessages.map((m) => m.id));
  const allChatMessages = [
    ...followUpMessages.filter((m) => !localIds.has(m.id)),
    ...chatMessages,
  ];
  const hasChatMessages = allChatMessages.length > 0 || isTyping;

  return (
    <div className="flex flex-col h-[var(--content-height)] bg-active-bg">
      {/* ── Progress Steps (top bar) ── */}
      <div className="flex-shrink-0 bg-white/80 backdrop-blur-sm border-b border-active-primary/5">
        <ProgressSteps current={currentStep} total={totalSteps} />
      </div>

      {/* ── Scrollable Content Area ── */}
      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6 flex flex-col gap-4">
          {/* ── Lesson Content as Chat Bubble ── */}
          <div key={currentStep} className="animate-fade-in">
            <ChatBubble
              message={{
                id: `lesson-card-${currentStep}`,
                role: "coach",
                content: `**${currentCard.title}**\n\n${currentCard.body}`,
                timestamp: new Date().toISOString(),
              }}
            />
          </div>

          {/* ── Inline Chat Messages ── */}
          {hasChatMessages && (
            <div className="space-y-3 animate-fade-in">
              {allChatMessages.map((msg) => (
                <ChatBubble key={msg.id} message={msg} />
              ))}
              {isTyping && <TypingIndicator />}
              <div ref={chatEndRef} />
            </div>
          )}
        </div>
      </div>

      {/* ── Bottom Bar: Chat input + Navigation ── */}
      <div className="flex-shrink-0 border-t border-active-primary/5 bg-white">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 py-3 space-y-3">
          {/* Chat input */}
          <ChatInput
            value={chatInput}
            onChange={setChatInput}
            onSend={handleChatSend}
            disabled={isTyping || !onSendMessage}
            placeholder={`Tell ${coachName} what you think...`}
          />

          {/* Previous / Next navigation */}
          <div className="flex items-center justify-between">
            <button
              onClick={goBack}
              disabled={isFirstStep}
              className={`flex items-center gap-1.5 px-5 py-2.5 rounded-xl font-bold text-sm transition-colors duration-200 ${isFirstStep
                  ? "text-gray-300 cursor-not-allowed"
                  : "text-active-text/60 hover:bg-active-bg hover:text-active-text"
                }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Previous
            </button>

            <button
              onClick={goNext}
              disabled={isLastStep && readySent}
              className={`flex items-center gap-1.5 px-6 py-2.5 rounded-xl font-bold text-sm text-white transition-colors duration-200 shadow-sm ${
                isLastStep && readySent
                  ? "bg-gray-300 cursor-not-allowed"
                  : isLastStep
                    ? "bg-active-secondary hover:bg-active-secondary/90"
                    : "bg-active-primary hover:bg-active-primary/90"
              }`}
            >
              {isLastStep
                ? readySent
                  ? "Answer above \u2191"
                  : "Let\u2019s Practice!"
                : "Next"}
              {!(isLastStep && readySent) && (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
