"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useActiveChild } from "@/contexts/ActiveChildContext";
import { getBadgeById } from "@/lib/badges";

interface ChildCard {
  id: string;
  name: string;
  age: number;
  tier: number;
  avatarEmoji: string;
  status: "on_track" | "needs_attention" | "needs_setup";
  hasPlacement: boolean;
  hasCurriculum: boolean;
  currentWeek: number | null;
  totalWeeks: number | null;
  weeklyCompleted: number;
  weeklyTotal: number;
  streakCount: number;
  avgScore: number | null;
  lastActive: string | null;
  strongest: { name: string; score: number } | null;
  weakest: { name: string; score: number } | null;
  recentLessons: Array<{
    lessonId: string;
    title: string;
    type: string;
    score: number;
  }>;
  recentBadges: string[];
  needsImprovementLessons: Array<{
    lessonId: string;
    title: string;
  }>;
}

interface AttentionItem {
  type: "red" | "amber" | "green" | "blue";
  childName: string;
  childId: string;
  message: string;
  actionLabel: string;
  actionUrl: string;
}

interface DashboardData {
  parentName: string;
  subscription: { plan: string; status: string } | null;
  children: ChildCard[];
  attentionItems: AttentionItem[];
}

const ATTENTION_COLORS: Record<string, { bar: string; bg: string; text: string; btn: string; btnHover: string }> = {
  red: {
    bar: "bg-[#E74C3C]",
    bg: "bg-[#E74C3C]/[0.04]",
    text: "text-[#E74C3C]/80",
    btn: "bg-[#E74C3C]/10 text-[#E74C3C] hover:bg-[#E74C3C]/20",
    btnHover: "",
  },
  amber: {
    bar: "bg-[#F0932B]",
    bg: "bg-[#F0932B]/[0.04]",
    text: "text-[#F0932B]/80",
    btn: "bg-[#F0932B]/10 text-[#F0932B] hover:bg-[#F0932B]/20",
    btnHover: "",
  },
  green: {
    bar: "bg-[#00B894]",
    bg: "bg-[#00B894]/[0.04]",
    text: "text-[#00B894]/80",
    btn: "bg-[#00B894]/10 text-[#00B894] hover:bg-[#00B894]/20",
    btnHover: "",
  },
  blue: {
    bar: "bg-[#0984E3]",
    bg: "bg-[#0984E3]/[0.04]",
    text: "text-[#0984E3]/80",
    btn: "bg-[#0984E3]/10 text-[#0984E3] hover:bg-[#0984E3]/20",
    btnHover: "",
  },
};

const STATUS_CONFIG: Record<string, { label: string; dot: string; text: string }> = {
  on_track: { label: "On Track", dot: "bg-[#00B894]", text: "text-[#00B894]" },
  needs_attention: { label: "Needs Attention", dot: "bg-[#F0932B]", text: "text-[#F0932B]" },
  needs_setup: { label: "Needs Setup", dot: "bg-[#0984E3]", text: "text-[#0984E3]" },
};

function getScoreLabel(score: number): { label: string; color: string } {
  if (score >= 3.5) return { label: "Excellent", color: "bg-[#00B894]/15 text-[#00B894]" };
  if (score >= 2.5) return { label: "On Track", color: "bg-[#0984E3]/15 text-[#0984E3]" };
  if (score >= 1.5) return { label: "Building Skills", color: "bg-[#F0932B]/15 text-[#F0932B]" };
  return { label: "Needs Support", color: "bg-[#E74C3C]/15 text-[#E74C3C]" };
}

function getTimeAgo(dateStr: string): { label: string; color: string } {
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / (24 * 60 * 60 * 1000));
  if (days === 0) return { label: "Today", color: "text-[#00B894]" };
  if (days === 1) return { label: "Yesterday", color: "text-[#00B894]" };
  if (days <= 3) return { label: `${days}d ago`, color: "text-[#2D3436]/50" };
  return { label: `${days}d ago`, color: "text-[#F0932B]" };
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

const TIER_PRIMARY: Record<number, string> = {
  1: "#FF6B6B",
  2: "#6C5CE7",
  3: "#2D3436",
};

