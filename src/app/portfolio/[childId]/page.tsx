"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { getPortfolio, type PortfolioSubmission } from "@/lib/api";

const FILTERS = [
  { key: "all", label: "All" },
  { key: "narrative", label: "Narrative", icon: "\uD83D\uDCD6" },
  { key: "persuasive", label: "Persuasive", icon: "\uD83D\uDCE2" },
  { key: "expository", label: "Expository", icon: "\uD83D\uDCDD" },
  { key: "descriptive", label: "Descriptive", icon: "\uD83C\uDFA8" },
] as const;

const SORT_OPTIONS = [
  { value: "newest", label: "Newest" },
  { value: "oldest", label: "Oldest" },
  { value: "highest", label: "Highest Score" },
] as const;

const TYPE_ICONS: Record<string, string> = {
  narrative: "\uD83D\uDCD6",
  persuasive: "\uD83D\uDCE2",
  expository: "\uD83D\uDCDD",
  descriptive: "\uD83C\uDFA8",
};

function ScoreBadge({ score }: { score: number }) {
  let colorClass = "bg-orange-100 text-orange-700";
  if (score >= 3.5) {
    colorClass = "bg-green-100 text-green-700";
  } else if (score >= 2.5) {
    colorClass = "bg-amber-100 text-amber-700";
  }
  return (
    <span
      className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${colorClass}`}
    >
      {score.toFixed(1)}/4.0
    </span>
  );
}

function SubmissionCard({ submission }: { submission: PortfolioSubmission }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-[#FF6B6B]/10 overflow-hidden transition-all duration-200">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full text-left p-5 hover:bg-[#FFF9F0]/50 transition-colors"
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <span className="text-2xl flex-shrink-0">
              {TYPE_ICONS[submission.lessonType] || "\uD83D\uDCC4"}
            </span>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm font-bold text-[#2D3436] truncate">
                  {submission.lessonTitle}
                </h3>
                {submission.revisionNumber > 0 && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-700">
                    Revision #{submission.revisionNumber}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3 mt-1">
                <span className="text-xs text-[#2D3436]/50">
                  {new Date(submission.createdAt).toLocaleDateString()}
                </span>
                <span className="text-xs text-[#2D3436]/40">
                  {submission.wordCount} words
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3 flex-shrink-0">
            {submission.feedback && (
              <ScoreBadge score={submission.feedback.overallScore} />
            )}
            <svg
              className={`w-5 h-5 text-[#2D3436]/30 transition-transform duration-200 ${
                expanded ? "rotate-180" : ""
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
          </div>
        </div>
      </button>

      {expanded && (
        <div className="px-5 pb-5 border-t border-[#FF6B6B]/5">
          {/* Submission text */}
          <div className="mt-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#2D3436]/40 mb-2">
              Your Writing
            </h4>
            <div className="bg-[#FFF9F0] rounded-xl p-4 text-sm text-[#2D3436]/80 leading-relaxed whitespace-pre-wrap">
              {submission.submissionText}
            </div>
          </div>

          {/* Feedback */}
          {submission.feedback && (
            <div className="mt-4 space-y-3">
              <div className="bg-green-50 rounded-xl p-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-green-700/70 mb-1">
                  Strength
                </h4>
                <p className="text-sm text-green-800">
                  {submission.feedback.strength}
                </p>
              </div>
              <div className="bg-amber-50 rounded-xl p-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-amber-700/70 mb-1">
                  Growth Area
                </h4>
                <p className="text-sm text-amber-800">
                  {submission.feedback.growthArea}
                </p>
              </div>
              <div className="bg-blue-50 rounded-xl p-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-blue-700/70 mb-1">
                  Encouragement
                </h4>
                <p className="text-sm text-blue-800">
                  {submission.feedback.encouragement}
                </p>
              </div>

              {/* Score breakdown */}
              {Object.keys(submission.feedback.scores).length > 0 && (
                <div className="bg-gray-50 rounded-xl p-4">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-[#2D3436]/40 mb-2">
                    Score Breakdown
                  </h4>
                  <div className="grid grid-cols-2 gap-2">
                    {Object.entries(submission.feedback.scores).map(
                      ([criterion, score]) => (
                        <div
                          key={criterion}
                          className="flex items-center justify-between"
                        >
                          <span className="text-xs text-[#2D3436]/60 capitalize">
                            {criterion.replace(/_/g, " ")}
                          </span>
                          <span className="text-xs font-bold text-[#2D3436]/80">
                            {score}/4
                          </span>
                        </div>
                      )
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function PortfolioPage() {
  const { childId } = useParams<{ childId: string }>();
  const router = useRouter();

  const [submissions, setSubmissions] = useState<PortfolioSubmission[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState("all");
  const [sort, setSort] = useState("newest");

  const limit = 10;

  const fetchPortfolio = useCallback(
    async (pageNum: number, append: boolean) => {
      if (!childId) return;
      try {
        if (append) {
          setLoadingMore(true);
        } else {
          setLoading(true);
        }
        const typeParam =
          activeFilter === "all" ? undefined : activeFilter;
        const data = await getPortfolio(childId, {
          page: pageNum,
          limit,
          type: typeParam,
          sort,
        });
        if (append) {
          setSubmissions((prev) => [...prev, ...data.submissions]);
        } else {
          setSubmissions(data.submissions);
        }
        setTotal(data.total);
        setPage(pageNum);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load portfolio");
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [childId, activeFilter, sort]
  );

  useEffect(() => {
    fetchPortfolio(1, false);
  }, [fetchPortfolio]);

  const hasMore = page * limit < total;

  return (
    <div className="min-h-screen bg-[#FFF9F0]">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-sm border-b border-[#FF6B6B]/10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push("/")}
              className="p-2 rounded-xl hover:bg-[#FF6B6B]/10 transition-colors"
              aria-label="Back to dashboard"
            >
              <svg
                className="w-5 h-5 text-[#2D3436]/60"
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
            </button>
            <h1 className="text-xl sm:text-2xl font-extrabold text-[#FF6B6B] tracking-tight">
              My Writing Portfolio
            </h1>
          </div>
          <button
            onClick={() =>
              window.open(
                `/api/children/${childId}/portfolio/export`,
                "_blank"
              )
            }
            className="px-4 py-2 bg-[#FF6B6B] text-white rounded-xl text-sm font-bold hover:bg-[#FF6B6B]/90 transition-colors shadow-sm"
          >
            Export CSV
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-5">
        {/* Filter + Sort Bar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex gap-2 overflow-x-auto pb-1">
            {FILTERS.map((f) => (
              <button
                key={f.key}
                onClick={() => setActiveFilter(f.key)}
                className={`px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-colors ${
                  activeFilter === f.key
                    ? "bg-[#FF6B6B] text-white shadow-sm"
                    : "bg-white text-[#2D3436]/60 border border-[#FF6B6B]/10 hover:bg-[#FF6B6B]/5"
                }`}
              >
                {"icon" in f ? `${f.icon} ` : ""}
                {f.label}
              </button>
            ))}
          </div>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            className="px-3 py-2 rounded-xl text-sm font-semibold bg-white border border-[#FF6B6B]/10 text-[#2D3436]/70 focus:outline-none focus:ring-2 focus:ring-[#FF6B6B]/20"
          >
            {SORT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <div className="w-10 h-10 border-4 border-[#FF6B6B]/20 border-t-[#FF6B6B] rounded-full animate-spin mx-auto" />
              <p className="mt-4 text-[#2D3436]/50 font-semibold text-sm">
                Loading your writing...
              </p>
            </div>
          </div>
        ) : error ? (
          <div className="text-center py-20">
            <p className="text-[#FF6B6B] font-semibold">{error}</p>
            <button
              onClick={() => fetchPortfolio(1, false)}
              className="mt-3 px-5 py-2.5 bg-[#FF6B6B] text-white rounded-xl text-sm font-bold hover:bg-[#FF6B6B]/90 transition-colors shadow-sm"
            >
              Try Again
            </button>
          </div>
        ) : submissions.length === 0 ? (
          <div className="text-center py-20">
            <span className="text-5xl block mb-4">{"\uD83D\uDCDD"}</span>
            <p className="text-[#2D3436]/50 font-semibold">
              Complete some lessons to see your writing here!
            </p>
            <Link
              href="/"
              className="inline-block mt-4 px-5 py-2.5 bg-[#FF6B6B] text-white rounded-xl text-sm font-bold hover:bg-[#FF6B6B]/90 transition-colors shadow-sm"
            >
              Go to Lessons
            </Link>
          </div>
        ) : (
          <>
            <p className="text-sm text-[#2D3436]/50 font-semibold">
              {total} submission{total !== 1 ? "s" : ""}
            </p>
            <div className="space-y-3">
              {submissions.map((sub) => (
                <SubmissionCard key={sub.id} submission={sub} />
              ))}
            </div>

            {hasMore && (
              <div className="text-center pt-4">
                <button
                  onClick={() => fetchPortfolio(page + 1, true)}
                  disabled={loadingMore}
                  className="px-6 py-3 bg-white text-[#FF6B6B] border border-[#FF6B6B]/20 rounded-xl text-sm font-bold hover:bg-[#FF6B6B]/5 transition-colors disabled:opacity-50"
                >
                  {loadingMore ? "Loading..." : "Load More"}
                </button>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
