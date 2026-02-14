"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

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

  const [child, setChild] = useState<ChildInfo | null>(null);
  const [prompts, setPrompts] = useState<string[]>([]);
  const [responses, setResponses] = useState<string[]>(["", "", ""]);
  const [step, setStep] = useState(0); // 0, 1, 2
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");

  // Refs for debounced save
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const responsesRef = useRef(responses);
  const stepRef = useRef(step);
  const isMountedRef = useRef(true);
  const hasLoadedRef = useRef(false);

  // Keep refs in sync
  responsesRef.current = responses;
  stepRef.current = step;

  const saveDraft = useCallback(
    async (responsesToSave?: string[], stepToSave?: number) => {
      // Don't save before data has loaded (prevents strict mode cleanup from creating empty drafts)
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

  // Cleanup on unmount: flush any pending save
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
      // Best-effort final save
      saveDraft();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchData = useCallback(async () => {
    try {
      // Fetch child info
      const childRes = await fetch(`/api/children/${childId}`);
      if (!childRes.ok) {
        throw new Error("Could not load child profile");
      }
      const childData = await childRes.json();
      setChild(childData.child);

      // Start placement to get prompts
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
        // Already completed, go to results
        router.replace(`/placement/${childId}/results`);
        return;
      }

      setPrompts(startData.prompts);
      hasLoadedRef.current = true;

      // Restore from draft if available
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

  async function handleSubmit() {
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
    }
  }

  function handleResponseChange(value: string) {
    setResponses((prev) => {
      const updated = [...prev];
      updated[step] = value;
      return updated;
    });
    debouncedSave();
  }

  function handleStepChange(newStep: number) {
    // Flush pending debounce and save immediately with the new step
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }
    setStep(newStep);
    saveDraft(responsesRef.current, newStep);
  }

  const currentWords = countWords(responses[step]);
  const canProceed = currentWords >= 20;

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FFF9F0] flex items-center justify-center">
        <div className="text-center animate-fade-in">
          <div className="text-4xl mb-4 animate-bounce-slow">&#x1F989;</div>
          <p className="text-[#2D3436]/60 font-semibold">
            Preparing your writing prompts...
          </p>
        </div>
      </div>
    );
  }

  if (submitting) {
    return (
      <div className="min-h-screen bg-[#FFF9F0] flex items-center justify-center">
        <div className="text-center animate-fade-in">
          <div className="text-4xl mb-4 animate-bounce-slow">&#x1F989;</div>
          <p className="text-lg font-bold text-[#2D3436] mb-2">
            Ollie is reading your writing...
          </p>
          <p className="text-[#2D3436]/60 font-medium">
            This might take a moment. Great job finishing all three prompts!
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

  const promptLabels = ["Narrative", "Descriptive", "Persuasive"];

  return (
    <div className="min-h-screen bg-[#FFF9F0]">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-sm border-b border-[#FF6B6B]/10">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <button
            onClick={() => router.push("/dashboard")}
            className="flex items-center gap-2 text-sm font-semibold text-[#2D3436]/60 hover:text-[#2D3436] transition-colors"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
            Dashboard
          </button>
          {child && (
            <span className="text-sm font-semibold text-[#2D3436]/40">
              {child.name}&apos;s Writing Assessment
            </span>
          )}
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
        {/* Progress indicator */}
        <div className="flex items-center justify-center gap-3 mb-8 animate-fade-in">
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex items-center gap-3">
              <div
                className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-300 ${
                  i < step
                    ? "bg-[#4ECDC4] text-white"
                    : i === step
                      ? "bg-[#FF6B6B] text-white scale-110"
                      : "bg-[#2D3436]/10 text-[#2D3436]/40"
                }`}
              >
                {i < step ? (
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={3}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                ) : (
                  i + 1
                )}
              </div>
              {i < 2 && (
                <div
                  className={`w-12 h-0.5 rounded-full transition-colors duration-300 ${
                    i < step ? "bg-[#4ECDC4]" : "bg-[#2D3436]/10"
                  }`}
                />
              )}
            </div>
          ))}
        </div>

        {/* Step label */}
        <div className="text-center mb-6 animate-fade-in">
          <p className="text-sm font-bold text-[#FF6B6B] uppercase tracking-wide">
            Step {step + 1} of 3 &mdash; {promptLabels[step]} Writing
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-red-700 text-sm font-medium mb-6">
            {error}
          </div>
        )}

        {/* Prompt card */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-[#FF6B6B]/10 mb-6 animate-fade-in">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#FFE66D]/30 flex items-center justify-center text-lg shrink-0">
              <svg
                className="w-5 h-5 text-[#FF6B6B]"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                />
              </svg>
            </div>
            <div>
              <p className="text-sm font-bold text-[#2D3436]/50 mb-1">
                Writing Prompt
              </p>
              <p className="text-[#2D3436] font-semibold leading-relaxed">
                {prompts[step]}
              </p>
            </div>
          </div>
        </div>

        {/* Writing area */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-[#FF6B6B]/10 mb-4 animate-fade-in stagger-1">
          <label className="block text-sm font-bold text-[#2D3436] mb-2">
            Your Writing
          </label>
          <textarea
            value={responses[step]}
            onChange={(e) => handleResponseChange(e.target.value)}
            placeholder="Start writing here... Let your ideas flow!"
            className="writing-area writing-lined w-full min-h-[200px] px-4 py-3 border border-[#2D3436]/10 rounded-xl text-[#2D3436] placeholder-[#2D3436]/30 focus:outline-none focus:border-[#FF6B6B]/50 focus:ring-2 focus:ring-[#FF6B6B]/20 transition-colors resize-y leading-[30px]"
          />
        </div>

        {/* Word count + save status */}
        <div className="flex items-center justify-between mb-8 px-1">
          <p
            className={`text-sm font-semibold ${
              currentWords >= 20
                ? "text-[#4ECDC4]"
                : "text-[#2D3436]/40"
            }`}
          >
            {currentWords} {currentWords === 1 ? "word" : "words"}
            {currentWords < 20 && (
              <span className="text-[#2D3436]/30">
                {" "}
                (at least 20 needed)
              </span>
            )}
          </p>
          <p
            className={`text-xs font-medium transition-opacity duration-300 ${
              saveStatus === "idle"
                ? "opacity-0"
                : "opacity-100"
            } ${
              saveStatus === "saving"
                ? "text-[#2D3436]/40"
                : saveStatus === "saved"
                  ? "text-[#4ECDC4]"
                  : saveStatus === "error"
                    ? "text-red-400"
                    : ""
            }`}
          >
            {saveStatus === "saving" && "Saving..."}
            {saveStatus === "saved" && "Saved"}
            {saveStatus === "error" && "Could not save"}
          </p>
        </div>

        {/* Navigation buttons */}
        <div className="flex gap-3 animate-fade-in stagger-2">
          {step > 0 && (
            <button
              type="button"
              onClick={() => handleStepChange(step - 1)}
              className="flex-1 px-6 py-3 bg-white border border-[#2D3436]/10 text-[#2D3436]/60 rounded-xl text-sm font-bold hover:bg-[#2D3436]/5 transition-colors"
            >
              Back
            </button>
          )}
          {step < 2 ? (
            <button
              type="button"
              disabled={!canProceed}
              onClick={() => handleStepChange(step + 1)}
              className={`flex-1 px-6 py-3 rounded-xl text-sm font-bold transition-colors shadow-sm ${
                canProceed
                  ? "bg-[#FF6B6B] text-white hover:bg-[#FF6B6B]/90"
                  : "bg-[#2D3436]/10 text-[#2D3436]/30 cursor-not-allowed"
              }`}
            >
              Next
            </button>
          ) : (
            <button
              type="button"
              disabled={!canProceed}
              onClick={handleSubmit}
              className={`flex-1 px-6 py-3 rounded-xl text-sm font-bold transition-colors shadow-sm ${
                canProceed
                  ? "bg-[#FF6B6B] text-white hover:bg-[#FF6B6B]/90"
                  : "bg-[#2D3436]/10 text-[#2D3436]/30 cursor-not-allowed"
              }`}
            >
              Submit for Analysis
            </button>
          )}
        </div>
      </main>
    </div>
  );
}
