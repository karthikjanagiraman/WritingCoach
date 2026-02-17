"use client";

import { useState, useEffect } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useActiveChild } from "@/contexts/ActiveChildContext";

interface ChildData {
  id: string;
  name: string;
  age: number;
  tier: number;
  avatarEmoji: string;
  gradeLevel?: string | null;
  interests?: string | null;
}

const TIER_INFO: Record<number, { label: string; color: string }> = {
  1: { label: "Tier 1: Explorer", color: "bg-tier1-primary" },
  2: { label: "Tier 2: Adventurer", color: "bg-tier2-primary" },
  3: { label: "Tier 3: Trailblazer", color: "bg-tier3-primary" },
};

interface ChildStatus {
  hasPlacement: boolean;
  hasCurriculum: boolean;
  currentWeek: number | null;
  totalWeeks: number | null;
}

interface ChildExtraStats {
  streakCount: number;
  badgeCount: number;
}

export default function ParentDashboard() {
  const { data: session } = useSession();
  const router = useRouter();
  const { setActiveChild } = useActiveChild();
  const [children, setChildren] = useState<ChildData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [childStatuses, setChildStatuses] = useState<Record<string, ChildStatus>>({});
  const [childExtraStats, setChildExtraStats] = useState<Record<string, ChildExtraStats>>({});

  useEffect(() => {
    fetch("/api/children")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load children");
        return res.json();
      })
      .then((data) => {
        setChildren(data.children);
        // Fetch placement/curriculum status for each child
        for (const child of data.children) {
          Promise.all([
            fetch(`/api/placement/${child.id}`).then(r => r.ok).catch(() => false),
            fetch(`/api/curriculum/${child.id}`).then(r => r.ok ? r.json() : null).catch(() => null),
          ]).then(([hasPlacement, currData]) => {
            let currentWeek: number | null = null;
            let totalWeeks: number | null = null;
            if (currData?.weeks) {
              totalWeeks = currData.weeks.length;
              const active = currData.weeks.find((w: any) => w.status !== "completed");
              currentWeek = active ? active.weekNumber : totalWeeks;
            }
            setChildStatuses(prev => ({
              ...prev,
              [child.id]: {
                hasPlacement,
                hasCurriculum: !!currData,
                currentWeek,
                totalWeeks,
              },
            }));
          });

          // Fetch streak and badge data
          Promise.all([
            fetch(`/api/children/${child.id}/streak`)
              .then((r) => (r.ok ? r.json() : null))
              .catch(() => null),
            fetch(`/api/children/${child.id}/badges`)
              .then((r) => (r.ok ? r.json() : null))
              .catch(() => null),
          ]).then(([streakData, badgesData]) => {
            setChildExtraStats((prev) => ({
              ...prev,
              [child.id]: {
                streakCount: streakData?.currentStreak ?? 0,
                badgeCount: badgesData?.total ?? 0,
              },
            }));
          });
        }
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  function handleSelectChild(child: ChildData) {
    setActiveChild({
      id: child.id,
      name: child.name,
      age: child.age,
      tier: child.tier as 1 | 2 | 3,
      avatarEmoji: child.avatarEmoji,
    });
    router.push("/home");
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FFF9F0] flex items-center justify-center">
        <div className="text-center">
          <div className="text-5xl animate-bounce-slow">&#128218;</div>
          <p className="mt-4 text-[#2D3436]/60 font-semibold">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FFF9F0]">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-sm border-b border-[#FF6B6B]/10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">&#128218;</span>
            <h1 className="text-xl sm:text-2xl font-extrabold text-[#FF6B6B] tracking-tight">
              WriteWise Kids
            </h1>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: "/auth/login" })}
            className="px-4 py-2 text-sm font-semibold text-[#2D3436]/60 hover:text-[#2D3436] hover:bg-[#FF6B6B]/5 rounded-xl transition-colors"
          >
            Log Out
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-8">
        {/* Welcome */}
        <section className="animate-fade-in">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-[#2D3436]">
            Welcome back, {session?.user?.name || "Parent"}!
          </h2>
          <p className="text-[#2D3436]/60 text-lg mt-1">
            Choose a child to start their writing session.
          </p>
        </section>

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-red-700 text-sm font-medium">
            {error}
          </div>
        )}

        {/* Children Grid */}
        <section className="animate-fade-in stagger-1">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-[#2D3436]">Your Children</h3>
            <button
              onClick={() => router.push("/dashboard/children/new")}
              className="px-4 py-2.5 bg-[#FF6B6B] text-white rounded-xl text-sm font-bold hover:bg-[#FF6B6B]/90 transition-colors shadow-sm"
            >
              + Add Child
            </button>
          </div>

          {children.length === 0 ? (
            <div className="bg-white rounded-2xl p-12 shadow-sm border border-[#FF6B6B]/10 text-center">
              <div className="text-5xl mb-4">&#128100;</div>
              <h4 className="text-lg font-bold text-[#2D3436] mb-2">
                No children yet
              </h4>
              <p className="text-[#2D3436]/50 text-sm mb-6">
                Add a child profile to get started with writing lessons.
              </p>
              <button
                onClick={() => router.push("/dashboard/children/new")}
                className="px-6 py-3 bg-[#FF6B6B] text-white rounded-xl text-sm font-bold hover:bg-[#FF6B6B]/90 transition-colors shadow-sm"
              >
                Add Your First Child
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {children.map((child) => {
                const tierInfo = TIER_INFO[child.tier] || TIER_INFO[1];
                const extra = childExtraStats[child.id];
                return (
                  <div
                    key={child.id}
                    className="bg-white rounded-2xl p-5 shadow-sm border border-[#FF6B6B]/10 hover:shadow-md hover:border-[#FF6B6B]/30 transition-all duration-200 cursor-pointer group"
                    onClick={() => handleSelectChild(child)}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <span className="text-4xl">{child.avatarEmoji}</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          router.push(`/dashboard/children/${child.id}`);
                        }}
                        className="p-1.5 rounded-lg text-[#2D3436]/30 hover:text-[#2D3436]/60 hover:bg-[#2D3436]/5 transition-colors"
                        aria-label={`Edit ${child.name}`}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                        </svg>
                      </button>
                    </div>
                    <h4 className="text-lg font-bold text-[#2D3436] mb-1">
                      {child.name}
                    </h4>
                    <p className="text-sm text-[#2D3436]/50 mb-3">
                      Age {child.age}
                    </p>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`inline-flex items-center px-2.5 py-1 ${tierInfo.color} text-white rounded-full text-xs font-bold`}>
                        {tierInfo.label}
                      </span>
                      {childStatuses[child.id] && (() => {
                        const s = childStatuses[child.id];
                        if (!s.hasPlacement) {
                          return (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-[#FFE66D]/30 text-[#B7950B] rounded-full text-xs font-bold">
                              {"\uD83D\uDCDD"} Needs Assessment
                            </span>
                          );
                        }
                        if (!s.hasCurriculum) {
                          return (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-[#4ECDC4]/20 text-[#00897B] rounded-full text-xs font-bold">
                              {"\uD83D\uDCDA"} Set Up Curriculum
                            </span>
                          );
                        }
                        return (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-[#00B894]/20 text-[#00896B] rounded-full text-xs font-bold">
                            {"\uD83D\uDCC5"} Week {s.currentWeek} of {s.totalWeeks}
                          </span>
                        );
                      })()}
                    </div>

                    {/* Streak & Badge Stats */}
                    {extra && (extra.streakCount > 0 || extra.badgeCount > 0) && (
                      <div className="flex items-center gap-3 mt-3">
                        {extra.streakCount > 0 && (
                          <span className="inline-flex items-center gap-1 text-xs font-bold text-[#FF6B6B]">
                            {"\uD83D\uDD25"} {extra.streakCount} {extra.streakCount === 1 ? "day" : "days"}
                          </span>
                        )}
                        {extra.badgeCount > 0 && (
                          <span className="inline-flex items-center gap-1 text-xs font-bold text-[#FDCB6E]">
                            {"\uD83C\uDFC6"} {extra.badgeCount} {extra.badgeCount === 1 ? "badge" : "badges"}
                          </span>
                        )}
                      </div>
                    )}

                    <div className="mt-4 pt-3 border-t border-[#2D3436]/5 flex items-center justify-between">
                      <span className="text-sm font-semibold text-[#FF6B6B] group-hover:text-[#FF6B6B]/80 transition-colors">
                        Start Session &rarr;
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          router.push(`/dashboard/children/${child.id}/report`);
                        }}
                        className="px-3 py-1.5 text-xs font-bold text-[#2D3436]/50 hover:text-[#2D3436] bg-[#2D3436]/5 hover:bg-[#2D3436]/10 rounded-lg transition-colors"
                      >
                        View Report
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
