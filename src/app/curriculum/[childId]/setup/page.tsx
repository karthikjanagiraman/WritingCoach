"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";

const DURATION_OPTIONS = [
  { value: 4, label: "4 weeks", description: "Quick start" },
  { value: 8, label: "8 weeks", description: "Standard" },
  { value: 12, label: "12 weeks", description: "Extended" },
];

const WRITING_TYPES = [
  { value: "narrative", label: "Narrative", icon: "\uD83D\uDCD6", description: "Story writing" },
  { value: "persuasive", label: "Persuasive", icon: "\uD83D\uDCE2", description: "Opinion/argument" },
  { value: "expository", label: "Expository", icon: "\uD83D\uDCDD", description: "Informational" },
  { value: "descriptive", label: "Descriptive", icon: "\uD83C\uDFA8", description: "Sensory detail" },
];

export default function CurriculumSetupPage() {
  const router = useRouter();
  const { childId } = useParams<{ childId: string }>();

  const [childName, setChildName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [lessonsPerWeek, setLessonsPerWeek] = useState(3);
  const [weekCount, setWeekCount] = useState(8);
  const [focusAreas, setFocusAreas] = useState<string[]>([]);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    async function fetchChild() {
      try {
        const res = await fetch(`/api/children/${childId}`);
        if (!res.ok) throw new Error("Failed to load child profile");
        const data = await res.json();
        setChildName(data.child?.name || data.name || "Your Child");
      } catch {
        setError("Could not load child profile.");
      } finally {
        setLoading(false);
      }
    }
    fetchChild();
  }, [childId]);

  function toggleFocusArea(area: string) {
    setFocusAreas((prev) =>
      prev.includes(area) ? prev.filter((a) => a !== area) : [...prev, area]
    );
  }

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setGenerating(true);

    try {
      const res = await fetch("/api/curriculum/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          childId,
          lessonsPerWeek,
          weekCount,
          focusAreas: focusAreas.length > 0 ? focusAreas : undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to generate curriculum");
      }

      router.push(`/curriculum/${childId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setGenerating(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FFF9F0] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-[#FF6B6B]/30 border-t-[#FF6B6B] rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FFF9F0]">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-sm border-b border-[#FF6B6B]/10">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 h-14 flex items-center">
          <button
            onClick={() => router.push("/dashboard")}
            className="flex items-center gap-2 text-sm font-semibold text-[#2D3436]/60 hover:text-[#2D3436] transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Dashboard
          </button>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
        <div className="animate-fade-in">
          <h2 className="text-2xl font-extrabold text-[#2D3436] mb-1">
            Set Up {childName}&apos;s Curriculum
          </h2>
          <p className="text-[#2D3436]/60 mb-8">
            Customize the learning plan to fit your schedule and goals.
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-red-700 text-sm font-medium mb-6">
            {error}
          </div>
        )}

        {generating ? (
          <div className="animate-fade-in flex flex-col items-center justify-center py-20">
            <div className="w-12 h-12 border-4 border-[#FF6B6B]/30 border-t-[#FF6B6B] rounded-full animate-spin mb-6" />
            <p className="text-lg font-bold text-[#2D3436]">
              Creating your personalized curriculum...
            </p>
            <p className="text-sm text-[#2D3436]/50 mt-2">
              This may take a few seconds.
            </p>
          </div>
        ) : (
          <form onSubmit={handleGenerate} className="space-y-6 animate-fade-in stagger-1">
            {/* Lessons Per Week */}
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-[#FF6B6B]/10">
              <label className="block text-sm font-bold text-[#2D3436] mb-1">
                Lessons per Week
              </label>
              <p className="text-xs text-[#2D3436]/50 mb-3">
                How many lessons per week?
              </p>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setLessonsPerWeek((v) => Math.max(1, v - 1))}
                  className="w-10 h-10 rounded-xl bg-[#2D3436]/5 hover:bg-[#2D3436]/10 text-[#2D3436] font-bold text-lg flex items-center justify-center transition-colors"
                >
                  -
                </button>
                <span className="w-12 text-center text-xl font-extrabold text-[#2D3436]">
                  {lessonsPerWeek}
                </span>
                <button
                  type="button"
                  onClick={() => setLessonsPerWeek((v) => Math.min(5, v + 1))}
                  className="w-10 h-10 rounded-xl bg-[#2D3436]/5 hover:bg-[#2D3436]/10 text-[#2D3436] font-bold text-lg flex items-center justify-center transition-colors"
                >
                  +
                </button>
              </div>
            </div>

            {/* Duration */}
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-[#FF6B6B]/10">
              <label className="block text-sm font-bold text-[#2D3436] mb-3">
                Duration
              </label>
              <div className="grid grid-cols-3 gap-3">
                {DURATION_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setWeekCount(opt.value)}
                    className={`px-3 py-3 rounded-xl text-center transition-all duration-150 ${
                      weekCount === opt.value
                        ? "bg-[#FF6B6B]/10 ring-2 ring-[#FF6B6B] text-[#2D3436]"
                        : "bg-[#2D3436]/5 hover:bg-[#2D3436]/10 text-[#2D3436]/70"
                    }`}
                  >
                    <div className="text-sm font-bold">{opt.label}</div>
                    <div className="text-xs text-[#2D3436]/50 mt-0.5">{opt.description}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Focus Areas */}
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-[#FF6B6B]/10">
              <label className="block text-sm font-bold text-[#2D3436] mb-1">
                Focus on Specific Writing Types
                <span className="font-normal text-[#2D3436]/40 ml-1">(optional)</span>
              </label>
              <p className="text-xs text-[#2D3436]/50 mb-3">
                Leave unchecked for a balanced curriculum across all types.
              </p>
              <div className="grid grid-cols-2 gap-3">
                {WRITING_TYPES.map((type) => (
                  <button
                    key={type.value}
                    type="button"
                    onClick={() => toggleFocusArea(type.value)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all duration-150 ${
                      focusAreas.includes(type.value)
                        ? "bg-[#FF6B6B]/10 ring-2 ring-[#FF6B6B]"
                        : "bg-[#2D3436]/5 hover:bg-[#2D3436]/10"
                    }`}
                  >
                    <span className="text-xl">{type.icon}</span>
                    <div>
                      <div className="text-sm font-bold text-[#2D3436]">{type.label}</div>
                      <div className="text-xs text-[#2D3436]/50">{type.description}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Submit */}
            <div className="pt-2">
              <button
                type="submit"
                className="w-full px-6 py-3 bg-[#FF6B6B] text-white rounded-xl text-sm font-bold hover:bg-[#FF6B6B]/90 transition-colors shadow-sm"
              >
                Generate My Curriculum
              </button>
            </div>
          </form>
        )}
      </main>
    </div>
  );
}
