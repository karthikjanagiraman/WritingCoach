"use client";

import { useState, useEffect, useRef } from "react";

const BASE_SPEED = 15; // ms per character
const ACCEL_AFTER = 200; // accelerate after this many chars
const FAST_SPEED = 5; // ms per character after acceleration

export function useTypingEffect(
  text: string,
  enabled: boolean = true
): { displayedText: string; isTyping: boolean; complete: () => void } {
  const [displayedText, setDisplayedText] = useState(enabled ? "" : text);
  const [isTyping, setIsTyping] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const indexRef = useRef(0);
  const textRef = useRef(text);

  // Instant-complete function (called when user sends next message)
  const complete = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = null;
    setDisplayedText(textRef.current);
    setIsTyping(false);
  };

  useEffect(() => {
    textRef.current = text;

    if (!enabled || !text) {
      setDisplayedText(text);
      setIsTyping(false);
      return;
    }

    // New text arrived — start typing
    indexRef.current = 0;
    setDisplayedText("");
    setIsTyping(true);

    const tick = () => {
      indexRef.current++;
      const idx = indexRef.current;
      setDisplayedText(text.slice(0, idx));

      if (idx >= text.length) {
        setIsTyping(false);
        return;
      }

      const speed = idx > ACCEL_AFTER ? FAST_SPEED : BASE_SPEED;
      timerRef.current = setTimeout(tick, speed);
    };

    timerRef.current = setTimeout(tick, BASE_SPEED);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [text, enabled]);

  return { displayedText, isTyping, complete };
}
