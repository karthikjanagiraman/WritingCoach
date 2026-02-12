"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CoachAvatar, SectionLabel } from "@/components/shared";
import {
  getProgress,
  type StudentProgressResponse,
} from "@/lib/api";
import { TierProvider, useTier } from "@/contexts/TierContext";
import { useActiveChild } from "@/contexts/ActiveChildContext";
import type { Tier } from "@/types";

interface SkillCategory {
  name: string;
  displayName: string;
  avgScore: number;
  skills: { name: string; displayName: string; score: number; level: string; totalAttempts: number }[];
}

interface StreakData {
  currentStreak: number;
  longestStreak: number;
  lastActiveDate: string | null;
  weeklyGoal: number;
  weeklyCompleted: number;
}

function ProgressBar({ value, color, height = "h-3" }: { value: number; color: string; height?: string }) {
  return (
    <div className={`w-full ${height} bg-gray-100 rounded-full overflow-hidden`}>
      <div
        className={`h-full ${color} rounded-full transition-all duration-700 ease-out`}
        style={{ width: `${value}%` }}
      />
    </div>
  );
}

const WRITING_TYPES = [
  { key: "narrative", label: "Narrative", icon: "\uD83D\uDCD6" },
  { key: "persuasive", label: "Persuasive", icon: "\uD83D\uDCE2" },
  { key: "expository", label: "Expository", icon: "\uD83D\uDCDD" },
  { key: "descriptive", label: "Descriptive", icon: "\uD83C\uDFA8" },
] as const;

function WritingTypeIcon({ type }: { type: string }) {
  const found = WRITING_TYPES.find((t) => t.key === type);
  return <span className="text-2xl">{found?.icon || "\uD83D\uDCC4"}</span>;
}

const TIER_BADGES: Record<number, { label: string; emoji: string }> = {
  1: { label: "Tier 1 Writer", emoji: "\uD83E\uDD89" },
  2: { label: "Tier 2 Writer", emoji: "\uD83E\uDD8A" },
  3: { label: "Tier 3 Writer", emoji: "\uD83D\uDC3A" },
};

const TYPE_ICONS: Record<string, string> = {
  narrative: "\uD83D\uDCD6",
  persuasive: "\uD83D\uDCE2",
  expository: "\uD83D\uDCDD",
  descriptive: "\uD83C\uDFA8",
};

interface RecentBadge {
  id: string;
  name: string;
  emoji: string;
  description: string;
  category: string;
  unlockedAt: string;
}

interface DashboardContentProps {
  data: StudentProgressResponse;
  childName: string;
  childTier: number;
  activeChild: { id: string; name: string; age: number; tier: 1 | 2 | 3; avatarEmoji: string };
  hasPlacement: boolean | null;
  curriculum: any;
  curriculumLoading: boolean;
  skills: SkillCategory[] | null;
  streakData: StreakData | null;
  recentBadges: RecentBadge[] | null;
}

