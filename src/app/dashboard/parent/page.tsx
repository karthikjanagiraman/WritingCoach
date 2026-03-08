"use client";

import { useState, useEffect } from "react";
import { useSession, signOut } from "next-auth/react";
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
  wordsWritten: number;
  weeklyActivity: boolean[];
}

interface AttentionItem {
  type: "red" | "amber" | "green" | "blue";
  childName: string;
  childId: string;
  message: string;
  actionLabel: string;
  actionUrl: string;
  icon: string;
}

interface DashboardData {
  parentName: string;
  subscription: { plan: string; status: string } | null;
  children: ChildCard[];
  attentionItems: AttentionItem[];
}

const ATTENTION_COLORS: Record<string, { bar: string; bg: string; iconBg: string; text: string; btn: string }> = {
  red: {
    bar: "border-l-[#FF6B6B]",
    bg: "bg-white",
    iconBg: "bg-[#FFF0F0]",
    text: "text-[#2D3436]",
    btn: "bg-[#FFF0F0] text-[#FF6B6B] hover:bg-[#FF6B6B] hover:text-white",
  },
  amber: {
    bar: "border-l-[#E17055]",
    bg: "bg-white",
    iconBg: "bg-[#FFF4F0]",
    text: "text-[#2D3436]",
    btn: "bg-[#FFF4F0] text-[#E17055] hover:bg-[#E17055] hover:text-white",
  },
  green: {
    bar: "border-l-[#00B894]",
    bg: "bg-white",
    iconBg: "bg-[#E8FFF8]",
    text: "text-[#2D3436]",
    btn: "bg-[#E8FFF8] text-[#00B894] hover:bg-[#00B894] hover:text-white",
  },
  blue: {
    bar: "border-l-[#0984E3]",
    bg: "bg-white",
    iconBg: "bg-[#EBF5FF]",
    text: "text-[#2D3436]",
    btn: "bg-[#EBF5FF] text-[#0984E3] hover:bg-[#0984E3] hover:text-white",
  },
};

const STATUS_CONFIG: Record<string, { label: string; dot: string; text: string; bg: string }> = {
  on_track: { label: "On Track", dot: "bg-[#00B894]", text: "text-[#00B894]", bg: "bg-[#E8FFF8]" },
  needs_attention: { label: "Needs Attention", dot: "bg-[#E17055]", text: "text-[#E17055]", bg: "bg-[#FFF4F0]" },
  needs_setup: { label: "Needs Setup", dot: "bg-[#0984E3]", text: "text-[#0984E3]", bg: "bg-[#EBF5FF]" },
};

const TIER_PRIMARY: Record<number, string> = {
  1: "#FF6B6B",
  2: "#6C5CE7",
  3: "#2D3436",
};

const TIER_GRADIENTS: Record<number, string> = {
  1: "linear-gradient(90deg, #FF6B6B, #FFB8B8)",
  2: "linear-gradient(90deg, #6C5CE7, #A29BFE)",
  3: "linear-gradient(90deg, #2D3436, #636E72)",
};

const TIER_LABELS: Record<number, string> = {
  1: "Explorer",
  2: "Adventurer",
  3: "Trailblazer",
};

const TIER_BADGE_STYLES: Record<number, string> = {
  1: "bg-[#FFF0F0] text-[#FF6B6B]",
  2: "bg-[#F0EEFF] text-[#6C5CE7]",
  3: "bg-[#F0F0F0] text-[#2D3436]",
};

const DOT_COLORS: Record<number, string> = {
  1: "bg-[#FF6B6B]",
  2: "bg-[#6C5CE7]",
  3: "bg-[#2D3436]",
};

function getScoreLabel(score: number): { label: string; color: string } {
  if (score >= 3.5) return { label: "Excellent", color: "bg-[#E8FFF8] text-[#00B894]" };
  if (score >= 2.5) return { label: "On Track", color: "bg-[#EBF5FF] text-[#0984E3]" };
  if (score >= 1.5) return { label: "Building", color: "bg-[#FFF4F0] text-[#E17055]" };
  return { label: "Needs Support", color: "bg-[#FFEAEA] text-[#D63031]" };
}

