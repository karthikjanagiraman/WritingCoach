"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

interface PresetOption {
  id: string;
  label: string;
  description: string;
  emoji: string;
}

const PRESET_OPTIONS: PresetOption[] = [
  {
    id: "too_easy",
    label: "Too Easy",
    description: "My child is ready for more challenging work",
    emoji: "\uD83D\uDE80",
  },
  {
    id: "too_hard",
    label: "Too Hard",
    description: "My child needs more foundational practice",
    emoji: "\uD83E\uDDF1",
  },
  {
    id: "focus_narrative",
    label: "Focus on Narrative",
    description: "More story writing practice",
    emoji: "\uD83D\uDCD6",
  },
  {
    id: "focus_persuasive",
    label: "Focus on Persuasive",
    description: "More persuasive writing practice",
    emoji: "\uD83D\uDCE2",
  },
];

export default function CurriculumRevisePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { childId } = useParams<{ childId: string }>();

  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [customText, setCustomText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/login");
    }
  }, [status, router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!selectedOption && !customText.trim()) {
      setError("Please select an option or describe the change you'd like.");
      return;
    }

    setSubmitting(true);

    // Build description from selected option + custom text
    const preset = PRESET_OPTIONS.find((o) => o.id === selectedOption);
    const parts: string[] = [];
    if (preset) {
      parts.push(`${preset.label}: ${preset.description}`);
    }
    if (customText.trim()) {
      parts.push(customText.trim());
    }

    try {
      const res = await fetch(`/api/curriculum/${childId}/revise`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reason: "parent_request",
          description: parts.join(". "),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to revise curriculum");
      }

      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-[#FFF9F0] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-[#FF6B6B]/30 border-t-[#FF6B6B] rounded-full animate-spin" />
      </div>
    );
  }

  if (!session) return null;

  if (success) {
    return (
      <div className="min-h-screen bg-[#FFF9F0]">
        <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-sm border-b border-[#FF6B6B]/10">
          <div className="max-w-2xl mx-auto px-4 sm:px-6 h-14 flex items-center">
            <button
              onClick={() => router.push(`/curriculum/${childId}`)}
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
              Back to Curriculum
            </button>
          </div>
        </header>
        <main className="max-w-2xl mx-auto px-4 sm:px-6 py-16 text-center animate-fade-in">
          <div className="text-5xl mb-4">{"\u2705"}</div>
          <h2 className="text-2xl font-extrabold text-[#2D3436] mb-2">
            Curriculum Updated!
          </h2>
          <p className="text-[#2D3436]/60 mb-8 max-w-md mx-auto">
            The learning plan has been revised based on your feedback. Future
            weeks now reflect the changes.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={() => router.push(`/curriculum/${childId}`)}
              className="px-6 py-3 bg-[#FF6B6B] text-white rounded-xl text-sm font-bold hover:bg-[#FF6B6B]/90 transition-colors shadow-sm"
            >
              View Updated Plan
            </button>
            <button
              onClick={() => router.push("/dashboard")}
              className="px-6 py-3 bg-white text-[#2D3436]/60 border border-[#2D3436]/10 rounded-xl text-sm font-bold hover:bg-[#2D3436]/5 transition-colors"
            >
              Back to Dashboard
            </button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FFF9F0]">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-sm border-b border-[#FF6B6B]/10">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 h-14 flex items-center">
          <button
            onClick={() => router.push(`/curriculum/${childId}`)}
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
            Back to Curriculum
          </button>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
        <div className="animate-fade-in mb-8">
          <h2 className="text-2xl font-extrabold text-[#2D3436] mb-1">
            Adjust Learning Plan
          </h2>
          <p className="text-[#2D3436]/60">
            Tell us how you'd like to adjust the curriculum. We'll update
            upcoming weeks to better fit your child's needs.
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-red-700 text-sm font-medium mb-6">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Preset Options */}
          <div className="space-y-3 animate-fade-in stagger-1">
            {PRESET_OPTIONS.map((option) => {
              const isSelected = selectedOption === option.id;
              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() =>
                    setSelectedOption(isSelected ? null : option.id)
                  }
                  className={`w-full flex items-center gap-4 p-4 rounded-2xl border text-left transition-all duration-200 ${
                    isSelected
                      ? "border-[#FF6B6B]/50 bg-[#FF6B6B]/5 ring-2 ring-[#FF6B6B]/20"
                      : "border-[#FF6B6B]/10 bg-white hover:border-[#FF6B6B]/30 hover:shadow-sm"
                  }`}
                >
                  <span className="text-2xl flex-shrink-0">
                    {option.emoji}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-bold text-[#2D3436]">
                      {option.label}
                    </div>
                    <div className="text-xs text-[#2D3436]/50 mt-0.5">
                      {option.description}
                    </div>
                  </div>
                  <div
                    className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                      isSelected
                        ? "border-[#FF6B6B] bg-[#FF6B6B]"
                        : "border-[#2D3436]/20"
                    }`}
                  >
                    {isSelected && (
                      <svg
                        className="w-3 h-3 text-white"
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
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Custom Feedback */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-[#FF6B6B]/10 animate-fade-in stagger-1">
            <label className="block text-sm font-bold text-[#2D3436] mb-2">
              Additional Feedback
              <span className="font-normal text-[#2D3436]/40 ml-1">
                (optional)
              </span>
            </label>
            <textarea
              value={customText}
              onChange={(e) => setCustomText(e.target.value)}
              placeholder="Any specific areas you'd like us to focus on..."
              rows={4}
              className="w-full px-4 py-3 border border-[#2D3436]/10 rounded-xl text-[#2D3436] text-sm placeholder-[#2D3436]/30 focus:outline-none focus:border-[#FF6B6B]/50 focus:ring-2 focus:ring-[#FF6B6B]/20 transition-colors resize-none"
            />
          </div>

          {/* Submit */}
          <div className="flex gap-3 pt-2 animate-fade-in stagger-1">
            <button
              type="button"
              onClick={() => router.push(`/curriculum/${childId}`)}
              className="flex-1 px-6 py-3 bg-white border border-[#2D3436]/10 text-[#2D3436]/60 rounded-xl text-sm font-bold hover:bg-[#2D3436]/5 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || (!selectedOption && !customText.trim())}
              className="flex-1 px-6 py-3 bg-[#FF6B6B] text-white rounded-xl text-sm font-bold hover:bg-[#FF6B6B]/90 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? "Updating..." : "Update Plan"}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
