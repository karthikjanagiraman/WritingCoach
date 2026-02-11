"use client";

import type { Message } from "@/types";
import CoachAvatar from "./CoachAvatar";
import CoachMessage from "../CoachMessage";
import { useTier } from "@/contexts/TierContext";

interface ChatBubbleProps {
  message: Message;
}

export default function ChatBubble({ message }: ChatBubbleProps) {
  const isCoach = message.role === "coach";
  const { coachName } = useTier();

  if (!isCoach) {
    return (
      <div className="flex justify-end max-w-[80%] self-end ml-auto">
        <div className="bg-active-primary text-white rounded-2xl rounded-tr-[4px] px-4 py-3 text-[0.95rem] leading-relaxed shadow-sm">
          {message.content}
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-end gap-2 max-w-[85%] animate-fade-in">
      <CoachAvatar size="xs" />
      <div className="bg-white border border-[#e0dcd5] rounded-2xl rounded-tl-[4px] px-4 py-3 text-[0.95rem] leading-[1.55] shadow-sm text-active-text">
        <div className="text-[0.72rem] font-bold text-[#3dbdb5] uppercase tracking-wide mb-[3px]">
          {coachName}
        </div>
        <CoachMessage content={message.content} />
      </div>
    </div>
  );
}
