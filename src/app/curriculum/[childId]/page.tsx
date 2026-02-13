"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";

const TYPE_ICONS: Record<string, string> = {
  narrative: "\uD83D\uDCD6",
  persuasive: "\uD83D\uDCE2",
  expository: "\uD83D\uDCDD",
  descriptive: "\uD83C\uDFA8",
};

interface Lesson {
  id: string;
  title: string;
  type: string;
  unit: string;
  completed?: boolean;
}

interface Week {
  weekNumber: number;
  theme: string;
  status: string;
  lessons: Lesson[];
}

interface CurriculumData {
  id: string;
  status: string;
  weekCount: number;
  lessonsPerWeek: number;
  focusAreas: string[] | null;
  startDate: string | null;
}

export default function CurriculumPage() {
  const router = useRouter();
  const { childId } = useParams<{ childId: string }>();

  const [curriculum, setCurriculum] = useState<CurriculumData | null>(null);
  const [weeks, setWeeks] = useState<Week[]>([]);
  const [expandedWeeks, setExpandedWeeks] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [noCurriculum, setNoCurriculum] = useState(false);

  useEffect(() => {
    async function fetchCurriculum() {
      try {
        const res = await fetch(`/api/curriculum/${childId}`);
        if (res.status === 404) {
          setNoCurriculum(true);
          return;
        }
        if (!res.ok) throw new Error("Failed to load curriculum");
        const data = await res.json();
        setCurriculum(data.curriculum);

        const fetchedWeeks: Week[] = data.weeks.map(
          (w: {
            weekNumber: number;
            theme: string;
            status: string;
            lessons?: Lesson[];
            lessonIds?: string | string[];
          }) => ({
            weekNumber: w.weekNumber,
            theme: w.theme,
            status: w.status,
            lessons: w.lessons || [],
          })
        );
        setWeeks(fetchedWeeks);

        // Auto-expand the current week (first non-completed)
        const currentWeek = fetchedWeeks.find((w) => w.status !== "completed");
        if (currentWeek) {
          setExpandedWeeks(new Set([currentWeek.weekNumber]));
        }
      } catch {
        setError("Could not load curriculum.");
      } finally {
        setLoading(false);
      }
    }
    fetchCurriculum();
  }, [childId]);

  function toggleWeek(weekNumber: number) {
    setExpandedWeeks((prev) => {
      const next = new Set(prev);
      if (next.has(weekNumber)) {
        next.delete(weekNumber);
      } else {
        next.add(weekNumber);
      }
      return next;
    });
  }

  const totalLessons = weeks.reduce((sum, w) => sum + w.lessons.length, 0);
  const completedLessonCount = weeks.reduce(
    (sum, w) => sum + w.lessons.filter((l) => l.completed).length,
    0
  );
  const currentWeekNumber =
    weeks.find((w) => w.lessons.some((l) => !l.completed))?.weekNumber ?? weeks.length;

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FFF9F0] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-[#FF6B6B]/30 border-t-[#FF6B6B] rounded-full animate-spin" />
      </div>
    );
  }

  if (noCurriculum) {
    return (
      <div className="min-h-screen bg-[#FFF9F0]">
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
        <main className="max-w-2xl mx-auto px-4 sm:px-6 py-16 text-center">
          <div className="text-5xl mb-4">📚</div>
          <h2 className="text-xl font-extrabold text-[#2D3436] mb-2">
            No Curriculum Yet
          </h2>
          <p className="text-[#2D3436]/60 mb-6">
            Set up a personalized learning plan to get started.
          </p>
          <button
            onClick={() => router.push(`/curriculum/${childId}/setup`)}
            className="px-6 py-3 bg-[#FF6B6B] text-white rounded-xl text-sm font-bold hover:bg-[#FF6B6B]/90 transition-colors shadow-sm"
          >
            Set Up Curriculum
          </button>
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
        {/* Title */}
        <div className="animate-fade-in mb-6">
          <h2 className="text-2xl font-extrabold text-[#2D3436] mb-1">
            My Curriculum
          </h2>
          <p className="text-[#2D3436]/60">
            {curriculum?.lessonsPerWeek} lessons per week &middot;{" "}
            {curriculum?.weekCount} weeks
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-red-700 text-sm font-medium mb-6">
            {error}
          </div>
        )}

        {/* Progress Bar */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-[#FF6B6B]/10 mb-6 animate-fade-in">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-bold text-[#2D3436]">
              Week {currentWeekNumber} of {weeks.length}
            </span>
            <span className="text-xs font-semibold text-[#2D3436]/50">
              {completedLessonCount} of {totalLessons} completed
            </span>
          </div>
          <div className="w-full h-3 bg-[#2D3436]/5 rounded-full overflow-hidden">
            <div
              className="h-full bg-[#4ECDC4] rounded-full transition-all duration-500"
              style={{
                width: `${totalLessons > 0 ? (completedLessonCount / totalLessons) * 100 : 0}%`,
              }}
            />
          </div>
        </div>

        {/* Week Cards */}
        <div className="space-y-3 animate-fade-in stagger-1">
          {weeks.map((week) => {
            const isExpanded = expandedWeeks.has(week.weekNumber);
            const weekLessonsDone = week.lessons.filter((l) => l.completed).length;
            const allWeekDone = week.lessons.length > 0 && weekLessonsDone === week.lessons.length;
            const isCompleted = allWeekDone;
            const isCurrent = !isCompleted && week.weekNumber === currentWeekNumber;

            return (
              <div
                key={week.weekNumber}
                className={`rounded-2xl border shadow-sm overflow-hidden transition-all duration-200 ${
                  isCurrent
                    ? "border-[#FF6B6B]/40 bg-white ring-1 ring-[#FF6B6B]/20"
                    : isCompleted
                    ? "border-[#4ECDC4]/20 bg-[#4ECDC4]/[0.03]"
                    : "border-[#FF6B6B]/10 bg-white"
                }`}
              >
                {/* Week Header (clickable) */}
                <button
                  onClick={() => toggleWeek(week.weekNumber)}
                  className="w-full flex items-center justify-between px-5 py-4 text-left"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`text-sm font-extrabold ${
                        isCompleted
                          ? "text-[#4ECDC4]"
                          : isCurrent
                          ? "text-[#FF6B6B]"
                          : "text-[#2D3436]/40"
                      }`}
                    >
                      Week {week.weekNumber}
                    </span>
                    <span className="text-sm font-semibold text-[#2D3436]">
                      {week.theme}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {/* Status badge */}
                    {isCompleted && (
                      <span className="text-xs font-bold text-[#4ECDC4] bg-[#4ECDC4]/10 px-2 py-0.5 rounded-full">
                        Completed
                      </span>
                    )}
                    {isCurrent && (
                      <span className="text-xs font-bold text-[#FF6B6B] bg-[#FF6B6B]/10 px-2 py-0.5 rounded-full">
                        In Progress
                      </span>
                    )}
                    {!isCompleted && !isCurrent && (
                      <span className="text-xs font-bold text-[#2D3436]/30 bg-[#2D3436]/5 px-2 py-0.5 rounded-full">
                        Upcoming
                      </span>
                    )}
                    {/* Chevron */}
                    <svg
                      className={`w-4 h-4 text-[#2D3436]/30 transition-transform duration-200 ${
                        isExpanded ? "rotate-180" : ""
                      }`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </button>

                {/* Expanded Lesson List */}
                {isExpanded && (
                  <div className="px-5 pb-4 border-t border-[#2D3436]/5">
                    <div className="pt-3 space-y-2">
                      {week.lessons.map((lesson) => (
                        <button
                          key={lesson.id}
                          onClick={() => router.push(`/lesson/${lesson.id}`)}
                          className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors text-left ${
                            lesson.completed
                              ? "bg-[#4ECDC4]/[0.06] hover:bg-[#4ECDC4]/[0.10]"
                              : "bg-[#2D3436]/[0.02] hover:bg-[#2D3436]/[0.05]"
                          }`}
                        >
                          <span className="text-lg">
                            {lesson.completed ? "\u2705" : (TYPE_ICONS[lesson.type] || "\uD83D\uDCDD")}
                          </span>
                          <div className="flex-1 min-w-0">
                            <div className={`text-sm font-semibold truncate ${lesson.completed ? "text-[#2D3436]/50" : "text-[#2D3436]"}`}>
                              {lesson.title}
                            </div>
                            <div className="text-xs text-[#2D3436]/40">
                              {lesson.type.charAt(0).toUpperCase() +
                                lesson.type.slice(1)}{" "}
                              &middot; {lesson.unit}
                            </div>
                          </div>
                          {lesson.completed ? (
                            <span className="text-xs font-bold text-[#4ECDC4]">Done</span>
                          ) : (
                            <svg
                              className="w-4 h-4 text-[#2D3436]/20 flex-shrink-0"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                          )}
                        </button>
                      ))}
                      {week.lessons.length === 0 && (
                        <p className="text-sm text-[#2D3436]/40 py-2">
                          No lessons assigned to this week.
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Revise Curriculum */}
        <div className="mt-8 text-center animate-fade-in">
          <button
            onClick={() => router.push(`/curriculum/${childId}/revise`)}
            className="text-sm font-semibold text-[#2D3436]/40 hover:text-[#2D3436]/60 transition-colors"
          >
            Revise Curriculum
          </button>
        </div>
      </main>
    </div>
  );
}