function DashboardContent({ data, childName, childTier, activeChild, hasPlacement, curriculum, curriculumLoading, skills, streakData, recentBadges }: DashboardContentProps) {
  const { coachName } = useTier();
  const { clearActiveChild } = useActiveChild();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<string>("all");

  const { completedLessons, currentLesson, availableLessons, assessments, typeStats, stats } = data;

  const progressPercent =
    stats.totalAvailable > 0
      ? Math.round((stats.totalCompleted / stats.totalAvailable) * 100)
      : 0;

  const tierBadge = TIER_BADGES[childTier] || TIER_BADGES[1];

  const filteredLessons =
    activeTab === "all"
      ? availableLessons
      : availableLessons.filter((l) => l.type === activeTab);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  };

  const weeklyGoal = streakData?.weeklyGoal ?? 3;
  const weeklyCompleted = streakData?.weeklyCompleted ?? 0;

  // Build skill category scores for bar display
  const SKILL_CATEGORIES = ["narrative", "persuasive", "expository", "descriptive"] as const;
  const skillScores = SKILL_CATEGORIES.map((cat) => {
    const found = skills?.find((s) => s.name === cat);
    return { name: cat, displayName: found?.displayName ?? (cat.charAt(0).toUpperCase() + cat.slice(1)), avgScore: found?.avgScore ?? 0 };
  });

  return (
    <div className="min-h-screen bg-active-bg">
      {/* Header — greeting merged into nav bar */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-sm border-b border-gray-200/60">
        <div className="max-w-3xl mx-auto px-4 sm:px-5 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CoachAvatar size="sm" />
            <div>
              <h1 className="text-base font-extrabold text-active-text leading-tight">
                {getGreeting()}, {childName}!
              </h1>
              <p className="text-xs text-active-text/40 font-semibold">
                {tierBadge.emoji} {tierBadge.label}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Link
              href={`/portfolio/${activeChild?.id}`}
              className="px-3 py-1.5 rounded-lg text-xs font-bold text-active-primary hover:bg-active-primary/10 transition-colors"
            >
              My Writing
            </Link>
            <button
              onClick={() => { clearActiveChild(); router.push("/dashboard"); }}
              className="px-3 py-1.5 rounded-lg text-xs font-bold text-active-text/40 hover:bg-gray-100 transition-colors"
            >
              Switch Child
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-5 py-6 space-y-5">
        {/* Placement / Curriculum Banners */}
        {hasPlacement === false && (
          <section className="animate-fade-in">
            <div className="bg-white rounded-2xl p-5 shadow-sm border-2 border-active-accent relative overflow-hidden">
              <div className="flex items-center gap-4">
                <span className="text-3xl flex-shrink-0">{"\uD83D\uDCDD"}</span>
                <div className="flex-1">
                  <h3 className="text-base font-bold text-active-text">Ready to Get Started?</h3>
                  <p className="text-sm text-active-text/50 mt-0.5">Take a quick writing assessment so we can create the perfect learning plan.</p>
                </div>
                <Link href={`/placement/${activeChild.id}`} className="px-5 py-2.5 bg-active-primary text-white rounded-xl text-sm font-bold hover:bg-active-primary/90 transition-colors shadow-sm whitespace-nowrap">
                  Start Assessment
                </Link>
              </div>
            </div>
          </section>
        )}

        {hasPlacement && !curriculum && !curriculumLoading && (
          <section className="animate-fade-in">
            <div className="bg-white rounded-2xl p-5 shadow-sm border-2 border-active-secondary relative overflow-hidden">
              <div className="flex items-center gap-4">
                <span className="text-3xl flex-shrink-0">{"\uD83D\uDCDA"}</span>
                <div className="flex-1">
                  <h3 className="text-base font-bold text-active-text">Assessment Complete!</h3>
                  <p className="text-sm text-active-text/50 mt-0.5">Now let{"'"}s create a personalized learning plan.</p>
                </div>
                <Link href={`/curriculum/${activeChild.id}/setup`} className="px-5 py-2.5 bg-active-secondary text-white rounded-xl text-sm font-bold hover:bg-active-secondary/90 transition-colors shadow-sm whitespace-nowrap">
                  Set Up Curriculum
                </Link>
              </div>
            </div>
          </section>
        )}

        {/* CTA Card */}
        {currentLesson && (
          <section className="animate-fade-in stagger-1">
            <Link href={`/lesson/${currentLesson.lessonId}`}>
              <div className="bg-white rounded-2xl p-5 border border-gray-200/60 hover:border-active-primary/30 hover:shadow-md transition-all duration-200 cursor-pointer group">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-active-primary/10 rounded-xl flex items-center justify-center flex-shrink-0">
                    <WritingTypeIcon type="narrative" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold uppercase tracking-wider text-active-primary/70 mb-0.5">
                      Continue lesson
                    </p>
                    <h2 className="text-lg font-extrabold text-active-text truncate">
                      {currentLesson.title}
                    </h2>
                    <div className="flex items-center gap-3 mt-2">
                      <div className="flex-1">
                        <ProgressBar value={progressPercent} color="bg-active-primary" height="h-1.5" />
                      </div>
                      <span className="text-xs font-semibold text-active-text/40 whitespace-nowrap">
                        {stats.totalCompleted}/{stats.totalAvailable}
                      </span>
                    </div>
                  </div>
                  <div className="flex-shrink-0 bg-active-primary text-white rounded-xl px-5 py-2.5 text-sm font-bold group-hover:shadow-lg transition-shadow">
                    Continue &rarr;
                  </div>
                </div>
              </div>
            </Link>
          </section>
        )}

        {/* Stats Row — 3 glanceable tiles */}
        <section className="animate-fade-in stagger-1">
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-white rounded-xl p-4 border border-gray-200/60 text-center">
              <div className="text-2xl mb-1">{"\uD83D\uDD25"}</div>
              <p className="text-2xl font-extrabold text-active-text">{streakData?.currentStreak ?? 0}</p>
              <p className="text-xs font-semibold text-active-text/40">Day streak</p>
            </div>
            <div className="bg-white rounded-xl p-4 border border-gray-200/60 text-center">
              <div className="text-2xl mb-1">{"\u2705"}</div>
              <p className="text-2xl font-extrabold text-active-text">{stats.totalCompleted}</p>
              <p className="text-xs font-semibold text-active-text/40">Lessons done</p>
            </div>
            <div className="bg-white rounded-xl p-4 border border-gray-200/60 text-center">
              <div className="text-2xl mb-1">{"\u2B50"}</div>
              <p className="text-2xl font-extrabold text-active-secondary">
                {stats.averageScore !== null ? stats.averageScore : "\u2014"}
              </p>
              <p className="text-xs font-semibold text-active-text/40">Avg score</p>
            </div>
          </div>
        </section>

        {/* Weekly Goal — slim inline bar */}
        <section className="animate-fade-in stagger-1">
          <div className="bg-white rounded-xl px-5 py-3.5 border border-gray-200/60 flex items-center gap-4">
            <p className="text-sm font-bold text-active-text/70 whitespace-nowrap">This week</p>
            <div className="flex gap-1.5 flex-1">
              {Array.from({ length: weeklyGoal }).map((_, i) => (
                <div
                  key={i}
                  className={`h-2.5 flex-1 rounded-full ${i < weeklyCompleted ? "bg-active-primary" : "bg-gray-100"}`}
                />
              ))}
            </div>
            <p className="text-xs font-semibold text-active-text/40 whitespace-nowrap">
              {weeklyCompleted} of {weeklyGoal} lessons
            </p>
          </div>
        </section>

        {/* This Week's Lessons */}
        {curriculum?.weeks && (
          <section className="animate-fade-in stagger-2">
            <div className="flex items-center justify-between mb-3">
              <SectionLabel>This Week{"'"}s Lessons</SectionLabel>
              <Link href={`/curriculum/${activeChild.id}`} className="text-xs font-bold text-active-primary hover:underline">
                View Curriculum &rarr;
              </Link>
            </div>
            {(() => {
              const currentWeek = curriculum.weeks.find((w: any) => w.status !== "completed");
              if (!currentWeek) return <p className="text-sm text-active-text/50">All weeks completed!</p>;
              return (
                <div>
                  <p className="text-sm text-active-text/50 mb-3">
                    Week {currentWeek.weekNumber}: {currentWeek.theme}
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {currentWeek.lessons?.map((lesson: any) => (
                      <Link key={lesson.id} href={`/lesson/${lesson.id}`}>
                        <div className="bg-white rounded-xl p-4 border border-gray-200/60 hover:border-active-primary/30 hover:shadow-sm cursor-pointer transition-all">
                          <div className="text-lg mb-1">{TYPE_ICONS[lesson.type] || "\uD83D\uDCC4"}</div>
                          <h5 className="text-sm font-bold text-active-text leading-snug">{lesson.title}</h5>
                          <p className="text-xs text-active-text/40 mt-0.5">{lesson.unit}</p>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              );
            })()}
          </section>
        )}

        {/* My Progress — combined skills + badges card */}
        <section className="animate-fade-in stagger-2">
          <SectionLabel>My Progress</SectionLabel>
          <div className="bg-white rounded-2xl border border-gray-200/60 overflow-hidden">
            <div className={`grid grid-cols-1 ${recentBadges && recentBadges.length > 0 ? "md:grid-cols-2 md:divide-x md:divide-gray-100" : ""}`}>
              {/* Skills side — horizontal bars */}
              <div className="p-5">
                <h4 className="text-sm font-bold text-active-text/70 mb-4">Writing Skills</h4>
                <div className="space-y-3">
                  {skillScores.map((cat) => (
                    <div key={cat.name}>
                      <div className="flex justify-between mb-1">
                        <span className="text-xs font-semibold text-active-text/60">{cat.displayName}</span>
                        <span className={`text-xs font-bold ${cat.avgScore > 0 ? "text-active-secondary" : "text-active-text/30"}`}>
                          {cat.avgScore > 0 ? cat.avgScore.toFixed(1) : "\u2014"}
                        </span>
                      </div>
                      <ProgressBar
                        value={cat.avgScore > 0 ? (cat.avgScore / 5) * 100 : 0}
                        color={cat.avgScore > 0 ? "bg-active-secondary" : "bg-gray-200"}
                        height="h-2"
                      />
                    </div>
                  ))}
                </div>
              </div>
              {/* Badges side */}
              {recentBadges && recentBadges.length > 0 && (
                <div className="p-5 border-t border-gray-100 md:border-t-0">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-sm font-bold text-active-text/70">Badges</h4>
                    <Link
                      href={`/badges/${activeChild.id}`}
                      className="text-xs font-bold text-active-primary hover:underline"
                    >
                      All &rarr;
                    </Link>
                  </div>
                  <div className="space-y-3">
                    {recentBadges.slice(0, 4).map((badge) => (
                      <div key={badge.id} className="flex items-center gap-3">
                        <span className="text-xl">{badge.emoji}</span>
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-active-text">{badge.name}</p>
                          <p className="text-xs text-active-text/40">{badge.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Writing Progress — compact tiles */}
        <section className="animate-fade-in stagger-3">
          <SectionLabel>Writing Progress</SectionLabel>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {WRITING_TYPES.map(({ key, label, icon }) => {
              const ts = typeStats?.[key] ?? { completed: 0, total: 0, avgScore: null };
              return (
                <div
                  key={key}
                  className="bg-white rounded-xl p-3.5 border border-gray-200/60 text-center"
                >
                  <p className="text-lg mb-1">{icon}</p>
                  <p className="text-xs font-bold text-active-text/70">{label}</p>
                  <p className="text-lg font-extrabold text-active-text mt-1">
                    {ts.completed}
                    <span className="text-xs font-semibold text-active-text/40">/{ts.total}</span>
                  </p>
                </div>
              );
            })}
          </div>
        </section>

        {/* Completed Lessons — divider list */}
        <section className="animate-fade-in stagger-3">
          <SectionLabel>Completed</SectionLabel>
          <div className="bg-white rounded-2xl border border-gray-200/60 divide-y divide-gray-50">
            {completedLessons.length > 0 ? (
              completedLessons.map((lesson) => {
                const assessment = assessments.find(
                  (a) => a.lessonId === lesson.lessonId
                );
                return (
                  <div
                    key={lesson.lessonId}
                    className="flex items-center gap-3 px-5 py-3.5"
                  >
                    <span className="text-base">{"\uD83D\uDCD6"}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-active-text">
                        {lesson.title}
                      </p>
                      <p className="text-xs text-active-text/40">
                        {lesson.completedAt
                          ? new Date(lesson.completedAt).toLocaleDateString()
                          : "Completed"}
                      </p>
                    </div>
                    {assessment && (
                      <span className="text-xs font-bold text-active-accent">
                        {"\u2B50"} {assessment.overallScore}
                      </span>
                    )}
                  </div>
                );
              })
            ) : (
              <p className="text-center text-active-text/40 py-6 text-sm">
                Your completed work will appear here!
              </p>
            )}
          </div>
        </section>

        {/* Explore Lessons */}
        <section className="animate-fade-in stagger-4">
          <SectionLabel>Explore Lessons</SectionLabel>

          <div className="flex gap-2 mb-3 overflow-x-auto pb-1">
            <button
              onClick={() => setActiveTab("all")}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-colors ${
                activeTab === "all"
                  ? "bg-active-primary text-white shadow-sm"
                  : "bg-white text-active-text/50 border border-gray-200/60 hover:bg-active-primary/5"
              }`}
            >
              All
            </button>
            {WRITING_TYPES.map(({ key, label, icon }) => (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-colors ${
                  activeTab === key
                    ? "bg-active-primary text-white shadow-sm"
                    : "bg-white text-active-text/50 border border-gray-200/60 hover:bg-active-primary/5"
                }`}
              >
                {icon} {label}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredLessons.slice(0, 9).map((lesson) => (
              <Link key={lesson.id} href={`/lesson/${lesson.id}`}>
                <div className="bg-white rounded-xl p-4 border border-gray-200/60 hover:border-active-primary/30 hover:shadow-sm cursor-pointer transition-all">
                  <h5 className="text-sm font-bold text-active-text">
                    {lesson.title}
                  </h5>
                  <p className="text-xs text-active-text/40 mt-0.5">{lesson.unit}</p>
                </div>
              </Link>
            ))}
          </div>
          {filteredLessons.length === 0 && (
            <p className="text-center text-active-text/40 py-6 text-sm">
              No lessons available in this category yet.
            </p>
          )}
        </section>
      </main>
    </div>
  );
}

export default function Dashboard() {
  const { activeChild } = useActiveChild();
  const router = useRouter();
  const [data, setData] = useState<StudentProgressResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [curriculum, setCurriculum] = useState<any>(null);
  const [curriculumLoading, setCurriculumLoading] = useState(true);
  const [hasPlacement, setHasPlacement] = useState<boolean | null>(null);
  const [skills, setSkills] = useState<SkillCategory[] | null>(null);
  const [streakData, setStreakData] = useState<StreakData | null>(null);
  const [recentBadges, setRecentBadges] = useState<RecentBadge[] | null>(null);

  useEffect(() => {
    if (!activeChild) {
      router.push("/dashboard");
      return;
    }
    getProgress(activeChild.id)
      .then(setData)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [activeChild, router]);

  useEffect(() => {
    if (!activeChild) return;
    fetch(`/api/curriculum/${activeChild.id}`)
      .then(res => res.ok ? res.json() : null)
      .then(data => setCurriculum(data))
      .catch(() => null)
      .finally(() => setCurriculumLoading(false));
  }, [activeChild]);

  useEffect(() => {
    if (!activeChild) return;
    fetch(`/api/placement/${activeChild.id}`)
      .then(res => setHasPlacement(res.ok))
      .catch(() => setHasPlacement(false));
  }, [activeChild]);

  useEffect(() => {
    if (!activeChild) return;
    fetch(`/api/children/${activeChild.id}/skills`)
      .then(res => res.ok ? res.json() : null)
      .then(data => { if (data?.categories) setSkills(data.categories); })
      .catch(() => null);
  }, [activeChild]);

  useEffect(() => {
    if (!activeChild) return;
    fetch(`/api/children/${activeChild.id}/streak`)
      .then(res => res.ok ? res.json() : null)
      .then(data => { if (data) setStreakData(data); })
      .catch(() => null);
  }, [activeChild]);

  useEffect(() => {
    if (!activeChild) return;
    fetch(`/api/children/${activeChild.id}/badges`)
      .then(res => res.ok ? res.json() : null)
      .then(data => { if (data?.badges) setRecentBadges(data.badges); })
      .catch(() => null);
  }, [activeChild]);

  if (loading) {
    return (
      <div className="min-h-screen bg-active-bg flex items-center justify-center">
        <div className="text-center">
          <div className="flex justify-center">
            <CoachAvatar size="lg" animate />
          </div>
          <p className="mt-4 text-active-text/60 font-semibold">Loading...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-active-bg flex items-center justify-center">
        <div className="text-center">
          <div className="flex justify-center">
            <CoachAvatar size="lg" />
          </div>
          <p className="mt-4 text-active-primary font-semibold">
            {error || "Something went wrong"}
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

  if (!activeChild) return null;

  return (
    <TierProvider tier={activeChild.tier as Tier}>
      <DashboardContent data={data} childName={activeChild.name} childTier={activeChild.tier} activeChild={activeChild} hasPlacement={hasPlacement} curriculum={curriculum} curriculumLoading={curriculumLoading} skills={skills} streakData={streakData} recentBadges={recentBadges} />
    </TierProvider>
  );
}
