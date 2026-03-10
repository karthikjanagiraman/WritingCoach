"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { saveDraft } from "@/lib/api";

export type SaveStatus = "idle" | "saving" | "saved" | "error";

const LOCAL_STORAGE_PREFIX = "writewhiz_draft_";
const LOCAL_SAVE_DEBOUNCE_MS = 5_000;
const SERVER_SAVE_THROTTLE_MS = 30_000;

export function useAutoSave(
  sessionId: string | undefined,
  text: string
): { saveStatus: SaveStatus } {
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const localTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const serverTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastServerSaveRef = useRef<number>(0);
  const textRef = useRef(text);
  textRef.current = text;

  // localStorage save (5s debounce)
  useEffect(() => {
    if (!sessionId || !text) return;

    if (localTimerRef.current) clearTimeout(localTimerRef.current);

    localTimerRef.current = setTimeout(() => {
      try {
        localStorage.setItem(
          `${LOCAL_STORAGE_PREFIX}${sessionId}`,
          JSON.stringify({ text, timestamp: Date.now() })
        );
        setSaveStatus("saved");
      } catch {
        // localStorage full or unavailable — ignore
      }
    }, LOCAL_SAVE_DEBOUNCE_MS);

    return () => {
      if (localTimerRef.current) clearTimeout(localTimerRef.current);
    };
  }, [sessionId, text]);

  // Server save (30s throttle)
  useEffect(() => {
    if (!sessionId || !text) return;

    const now = Date.now();
    const elapsed = now - lastServerSaveRef.current;

    if (elapsed >= SERVER_SAVE_THROTTLE_MS) {
      // Save immediately
      setSaveStatus("saving");
      lastServerSaveRef.current = now;
      saveDraft(sessionId, text)
        .then(() => setSaveStatus("saved"))
        .catch(() => setSaveStatus("error"));
    } else if (!serverTimerRef.current) {
      // Schedule save for remaining time
      const remaining = SERVER_SAVE_THROTTLE_MS - elapsed;
      serverTimerRef.current = setTimeout(() => {
        serverTimerRef.current = null;
        lastServerSaveRef.current = Date.now();
        setSaveStatus("saving");
        saveDraft(sessionId, textRef.current)
          .then(() => setSaveStatus("saved"))
          .catch(() => setSaveStatus("error"));
      }, remaining);
    }

    return () => {
      if (serverTimerRef.current) {
        clearTimeout(serverTimerRef.current);
        serverTimerRef.current = null;
      }
    };
  }, [sessionId, text]);

  return { saveStatus };
}

export function useDraftRecovery(
  sessionId: string | undefined,
  serverDraft?: string
): { recoveredDraft: string | null; clearRecoveredDraft: () => void } {
  const [recoveredDraft, setRecoveredDraft] = useState<string | null>(null);

  useEffect(() => {
    if (!sessionId) return;

    // Prefer server-side draft (cross-device recovery)
    if (serverDraft) {
      setRecoveredDraft(serverDraft);
      return;
    }

    // Fallback to localStorage
    try {
      const stored = localStorage.getItem(
        `${LOCAL_STORAGE_PREFIX}${sessionId}`
      );
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.text && typeof parsed.text === "string" && parsed.text.trim().length > 0) {
          setRecoveredDraft(parsed.text);
        }
      }
    } catch {
      // Malformed or unavailable — ignore
    }
  }, [sessionId, serverDraft]);

  const clearRecoveredDraft = useCallback(() => {
    setRecoveredDraft(null);
    if (sessionId) {
      try {
        localStorage.removeItem(`${LOCAL_STORAGE_PREFIX}${sessionId}`);
      } catch {
        // ignore
      }
    }
  }, [sessionId]);

  return { recoveredDraft, clearRecoveredDraft };
}
