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
import { AssessmentIntro } from "@/components/placement/AssessmentIntro";
import { getPlacementTheme } from "@/components/placement/PlacementTheme";
import type { PlacementTheme } from "@/components/placement/PlacementTheme";

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

  // Middle band celebration banner state
  const [showMiddleBanner, setShowMiddleBanner] = useState(false);
  const [middleBannerText, setMiddleBannerText] = useState("");

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

  // Compute theme from child age
  const theme: PlacementTheme | null = child
    ? getPlacementTheme(child.age)
    : null;

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
        body: JSON.stringify({
          childId,
          prompts,
          responses: responsesRef.current,
        }),
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

    if (theme?.ageMode === "teen") {
      // Teen: no celebration overlay — advance directly
      handleTeenAdvance();
    } else if (theme?.ageMode === "middle") {
      // Middle: show inline banner then advance
      handleMiddleAdvance();
    } else {
      // Young: show celebration overlay
      setShowCelebration(true);
    }
  }

  function handleTeenAdvance() {
    if (step < 2) {
      // Fade card out
      setCardTransitioning(true);

      setTimeout(() => {
        const nextStep = step + 1;
        setStep(nextStep);
        saveDraft(responsesRef.current, nextStep);

        // Fade card back in
        setTimeout(() => {
          setCardTransitioning(false);
        }, 50);
      }, 250);
    } else {
      // Last trial - submit to API
      handleSubmitToAPI();
    }
  }

  function handleMiddleAdvance() {
    const bannerTexts = [
      "Nice work! Moving to Activity 2...",
      "Great job! One more to go...",
      "All done! Analyzing your writing...",
    ];
    setMiddleBannerText(bannerTexts[step]);
    setShowMiddleBanner(true);

    // Auto-dismiss banner after 1800ms, then advance
    setTimeout(() => {
      setShowMiddleBanner(false);

      setTimeout(() => {
        if (step < 2) {
          setCardTransitioning(true);
          setTimeout(() => {
            const nextStep = step + 1;
            setStep(nextStep);
            saveDraft(responsesRef.current, nextStep);
            setTimeout(() => {
              setCardTransitioning(false);
            }, 50);
          }, 250);
        } else {
          // Last trial - show simple loading and submit
          setSubmitting(true);
          handleSubmitToAPI();
        }
      }, 200);
    }, 1800);
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
  const canSubmit = theme
    ? currentWords >= theme.wordMinimum
    : currentWords >= 20;
  const trial = TRIAL_CONFIG[step];

  // Loading state — age-adaptive
  if (loading) {
    // If child hasn't loaded yet, show a neutral spinner (no emoji, no text)
    if (!child) {
      return (
        <div className="min-h-screen flex items-center justify-center" style={{ background: "#F8FAFC" }}>
          <div className="w-8 h-8 border-4 border-[#E2E8F0] border-t-[#94A3B8] rounded-full animate-spin" />
        </div>
      );
    }

    if (theme?.ageMode === "teen") {
      return (
        <div
          className="min-h-screen flex items-center justify-center"
          style={{ background: "#FFFFFF" }}
        >
          <div className="text-center animate-fade-in">
            <div
              style={{
                width: 24,
                height: 24,
                border: "2px solid #E2E8F0",
                borderTopColor: "#2D3436",
                borderRadius: "50%",
                animation: "spin 0.8s linear infinite",
                margin: "0 auto 16px",
              }}
            />
            <p
              style={{
                fontFamily: "'Sora', sans-serif",
                fontSize: 14,
                fontWeight: 500,
                color: "#64748B",
              }}
            >
              Loading assessment...
            </p>
          </div>
        </div>
      );
    }

    // Young/Middle loading
    const loadingBg = theme?.ageMode === "middle" ? "#F8F9FD" : "#FFF9F0";
    const loadingText =
      theme?.ageMode === "middle"
        ? "Getting your activities ready..."
        : "Preparing your writing quest...";

    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: loadingBg }}
      >
        <div className="text-center animate-fade-in">
          <div className="text-4xl mb-4 animate-bounce-slow">&#x1F989;</div>
          <p className="text-[#2D3436]/60 font-semibold">{loadingText}</p>
        </div>
      </div>
    );
  }

  // Error state — age-adaptive
  if (error && prompts.length === 0) {
    if (theme?.ageMode === "teen") {
      return (
        <div
          className="min-h-screen flex items-center justify-center"
          style={{ background: "#FFFFFF" }}
        >
          <div className="text-center max-w-md mx-auto px-4">
            <div
              style={{
                background: "#FFFFFF",
                border: "1px solid #E2E8F0",
                borderLeft: "4px solid #EF4444",
                borderRadius: 8,
                padding: "16px 20px",
                display: "flex",
                alignItems: "flex-start",
                gap: 12,
                marginBottom: 16,
              }}
            >
              <svg
                width={20}
                height={20}
                viewBox="0 0 24 24"
                fill="none"
                stroke="#EF4444"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ flexShrink: 0, marginTop: 1 }}
              >
                <circle cx="12" cy="12" r="10" />
                <line x1="15" y1="9" x2="9" y2="15" />
                <line x1="9" y1="9" x2="15" y2="15" />
              </svg>
              <p
                style={{
                  fontFamily: "'Sora', sans-serif",
                  fontSize: 14,
                  fontWeight: 400,
                  color: "#334155",
                  lineHeight: 1.6,
                  margin: 0,
                }}
              >
                {error}
              </p>
            </div>
            <button
              onClick={() => router.push("/dashboard")}
              style={{
                background: "transparent",
                border: "1px solid #E2E8F0",
                color: "#64748B",
                padding: "10px 24px",
                borderRadius: 8,
                fontFamily: "'Sora', sans-serif",
                fontSize: 14,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      );
    }

    const errorBg = theme?.ageMode === "middle" ? "#F8F9FD" : "#FFF9F0";
    const errorBtnBg = theme?.ageMode === "middle" ? "#6C5CE7" : "#FF6B6B";

    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: errorBg }}
      >
        <div className="text-center max-w-md mx-auto px-4">
          <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-red-700 text-sm font-medium mb-4">
            {error}
          </div>
          <button
            onClick={() => router.push("/dashboard")}
            className="px-6 py-3 text-white rounded-xl text-sm font-bold hover:opacity-90 transition-colors"
            style={{ background: errorBtnBg }}
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  // --- Main render ---

  const pageBg = theme?.pageBg ?? "#FFF9F0";
  const isTeen = theme?.ageMode === "teen";
  const isMiddle = theme?.ageMode === "middle";

  // Time estimate badge config
  const timeEstimateConfig = theme
    ? {
        text:
          theme.ageMode === "teen"
            ? `~${theme.timeEstimate.replace(" minutes", " min")}`
            : `About ${theme.timeEstimate.replace(" minutes", " min")}`,
        iconColor:
          theme.ageMode === "teen"
            ? "#94A3B8"
            : theme.ageMode === "middle"
              ? "#6C5CE7"
              : "#FF6B6B",
        textColor:
          theme.ageMode === "teen"
            ? "#94A3B8"
            : theme.ageMode === "middle"
              ? "#2D343670"
              : "#2D343680",
        fontFamily: theme.fontFamily,
        fontWeight: theme.ageMode === "teen" ? 500 : theme.ageMode === "middle" ? 600 : 700,
      }
    : null;

  return (
    <div
      className="min-h-screen overflow-x-hidden"
      style={{ background: pageBg, fontFamily: theme?.fontFamily || "inherit" }}
    >
      {theme?.showCharacters && <QuestCharacterDefs />}
      {theme?.showAmbientParticles && <AmbientParticles trialIndex={step} />}

      {/* Teen: Sticky header */}
      {isTeen && (
        <header
          style={{
            height: 56,
            background: "#FFFFFF",
            borderBottom: "1px solid #E2E8F0",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 24px",
            position: "sticky",
            top: 0,
            zIndex: 30,
          }}
        >
          {/* Back button */}
          <button
            onClick={() => router.push("/dashboard")}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              fontFamily: "'Sora', sans-serif",
              fontSize: 14,
              fontWeight: 500,
              color: "#64748B",
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: 0,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = "#2D3436";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = "#64748B";
            }}
          >
            <svg
              width={16}
              height={16}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15 19l-7-7 7-7"
              />
            </svg>
            Back to Dashboard
          </button>

          {/* Right side: time estimate + section indicator + dots */}
          <div
            style={{ display: "flex", alignItems: "center", gap: 16 }}
          >
            {/* Time estimate (teen: inline text) */}
            {timeEstimateConfig && (
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                  fontFamily: "'Sora', sans-serif",
                  fontSize: 12,
                  fontWeight: 500,
                  color: "#94A3B8",
                }}
                aria-label={`Estimated time: about ${theme?.timeEstimate}`}
              >
                <svg
                  width={14}
                  height={14}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#94A3B8"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
                {timeEstimateConfig.text}
              </span>
            )}

            <span
              style={{
                fontFamily: "'Sora', sans-serif",
                fontSize: 13,
                fontWeight: 600,
                color: "#94A3B8",
              }}
            >
              Section {step + 1} of 3
            </span>

            {/* Section dots */}
            <div
              style={{ display: "flex", gap: 6, marginLeft: 0 }}
              role="progressbar"
              aria-valuenow={step + 1}
              aria-valuemin={1}
              aria-valuemax={3}
              aria-label={`Assessment progress, section ${step + 1} of 3`}
            >
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    transition: "all 0.3s ease",
                    ...(completedTrials.has(i)
                      ? { background: "#0984E3" }
                      : i === step
                        ? {
                            background: "#2D3436",
                            boxShadow: "0 0 0 3px #2D343620",
                          }
                        : { background: "#E2E8F0" }),
                  }}
                />
              ))}
            </div>
          </div>
        </header>
      )}

      {/* Young/Middle: Back to dashboard + time estimate badge */}
      {!isTeen && (
        <div className="relative" style={{ zIndex: 2 }}>
          <button
            onClick={() => router.push("/dashboard")}
            className="absolute top-4 left-4 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[0.8rem] font-semibold text-[#2D3436]/40 hover:text-[#2D3436]/70 hover:bg-white/50 transition-colors"
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

          {/* Time estimate badge (young/middle) */}
          {timeEstimateConfig && (
            <div
              className="absolute top-4 right-4"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "6px 14px",
                background: isMiddle
                  ? "rgba(255, 255, 255, 0.8)"
                  : "rgba(255, 255, 255, 0.7)",
                backdropFilter: "blur(4px)",
                borderRadius: 20,
                border: isMiddle
                  ? "1px solid rgba(108, 92, 231, 0.1)"
                  : "1px solid rgba(255, 107, 107, 0.15)",
              }}
              aria-label={`Estimated time: about ${theme?.timeEstimate}`}
            >
              <svg
                width={14}
                height={14}
                viewBox="0 0 24 24"
                fill="none"
                stroke={timeEstimateConfig.iconColor}
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
              <span
                style={{
                  fontFamily: timeEstimateConfig.fontFamily,
                  fontSize: 12,
                  fontWeight: timeEstimateConfig.fontWeight,
                  color: timeEstimateConfig.textColor,
                }}
              >
                {timeEstimateConfig.text}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Main layout */}
      {isTeen ? (
        // Teen: single centered column, no sidebar
        <div style={{ maxWidth: 680, margin: "0 auto", padding: "0 24px 60px" }}>
          {error && (
            <div
              style={{
                background: "#FFFFFF",
                border: "1px solid #E2E8F0",
                borderLeft: "4px solid #EF4444",
                borderRadius: 8,
                padding: "16px 20px",
                display: "flex",
                alignItems: "flex-start",
                gap: 12,
                margin: "16px 0",
              }}
            >
              <svg
                width={20}
                height={20}
                viewBox="0 0 24 24"
                fill="none"
                stroke="#EF4444"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ flexShrink: 0, marginTop: 1 }}
              >
                <circle cx="12" cy="12" r="10" />
                <line x1="15" y1="9" x2="9" y2="15" />
                <line x1="9" y1="9" x2="15" y2="15" />
              </svg>
              <p
                style={{
                  fontFamily: "'Sora', sans-serif",
                  fontSize: 14,
                  fontWeight: 400,
                  color: "#334155",
                  lineHeight: 1.6,
                  margin: 0,
                }}
              >
                {error}
              </p>
            </div>
          )}

          <QuestCard
            trial={trial}
            trialIndex={step}
            ollieSays=""
            prompt={prompts[step] || ""}
            response={responses[step]}
            onResponseChange={handleResponseChange}
            onSubmit={handleTrialSubmit}
            canSubmit={canSubmit}
            wordCount={currentWords}
            saveStatus={saveStatus}
            isTransitioning={cardTransitioning}
            ageMode="teen"
            wordMinimum={theme?.wordMinimum ?? 60}
          />
        </div>
      ) : (
        // Young/Middle: sidebar + card layout
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
          {theme?.showQuestTrailSidebar && (
            <QuestTrailSidebar
              currentTrial={step}
              completedTrials={completedTrials}
            />
          )}

          {/* Right panel */}
          <div className="flex-1 min-w-0">
            {/* Middle band: inline celebration banner */}
            {showMiddleBanner && isMiddle && (
              <div
                style={{
                  position: "relative",
                  marginBottom: 16,
                  padding: "16px 20px",
                  borderRadius: 16,
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  background:
                    "linear-gradient(135deg, #F0FFF4, #F8F9FD)",
                  border: "1px solid #00B89430",
                  boxShadow: "0 2px 12px rgba(0, 184, 148, 0.08)",
                  animation: "slideDownFade 0.4s ease-out",
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: 14,
                  fontWeight: 700,
                  color: "#2D3436",
                }}
              >
                <span style={{ fontSize: 24 }}>&#x2713;</span>
                {middleBannerText}
              </div>
            )}

            {error && !isTeen && (
              <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-red-700 text-sm font-medium mb-4">
                {error}
              </div>
            )}

            {/* Middle band: simple loading after final submit */}
            {submitting && isMiddle && step === 2 ? (
              <div style={{ textAlign: "center", padding: "60px 24px" }}>
                <div
                  style={{
                    width: 32,
                    height: 32,
                    border: "3px solid #6C5CE720",
                    borderTopColor: "#6C5CE7",
                    borderRadius: "50%",
                    animation: "spin 0.8s linear infinite",
                    margin: "0 auto 16px",
                  }}
                />
                <p
                  style={{
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: 15,
                    fontWeight: 600,
                    color: "#2D3436aa",
                  }}
                >
                  Analyzing your writing...
                </p>
              </div>
            ) : (
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
                ageMode={theme?.ageMode ?? "young"}
                wordMinimum={theme?.wordMinimum ?? 20}
              />
            )}
          </div>
        </div>
      )}

      {/* Intro overlays */}
      {showIntro && theme?.showIntroNarration && (
        <QuestIntro
          childName={child?.name ?? "young writer"}
          onComplete={() => setShowIntro(false)}
          condensed={isMiddle}
        />
      )}

      {showIntro && !theme?.showIntroNarration && theme?.ageMode === "teen" && (
        <AssessmentIntro onComplete={() => setShowIntro(false)} />
      )}

      {/* Celebration overlay (young only) */}
      {theme?.showTrialCelebration && (
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
      )}

      {/* Finale overlay (young only) */}
      {theme?.showQuestFinale && (
        <QuestFinale
          visible={showFinale}
          childName={child?.name ?? "young writer"}
        />
      )}

      {/* Inline styles for animations needed by middle/teen */}
      <style>{`
        @keyframes slideDownFade {
          from { opacity: 0; transform: translateY(-12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>
    </div>
  );
}
