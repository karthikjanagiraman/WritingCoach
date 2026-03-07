"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { getPlacementTheme } from "@/components/placement/PlacementTheme";
import type { AgeMode } from "@/components/placement/PlacementTheme";

interface PromptScores {
  [dimension: string]: number;
}

interface PlacementData {
  id: string;
  childId: string;
  prompts: string[];
  responses: string[];
  aiAnalysis: {
    strengths: string[];
    gaps: string[];
    reasoning: string;
    promptScores?: {
      narrative: PromptScores;
      descriptive: PromptScores;
      persuasive: PromptScores;
    };
    promptAverages?: {
      narrative: number;
      descriptive: number;
      persuasive: number;
    };
  };
  recommendedTier: number;
  assignedTier: number;
  confidence: number;
}

const TIER_INFO: Record<
  number,
  { name: string; description: string; color: string }
> = {
  1: {
    name: "Foundational Writer",
    description:
      "Building strong foundations with creative stories and fun descriptions",
    color: "#FF6B6B",
  },
  2: {
    name: "Developing Writer",
    description:
      "Growing skills with multi-paragraph writing and persuasive arguments",
    color: "#6C5CE7",
  },
  3: {
    name: "Advanced Writer",
    description:
      "Mastering complex writing with thesis-driven essays and literary analysis",
    color: "#2D3436",
  },
};

function getScoreColor(score: number): string {
  if (score <= 1) return "#FF7675";
  if (score <= 2) return "#FDCB6E";
  if (score <= 3) return "#00B894";
  return "#0984E3";
}

const DIMENSION_LABELS: Record<string, string> = {
  voice_character: "Voice & Character",
  structure_plot: "Structure & Plot",
  imagery_figurative: "Imagery & Figurative Language",
  sensory_detail: "Sensory Detail",
  organization: "Organization",
  word_choice: "Word Choice",
  claim_evidence: "Claim & Evidence",
  counterargument: "Counterargument",
  persuasive_technique: "Persuasive Technique",
};

function formatDimensionLabel(key: string): string {
  return (
    DIMENSION_LABELS[key] ??
    key
      .replace(/_/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase())
  );
}

function getAgeTierFromAge(age: number): number {
  if (age <= 9) return 1;
  if (age <= 12) return 2;
  return 3;
}