export default function ParentDashboard() {
  const { data: session, status: authStatus } = useSession();
  const router = useRouter();
  const { setActiveChild } = useActiveChild();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authStatus === "unauthenticated") {
      router.push("/auth/login");
      return;
    }
  }, [authStatus, router]);

  useEffect(() => {
    fetch("/api/dashboard/parent")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load dashboard");
        return res.json();
      })
      .then((d) => setData(d))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  function handleSelectChild(child: ChildCard) {
    setActiveChild({
      id: child.id,
      name: child.name,
      age: child.age,
      tier: child.tier as 1 | 2 | 3,
      avatarEmoji: child.avatarEmoji,
    });
    router.push("/home");
  }

  if (loading || authStatus === "loading") {
    return (
      <div className="min-h-screen bg-[#FFF9F0] flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-[#6C5CE7]/30 border-t-[#6C5CE7] rounded-full animate-spin mx-auto" />
          <p className="mt-4 text-[#2D3436]/50 font-medium" style={{ fontFamily: "'DM Sans', sans-serif" }}>
            Loading dashboard...
          </p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-[#FFF9F0] flex items-center justify-center">
        <div className="text-center">
          <p className="text-[#E74C3C] font-semibold">{error || "Something went wrong"}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-3 px-5 py-2.5 bg-[#6C5CE7] text-white rounded-xl text-sm font-bold hover:bg-[#5A4BD1] transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  const planLabel = data.subscription?.plan === "FAMILY_4"
    ? "Family Plus"
    : data.subscription?.plan === "FAMILY_2"
      ? "Family Plan"
      : data.subscription?.status === "TRIALING"
        ? "Free Trial"
        : null;

  const weeklyTotal = data.children.reduce((s, c) => s + c.weeklyTotal, 0);
  const weeklyDone = data.children.reduce((s, c) => s + c.weeklyCompleted, 0);

  return (
    <div className="min-h-screen bg-[#FFF9F0]">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-xl border-b border-[#2D3436]/[0.06]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="text-2xl">&#128218;</span>
            <span
              className="text-lg font-semibold text-[#2D3436]"
              style={{ fontFamily: "'Fraunces', serif" }}
            >
              WriteWise Kids
            </span>
            {planLabel && (
              <span className="text-[10px] font-bold text-[#6C5CE7] bg-[#6C5CE7]/[0.08] px-2.5 py-1 rounded-full ml-1">
                {planLabel}
              </span>
            )}
          </div>
          <button
            onClick={() => router.push("/dashboard")}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-[#2D3436]/50 hover:text-[#2D3436] hover:bg-[#2D3436]/[0.04] rounded-xl transition-colors"
            style={{ fontFamily: "'DM Sans', sans-serif" }}
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
            Back to Profiles
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        {/* Greeting */}
        <section className="animate-fade-in">
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div>
              <h1
                className="text-2xl sm:text-3xl font-medium text-[#2D3436]"
                style={{ fontFamily: "'Fraunces', serif", fontWeight: 500 }}
              >
                {getGreeting()}, {data.parentName}
              </h1>
              <p
                className="text-base text-[#2D3436]/40 mt-1"
                style={{ fontFamily: "'DM Sans', sans-serif" }}
              >
                Here&apos;s how your family is doing this week
              </p>
            </div>

            {/* Weekly progress pill */}
            {weeklyTotal > 0 && (
              <div className="flex items-center gap-3 bg-white rounded-xl px-4 py-2.5 border border-[#2D3436]/[0.06]">
                <span className="text-sm font-medium text-[#2D3436]/60" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                  {weeklyDone} of {weeklyTotal} lessons this week
                </span>
                <div className="w-24 h-2 bg-[#2D3436]/[0.06] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#6C5CE7] rounded-full transition-all duration-700"
                    style={{ width: `${Math.min(100, (weeklyDone / weeklyTotal) * 100)}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Attention Items */}
        {data.attentionItems.length > 0 && (
          <section className="space-y-2 animate-fade-in stagger-1">
            {data.attentionItems.slice(0, 4).map((item, idx) => {
              const colors = ATTENTION_COLORS[item.type] || ATTENTION_COLORS.amber;
              return (
                <div
                  key={`${item.childId}-${item.type}-${idx}`}
                  className={`flex items-center gap-3 ${colors.bg} rounded-xl pl-0 pr-3 py-3 overflow-hidden`}
                >
                  <div className={`w-1 self-stretch rounded-r-full ${colors.bar}`} />
                  <p className="flex-1 text-sm text-[#2D3436]/70 min-w-0" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                    {item.message}
                  </p>
                  <Link
                    href={item.actionUrl}
                    onClick={(e) => {
                      if (item.actionUrl === "/home") {
                        e.preventDefault();
                        const child = data.children.find((c) => c.id === item.childId);
                        if (child) handleSelectChild(child);
                      }
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-colors ${colors.btn}`}
                    style={{ fontFamily: "'DM Sans', sans-serif" }}
                  >
                    {item.actionLabel}
                  </Link>
                </div>
              );
            })}
          </section>
        )}

        {/* Child Progress Cards */}
        <section className="animate-fade-in stagger-2">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {data.children.map((child) => {
              const statusCfg = STATUS_CONFIG[child.status] || STATUS_CONFIG.on_track;
              const tierColor = TIER_PRIMARY[child.tier] || "#FF6B6B";
              const scoreInfo = child.avgScore !== null ? getScoreLabel(child.avgScore) : null;
              const lastActiveInfo = child.lastActive ? getTimeAgo(child.lastActive) : null;

              if (child.status === "needs_setup") {
                return (
                  <div
                    key={child.id}
                    className="bg-white rounded-2xl border-2 border-dashed border-[#2D3436]/[0.08] p-6"
                  >
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-12 h-12 rounded-xl bg-[#0984E3]/[0.08] flex items-center justify-center text-2xl">
                        {child.avatarEmoji}
                      </div>
                      <div>
                        <span className="text-base font-bold text-[#2D3436]" style={{ fontFamily: "'Nunito', sans-serif" }}>
                          {child.name}
                        </span>
                        <span className="block text-xs text-[#2D3436]/40" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                          Age {child.age}
                        </span>
                      </div>
                      <span className={`ml-auto text-xs font-bold ${statusCfg.text}`} style={{ fontFamily: "'DM Sans', sans-serif" }}>
                        {statusCfg.label}
                      </span>
                    </div>
                    <p className="text-sm text-[#2D3436]/50 mb-4 leading-relaxed" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                      {child.name} needs a placement assessment to find the right starting level. This short writing exercise takes about 10 minutes.
                    </p>
                    <Link
                      href={`/placement/${child.id}`}
                      className="inline-flex items-center px-5 py-2.5 bg-[#00B894] text-white rounded-xl text-sm font-bold hover:bg-[#00A884] transition-colors shadow-sm"
                      style={{ fontFamily: "'DM Sans', sans-serif" }}
                    >
                      Begin Assessment
                    </Link>
                  </div>
                );
              }

              return (
                <div
                  key={child.id}
                  className="bg-white rounded-2xl border border-[#2D3436]/[0.06] overflow-hidden hover:shadow-md transition-shadow"
                >
                  {/* Layer 1: Identity bar */}
                  <div className="px-5 pt-5 pb-3 flex items-center gap-3">
                    <div
                      className="w-11 h-11 rounded-xl flex items-center justify-center text-xl"
                      style={{ backgroundColor: `${tierColor}10` }}
                    >
                      {child.avatarEmoji}
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="text-base font-bold text-[#2D3436]" style={{ fontFamily: "'Nunito', sans-serif" }}>
                        {child.name}
                      </span>
                      <span className="block text-xs text-[#2D3436]/40" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                        Age {child.age}
                        {child.currentWeek && child.totalWeeks && ` \u00B7 Week ${child.currentWeek} of ${child.totalWeeks}`}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className={`w-2 h-2 rounded-full ${statusCfg.dot}`} />
                      <span className={`text-xs font-bold ${statusCfg.text}`} style={{ fontFamily: "'DM Sans', sans-serif" }}>
                        {statusCfg.label}
                      </span>
                    </div>
                  </div>

                  {/* Layer 2: Metrics row */}
                  <div className="mx-5 grid grid-cols-4 rounded-xl overflow-hidden border border-[#2D3436]/[0.04]">
                    <div className="bg-[#2D3436]/[0.015] px-3 py-2.5 text-center border-r border-[#2D3436]/[0.04]">
                      <p className="text-sm font-bold text-[#2D3436]" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                        {child.weeklyCompleted}/{child.weeklyTotal}
                      </p>
                      <p className="text-[10px] text-[#2D3436]/40 mt-0.5" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                        This Week
                      </p>
                    </div>
                    <div className="bg-[#2D3436]/[0.015] px-3 py-2.5 text-center border-r border-[#2D3436]/[0.04]">
                      <p className="text-sm font-bold text-[#2D3436]" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                        {child.streakCount > 0 ? `\uD83D\uDD25 ${child.streakCount}` : "\u2014"}
                      </p>
                      <p className="text-[10px] text-[#2D3436]/40 mt-0.5" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                        Streak
                      </p>
                    </div>
                    <div className="bg-[#2D3436]/[0.015] px-3 py-2.5 text-center border-r border-[#2D3436]/[0.04]">
                      {child.avgScore !== null && scoreInfo ? (
                        <>
                          <p className="text-sm font-bold" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                            <span className={`inline-block px-1.5 py-0.5 rounded text-xs font-bold ${scoreInfo.color}`}>
                              {child.avgScore.toFixed(1)}
                            </span>
                          </p>
                          <p className="text-[10px] text-[#2D3436]/40 mt-0.5" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                            Avg Score
                          </p>
                        </>
                      ) : (
                        <>
                          <p className="text-sm font-bold text-[#2D3436]/20" style={{ fontFamily: "'DM Sans', sans-serif" }}>&mdash;</p>
                          <p className="text-[10px] text-[#2D3436]/40 mt-0.5" style={{ fontFamily: "'DM Sans', sans-serif" }}>Avg Score</p>
                        </>
                      )}
                    </div>
                    <div className="bg-[#2D3436]/[0.015] px-3 py-2.5 text-center">
                      {lastActiveInfo ? (
                        <>
                          <p className={`text-sm font-bold ${lastActiveInfo.color}`} style={{ fontFamily: "'DM Sans', sans-serif" }}>
                            {lastActiveInfo.label}
                          </p>
                          <p className="text-[10px] text-[#2D3436]/40 mt-0.5" style={{ fontFamily: "'DM Sans', sans-serif" }}>Active</p>
                        </>
                      ) : (
                        <>
                          <p className="text-sm font-bold text-[#2D3436]/20" style={{ fontFamily: "'DM Sans', sans-serif" }}>&mdash;</p>
                          <p className="text-[10px] text-[#2D3436]/40 mt-0.5" style={{ fontFamily: "'DM Sans', sans-serif" }}>Active</p>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Layer 3: Insights row */}
                  {(child.strongest || child.weakest) && (
                    <div className="mx-5 mt-3 flex items-center gap-4 flex-wrap">
                      {child.strongest && (
                        <span className="text-xs text-[#2D3436]/50" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                          <span className="text-[#00B894]">{"\u25B2"}</span> Strongest:{" "}
                          <strong className="text-[#2D3436]/70">{child.strongest.name}</strong>{" "}
                          <span className="text-[#2D3436]/30">({child.strongest.score})</span>
                        </span>
                      )}
                      {child.weakest && (
                        <span className="text-xs text-[#2D3436]/50" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                          <span className="text-[#F0932B]">{"\u25BD"}</span> Needs work:{" "}
                          <strong className="text-[#2D3436]/70">{child.weakest.name}</strong>{" "}
                          <span className="text-[#2D3436]/30">({child.weakest.score})</span>
                        </span>
                      )}
                    </div>
                  )}

                  {/* Layer 4: Recent lessons strip */}
                  {child.recentLessons.length > 0 && (
                    <div className="mx-5 mt-3 flex items-center gap-2 flex-wrap">
                      {child.recentLessons.map((lesson) => {
                        const ls = getScoreLabel(lesson.score);
                        return (
                          <span
                            key={lesson.lessonId}
                            className="inline-flex items-center gap-1.5 text-xs text-[#2D3436]/50 bg-[#2D3436]/[0.03] rounded-lg px-2.5 py-1"
                            style={{ fontFamily: "'DM Sans', sans-serif" }}
                          >
                            {lesson.title}
                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${ls.color}`}>
                              {lesson.score.toFixed(1)}
                            </span>
                          </span>
                        );
                      })}
                    </div>
                  )}

                  {/* Layer 5: Actions */}
                  <div className="px-5 py-4 mt-3 border-t border-[#2D3436]/[0.04] flex items-center gap-3">
                    <Link
                      href={`/dashboard/children/${child.id}/report`}
                      className="flex-1 text-center px-4 py-2.5 rounded-xl text-sm font-bold text-white transition-colors shadow-sm"
                      style={{
                        backgroundColor: tierColor,
                        fontFamily: "'DM Sans', sans-serif",
                      }}
                    >
                      {"\uD83D\uDCCA"} See Full Report
                    </Link>
                    <button
                      onClick={() => handleSelectChild(child)}
                      className="flex-1 text-center px-4 py-2.5 rounded-xl text-sm font-bold border transition-colors"
                      style={{
                        color: tierColor,
                        borderColor: `${tierColor}30`,
                        fontFamily: "'DM Sans', sans-serif",
                      }}
                    >
                      {"\u270D\uFE0F"} Continue Lessons
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Bottom actions */}
        <section className="flex items-center justify-center gap-4 py-4 animate-fade-in stagger-3">
          <Link
            href="/dashboard/children/new"
            className="text-sm font-medium text-[#2D3436]/40 hover:text-[#2D3436]/70 transition-colors"
            style={{ fontFamily: "'DM Sans', sans-serif" }}
          >
            + Add Child
          </Link>
          <span className="text-[#2D3436]/10">|</span>
          <Link
            href="/pricing"
            className="text-sm font-medium text-[#2D3436]/40 hover:text-[#2D3436]/70 transition-colors"
            style={{ fontFamily: "'DM Sans', sans-serif" }}
          >
            Manage Subscription
          </Link>
        </section>
      </main>
    </div>
  );
}
