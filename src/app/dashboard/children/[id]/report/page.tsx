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
  overallScore: number;
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

function ReportContent({ childId }: { childId: string }) {
  const router = useRouter();
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

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

        {/* Recent Assessments */}
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
              {recentAssessments.map((assessment, idx) => (
                <div
                  key={`${assessment.lessonId}-${idx}`}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl bg-active-bg/50 hover:bg-active-bg transition-colors"
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
                    </div>
                  </div>
                  <div className="flex-shrink-0">
                    <span
                      className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${
                        assessment.overallScore >= 4
                          ? "bg-success/10 text-success"
                          : assessment.overallScore >= 2.5
                          ? "bg-warning/10 text-yellow-700"
                          : "bg-error/10 text-error"
                      }`}
                    >
                      {assessment.overallScore.toFixed(1)}/5
                    </span>
                  </div>
                </div>
              ))}
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
