"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { TierProvider } from "@/contexts/TierContext";
import SkillRadarChart from "@/components/SkillRadarChart";
import ScoreTrendChart from "@/components/charts/ScoreTrendChart";
import ActivityHeatmap from "@/components/charts/ActivityHeatmap";
import type { Tier } from "@/types";

interface ReportChild {
  id: string;
  name: string;
  age: number;
  tier: number;
}

interface ReportSummary {
  totalLessons: number;
  completedLessons: number;
  needsImprovementLessons?: number;
  averageScore: number | null;
  totalWords: number;
  totalSubmissions: number;
  badgeCount: number;
}

interface ReportSkill {
  category: string;
  displayName: string;
  avgScore: number;
}

interface ReportStreak {
  currentStreak: number;
  longestStreak: number;
  weeklyGoal: number;
  weeklyCompleted: number;
}

interface ReportAssessment {
  lessonId: string;
  lessonTitle: string;
  lessonType: string;
  learningObjectives?: string[];
  overallScore: number;
  scores?: Record<string, number>;
  feedback?: { strength: string; growth: string; encouragement: string } | null;
  submittedText?: string | null;
  wordCount?: number | null;
  revisionCount?: number;
  status?: string;
  createdAt: string;
}

interface ScoreByType {
  type: string;
  avgScore: number;
  count: number;
}

interface ActivityEntry {
  date: string;
  count: number;
}

interface ReportData {
  child: ReportChild;
  summary: ReportSummary;
  skills: ReportSkill[];
  streak: ReportStreak;
  recentAssessments: ReportAssessment[];
  scoresByType: ScoreByType[];
  activityTimeline: ActivityEntry[];
}

const TIER_LABELS: Record<number, string> = {
  1: "Tier 1: Explorer",
  2: "Tier 2: Adventurer",
  3: "Tier 3: Trailblazer",
};

const TIER_COLORS: Record<number, string> = {
  1: "bg-tier1-primary",
  2: "bg-tier2-primary",
  3: "bg-tier3-primary",
};

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
          <span key={i} className="text-base">
            {isFull ? "\u2B50" : isHalf ? "\u2B50" : "\u2606"}
          </span>
        );
      })}
    </span>
  );
}