function getTimeAgo(dateStr: string): { label: string; color: string } {
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / (24 * 60 * 60 * 1000));
  if (days === 0) return { label: "Today", color: "text-[#00B894]" };
  if (days === 1) return { label: "Yesterday", color: "text-[#00B894]" };
  if (days <= 3) return { label: `${days}d ago`, color: "text-[#2D3436]/50" };
  return { label: `${days}d ago`, color: "text-[#E17055]" };
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

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

  const activeChildren = data.children.filter((c) => c.status !== "needs_setup");
  const todayDayIndex = new Date().getDay() === 0 ? 6 : new Date().getDay() - 1;
  const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  return (
    <div className="min-h-screen bg-[#FFF9F0]">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-xl border-b border-[#2D3436]/[0.06]">
        <div className="max-w-[960px] mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span
              className="text-lg font-semibold text-[#2D3436]"
              style={{ fontFamily: "'Fraunces', serif" }}
            >
              Write<span className="text-[#6C5CE7]">Wise</span> Kids
            </span>
            {planLabel && (
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#6C5CE7] bg-[#F0EEFF] px-2.5 py-1 rounded-full">
                {planLabel}
              </span>
            )}
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push("/dashboard")}
              className="text-[13px] font-medium text-[#636E72] hover:text-[#2D3436] transition-colors"
              style={{ fontFamily: "'DM Sans', sans-serif" }}
            >
              Back to Profiles
            </button>
            <button
              onClick={() => signOut({ callbackUrl: "/auth/login" })}
              className="text-[13px] font-medium text-[#636E72] hover:text-[#2D3436] transition-colors"
              style={{ fontFamily: "'DM Sans', sans-serif" }}
            >
              Log out
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-[960px] mx-auto px-4 sm:px-6 py-8 space-y-8">
        {/* Greeting */}
        <section className="animate-fade-in">
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div>
              <h1
                className="text-2xl sm:text-[26px] font-medium text-[#2D3436] tracking-tight"
                style={{ fontFamily: "'Fraunces', serif", fontWeight: 500, lineHeight: 1.2 }}
              >
                {getGreeting()}, {data.parentName}
              </h1>
              <p
                className="text-sm text-[#636E72] mt-1"
                style={{ fontFamily: "'DM Sans', sans-serif" }}
              >
                Here&apos;s how your family is doing this week
              </p>
            </div>

            {weeklyTotal > 0 && (
              <div className="flex items-center gap-3 flex-shrink-0">
                <span className="text-[13px] font-semibold text-[#636E72] whitespace-nowrap" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                  <strong className="text-[#2D3436] font-bold">{weeklyDone}</strong> of <strong className="text-[#2D3436] font-bold">{weeklyTotal}</strong> lessons this week
                </span>
                <div className="w-[120px] h-1.5 bg-[#F5EDE0] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#6C5CE7] rounded-full transition-all duration-700"
                    style={{ width: `${Math.min(100, weeklyTotal > 0 ? (weeklyDone / weeklyTotal) * 100 : 0)}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Attention Items */}
        {data.attentionItems.length > 0 && (
          <section className="flex flex-col gap-2 animate-fade-in stagger-1">
            {data.attentionItems.slice(0, 4).map((item, idx) => {
              const colors = ATTENTION_COLORS[item.type] || ATTENTION_COLORS.amber;
              return (
                <div
                  key={`${item.childId}-${item.type}-${idx}`}
                  className={`flex items-center gap-3 ${colors.bg} rounded-xl px-4 py-3 border-l-[3px] ${colors.bar} transition-all hover:shadow-sm hover:translate-x-0.5`}
                  style={{ boxShadow: "0 1px 2px rgba(45,52,54,0.03)" }}
                >
                  <div className={`w-7 h-7 rounded-lg ${colors.iconBg} flex items-center justify-center text-base flex-shrink-0`}>
                    {item.icon}
                  </div>
                  <p className="flex-1 text-[13px] text-[#2D3436] min-w-0 leading-snug" style={{ fontFamily: "'DM Sans', sans-serif" }}>
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
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${colors.btn}`}
                    style={{ fontFamily: "'DM Sans', sans-serif" }}
                  >
                    {item.actionLabel}
                  </Link>
                </div>
              );
            })}
          </section>
        )}

        {/* Section heading */}
        <h2
          className="text-xl font-medium text-[#2D3436] tracking-tight animate-fade-in stagger-2"
          style={{ fontFamily: "'Fraunces', serif", fontWeight: 500, letterSpacing: "-0.3px" }}
        >
          Your writers
        </h2>

        {/* Child Progress Cards — single column */}
        <section className="flex flex-col gap-4 animate-fade-in stagger-2">
          {data.children.map((child) => {
            const statusCfg = STATUS_CONFIG[child.status] || STATUS_CONFIG.on_track;
            const tierColor = TIER_PRIMARY[child.tier] || "#FF6B6B";
            const scoreInfo = child.avgScore !== null ? getScoreLabel(child.avgScore) : null;
            const lastActiveInfo = child.lastActive ? getTimeAgo(child.lastActive) : null;

            /* ─── Onboarding card (needs_setup) ─── */
            if (child.status === "needs_setup") {
              return (
                <div
                  key={child.id}
                  className="bg-white rounded-2xl p-6 relative overflow-hidden"
                  style={{
                    borderTop: "3px solid transparent",
                    borderImage: "linear-gradient(90deg, #0984E3, #74B9FF) 1",
                    border: "1.5px dashed rgba(9,132,227,0.2)",
                    boxShadow: "0 1px 3px rgba(45,52,54,0.04), 0 4px 12px rgba(45,52,54,0.03)",
                  }}
                >
                  {/* Blue gradient top strip */}
                  <div
                    className="absolute top-0 left-0 right-0 h-[3px]"
                    style={{ background: "linear-gradient(90deg, #0984E3, #74B9FF)" }}
                  />

                  <div className="flex items-center gap-3 mb-0">
                    <div className="w-11 h-11 rounded-xl bg-[#EBF5FF] flex items-center justify-center text-xl flex-shrink-0">
                      {child.avatarEmoji}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-semibold text-[#2D3436]" style={{ fontFamily: "'Fraunces', serif" }}>
                          {child.name}
                        </span>
                        <span className="text-[10px] font-bold uppercase tracking-wide bg-[#EBF5FF] text-[#0984E3] px-2 py-0.5 rounded-full">
                          New
                        </span>
                      </div>
                      <span className="text-xs text-[#B2BEC3]" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                        Age {child.age}
                      </span>
                    </div>
                    <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full ${statusCfg.bg}`}>
                      <div className={`w-[7px] h-[7px] rounded-full ${statusCfg.dot}`} />
                      <span className={`text-xs font-semibold ${statusCfg.text}`} style={{ fontFamily: "'DM Sans', sans-serif" }}>
                        {statusCfg.label}
                      </span>
                    </div>
                  </div>

                  <div className="mt-4 flex items-center gap-5 flex-wrap sm:flex-nowrap">
                    <div className="flex-1">
                      <p className="text-sm text-[#636E72] leading-relaxed" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                        {child.name} needs a placement assessment to find the right starting level. This short writing exercise helps us understand where they are and build a personalized curriculum.
                      </p>
                      <div className="flex items-center gap-1 mt-2 text-xs text-[#B2BEC3]" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                          <circle cx="12" cy="12" r="10" />
                          <path d="M12 6v6l4 2" />
                        </svg>
                        Takes about 10 minutes
                      </div>
                    </div>
                    <Link
                      href={`/placement/${child.id}`}
                      className="inline-flex items-center gap-1.5 px-6 py-2.5 bg-[#00B894] text-white rounded-xl text-[13px] font-bold hover:bg-[#00A383] transition-all hover:-translate-y-px shadow-sm flex-shrink-0"
                      style={{ fontFamily: "'DM Sans', sans-serif" }}
                    >
                      Begin Assessment &rarr;
                    </Link>
                  </div>
                </div>
              );
            }

            /* ─── Active child card ─── */
            return (
              <div
                key={child.id}
                className="bg-white rounded-2xl overflow-hidden transition-all hover:shadow-md hover:-translate-y-px relative"
                style={{
                  boxShadow: "0 1px 3px rgba(45,52,54,0.04), 0 4px 12px rgba(45,52,54,0.03)",
                }}
              >
                {/* Tier accent gradient strip */}
                <div
                  className="h-[3px] w-full"
                  style={{ background: TIER_GRADIENTS[child.tier] || TIER_GRADIENTS[1] }}
                />

                {/* Layer 1: Identity bar */}
                <div className="px-6 pt-5 pb-3 flex items-center gap-3">
                  <div
                    className="w-11 h-11 rounded-xl flex items-center justify-center text-[22px] flex-shrink-0"
                    style={{ backgroundColor: `${tierColor}12` }}
                  >
                    {child.avatarEmoji}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span
                        className="text-lg font-semibold text-[#2D3436]"
                        style={{ fontFamily: "'Fraunces', serif" }}
                      >
                        {child.name}
                      </span>
                      <span className={`text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full ${TIER_BADGE_STYLES[child.tier] || TIER_BADGE_STYLES[1]}`}>
                        {TIER_LABELS[child.tier] || "Explorer"}
                      </span>
                    </div>
                    <span className="text-xs text-[#B2BEC3]" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                      Age {child.age}
                      {child.currentWeek && child.totalWeeks && ` \u00B7 Week ${child.currentWeek} of ${child.totalWeeks}`}
                      {child.wordsWritten > 0 && ` \u00B7 ${child.wordsWritten.toLocaleString()} words written`}
                    </span>
                  </div>
                  <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full flex-shrink-0 ${statusCfg.bg}`}>
                    <div
                      className={`w-[7px] h-[7px] rounded-full ${statusCfg.dot}`}
                      style={child.status === "on_track" ? { animation: "pulseGlow 2s ease-in-out infinite" } : undefined}
                    />
                    <span className={`text-xs font-semibold ${statusCfg.text}`} style={{ fontFamily: "'DM Sans', sans-serif" }}>
                      {statusCfg.label}
                    </span>
                  </div>
                </div>

                {/* Layer 2: Metrics row */}
                <div className="mx-6 grid grid-cols-2 sm:grid-cols-4 gap-3 pb-4 border-b border-[#2D3436]/[0.05]">
                  {/* Weekly progress */}
                  <div className="flex flex-col gap-1">
                    <span className="text-[11px] font-semibold text-[#B2BEC3] uppercase tracking-wide" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                      This Week
                    </span>
                    <span className="text-sm font-bold text-[#2D3436]" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                      {child.weeklyCompleted}/{child.weeklyTotal} lessons
                    </span>
                    <div className="w-full h-1 bg-[#F5EDE0] rounded-full overflow-hidden mt-0.5">
                      <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{
                          width: `${child.weeklyTotal > 0 ? Math.min(100, (child.weeklyCompleted / child.weeklyTotal) * 100) : 0}%`,
                          backgroundColor: tierColor,
                        }}
                      />
                    </div>
                  </div>

                  {/* Streak */}
                  <div className="flex flex-col gap-1">
                    <span className="text-[11px] font-semibold text-[#B2BEC3] uppercase tracking-wide" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                      Streak
                    </span>
                    {child.streakCount > 0 ? (
                      <span className="text-sm font-bold text-[#E17055]" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                        {"\uD83D\uDD25"} {child.streakCount} day{child.streakCount !== 1 ? "s" : ""}
                      </span>
                    ) : (
                      <span className="text-sm font-medium text-[#B2BEC3]" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                        {"\u2014"} broken
                      </span>
                    )}
                  </div>

                  {/* Avg Score */}
                  <div className="flex flex-col gap-1">
                    <span className="text-[11px] font-semibold text-[#B2BEC3] uppercase tracking-wide" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                      Avg Score
                    </span>
                    {child.avgScore !== null && scoreInfo ? (
                      <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full w-fit ${scoreInfo.color}`}>
                        {child.avgScore.toFixed(1)} {"\u2014"} {scoreInfo.label}
                      </span>
                    ) : (
                      <span className="text-sm font-medium text-[#B2BEC3]" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                        {"\u2014"}
                      </span>
                    )}
                  </div>

                  {/* Last Active */}
                  <div className="flex flex-col gap-1">
                    <span className="text-[11px] font-semibold text-[#B2BEC3] uppercase tracking-wide" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                      Last Active
                    </span>
                    {lastActiveInfo ? (
                      <span className={`text-sm font-bold ${lastActiveInfo.color}`} style={{ fontFamily: "'DM Sans', sans-serif" }}>
                        {lastActiveInfo.label}
                      </span>
                    ) : (
                      <span className="text-sm font-medium text-[#B2BEC3]" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                        {"\u2014"}
                      </span>
                    )}
                  </div>
                </div>

                {/* Layer 3: Insight pills */}
                {(child.strongest || child.weakest) && (
                  <div className="mx-6 mt-4 flex items-center gap-3 flex-wrap">
                    {child.strongest && (
                      <div className="flex items-center gap-1.5 text-xs bg-[#FFF9F0] rounded-lg px-3 py-1.5" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                        <span>{"\uD83D\uDCAA"}</span>
                        <span className="text-[#636E72]">
                          Strongest: <strong className="text-[#2D3436]">{child.strongest.name}</strong>
                        </span>
                        <span className={`text-[11px] font-bold px-1.5 py-px rounded-full ${getScoreLabel(child.strongest.score).color}`}>
                          {child.strongest.score.toFixed(1)}
                        </span>
                      </div>
                    )}
                    {child.weakest && (
                      <div className="flex items-center gap-1.5 text-xs bg-[#FFF9F0] rounded-lg px-3 py-1.5" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                        <span>{"\uD83C\uDF31"}</span>
                        <span className="text-[#636E72]">
                          Needs work: <strong className="text-[#2D3436]">{child.weakest.name}</strong>
                        </span>
                        <span className={`text-[11px] font-bold px-1.5 py-px rounded-full ${getScoreLabel(child.weakest.score).color}`}>
                          {child.weakest.score.toFixed(1)}
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {/* Layer 4: Recent lessons */}
                {child.recentLessons.length > 0 && (
                  <div className="mx-6 mt-3 flex items-center gap-2 flex-wrap">
                    {child.recentLessons.map((lesson, idx) => {
                      const ls = getScoreLabel(lesson.score);
                      const isLowScore = lesson.score <= 1.4;
                      return (
                        <div
                          key={`${lesson.lessonId}-${idx}`}
                          className="flex items-center gap-2 text-[13px] rounded-lg px-3.5 py-2 transition-colors"
                          style={{
                            fontFamily: "'DM Sans', sans-serif",
                            background: isLowScore ? "#FFEAEA" : "#FFF9F0",
                            border: isLowScore ? "1.5px solid rgba(214,48,49,0.15)" : "none",
                            color: "#2D3436",
                          }}
                        >
                          <span className="font-medium">{lesson.title}</span>
                          <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${ls.color}`}>
                            {lesson.score.toFixed(1)}{isLowScore ? " \u26A0" : ""}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Layer 5: Actions */}
                <div className="px-6 py-4 mt-3 flex items-center gap-3 flex-wrap sm:flex-nowrap">
                  <Link
                    href={`/dashboard/children/${child.id}/report`}
                    className="flex-1 text-center px-5 py-2.5 rounded-xl text-[13px] font-bold text-white transition-all hover:-translate-y-px inline-flex items-center justify-center gap-1.5"
                    style={{
                      backgroundColor: tierColor,
                      fontFamily: "'DM Sans', sans-serif",
                      boxShadow: `0 4px 12px ${tierColor}30`,
                    }}
                  >
                    See Full Report &rarr;
                  </Link>
                  <button
                    onClick={() => handleSelectChild(child)}
                    className="flex-1 text-center px-5 py-2.5 rounded-xl text-[13px] font-semibold border-[1.5px] transition-all hover:bg-[#F0EEFF]"
                    style={{
                      color: "#636E72",
                      borderColor: "rgba(45,52,54,0.12)",
                      fontFamily: "'DM Sans', sans-serif",
                    }}
                  >
                    Continue Lessons
                  </button>
                </div>
              </div>
            );
          })}
        </section>

        {/* Activity Summary */}
        {activeChildren.length > 0 && (
          <section className="animate-fade-in stagger-3">
            <h2
              className="text-xl font-medium text-[#2D3436] tracking-tight mb-4"
              style={{ fontFamily: "'Fraunces', serif", fontWeight: 500, letterSpacing: "-0.3px" }}
            >
              This week
            </h2>
            <div
              className="bg-white rounded-2xl p-6"
              style={{ boxShadow: "0 1px 3px rgba(45,52,54,0.04), 0 4px 12px rgba(45,52,54,0.03)" }}
            >
              {/* Header row */}
              <div className="grid gap-1 pb-3 mb-3 border-b border-[#2D3436]/[0.05]" style={{ gridTemplateColumns: "100px repeat(7, 1fr)" }}>
                <span />
                {DAY_LABELS.map((day) => (
                  <span
                    key={day}
                    className="text-[11px] font-semibold text-[#B2BEC3] uppercase tracking-wide text-center"
                    style={{ fontFamily: "'DM Sans', sans-serif" }}
                  >
                    {day}
                  </span>
                ))}
              </div>

              {/* Child rows */}
              {activeChildren.map((child, rowIdx) => (
                <div
                  key={child.id}
                  className="grid gap-1 items-center py-2"
                  style={{
                    gridTemplateColumns: "100px repeat(7, 1fr)",
                    borderTop: rowIdx > 0 ? "1px solid rgba(45,52,54,0.03)" : undefined,
                  }}
                >
                  <div className="flex items-center gap-2 text-[13px] font-semibold text-[#2D3436]" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                    <span className="text-base">{child.avatarEmoji}</span>
                    {child.name}
                  </div>
                  {(child.weeklyActivity || [false, false, false, false, false, false, false]).map((active, dayIdx) => (
                    <div key={dayIdx} className="flex justify-center items-center">
                      <div
                        className={`w-2.5 h-2.5 rounded-full ${
                          active
                            ? `${DOT_COLORS[child.tier] || DOT_COLORS[1]}`
                            : "bg-[#F5EDE0] opacity-50"
                        }`}
                        style={
                          active && dayIdx === todayDayIndex
                            ? { boxShadow: `0 0 0 3px ${TIER_PRIMARY[child.tier] || TIER_PRIMARY[1]}33` }
                            : undefined
                        }
                      />
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </section>
        )}

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

      {/* Inline keyframes for pulseGlow animation */}
      <style jsx>{`
        @keyframes pulseGlow {
          0%, 100% { box-shadow: 0 0 0 0 rgba(0,184,148,0.2); }
          50% { box-shadow: 0 0 0 6px rgba(0,184,148,0); }
        }
      `}</style>
    </div>
  );
}
