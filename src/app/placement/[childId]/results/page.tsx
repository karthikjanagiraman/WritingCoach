"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

interface PlacementData {
  id: string;
  childId: string;
  prompts: string[];
  responses: string[];
  aiAnalysis: {
    strengths: string[];
    gaps: string[];
    reasoning: string;
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

export default function PlacementResultsPage() {
  const { childId } = useParams<{ childId: string }>();
  const router = useRouter();
  const { status } = useSession();

  const [placement, setPlacement] = useState<PlacementData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedSample, setExpandedSample] = useState<number | null>(null);
  const [showTierPicker, setShowTierPicker] = useState(false);
  const [overriding, setOverriding] = useState(false);

  const fetchResults = useCallback(async () => {
    try {
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

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FFF9F0] flex items-center justify-center">
        <div className="text-center animate-fade-in">
          <div className="text-4xl mb-4 animate-bounce-slow">&#x1F989;</div>
          <p className="text-[#2D3436]/60 font-semibold">Loading results...</p>
        </div>
      </div>
    );
  }

  if (error && !placement) {
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

  if (!placement) return null;

  const tierInfo = TIER_INFO[placement.recommendedTier];
  const confidencePct = Math.round(placement.confidence * 100);
  const promptLabels = ["Narrative", "Descriptive", "Persuasive"];

  return (
    <div className="min-h-screen bg-[#FFF9F0]">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-sm border-b border-[#FF6B6B]/10">
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
          <div className="text-5xl mb-3">&#x1F389;</div>
          <h1 className="text-2xl font-extrabold text-[#2D3436] mb-2">
            Assessment Complete!
          </h1>
          <p className="text-[#2D3436]/60 font-medium">
            Here&apos;s what we learned about your writing.
          </p>
        </div>

        {/* Recommended tier card */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-[#FF6B6B]/10 animate-fade-in stagger-1">
          <p className="text-sm font-bold text-[#2D3436]/50 mb-3 uppercase tracking-wide">
            Recommended Level
          </p>
          <div className="flex items-center gap-4 mb-4">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center text-white text-xl font-extrabold shrink-0"
              style={{ backgroundColor: tierInfo.color }}
            >
              {placement.recommendedTier}
            </div>
            <div>
              <p className="text-lg font-extrabold text-[#2D3436]">
                {tierInfo.name}
              </p>
              <p className="text-sm text-[#2D3436]/60 font-medium">
                {tierInfo.description}
              </p>
            </div>
          </div>

          {/* Confidence meter */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs font-bold text-[#2D3436]/40 uppercase tracking-wide">
                Confidence
              </p>
              <p className="text-xs font-bold text-[#4ECDC4]">
                {confidencePct}%
              </p>
            </div>
            <div className="w-full h-2 bg-[#2D3436]/5 rounded-full overflow-hidden">
              <div
                className="h-full bg-[#4ECDC4] rounded-full transition-all duration-1000 ease-out"
                style={{ width: `${confidencePct}%` }}
              />
            </div>
          </div>
        </div>

        {/* Section 2: Strengths and Growth Areas */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-[#FF6B6B]/10 animate-fade-in stagger-2">
          <p className="text-sm font-bold text-[#2D3436]/50 mb-4 uppercase tracking-wide">
            What We Noticed
          </p>

          {/* Strengths */}
          {placement.aiAnalysis.strengths.length > 0 && (
            <div className="mb-5">
              <p className="text-sm font-bold text-[#4ECDC4] mb-2">
                Strengths
              </p>
              <div className="space-y-2">
                {placement.aiAnalysis.strengths.map((s, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <svg
                      className="w-4 h-4 text-[#4ECDC4] mt-0.5 shrink-0"
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
            <div className="bg-[#FFF9F0] rounded-xl p-4">
              <p className="text-xs font-bold text-[#2D3436]/40 mb-1 uppercase tracking-wide">
                Assessment Notes
              </p>
              <p className="text-sm text-[#2D3436]/70 font-medium leading-relaxed">
                {placement.aiAnalysis.reasoning}
              </p>
            </div>
          )}
        </div>

        {/* Section 3: Writing Samples */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-[#FF6B6B]/10 animate-fade-in stagger-3">
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
                className="flex-1 px-6 py-3 bg-[#FF6B6B] text-white rounded-xl text-sm font-bold hover:bg-[#FF6B6B]/90 transition-colors shadow-sm"
              >
                Accept & Continue
              </button>
            </div>
          ) : (
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-[#FF6B6B]/10">
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
              <div className="space-y-3">
                {[1, 2, 3].map((tier) => {
                  const info = TIER_INFO[tier];
                  const isRecommended = tier === placement.recommendedTier;
                  return (
                    <button
                      key={tier}
                      type="button"
                      disabled={overriding}
                      onClick={() => handleTierOverride(tier)}
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
        </div>

        {/* Bottom spacing */}
        <div className="h-8" />
      </main>
    </div>
  );
}