function ReportContent({ childId }: { childId: string }) {
  const router = useRouter();
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [expandedAssessments, setExpandedAssessments] = useState<Set<string>>(new Set());
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [generatingSummary, setGeneratingSummary] = useState(false);

  useEffect(() => {
    fetch(`/api/children/${encodeURIComponent(childId)}/report`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load report");
        return res.json();
      })
      .then((data) => setReportData(data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [childId]);

  async function handleExport() {
    setExporting(true);
    try {
      const res = await fetch(
        `/api/children/${encodeURIComponent(childId)}/report/export`
      );
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download =
        res.headers.get("Content-Disposition")?.match(/filename="(.+)"/)?.[1] ||
        "report.csv";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      alert("Failed to export report. Please try again.");
    } finally {
      setExporting(false);
    }
  }

  async function handleGenerateSummary() {
    setGeneratingSummary(true);
    try {
      const res = await fetch(
        `/api/children/${encodeURIComponent(childId)}/report?generateSummary=true`
      );
      if (!res.ok) throw new Error("Failed to generate summary");
      const data = await res.json();
      setAiSummary(data.aiSummary ?? null);
    } catch {
      setAiSummary(null);
    } finally {
      setGeneratingSummary(false);
    }
  }

  function toggleAssessment(lessonId: string) {
    setExpandedAssessments((prev) => {
      const next = new Set(prev);
      if (next.has(lessonId)) next.delete(lessonId);
      else next.add(lessonId);
      return next;
    });
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-active-bg flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-active-primary/30 border-t-active-primary rounded-full animate-spin mx-auto" />
          <p className="mt-4 text-active-text/60 font-semibold">
            Loading report...
          </p>
        </div>
      </div>
    );
  }

  if (error || !reportData) {
    return (
      <div className="min-h-screen bg-active-bg flex items-center justify-center">
        <div className="text-center">
          <p className="text-active-primary font-semibold">
            {error || "Failed to load report"}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="mt-3 px-5 py-2.5 bg-active-primary text-white rounded-xl text-sm font-bold hover:bg-active-primary/90 transition-colors shadow-sm"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  const { child, summary, skills, streak, recentAssessments, scoresByType, activityTimeline } =
    reportData;

  // Transform skills into the format SkillRadarChart expects (grouped by category)
  const skillCategories = skills.reduce(
    (acc, skill) => {
      const existing = acc.find((c) => c.name === skill.category);
      if (existing) {
        existing.skills.push({
          name: skill.displayName.toLowerCase().replace(/\s/g, "_"),
          displayName: skill.displayName,
          score: skill.avgScore,
          level: skill.avgScore >= 4 ? "advanced" : skill.avgScore >= 2.5 ? "developing" : "emerging",
          totalAttempts: 1,
        });
        // Recalculate average
        existing.avgScore =
          Math.round(
            (existing.skills.reduce((s, sk) => s + sk.score, 0) /
              existing.skills.length) *
              10
          ) / 10;
      } else {
        acc.push({
          name: skill.category,
          displayName: capitalize(skill.category),
          avgScore: skill.avgScore,
          skills: [
            {
              name: skill.displayName.toLowerCase().replace(/\s/g, "_"),
              displayName: skill.displayName,
              score: skill.avgScore,
              level:
                skill.avgScore >= 4
                  ? "advanced"
                  : skill.avgScore >= 2.5
                  ? "developing"
                  : "emerging",
              totalAttempts: 1,
            },
          ],
        });
      }
      return acc;
    },
    [] as {
      name: string;
      displayName: string;
      avgScore: number;
      skills: {
        name: string;
        displayName: string;
        score: number;
        level: string;
        totalAttempts: number;
      }[];
    }[]
  );

  return (
    <div className="min-h-screen bg-active-bg">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-sm border-b border-active-primary/10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push("/dashboard")}
              className="w-9 h-9 rounded-full bg-active-bg flex items-center justify-center flex-shrink-0 hover:bg-active-primary/10 transition-colors"
              aria-label="Back to Dashboard"
            >
              <svg
                className="w-5 h-5 text-active-text"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>
            <h1 className="text-xl font-extrabold text-active-text">
              Progress Report
            </h1>
          </div>
          <button
            onClick={handleExport}
            disabled={exporting}
            className="px-4 py-2 text-sm font-bold text-active-primary border border-active-primary/20 rounded-xl hover:bg-active-primary/5 transition-colors disabled:opacity-50"
          >
            {exporting ? "Exporting..." : "Export CSV"}
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Child Header */}
        <section className="bg-white rounded-2xl p-5 shadow-sm border border-active-primary/10 animate-fade-in">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-active-primary/10 flex items-center justify-center text-3xl">
              {"\uD83D\uDC67"}
            </div>
            <div className="flex-1">
              <h2 className="text-2xl font-extrabold text-active-text">
                {child.name}
              </h2>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <span className="text-sm text-active-text/50">
                  Age {child.age}
                </span>
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 ${TIER_COLORS[child.tier] || "bg-tier1-primary"} text-white rounded-full text-xs font-bold`}
                >
                  {TIER_LABELS[child.tier] || "Tier 1"}
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* Summary Stats */}
        <section className="grid grid-cols-2 sm:grid-cols-4 gap-3 animate-fade-in stagger-1">
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-active-primary/10 text-center">
            <div className="text-2xl font-extrabold text-active-primary">
              {summary.completedLessons}
            </div>
            <div className="text-xs font-semibold text-active-text/50 mt-1">
              Lessons Done
            </div>
          </div>
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-active-primary/10 text-center">
            <div className="text-2xl font-extrabold text-active-secondary">
              {summary.averageScore !== null
                ? summary.averageScore.toFixed(1)
                : "--"}
            </div>
            <div className="text-xs font-semibold text-active-text/50 mt-1">
              Avg Score
            </div>
          </div>
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-active-primary/10 text-center">
            <div className="text-2xl font-extrabold text-active-accent">
              {summary.totalWords.toLocaleString()}
            </div>
            <div className="text-xs font-semibold text-active-text/50 mt-1">
              Words Written
            </div>
          </div>
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-active-primary/10 text-center">
            <div className="text-2xl font-extrabold text-active-primary">
              {summary.badgeCount}
            </div>
            <div className="text-xs font-semibold text-active-text/50 mt-1">
              Badges Earned
            </div>
          </div>
        </section>

        {/* Needs Improvement Alert */}
        {(summary.needsImprovementLessons ?? 0) > 0 && (
          <section className="bg-amber-50 rounded-2xl p-4 border border-amber-200 animate-fade-in">
            <div className="flex items-center gap-3">
              <span className="text-2xl">{"\u26A0\uFE0F"}</span>
              <div>
                <span className="text-sm font-bold text-amber-800">
                  {summary.needsImprovementLessons} {summary.needsImprovementLessons === 1 ? "lesson needs" : "lessons need"} revision
                </span>
                <p className="text-xs text-amber-700/70 mt-0.5">
                  These lessons scored below expectations. Encourage your child to try revising their work.
                </p>
              </div>
            </div>
          </section>
        )}

        {/* AI Summary Card */}
        <section className="bg-white rounded-2xl p-5 shadow-sm border border-active-primary/10 animate-fade-in stagger-1">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-active-text flex items-center gap-2">
              <span>{"\uD83E\uDD16"}</span> AI Progress Summary
            </h3>
            {!aiSummary && (
              <button
                onClick={handleGenerateSummary}
                disabled={generatingSummary}
                className="px-4 py-1.5 text-xs font-bold text-active-primary border border-active-primary/20 rounded-lg hover:bg-active-primary/5 transition-colors disabled:opacity-50"
              >
                {generatingSummary ? "Generating..." : "Generate Summary"}
              </button>
            )}
          </div>
          {generatingSummary && (
            <div className="flex items-center gap-3 py-4">
              <div className="w-5 h-5 border-2 border-active-primary/30 border-t-active-primary rounded-full animate-spin" />
              <p className="text-sm text-active-text/50">Analyzing progress and generating insights...</p>
            </div>
          )}
          {aiSummary && (
            <div className="text-sm text-active-text/80 leading-relaxed whitespace-pre-wrap">
              {aiSummary}
            </div>
          )}
          {!aiSummary && !generatingSummary && (
            <p className="text-sm text-active-text/40 py-2">
              Generate a personalized AI summary of your child&apos;s writing progress, strengths, and suggestions for home support.
            </p>
          )}
        </section>

        {/* Streak Summary */}
        {streak.currentStreak > 0 && (
          <section className="bg-white rounded-2xl p-4 shadow-sm border border-active-primary/10 animate-fade-in">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{"\uD83D\uDD25"}</span>
                <div>
                  <span className="text-lg font-extrabold text-active-text">
                    {streak.currentStreak} day streak
                  </span>
                  <span className="text-sm text-active-text/40 ml-2">
                    (Best: {streak.longestStreak})
                  </span>
                </div>
              </div>
              <div className="text-sm text-active-text/50 font-semibold">
                {streak.weeklyCompleted}/{streak.weeklyGoal} this week
              </div>
            </div>
          </section>
        )}

        {/* Charts Row */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-4 animate-fade-in stagger-1">
          <SkillRadarChart categories={skillCategories} />
          <ScoreTrendChart data={scoresByType} />
        </section>

        {/* Activity Heatmap */}
        <section className="animate-fade-in stagger-1">
          <ActivityHeatmap data={activityTimeline} />
        </section>

        {/* Recent Assessments — Expandable */}
        <section className="bg-white rounded-2xl p-5 shadow-sm border border-active-primary/10 animate-fade-in stagger-1">
          <h3 className="text-sm font-bold text-active-text mb-4">
            Recent Assessments
          </h3>
          {recentAssessments.length === 0 ? (
            <p className="text-sm text-active-text/40 py-4 text-center">
              No assessments yet. Complete a lesson to see results here.
            </p>
          ) : (
            <div className="space-y-2">
              {recentAssessments.map((assessment, idx) => {
                const isExpanded = expandedAssessments.has(assessment.lessonId);
                const isNeedsImprovement = assessment.status === "needs_improvement";
                return (
                  <div key={`${assessment.lessonId}-${idx}`}>
                    <button
                      onClick={() => toggleAssessment(assessment.lessonId)}
                      className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-active-bg/50 hover:bg-active-bg transition-colors text-left"
                    >
                      <span className="text-lg flex-shrink-0">
                        {TYPE_ICONS[assessment.lessonType] || "\uD83D\uDCDD"}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold text-active-text truncate">
                          {assessment.lessonTitle}
                        </div>
                        <div className="text-xs text-active-text/40">
                          {capitalize(assessment.lessonType)} &middot;{" "}
                          {new Date(assessment.createdAt).toLocaleDateString()}
                          {(assessment.revisionCount ?? 0) > 0 && (
                            <span> &middot; {assessment.revisionCount} revision{assessment.revisionCount !== 1 ? "s" : ""}</span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {isNeedsImprovement && (
                          <span className="text-xs font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
                            Needs Improvement
                          </span>
                        )}
                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${
                            assessment.overallScore >= 3.5
                              ? "bg-green-100 text-green-700"
                              : assessment.overallScore >= 2.5
                              ? "bg-yellow-100 text-yellow-700"
                              : assessment.overallScore >= 1.5
                              ? "bg-orange-100 text-orange-700"
                              : "bg-red-100 text-red-700"
                          }`}
                        >
                          {assessment.overallScore.toFixed(1)}/4
                        </span>
                        <svg
                          className={`w-4 h-4 text-active-text/30 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                          viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"
                        >
                          <polyline points="6 9 12 15 18 9" />
                        </svg>
                      </div>
                    </button>

                    {/* Expanded Detail */}
                    {isExpanded && (
                      <div className="mt-1 ml-10 mr-2 p-4 bg-white rounded-xl border border-gray-100 space-y-3 animate-fade-in">
                        {/* Learning Objectives */}
                        {assessment.learningObjectives && assessment.learningObjectives.length > 0 && (
                          <div>
                            <h4 className="text-xs font-bold text-active-text/50 uppercase tracking-wider mb-1">Learning Objectives</h4>
                            <ul className="space-y-0.5">
                              {assessment.learningObjectives.map((obj, i) => (
                                <li key={i} className="text-xs text-active-text/60 flex items-start gap-1.5">
                                  <span className="text-active-secondary">&#8226;</span> {obj}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {/* Per-Criterion Scores */}
                        {assessment.scores && Object.keys(assessment.scores).length > 0 && (
                          <div>
                            <h4 className="text-xs font-bold text-active-text/50 uppercase tracking-wider mb-1">Scores</h4>
                            <div className="space-y-1">
                              {Object.entries(assessment.scores).map(([criterion, score]) => (
                                <div key={criterion} className="flex items-center justify-between">
                                  <span className="text-xs font-semibold text-active-text/70 capitalize">
                                    {criterion.replace(/_/g, " ")}
                                  </span>
                                  <div className="flex items-center gap-1.5">
                                    <StarRating score={score} />
                                    <span className="text-xs text-active-text/40">{score.toFixed(1)}</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Feedback */}
                        {assessment.feedback && (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            <div className="bg-active-secondary/5 rounded-lg p-3 border border-active-secondary/10">
                              <p className="text-xs font-bold text-active-secondary mb-1">Strength</p>
                              <p className="text-xs text-active-text/70 leading-relaxed">{assessment.feedback.strength}</p>
                            </div>
                            <div className="bg-active-accent/5 rounded-lg p-3 border border-active-accent/10">
                              <p className="text-xs font-bold text-active-text/60 mb-1">Growth Area</p>
                              <p className="text-xs text-active-text/70 leading-relaxed">{assessment.feedback.growth}</p>
                            </div>
                          </div>
                        )}

                        {/* Writing Excerpt */}
                        {assessment.submittedText && (
                          <div>
                            <h4 className="text-xs font-bold text-active-text/50 uppercase tracking-wider mb-1">
                              Writing Excerpt {assessment.wordCount ? `(${assessment.wordCount} words)` : ""}
                            </h4>
                            <div className="bg-active-bg rounded-lg p-3">
                              <p className="text-xs text-active-text/70 leading-relaxed font-[Literata,serif] italic">
                                &ldquo;{assessment.submittedText.length > 200
                                  ? assessment.submittedText.slice(0, 200) + "..."
                                  : assessment.submittedText}&rdquo;
                              </p>
                            </div>
                          </div>
                        )}

                        {/* View Full Detail Link */}
                        <Link
                          href={`/dashboard/children/${childId}/report/${assessment.lessonId}`}
                          className="inline-flex items-center gap-1 text-xs font-bold text-active-primary hover:underline mt-1"
                        >
                          View Full Detail &rarr;
                        </Link>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Actions */}
        <section className="flex flex-col sm:flex-row gap-3 animate-fade-in stagger-1 pb-8">
          <Link
            href={`/badges/${childId}`}
            className="flex-1 text-center px-5 py-3 bg-active-primary text-white rounded-xl text-sm font-bold hover:bg-active-primary/90 transition-colors shadow-sm"
          >
            View Badge Collection
          </Link>
          <Link
            href={`/curriculum/${childId}`}
            className="flex-1 text-center px-5 py-3 bg-white text-active-primary border border-active-primary/20 rounded-xl text-sm font-bold hover:bg-active-primary/5 transition-colors"
          >
            View Curriculum
          </Link>
        </section>
      </main>
    </div>
  );
}

export default function ReportPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: childId } = use(params);
  const { data: session, status } = useSession();
  const router = useRouter();
  const [tier, setTier] = useState<Tier>(1);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/login");
    }
  }, [status, router]);

  // Fetch child tier for TierProvider
  useEffect(() => {
    fetch(`/api/children/${encodeURIComponent(childId)}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.child?.tier) {
          setTier(data.child.tier as Tier);
        }
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
      <ReportContent childId={childId} />
    </TierProvider>
  );
}
