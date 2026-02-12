"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CoachAvatar, SectionLabel } from "@/components/shared";
import SkillRadarChart from "@/components/SkillRadarChart";
import StreakDisplay from "@/components/StreakDisplay";
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

function ProgressBar({ value, color }: { value: number; color: string }) {
  return (
    <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
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
}

function DashboardContent({ data, childName, childTier, activeChild, hasPlacement, curriculum, curriculumLoading, skills, streakData }: DashboardContentProps) {
  const { coachName } = useTier();
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

  return (
    <div className="min-h-screen bg-active-bg">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-sm border-b border-active-primary/10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CoachAvatar size="sm" />
            <h1 className="text-xl sm:text-2xl font-extrabold text-active-primary tracking-tight">
              WriteWise Kids
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href={`/portfolio/${activeChild?.id}`}
              className="px-3 py-2 rounded-xl text-sm font-bold text-active-primary hover:bg-active-primary/10 transition-colors"
            >
              My Writing
            </Link>
            <button
              className="p-2.5 rounded-xl hover:bg-active-primary/10 transition-colors"
              aria-label="Settings"
            >
              <svg className="w-5 h-5 text-active-text/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Greeting Section with Tier Badge */}
        <section className="animate-fade-in">
          <div className="flex items-center gap-4">
            <CoachAvatar size="lg" animate />
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-2xl sm:text-3xl font-extrabold text-active-text">
                  {getGreeting()}, {childName}!
                </h2>
                <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-active-primary/10 text-active-primary rounded-full text-xs font-bold">
                  {tierBadge.emoji} {tierBadge.label}
                </span>
              </div>
              <p className="text-active-text/70 text-lg mt-1">
                {coachName} is here to help you write something amazing today!
              </p>
            </div>
          </div>
        </section>

        {/* Skills & Streak Section */}
        <section className="animate-fade-in stagger-1">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <SkillRadarChart categories={skills ?? []} />
            <StreakDisplay
              currentStreak={streakData?.currentStreak ?? 0}
              longestStreak={streakData?.longestStreak ?? 0}
              weeklyGoal={streakData?.weeklyGoal ?? 3}
              weeklyCompleted={streakData?.weeklyCompleted ?? 0}
            />
          </div>
        </section>

        {/* Current Lesson Card */}
        {currentLesson && (
          <section className="animate-fade-in stagger-1">
            <SectionLabel>Continue Learning</SectionLabel>
            <Link href={`/lesson/${currentLesson.lessonId}`}>
              <div className="bg-white rounded-2xl p-5 sm:p-6 shadow-sm border border-active-primary/10 hover:shadow-md hover:border-active-primary/30 transition-all duration-200 cursor-pointer group">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <WritingTypeIcon type="narrative" />
                      <span className="text-xs font-semibold uppercase tracking-wider text-active-primary/70">
                        {currentLesson.currentPhase || "In Progress"}
                      </span>
                    </div>
                    <h4 className="text-xl font-bold text-active-text truncate">
                      {currentLesson.title}
                    </h4>
                    <div className="mt-3 flex items-center gap-3">
                      <div className="flex-1">
                        <ProgressBar value={progressPercent} color="bg-active-primary" />
                      </div>
                      <span className="text-sm font-semibold text-active-text/60 whitespace-nowrap">
                        {stats.totalCompleted}/{stats.totalAvailable} lessons
                      </span>
                    </div>
                  </div>
                  <div className="flex-shrink-0 bg-active-primary text-white rounded-xl px-4 py-2.5 font-bold text-sm group-hover:bg-active-primary/90 transition-colors shadow-sm">
                    Continue
                    <span className="ml-1 inline-block group-hover:translate-x-0.5 transition-transform">
                      &rarr;
                    </span>
                  </div>
                </div>
              </div>
            </Link>
          </section>
        )}

        {/* Writing Progress by Type - 4 cards */}
        <section className="animate-fade-in stagger-2">
          <SectionLabel>My Writing Progress</SectionLabel>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {WRITING_TYPES.map(({ key, label, icon }) => {
              const ts = typeStats?.[key] ?? { completed: 0, total: 0, avgScore: null };
              const pct = ts.total > 0 ? Math.round((ts.completed / ts.total) * 100) : 0;
              return (
                <div
                  key={key}
                  className="bg-white rounded-2xl p-4 shadow-sm border border-active-primary/10"
                >
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-xl">{icon}</span>
                    <span className="text-sm font-bold text-active-text">{label}</span>
                  </div>
                  <ProgressBar value={pct} color="bg-active-primary" />
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-xs font-semibold text-active-text/60">
                      {ts.completed}/{ts.total}
                    </span>
                    {ts.avgScore !== null && (
                      <span className="text-xs font-bold text-active-secondary">
                        {ts.avgScore}/4
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          {stats.averageScore !== null && (
            <div className="text-center mt-3">
              <p className="text-sm text-active-text/60">
                Overall Average:{" "}
                <span className="font-bold text-active-secondary">
                  {stats.averageScore} / 4.0
                </span>
              </p>
            </div>
          )}
        </section>

        {/* Completed Lessons */}
        <section className="animate-fade-in stagger-3">
          <SectionLabel>Completed Lessons</SectionLabel>
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-active-primary/10 space-y-3">
            {completedLessons.length > 0 ? (
              completedLessons.map((lesson) => {
                const assessment = assessments.find(
                  (a) => a.lessonId === lesson.lessonId
                );
                return (
                  <div
                    key={lesson.lessonId}
                    className="flex items-center gap-3 p-3 rounded-xl hover:bg-active-bg/50 transition-colors"
                  >
                    <WritingTypeIcon type="narrative" />
                    <div className="flex-1 min-w-0">
                      <h5 className="text-sm font-bold text-active-text truncate">
                        {lesson.title}
                      </h5>
                      <p className="text-xs text-active-text/50">
                        {lesson.completedAt
                          ? new Date(lesson.completedAt).toLocaleDateString()
                          : "Completed"}
                      </p>
                    </div>
                    {assessment && (
                      <div className="flex items-center gap-1">
                        <svg
                          className="w-4 h-4 text-active-accent"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                        <span className="text-sm font-bold text-active-text/70">
                          {assessment.overallScore}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })
            ) : (
              <p className="text-center text-active-text/40 py-4 text-sm">
                Your completed work will appear here!
              </p>
            )}
          </div>
        </section>

        {/* Placement Banner */}
        {hasPlacement === false && (
          <section className="animate-fade-in stagger-1">
            <div className="bg-white rounded-2xl p-6 shadow-sm border-2 border-[#FFE66D] relative overflow-hidden">
              <div className="flex items-center gap-4">
                <span className="text-4xl">{"\uD83D\uDCDD"}</span>
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-[#2D3436]">Ready to Get Started?</h3>
                  <p className="text-sm text-[#2D3436]/60 mt-1">Take a quick writing assessment so we can create the perfect learning plan.</p>
                </div>
                <Link href={`/placement/${activeChild.id}`} className="px-5 py-2.5 bg-[#FF6B6B] text-white rounded-xl text-sm font-bold hover:bg-[#FF6B6B]/90 transition-colors shadow-sm whitespace-nowrap">
                  Start Assessment
                </Link>
              </div>
            </div>
          </section>
        )}

        {/* Curriculum Setup Banner */}
        {hasPlacement && !curriculum && !curriculumLoading && (
          <section className="animate-fade-in stagger-1">
            <div className="bg-white rounded-2xl p-6 shadow-sm border-2 border-[#4ECDC4] relative overflow-hidden">
              <div className="flex items-center gap-4">
                <span className="text-4xl">{"\uD83D\uDCDA"}</span>
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-[#2D3436]">Assessment Complete!</h3>
                  <p className="text-sm text-[#2D3436]/60 mt-1">Now let{"'"}s create a personalized learning plan for you.</p>
                </div>
                <Link href={`/curriculum/${activeChild.id}/setup`} className="px-5 py-2.5 bg-[#4ECDC4] text-white rounded-xl text-sm font-bold hover:bg-[#4ECDC4]/90 transition-colors shadow-sm whitespace-nowrap">
                  Set Up Curriculum
                </Link>
              </div>
            </div>
          </section>
        )}

        {/* This Week's Lessons */}
        {curriculum?.weeks && (
          <section className="animate-fade-in stagger-1">
            <SectionLabel>This Week{"'"}s Lessons</SectionLabel>
            {(() => {
              const currentWeek = curriculum.weeks.find((w: any) => w.status !== "completed");
              if (!currentWeek) return <p className="text-sm text-active-text/60">All weeks completed!</p>;
              return (
                <div className="space-y-3">
                  <p className="text-sm text-active-text/60 mb-2">
                    Week {currentWeek.weekNumber}: {currentWeek.theme}
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {currentWeek.lessons?.map((lesson: any) => (
                      <Link key={lesson.id} href={`/lesson/${lesson.id}`}>
                        <div className="bg-white rounded-xl p-4 border border-active-primary/10 hover:shadow-md hover:border-active-primary/30 cursor-pointer transition-all duration-200">
                          <div className="flex items-center gap-3">
                            <span className="text-xl">{TYPE_ICONS[lesson.type] || "\uD83D\uDCC4"}</span>
                            <div className="flex-1 min-w-0">
                              <h5 className="text-sm font-bold text-active-text truncate">{lesson.title}</h5>
                              <p className="text-xs text-active-text/50">{lesson.unit}</p>
                            </div>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                  <Link href={`/curriculum/${activeChild.id}`} className="inline-block text-sm font-semibold text-active-primary hover:underline mt-2">
                    View Full Curriculum &rarr;
                  </Link>
                </div>
              );
            })()}
          </section>
        )}

        {/* Available Lessons with Type Tabs */}
        <section className="animate-fade-in stagger-4">
          <SectionLabel>Explore Lessons</SectionLabel>

          {/* Tab Bar */}
          <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
            <button
              onClick={() => setActiveTab("all")}
              className={`px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-colors ${
                activeTab === "all"
                  ? "bg-active-primary text-white shadow-sm"
                  : "bg-white text-active-text/60 border border-active-primary/10 hover:bg-active-primary/5"
              }`}
            >
              All
            </button>
            {WRITING_TYPES.map(({ key, label, icon }) => (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                className={`px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-colors ${
                  activeTab === key
                    ? "bg-active-primary text-white shadow-sm"
                    : "bg-white text-active-text/60 border border-active-primary/10 hover:bg-active-primary/5"
                }`}
              >
                {icon} {label}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredLessons.slice(0, 9).map((lesson) => (
              <Link key={lesson.id} href={`/lesson/${lesson.id}`}>
                <div className="bg-white rounded-xl p-4 border border-active-primary/10 hover:shadow-md hover:border-active-primary/30 cursor-pointer transition-all duration-200">
                  <div className="flex items-center gap-3">
                    <WritingTypeIcon type={lesson.type} />
                    <div className="flex-1 min-w-0">
                      <h5 className="text-sm font-bold text-active-text truncate">
                        {lesson.title}
                      </h5>
                      <p className="text-xs text-active-text/50">{lesson.unit}</p>
                    </div>
                  </div>
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
      <DashboardContent data={data} childName={activeChild.name} childTier={activeChild.tier} activeChild={activeChild} hasPlacement={hasPlacement} curriculum={curriculum} curriculumLoading={curriculumLoading} skills={skills} streakData={streakData} />
    </TierProvider>
  );
}
