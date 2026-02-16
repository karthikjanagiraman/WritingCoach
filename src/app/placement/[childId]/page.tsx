"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

import {
  QuestCharacterDefs,
  TRIAL_CONFIG,
} from "@/components/placement/QuestCharacters";
import { AmbientParticles } from "@/components/placement/AmbientParticles";
import { QuestTrailSidebar } from "@/components/placement/QuestTrailSidebar";
import { QuestCard } from "@/components/placement/QuestCard";
import { TrialCelebration } from "@/components/placement/TrialCelebration";
import { QuestFinale } from "@/components/placement/QuestFinale";
import { QuestIntro } from "@/components/placement/QuestIntro";

interface ChildInfo {
  id: string;
  name: string;
  age: number;
}

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

type SaveStatus = "idle" | "saving" | "saved" | "error";

export default function PlacementAssessmentPage() {
  const { childId } = useParams<{ childId: string }>();
  const router = useRouter();
  const { status } = useSession();

  // Preserved state from original implementation
  const [child, setChild] = useState<ChildInfo | null>(null);
  const [prompts, setPrompts] = useState<string[]>([]);
  const [responses, setResponses] = useState<string[]>(["", "", ""]);
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");

  // New quest UI state
  const [showIntro, setShowIntro] = useState(true);
  const [completedTrials, setCompletedTrials] = useState<Set<number>>(
    new Set()
  );
  const [showCelebration, setShowCelebration] = useState(false);
  const [showFinale, setShowFinale] = useState(false);
  const [cardTransitioning, setCardTransitioning] = useState(false);

  // Refs for debounced save
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const responsesRef = useRef(responses);
  const stepRef = useRef(step);
  const isMountedRef = useRef(true);
  const hasLoadedRef = useRef(false);
  const fetchingRef = useRef(false);

  // Keep refs in sync
  responsesRef.current = responses;
  stepRef.current = step;

  const saveDraft = useCallback(
    async (responsesToSave?: string[], stepToSave?: number) => {
      if (!hasLoadedRef.current) return;

      const r = responsesToSave ?? responsesRef.current;
      const s = stepToSave ?? stepRef.current;

      try {
        setSaveStatus("saving");
        const res = await fetch("/api/placement/save-draft", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ childId, responses: r, step: s }),
        });

        if (!isMountedRef.current) return;

        if (res.ok) {
          setSaveStatus("saved");
          setTimeout(() => {
            if (isMountedRef.current) setSaveStatus("idle");
          }, 2000);
        } else {
          setSaveStatus("error");
          setTimeout(() => {
            if (isMountedRef.current) setSaveStatus("idle");
          }, 3000);
        }
      } catch {
        if (!isMountedRef.current) return;
        setSaveStatus("error");
        setTimeout(() => {
          if (isMountedRef.current) setSaveStatus("idle");
        }, 3000);
      }
    },
    [childId]
  );

  const debouncedSave = useCallback(() => {
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
    }
    saveTimerRef.current = setTimeout(() => {
      saveDraft();
    }, 3000);
  }, [saveDraft]);

  // Cleanup on unmount
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
      saveDraft();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchData = useCallback(async () => {
    if (fetchingRef.current) return;
    fetchingRef.current = true;

    try {
      const childRes = await fetch(`/api/children/${childId}`);
      if (!childRes.ok) {
        throw new Error("Could not load child profile");
      }
      const childData = await childRes.json();
      setChild(childData.child);

      const startRes = await fetch("/api/placement/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ childId }),
      });

      if (!startRes.ok) {
        const data = await startRes.json();
        throw new Error(data.error || "Failed to start placement");
      }

      const startData = await startRes.json();

      if (startData.existingResult) {
        router.replace(`/placement/${childId}/results`);
        return;
      }

      setPrompts(startData.prompts);
      hasLoadedRef.current = true;

      // Restore from draft — skip intro narration if resuming
      if (startData.hasDraft) {
        if (Array.isArray(startData.responses)) {
          setResponses(startData.responses);
        }
        if (
          typeof startData.step === "number" &&
          startData.step >= 0 &&
          startData.step <= 2
        ) {
          setStep(startData.step);
        }
        setShowIntro(false);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }, [childId, router]);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/auth/signin");
      return;
    }
    if (status === "authenticated") {
      fetchData();
    }
  }, [status, router, fetchData]);

  function handleResponseChange(value: string) {
    setResponses((prev) => {
      const updated = [...prev];
      updated[step] = value;
      return updated;
    });
    debouncedSave();
  }

  async function handleSubmitToAPI() {
    // Flush any pending save
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/placement/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ childId, prompts, responses }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to submit assessment");
      }

      router.push(`/placement/${childId}/results`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setSubmitting(false);
      setShowFinale(false);
    }
  }

  function handleTrialSubmit() {
    const currentStep = step;

    // Mark trial as completed
    setCompletedTrials((prev) => new Set(prev).add(currentStep));

    // Show celebration
    setShowCelebration(true);
  }

  const handleCelebrationComplete = useCallback(() => {
    setShowCelebration(false);

    if (step < 2) {
      // Fade card out
      setCardTransitioning(true);

      setTimeout(() => {
        // Advance to next trial
        const nextStep = step + 1;
        setStep(nextStep);
        saveDraft(responsesRef.current, nextStep);

        // Fade card back in
        setTimeout(() => {
          setCardTransitioning(false);
        }, 50);
      }, 250);
    } else {
      // Last trial - show finale and submit
      setShowFinale(true);
      handleSubmitToAPI();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, saveDraft]);

  const currentWords = countWords(responses[step]);
  const canSubmit = currentWords >= 20;
  const trial = TRIAL_CONFIG[step];

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FFF9F0] flex items-center justify-center">
        <div className="text-center animate-fade-in">
          <div className="text-4xl mb-4 animate-bounce-slow">&#x1F989;</div>
          <p className="text-[#2D3436]/60 font-semibold">
            Preparing your writing quest...
          </p>
        </div>
      </div>
    );
  }

  if (error && prompts.length === 0) {
    return (
      <div className="min-h-screen bg-[#FFF9F0] flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-red-700 text-sm font-medium mb-4">
            {error}
          </div>
          <button
            onClick={() => router.push("/dashboard")}
            className="px-6 py-3 bg-[#FF6B6B] text-white rounded-xl text-sm font-bold hover:bg-[#FF6B6B]/90 transition-colors"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FFF9F0] overflow-x-hidden">
      <QuestCharacterDefs />
      <AmbientParticles trialIndex={step} />

      {/* Main layout */}
      <div
        className="flex mx-auto relative"
        style={{
          maxWidth: 1060,
          padding: "28px 24px 60px",
          gap: 24,
          zIndex: 1,
        }}
      >
        {/* Left sidebar */}
        <QuestTrailSidebar
          currentTrial={step}
          completedTrials={completedTrials}
        />

        {/* Right panel */}
        <div className="flex-1 min-w-0">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-red-700 text-sm font-medium mb-4">
              {error}
            </div>
          )}

          <QuestCard
            trial={trial}
            trialIndex={step}
            ollieSays={trial.ollie}
            prompt={prompts[step] || ""}
            response={responses[step]}
            onResponseChange={handleResponseChange}
            onSubmit={handleTrialSubmit}
            canSubmit={canSubmit}
            wordCount={currentWords}
            saveStatus={saveStatus}
            isTransitioning={cardTransitioning}
          />
        </div>
      </div>

      {/* V3 narration intro — one-time overlay on first visit */}
      {showIntro && (
        <QuestIntro
          childName={child?.name ?? "young writer"}
          onComplete={() => setShowIntro(false)}
        />
      )}

      {/* Celebration overlay */}
      <TrialCelebration
        visible={showCelebration}
        charId={TRIAL_CONFIG[step].charId}
        title={TRIAL_CONFIG[step].celebTitle}
        subtitle={
          step === 2
            ? `You've done it, ${child?.name ?? "young writer"}! You are worthy.`
            : TRIAL_CONFIG[step].celebSub
        }
        onComplete={handleCelebrationComplete}
      />

      {/* Finale overlay */}
      <QuestFinale
        visible={showFinale}
        childName={child?.name ?? "young writer"}
      />
    </div>
  );
}