export default function PlacementResultsPage() {
  const { childId } = useParams<{ childId: string }>();
  const router = useRouter();
  const { status } = useSession();

  const [placement, setPlacement] = useState<PlacementData | null>(null);
  const [childAge, setChildAge] = useState<number | null>(null);
  const [childName, setChildName] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedSample, setExpandedSample] = useState<number | null>(null);
  const [showTierPicker, setShowTierPicker] = useState(false);
  const [overriding, setOverriding] = useState(false);
  const [showRetakeModal, setShowRetakeModal] = useState(false);
  const [retaking, setRetaking] = useState(false);
  const [showConfidenceTooltip, setShowConfidenceTooltip] = useState(false);

  const fetchResults = useCallback(async () => {
    try {
      // Fetch child info for age-adaptive styling
      const childRes = await fetch(`/api/children/${childId}`);
      if (childRes.ok) {
        const childData = await childRes.json();
        setChildAge(childData.child.age);
        setChildName(childData.child.name);
      }

      const res = await fetch(`/api/placement/${childId}`);

      if (res.status === 404) {
        router.replace(`/placement/${childId}`);
        return;
      }

      if (!res.ok) {
        throw new Error("Failed to load results");
      }

      const data = await res.json();
      setPlacement(data.placement);
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
      fetchResults();
    }
  }, [status, router, fetchResults]);

  async function handleTierOverride(tier: number) {
    setOverriding(true);
    setError(null);

    try {
      const res = await fetch(`/api/placement/${childId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assignedTier: tier }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to update tier");
      }

      router.push(`/curriculum/${childId}/setup`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setOverriding(false);
    }
  }

  function handleAccept() {
    router.push(`/curriculum/${childId}/setup`);
  }

  async function handleRetake() {
    setRetaking(true);
    try {
      const res = await fetch(`/api/placement/${childId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        throw new Error("Failed to retake assessment");
      }
      router.push(`/placement/${childId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setRetaking(false);
      setShowRetakeModal(false);
    }
  }

  // Derive age mode from child age or fall back based on tier
  const ageMode: AgeMode = childAge
    ? getPlacementTheme(childAge).ageMode
    : "young";
  const isTeen = ageMode === "teen";
  const isMiddle = ageMode === "middle";

  // Age-adaptive page styling
  const pageBg = isTeen ? "#FFFFFF" : isMiddle ? "#F8F9FD" : "#FFF9F0";
  const headerBorderColor = isTeen
    ? "#E2E8F0"
    : isMiddle
      ? "rgba(108, 92, 231, 0.1)"
      : "rgba(255, 107, 107, 0.1)";
  const cardBorderColor = isTeen
    ? "#E2E8F0"
    : isMiddle
      ? "rgba(108, 92, 231, 0.1)"
      : "rgba(255, 107, 107, 0.1)";
  const fontFamily = isTeen
    ? "'Sora', sans-serif"
    : isMiddle
      ? "'DM Sans', sans-serif"
      : "'Nunito', sans-serif";

  if (loading) {
    if (isTeen) {
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
              Loading results...
            </p>
          </div>
        </div>
      );
    }

    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: pageBg }}
      >
        <div className="text-center animate-fade-in">
          <div className="text-4xl mb-4 animate-bounce-slow">&#x1F989;</div>
          <p className="text-[#2D3436]/60 font-semibold">
            Loading results...
          </p>
        </div>
      </div>
    );
  }

  if (error && !placement) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: pageBg }}
      >
        <div className="text-center max-w-md mx-auto px-4">
          <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-red-700 text-sm font-medium mb-4">
            {error}
          </div>
          <button
            onClick={() => router.push("/dashboard")}
            className="px-6 py-3 text-white rounded-xl text-sm font-bold hover:opacity-90 transition-colors"
            style={{
              background: isTeen
                ? "#2D3436"
                : isMiddle
                  ? "#6C5CE7"
                  : "#FF6B6B",
            }}
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (!placement) return null;

  const tierInfo = TIER_INFO[placement.assignedTier];
  const recTierInfo = TIER_INFO[placement.recommendedTier];
  const confidencePct = Math.round(placement.confidence * 100);
  const promptLabels = ["Narrative", "Descriptive", "Persuasive"];

  // Tier clamping for override: only show tiers within 1 of age-appropriate tier
  const ageTier = childAge ? getAgeTierFromAge(childAge) : placement.recommendedTier;
  const minTier = Math.max(1, ageTier - 1);
  const maxTier = Math.min(3, ageTier + 1);
  const validTiers = [1, 2, 3].filter((t) => t >= minTier && t <= maxTier);

  return (
    <div className="min-h-screen" style={{ background: pageBg, fontFamily }}>
      {/* Header */}
      <header
        className="sticky top-0 z-30 bg-white/90 backdrop-blur-sm"
        style={{ borderBottom: `1px solid ${headerBorderColor}` }}
      >
        <div className="max-w-2xl mx-auto px-4 sm:px-6 h-14 flex items-center">
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
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        {/* Section 1: Assessment Complete */}
        <div className="text-center animate-fade-in">
          {!isTeen && <div className="text-5xl mb-3">&#x1F389;</div>}
          <h1
            className="text-2xl font-extrabold text-[#2D3436] mb-2"
            style={isTeen ? { fontFamily: "'Sora', sans-serif", fontSize: 20, fontWeight: 600 } : undefined}
          >
            Assessment Complete{isTeen ? "" : "!"}
          </h1>
          <p className="text-[#2D3436]/60 font-medium">
            {isTeen
              ? `Here's a summary of ${childName || "your child"}'s writing assessment.`
              : "Here's what we learned about your writing."}
          </p>
        </div>

        {/* Recommended tier card */}
        <div
          className="bg-white rounded-2xl p-6 shadow-sm animate-fade-in stagger-1"
          style={{ border: `1px solid ${cardBorderColor}` }}
        >
          <p className="text-sm font-bold text-[#2D3436]/50 mb-3 uppercase tracking-wide">
            Recommended Level
          </p>
          <div className="flex items-center gap-4 mb-4">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center text-white text-xl font-extrabold shrink-0"
              style={{
                backgroundColor: isTeen ? "transparent" : recTierInfo.color,
                ...(isTeen
                  ? {
                      border: `2px solid ${recTierInfo.color}`,
                      color: recTierInfo.color,
                    }
                  : {}),
              }}
            >
              {placement.recommendedTier}
            </div>
            <div>
              <p className="text-lg font-extrabold text-[#2D3436]">
                {recTierInfo.name}
              </p>
              <p className="text-sm text-[#2D3436]/60 font-medium">
                {recTierInfo.description}
              </p>
            </div>
          </div>

          {/* Confidence meter */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-1 relative">
                <p className="text-xs font-bold text-[#2D3436]/40 uppercase tracking-wide">
                  {isTeen ? "Assessment Confidence" : "Confidence"}
                </p>
                {/* Info icon with tooltip */}
                <button
                  type="button"
                  className="relative"
                  onMouseEnter={() => setShowConfidenceTooltip(true)}
                  onMouseLeave={() => setShowConfidenceTooltip(false)}
                  onClick={() =>
                    setShowConfidenceTooltip(!showConfidenceTooltip)
                  }
                  aria-describedby="confidence-tooltip"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: 16,
                    height: 16,
                    borderRadius: "50%",
                    background: "#E2E8F0",
                    color: "#94A3B8",
                    fontSize: 10,
                    fontWeight: 700,
                    cursor: "help",
                    border: "none",
                    padding: 0,
                  }}
                >
                  i
                  {showConfidenceTooltip && (
                    <div
                      id="confidence-tooltip"
                      role="tooltip"
                      style={{
                        position: "absolute",
                        bottom: "calc(100% + 8px)",
                        left: "50%",
                        transform: "translateX(-50%)",
                        width: 280,
                        padding: "12px 16px",
                        background: "#1E293B",
                        color: "#F1F5F9",
                        fontSize: 12,
                        fontWeight: 400,
                        lineHeight: 1.65,
                        borderRadius: 8,
                        boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                        zIndex: 10,
                        textTransform: "none",
                        letterSpacing: "normal",
                        textAlign: "left",
                      }}
                    >
                      This indicates how confident the AI is in the tier
                      recommendation. A higher percentage means the writing
                      samples clearly aligned with this tier&apos;s
                      expectations. A lower percentage may mean your
                      child&apos;s writing spans multiple levels.
                      {/* Arrow */}
                      <div
                        style={{
                          position: "absolute",
                          bottom: -6,
                          left: "50%",
                          transform: "translateX(-50%)",
                          width: 0,
                          height: 0,
                          borderLeft: "6px solid transparent",
                          borderRight: "6px solid transparent",
                          borderTop: "6px solid #1E293B",
                        }}
                      />
                    </div>
                  )}
                </button>
              </div>
              <p
                className="text-xs font-bold"
                style={{ color: isMiddle ? "#00B894" : "#4ECDC4" }}
              >
                {confidencePct}%
              </p>
            </div>
            <div className="w-full h-2 bg-[#2D3436]/5 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-1000 ease-out"
                style={{
                  width: `${confidencePct}%`,
                  background: isMiddle ? "#00B894" : "#4ECDC4",
                }}
              />
            </div>
          </div>
        </div>

        {/* Section 2: Strengths and Growth Areas */}
        <div
          className="bg-white rounded-2xl p-6 shadow-sm animate-fade-in stagger-2"
          style={{ border: `1px solid ${cardBorderColor}` }}
        >
          <p className="text-sm font-bold text-[#2D3436]/50 mb-4 uppercase tracking-wide">
            {isTeen ? "Assessment Summary" : "What We Noticed"}
          </p>

          {/* Strengths */}
          {placement.aiAnalysis.strengths.length > 0 && (
            <div className="mb-5">
              <p
                className="text-sm font-bold mb-2"
                style={{ color: isMiddle ? "#00B894" : "#4ECDC4" }}
              >
                Strengths
              </p>
              <div className="space-y-2">
                {placement.aiAnalysis.strengths.map((s, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <svg
                      className="w-4 h-4 mt-0.5 shrink-0"
                      style={{ color: isMiddle ? "#00B894" : "#4ECDC4" }}
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
                    <p className="text-sm text-[#2D3436]/80 font-medium">
                      {s}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Growth areas */}
          {placement.aiAnalysis.gaps.length > 0 && (
            <div className="mb-5">
              <p className="text-sm font-bold text-[#FF6B6B] mb-2">
                Growth Areas
              </p>
              <div className="space-y-2">
                {placement.aiAnalysis.gaps.map((g, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <svg
                      className="w-4 h-4 text-[#FF6B6B] mt-0.5 shrink-0"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 10l7-7m0 0l7 7m-7-7v18"
                      />
                    </svg>
                    <p className="text-sm text-[#2D3436]/80 font-medium">
                      {g}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* AI reasoning */}
          {placement.aiAnalysis.reasoning && (
            <div
              className="rounded-xl p-4"
              style={{
                background: isTeen
                  ? "#F8FAFC"
                  : isMiddle
                    ? "#F8F9FD"
                    : "#FFF9F0",
              }}
            >
              <p className="text-xs font-bold text-[#2D3436]/40 mb-1 uppercase tracking-wide">
                Assessment Notes
              </p>
              <p className="text-sm text-[#2D3436]/70 font-medium leading-relaxed">
                {placement.aiAnalysis.reasoning}
              </p>
            </div>
          )}
        </div>

        {/* Score Breakdown Section (if promptScores available) */}
        {placement.aiAnalysis.promptScores && (
          <ScoreBreakdown
            promptScores={placement.aiAnalysis.promptScores}
            promptAverages={placement.aiAnalysis.promptAverages}
            cardBorderColor={cardBorderColor}
          />
        )}

        {/* Section 3: Writing Samples */}
        <div
          className="bg-white rounded-2xl p-6 shadow-sm animate-fade-in stagger-3"
          style={{ border: `1px solid ${cardBorderColor}` }}
        >
          <p className="text-sm font-bold text-[#2D3436]/50 mb-4 uppercase tracking-wide">
            Your Writing Samples
          </p>
          <div className="space-y-3">
            {placement.prompts.map((prompt, i) => (
              <div
                key={i}
                className="border border-[#2D3436]/10 rounded-xl overflow-hidden"
              >
                <button
                  type="button"
                  onClick={() =>
                    setExpandedSample(expandedSample === i ? null : i)
                  }
                  className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-[#2D3436]/[0.02] transition-colors"
                >
                  <span className="text-sm font-bold text-[#2D3436]">
                    {promptLabels[i]} Writing
                  </span>
                  <svg
                    className={`w-4 h-4 text-[#2D3436]/40 transition-transform duration-200 ${
                      expandedSample === i ? "rotate-180" : ""
                    }`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </button>
                {expandedSample === i && (
                  <div className="px-4 pb-4 animate-fade-in">
                    <div className="bg-[#FFE66D]/20 rounded-lg p-3 mb-3">
                      <p className="text-xs font-bold text-[#2D3436]/40 mb-1">
                        Prompt
                      </p>
                      <p className="text-sm text-[#2D3436]/80 font-medium">
                        {prompt}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-bold text-[#2D3436]/40 mb-1">
                        Response
                      </p>
                      <p className="text-sm text-[#2D3436]/70 leading-relaxed whitespace-pre-wrap">
                        {placement.responses[i]}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Section 4: Actions */}
        <div className="animate-fade-in stagger-4 space-y-3">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-red-700 text-sm font-medium">
              {error}
            </div>
          )}

          {!showTierPicker ? (
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowTierPicker(true)}
                className="flex-1 px-6 py-3 bg-white border border-[#2D3436]/10 text-[#2D3436]/60 rounded-xl text-sm font-bold hover:bg-[#2D3436]/5 transition-colors"
              >
                Choose a Different Tier
              </button>
              <button
                type="button"
                onClick={handleAccept}
                className="flex-1 px-6 py-3 text-white rounded-xl text-sm font-bold hover:opacity-90 transition-colors shadow-sm"
                style={{ background: tierInfo.color }}
              >
                Accept & Continue
              </button>
            </div>
          ) : (
            <div
              className="bg-white rounded-2xl p-6 shadow-sm"
              style={{ border: `1px solid ${cardBorderColor}` }}
            >
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm font-bold text-[#2D3436]/50 uppercase tracking-wide">
                  Choose a Tier
                </p>
                <button
                  type="button"
                  onClick={() => setShowTierPicker(false)}
                  className="text-sm font-semibold text-[#2D3436]/40 hover:text-[#2D3436] transition-colors"
                >
                  Cancel
                </button>
              </div>

              {/* Guidance text */}
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 500,
                  lineHeight: 1.7,
                  color: "#64748B",
                  marginBottom: 16,
                  padding: "12px 16px",
                  background: "#FFFBEB",
                  border: "1px solid #FDE68A",
                  borderRadius: 10,
                }}
              >
                The assessment placed{" "}
                {childName || "your child"} at{" "}
                {recTierInfo.name}. If you think a different level would be a
                better fit, you can choose one below. We recommend staying
                within one level of the recommendation.
              </div>

              <div className="space-y-3">
                {validTiers.map((tier) => {
                  const info = TIER_INFO[tier];
                  const isRecommended = tier === placement.recommendedTier;
                  const isCurrent = tier === placement.assignedTier;
                  return (
                    <button
                      key={tier}
                      type="button"
                      disabled={overriding}
                      onClick={() => {
                        if (isCurrent && isRecommended) return;
                        handleTierOverride(tier);
                      }}
                      className={`w-full text-left p-4 rounded-xl border-2 transition-all hover:shadow-sm disabled:opacity-50 disabled:cursor-not-allowed ${
                        isRecommended
                          ? "border-[#4ECDC4] bg-[#4ECDC4]/5"
                          : "border-[#2D3436]/10 hover:border-[#2D3436]/20"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-sm font-extrabold shrink-0"
                          style={{ backgroundColor: info.color }}
                        >
                          {tier}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-extrabold text-[#2D3436]">
                              {info.name}
                            </p>
                            {isRecommended && (
                              <span className="text-[10px] font-bold text-[#4ECDC4] bg-[#4ECDC4]/10 px-2 py-0.5 rounded-full uppercase">
                                Recommended
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-[#2D3436]/60 font-medium mt-0.5">
                            {info.description}
                          </p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Retake divider and button */}
          <div style={{ borderTop: "1px solid #F1F5F9", margin: "24px 0 16px" }} />
          <p
            style={{
              fontSize: 13,
              fontWeight: 500,
              color: "#94A3B8",
              textAlign: "center",
              marginBottom: 12,
            }}
          >
            Didn&apos;t go well? You can retake the assessment.
          </p>
          <button
            type="button"
            onClick={() => setShowRetakeModal(true)}
            style={{
              display: "block",
              width: "auto",
              margin: "0 auto",
              padding: "10px 24px",
              background: "transparent",
              border: "1px solid #E2E8F0",
              borderRadius: 10,
              fontSize: 13,
              fontWeight: 600,
              color: "#64748B",
              cursor: "pointer",
              transition: "all 0.2s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "#F8FAFC";
              e.currentTarget.style.borderColor = "#CBD5E1";
              e.currentTarget.style.color = "#334155";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
              e.currentTarget.style.borderColor = "#E2E8F0";
              e.currentTarget.style.color = "#64748B";
            }}
          >
            Retake Assessment
          </button>
        </div>

        {/* Bottom spacing */}
        <div className="h-8" />
      </main>

      {/* Retake confirmation modal */}
      {showRetakeModal && (
        <div
          role="alertdialog"
          aria-labelledby="retake-title"
          aria-describedby="retake-description"
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.3)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 100,
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowRetakeModal(false);
          }}
        >
          <div
            style={{
              background: "#FFFFFF",
              borderRadius: 16,
              padding: 28,
              maxWidth: 380,
              width: "90%",
              boxShadow: "0 20px 60px rgba(0,0,0,0.15)",
            }}
          >
            <h3
              id="retake-title"
              style={{
                fontSize: 18,
                fontWeight: 700,
                color: "#2D3436",
                marginBottom: 12,
              }}
            >
              Retake Assessment?
            </h3>
            <p
              id="retake-description"
              style={{
                fontSize: 14,
                fontWeight: 400,
                lineHeight: 1.7,
                color: "#64748B",
                marginBottom: 24,
              }}
            >
              This will erase the current results and{" "}
              {childName || "your child"} will need to complete all three
              writing activities again.
            </p>
            <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
              <button
                type="button"
                onClick={() => setShowRetakeModal(false)}
                disabled={retaking}
                style={{
                  padding: "10px 20px",
                  borderRadius: 10,
                  background: "#F1F5F9",
                  color: "#64748B",
                  fontWeight: 600,
                  fontSize: 14,
                  border: "none",
                  cursor: "pointer",
                }}
                autoFocus
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRetake}
                disabled={retaking}
                style={{
                  padding: "10px 20px",
                  borderRadius: 10,
                  background: "#EF4444",
                  color: "#FFFFFF",
                  fontWeight: 600,
                  fontSize: 14,
                  border: "none",
                  cursor: retaking ? "not-allowed" : "pointer",
                  opacity: retaking ? 0.5 : 1,
                }}
              >
                {retaking ? "Retaking..." : "Yes, Retake"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// --- Score Breakdown Component ---

function ScoreBreakdown({
  promptScores,
  promptAverages,
  cardBorderColor,
}: {
  promptScores: {
    narrative: PromptScores;
    descriptive: PromptScores;
    persuasive: PromptScores;
  };
  promptAverages?: {
    narrative: number;
    descriptive: number;
    persuasive: number;
  };
  cardBorderColor: string;
}) {
  const types = [
    { key: "narrative" as const, label: "Narrative Writing" },
    { key: "descriptive" as const, label: "Descriptive Writing" },
    { key: "persuasive" as const, label: "Persuasive Writing" },
  ];

  let barIndex = 0;

  return (
    <div
      className="bg-white rounded-2xl p-6 shadow-sm animate-fade-in stagger-2"
      style={{ border: `1px solid ${cardBorderColor}` }}
    >
      <p className="text-sm font-bold text-[#2D3436]/50 mb-5 uppercase tracking-wide">
        Score Breakdown
      </p>

      {types.map((type, typeIdx) => {
        const scores = promptScores[type.key];
        if (!scores) return null;

        const avg = promptAverages?.[type.key];
        const dimensions = Object.entries(scores);

        return (
          <div key={type.key}>
            {typeIdx > 0 && (
              <div
                style={{
                  borderTop: "1px solid #F1F5F9",
                  margin: "16px 0",
                }}
              />
            )}

            {/* Type header row */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "baseline",
                marginBottom: 12,
              }}
            >
              <span
                style={{ fontSize: 15, fontWeight: 700, color: "#2D3436" }}
              >
                {type.label}
              </span>
              {avg !== undefined && (
                <span
                  style={{ fontSize: 13, fontWeight: 600, color: "#64748B" }}
                >
                  {avg.toFixed(1)} / 4
                </span>
              )}
            </div>

            {/* Dimension bars */}
            {dimensions.map(([dimension, score]) => {
              const currentBarIdx = barIndex++;
              const barWidth = (score / 4) * 100;

              return (
                <div
                  key={dimension}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    marginBottom: 8,
                  }}
                >
                  {/* Dimension label */}
                  <span
                    style={{
                      width: 140,
                      fontSize: 12,
                      fontWeight: 500,
                      color: "#64748B",
                      textAlign: "right",
                      flexShrink: 0,
                    }}
                  >
                    {formatDimensionLabel(dimension)}
                  </span>

                  {/* Bar track */}
                  <div
                    style={{
                      flex: 1,
                      height: 8,
                      background: "#F1F5F9",
                      borderRadius: 4,
                      overflow: "hidden",
                    }}
                  >
                    <div
                      role="meter"
                      aria-valuenow={score}
                      aria-valuemin={1}
                      aria-valuemax={4}
                      aria-label={`${formatDimensionLabel(dimension)}: ${score} out of 4`}
                      style={{
                        height: "100%",
                        borderRadius: 4,
                        background: getScoreColor(score),
                        width: `${barWidth}%`,
                        transition: "width 1s ease-out",
                        transitionDelay: `${currentBarIdx * 100}ms`,
                      }}
                    />
                  </div>

                  {/* Score label */}
                  <span
                    style={{
                      width: 32,
                      fontSize: 11,
                      fontWeight: 600,
                      color: "#94A3B8",
                      textAlign: "right",
                      flexShrink: 0,
                    }}
                  >
                    {score}/4
                  </span>
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}
