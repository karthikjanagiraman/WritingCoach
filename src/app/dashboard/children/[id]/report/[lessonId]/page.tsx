"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { TierProvider } from "@/contexts/TierContext";
import type { Tier } from "@/types";
import { getLessonReport, type LessonReportResponse } from "@/lib/api";

const TYPE_ICONS: Record<string, string> = {
  narrative: "\uD83D\uDCD6",
  persuasive: "\uD83D\uDCE2",
  expository: "\uD83D\uDCDD",
  descriptive: "\uD83C\uDFA8",
};

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function StarRating({ score, maxScore = 4 }: { score: number; maxScore?: number }) {
  const rounded = Math.round(score * 2) / 2;
  return (
    <span className="inline-flex items-center gap-0.5">
      {Array.from({ length: maxScore }, (_, i) => {
        const isFull = i < Math.floor(rounded);
        const isHalf = !isFull && i < rounded;
        return (
          <span key={i} className="text-lg">
            {isFull ? "\u2B50" : isHalf ? "\u2B50" : "\u2606"}
          </span>
        );
      })}
    </span>
  );
}

function LessonDetailContent({ childId, lessonId }: { childId: string; lessonId: string }) {
  const router = useRouter();
  const [data, setData] = useState<LessonReportResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showFullText, setShowFullText] = useState<Record<string, boolean>>({});

  useEffect(() => {
    getLessonReport(childId, lessonId)
      .then(setData)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [childId, lessonId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-active-bg flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-active-primary/30 border-t-active-primary rounded-full animate-spin mx-auto" />
          <p className="mt-4 text-active-text/60 font-semibold">Loading lesson detail...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-active-bg flex items-center justify-center">
        <div className="text-center">
          <p className="text-active-primary font-semibold">{error || "Failed to load"}</p>
          <button
            onClick={() => router.back()}
            className="mt-3 px-5 py-2.5 bg-active-primary text-white rounded-xl text-sm font-bold"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  const { lesson, status, assessment, submissions, parentTips } = data;

  return (
    <div className="min-h-screen bg-active-bg">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-sm border-b border-active-primary/10">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 h-14 flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="w-9 h-9 rounded-full bg-active-bg flex items-center justify-center flex-shrink-0 hover:bg-active-primary/10 transition-colors"
            aria-label="Back"
          >
            <svg className="w-5 h-5 text-active-text" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
          <h1 className="text-lg font-extrabold text-active-text truncate">
            Lesson Detail
          </h1>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-6 space-y-5">
        {/* Lesson Header */}
        <section className="bg-white rounded-2xl p-5 shadow-sm border border-active-primary/10">
          <div className="flex items-start gap-3">
            <span className="text-3xl flex-shrink-0">{TYPE_ICONS[lesson.type] || "\uD83D\uDCDD"}</span>
            <div className="flex-1">
              <h2 className="text-xl font-extrabold text-active-text">{lesson.title}</h2>
              <p className="text-sm text-active-text/50 mt-0.5">{capitalize(lesson.type)} &middot; {lesson.unit}</p>
              {status === "needs_improvement" && (
                <span className="inline-block mt-2 text-xs font-bold text-amber-700 bg-amber-100 px-2.5 py-0.5 rounded-full">
                  Needs Improvement
                </span>
              )}
              {status === "completed" && (
                <span className="inline-block mt-2 text-xs font-bold text-green-700 bg-green-100 px-2.5 py-0.5 rounded-full">
                  Completed
                </span>
              )}
            </div>
          </div>
          {lesson.learningObjectives.length > 0 && (
            <div className="mt-4">
              <h4 className="text-xs font-bold text-active-text/50 uppercase tracking-wider mb-2">Learning Objectives</h4>
              <ul className="space-y-1">
                {lesson.learningObjectives.map((obj, i) => (
                  <li key={i} className="text-sm text-active-text/70 flex items-start gap-2">
                    <span className="text-active-secondary mt-0.5">&#8226;</span>
                    {obj}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>

        {/* Score Card */}
        {assessment && (
          <section className="bg-white rounded-2xl p-5 shadow-sm border border-active-primary/10">
            <div className="text-center mb-4">
              <div className="mb-2">
                <StarRating score={assessment.overallScore} />
              </div>
              <p className="text-sm text-active-text/60 font-semibold">
                {assessment.overallScore.toFixed(1)} out of 4 stars
              </p>
              <p className="text-xs text-active-text/40 mt-1">
                {new Date(assessment.createdAt).toLocaleDateString()}
              </p>
            </div>
            {/* Per-criterion breakdown */}
            <div className="space-y-2">
              {Object.entries(assessment.scores).map(([criterion, score]) => (
                <div key={criterion} className="flex items-center justify-between gap-3">
                  <span className="text-sm font-semibold text-active-text capitalize flex-shrink-0">
                    {criterion.replace(/_/g, " ")}
                  </span>
                  <div className="flex items-center gap-2">
                    <StarRating score={score} />
                    <span className="text-xs text-active-text/40 w-8 text-right">{score.toFixed(1)}</span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Feedback Section */}
        {assessment?.feedback && (
          <section className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-gradient-to-br from-active-secondary/10 to-active-secondary/5 rounded-2xl p-5 border border-active-secondary/20">
              <h3 className="font-bold text-active-secondary mb-2 flex items-center gap-2">
                <span className="text-xl">{"\uD83D\uDCAA"}</span> What They Did Well
              </h3>
              <p className="text-active-text/80 text-[15px] leading-relaxed">{assessment.feedback.strength}</p>
            </div>
            <div className="bg-gradient-to-br from-active-accent/10 to-active-accent/5 rounded-2xl p-5 border border-active-accent/20">
              <h3 className="font-bold text-active-text mb-2 flex items-center gap-2">
                <span className="text-xl">{"\uD83C\uDF31"}</span> Area for Growth
              </h3>
              <p className="text-active-text/80 text-[15px] leading-relaxed">{assessment.feedback.growth}</p>
            </div>
          </section>
        )}

        {/* Writing Submissions */}
        {submissions.length > 0 && (
          <section className="bg-white rounded-2xl p-5 shadow-sm border border-active-primary/10">
            <h3 className="text-sm font-bold text-active-text mb-4">
              Writing {submissions.length > 1 ? "Submissions" : "Submission"}
            </h3>
            <div className="space-y-4">
              {submissions.map((sub) => {
                const isExpanded = showFullText[sub.id] ?? false;
                const isLong = sub.submissionText.length > 400;
                return (
                  <div key={sub.id} className="border border-gray-100 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-active-text/50">
                        {sub.revisionNumber === 0 ? "Original" : `Revision ${sub.revisionNumber}`}
                      </span>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-active-text/40">{sub.wordCount} words</span>
                        {sub.feedback && (
                          <span className="text-xs font-bold text-active-accent">
                            {"\u2B50"} {sub.feedback.overallScore.toFixed(1)}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="bg-active-bg rounded-lg p-3">
                      <p className="text-sm text-active-text/80 leading-relaxed whitespace-pre-wrap font-[Literata,serif]">
                        {isLong && !isExpanded
                          ? sub.submissionText.slice(0, 400) + "..."
                          : sub.submissionText}
                      </p>
                      {isLong && (
                        <button
                          onClick={() => setShowFullText((prev) => ({ ...prev, [sub.id]: !isExpanded }))}
                          className="text-xs font-bold text-active-primary mt-2 hover:underline"
                        >
                          {isExpanded ? "Show less" : "Read more"}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Revision History — score comparison */}
        {submissions.length > 1 && (
          <section className="bg-white rounded-2xl p-5 shadow-sm border border-active-primary/10">
            <h3 className="text-sm font-bold text-active-text mb-3">Revision Progress</h3>
            <div className="space-y-2">
              {submissions.filter((s) => s.feedback).map((sub) => (
                <div key={sub.id} className="flex items-center justify-between px-3 py-2 rounded-lg bg-active-bg/50">
                  <span className="text-sm font-semibold text-active-text">
                    {sub.revisionNumber === 0 ? "Original" : `Revision ${sub.revisionNumber}`}
                  </span>
                  <div className="flex items-center gap-2">
                    <StarRating score={sub.feedback!.overallScore} />
                    <span className="text-xs font-bold text-active-text/60">
                      {sub.feedback!.overallScore.toFixed(1)}/4
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Parent Tips */}
        {parentTips && (
          <section className="bg-gradient-to-br from-active-primary/5 to-active-primary/10 rounded-2xl p-5 border border-active-primary/15">
            <h3 className="font-bold text-active-text mb-3 flex items-center gap-2">
              <span className="text-xl">{"\uD83D\uDCA1"}</span> Tips for Home
            </h3>
            <div className="text-active-text/80 text-[15px] leading-relaxed whitespace-pre-wrap">
              {parentTips}
            </div>
          </section>
        )}

        {/* Back button */}
        <section className="pb-8">
          <button
            onClick={() => router.back()}
            className="w-full text-center px-5 py-3 bg-white text-active-primary border border-active-primary/20 rounded-xl text-sm font-bold hover:bg-active-primary/5 transition-colors"
          >
            &larr; Back to Report
          </button>
        </section>
      </main>
    </div>
  );
}

export default function LessonDetailPage({
  params,
}: {
  params: Promise<{ id: string; lessonId: string }>;
}) {
  const { id: childId, lessonId } = use(params);
  const { data: session, status } = useSession();
  const router = useRouter();
  const [tier, setTier] = useState<Tier>(1);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/login");
    }
  }, [status, router]);

  useEffect(() => {
    fetch(`/api/children/${encodeURIComponent(childId)}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.child?.tier) setTier(data.child.tier as Tier);
      })
      .catch(() => {});
  }, [childId]);

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-[#FFF9F0] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-[#FF6B6B]/30 border-t-[#FF6B6B] rounded-full animate-spin" />
      </div>
    );
  }

  if (!session) return null;

  return (
    <TierProvider tier={tier}>
      <LessonDetailContent childId={childId} lessonId={lessonId} />
    </TierProvider>
  );
}
