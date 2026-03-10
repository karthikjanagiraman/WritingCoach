"use client";

import { useState, useEffect } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useActiveChild } from "@/contexts/ActiveChildContext";
import { useSubscription } from "@/hooks/useSubscription";
import PinModal from "@/components/PinModal";
import WriteWhizLogo from "@/components/WriteWhizLogo";
import { InkLoader } from "@/components/shared";

interface ChildData {
  id: string;
  name: string;
  age: number;
  tier: number;
  avatarEmoji: string;
  gradeLevel?: string | null;
  interests?: string | null;
}

interface ChildStatus {
  hasPlacement: boolean;
  hasCurriculum: boolean;
  currentWeek: number | null;
  totalWeeks: number | null;
}

interface ChildExtraStats {
  streakCount: number;
  badgeCount: number;
  attentionCount: number;
}

const TIER_LABELS: Record<number, string> = {
  1: "Explorer",
  2: "Adventurer",
  3: "Trailblazer",
};

const AVATAR_BG: Record<string, string> = {
  "\uD83E\uDD89": "bg-[#FF6B6B]/10", // owl — coral
  "\uD83E\uDD8A": "bg-[#6C5CE7]/10", // fox — purple
  "\uD83D\uDC3B": "bg-[#00B894]/10", // bear — teal
  "\uD83D\uDC3A": "bg-[#2D3436]/10", // wolf — charcoal
};

export default function ProfilePicker() {
  const { data: session } = useSession();
  const router = useRouter();
  const { setActiveChild, clearActiveChild } = useActiveChild();
  const [children, setChildren] = useState<ChildData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [childStatuses, setChildStatuses] = useState<Record<string, ChildStatus>>({});
  const [childExtraStats, setChildExtraStats] = useState<Record<string, ChildExtraStats>>({});
  const [hasPin, setHasPin] = useState<boolean | null>(null);
  const [pinModalOpen, setPinModalOpen] = useState(false);
  const [pinMode, setPinMode] = useState<"setup" | "verify">("setup");
  const { subscription } = useSubscription();

  // Fetch children
  useEffect(() => {
    fetch("/api/children")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load children");
        return res.json();
      })
      .then((data) => {
        setChildren(data.children);
        for (const child of data.children) {
          Promise.all([
            fetch(`/api/placement/${child.id}`).then((r) => r.ok).catch(() => false),
            fetch(`/api/curriculum/${child.id}`).then((r) => (r.ok ? r.json() : null)).catch(() => null),
          ]).then(([hasPlacement, currData]) => {
            let currentWeek: number | null = null;
            let totalWeeks: number | null = null;
            if (currData?.weeks) {
              totalWeeks = currData.weeks.length;
              const active = currData.weeks.find((w: any) => w.status !== "completed");
              currentWeek = active ? active.weekNumber : totalWeeks;
            }
            setChildStatuses((prev) => ({
              ...prev,
              [child.id]: { hasPlacement, hasCurriculum: !!currData, currentWeek, totalWeeks },
            }));
          });

          Promise.all([
            fetch(`/api/children/${child.id}/streak`).then((r) => (r.ok ? r.json() : null)).catch(() => null),
            fetch(`/api/children/${child.id}/badges`).then((r) => (r.ok ? r.json() : null)).catch(() => null),
          ]).then(([streakData, badgesData]) => {
            setChildExtraStats((prev) => ({
              ...prev,
              [child.id]: {
                streakCount: streakData?.currentStreak ?? 0,
                badgeCount: badgesData?.total ?? 0,
                attentionCount: 0,
              },
            }));
          });
        }
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  // Fetch PIN status
  useEffect(() => {
    fetch("/api/pin")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => setHasPin(data?.hasPin ?? false))
      .catch(() => setHasPin(false));
  }, []);

  // Compute total attention items
  const totalAttention = children.reduce((count, child) => {
    const status = childStatuses[child.id];
    if (!status) return count;
    if (!status.hasPlacement) return count + 1;
    return count;
  }, 0);

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

  function handleParentDashboard() {
    if (hasPin === null) {
      // PIN status still loading — go directly
      router.push("/dashboard/parent");
    } else if (hasPin === false) {
      setPinMode("setup");
      setPinModalOpen(true);
    } else {
      setPinMode("verify");
      setPinModalOpen(true);
    }
  }

  function handlePinSuccess() {
    setPinModalOpen(false);
    router.push("/dashboard/parent");
  }

  function handlePinSkip() {
    setPinModalOpen(false);
    router.push("/dashboard/parent");
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FFF9F0] flex items-center justify-center">
        <InkLoader message="Loading..." />
      </div>
    );
  }

  const planLabel = subscription?.plan === "FAMILY_4"
    ? "Family Plus"
    : subscription?.plan === "FAMILY_2"
      ? "Family Plan"
      : null;

  return (
    <div className="min-h-screen bg-[#FFF9F0] flex flex-col relative overflow-hidden">
      {/* Decorative ink blobs — background */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden="true">
        <div
          className="absolute top-24 -right-10 w-32 h-32 opacity-[0.04] animate-ink-blob-pulse"
          style={{
            background: "#6C5CE7",
            borderRadius: "40% 60% 55% 45% / 50% 40% 60% 50%",
          }}
        />
        <div
          className="absolute bottom-20 -left-8 w-24 h-24 opacity-[0.03] animate-ink-blob-pulse"
          style={{
            background: "#FF6B6B",
            borderRadius: "55% 45% 40% 60% / 45% 55% 50% 50%",
            animationDelay: "2s",
          }}
        />
        <div
          className="absolute top-1/2 right-1/4 w-10 h-10 opacity-[0.05] animate-ink-blob-pulse"
          style={{
            background: "#4ECDC4",
            borderRadius: "50% 50% 50% 50% / 35% 35% 65% 65%",
            animationDelay: "3s",
          }}
        />
      </div>

      {/* Top Nav */}
      <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-xl border-b border-[#2D3436]/[0.06]">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <WriteWhizLogo size="sm" />
          </div>
          <button
            onClick={() => { clearActiveChild(); signOut({ callbackUrl: "/auth/login" }); }}
            className="px-4 py-2 text-sm font-medium text-[#2D3436]/40 hover:text-[#2D3436]/70 hover:bg-[#2D3436]/[0.04] rounded-xl transition-colors"
            style={{ fontFamily: "'DM Sans', sans-serif" }}
          >
            Log out
          </button>
        </div>
      </header>

      {/* Main Content — centered */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 sm:px-6 py-12">
        <div className="w-full max-w-2xl">
          {/* Title */}
          <div className="text-center mb-10 animate-fade-in">
            <h1
              className="text-3xl sm:text-4xl font-semibold text-[#2D3436] mb-2"
              style={{ fontFamily: "'Literata', serif", fontWeight: 600 }}
            >
              Who&apos;s writing today?
            </h1>
            <p
              className="text-base text-[#2D3436]/40"
              style={{ fontFamily: "'DM Sans', sans-serif" }}
            >
              Pick your profile to start
            </p>
          </div>

          {/* Error */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-red-700 text-sm font-medium mb-8">
              {error}
            </div>
          )}

          {/* No Children State */}
          {children.length === 0 ? (
            <div className="text-center py-12 animate-fade-in">
              <div className="text-5xl mb-4">&#128100;</div>
              <h4 className="text-lg font-bold text-[#2D3436] mb-2">No children yet</h4>
              <p className="text-[#2D3436]/50 text-sm mb-6">
                Add a child profile to get started with writing lessons.
              </p>
              <button
                onClick={() => router.push("/dashboard/children/new")}
                className="px-6 py-3 bg-[#FF6B6B] text-white rounded-2xl text-sm font-bold hover:bg-[#FF5252] transition-colors shadow-sm"
              >
                Add Your First Child
              </button>
            </div>
          ) : (
            <>
              {/* Profile Cards */}
              <div className="flex flex-wrap justify-center gap-8 mb-10 animate-fade-in stagger-1">
                {children.map((child, idx) => {
                  const extra = childExtraStats[child.id];
                  const status = childStatuses[child.id];
                  const needsSetup = status && !status.hasPlacement;
                  const bg = AVATAR_BG[child.avatarEmoji] || "bg-[#FF6B6B]/10";

                  return (
                    <button
                      key={child.id}
                      onClick={() => handleSelectChild(child)}
                      className="group flex flex-col items-center gap-3 transition-transform duration-200 hover:-translate-y-1.5 active:scale-95 outline-none focus-visible:ring-2 focus-visible:ring-[#6C5CE7] rounded-3xl p-2"
                      style={{ animationDelay: `${idx * 80}ms` }}
                    >
                      {/* Avatar — organic ink-inspired border-radius */}
                      <div
                        className={`relative w-28 h-28 sm:w-32 sm:h-32 ${bg} flex items-center justify-center shadow-sm group-hover:shadow-md transition-shadow`}
                        style={{ borderRadius: "30px 26px 28px 24px" }}
                      >
                        <span className="text-5xl sm:text-6xl">{child.avatarEmoji}</span>

                        {/* Streak badge */}
                        {extra && extra.streakCount > 0 && (
                          <span className="absolute -top-2 -right-2 flex items-center gap-0.5 bg-[#FF6B6B] text-white text-xs font-bold px-2 py-0.5 rounded-full shadow-sm">
                            {"\uD83D\uDD25"} {extra.streakCount}
                          </span>
                        )}

                        {/* NEW badge for needs-setup children */}
                        {needsSetup && (
                          <span className="absolute -top-2 -right-2 bg-[#00B894] text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm uppercase tracking-wider">
                            NEW
                          </span>
                        )}
                      </div>

                      {/* Name */}
                      <span
                        className="text-base font-bold text-[#2D3436]"
                        style={{ fontFamily: "'Nunito', sans-serif" }}
                      >
                        {child.name}
                      </span>

                      {/* Sub label */}
                      <span
                        className="text-xs text-[#2D3436]/40 -mt-2"
                        style={{ fontFamily: "'DM Sans', sans-serif" }}
                      >
                        {needsSetup
                          ? "Needs setup"
                          : `Age ${child.age} \u00B7 ${TIER_LABELS[child.tier] || "Explorer"}`}
                      </span>
                    </button>
                  );
                })}

                {/* Add child button (inline with profiles) */}
                <button
                  onClick={() => router.push("/dashboard/children/new")}
                  className="group flex flex-col items-center gap-3 transition-transform duration-200 hover:-translate-y-1.5 active:scale-95 outline-none focus-visible:ring-2 focus-visible:ring-[#6C5CE7] rounded-3xl p-2"
                >
                  <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-[28px] border-2 border-dashed border-[#2D3436]/10 flex items-center justify-center group-hover:border-[#FF6B6B]/40 transition-colors">
                    <svg className="w-10 h-10 text-[#2D3436]/20 group-hover:text-[#FF6B6B]/60 transition-colors" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                      <line x1="12" y1="5" x2="12" y2="19" />
                      <line x1="5" y1="12" x2="19" y2="12" />
                    </svg>
                  </div>
                  <span className="text-sm font-semibold text-[#2D3436]/30 group-hover:text-[#FF6B6B]/70 transition-colors" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                    Add Child
                  </span>
                </button>
              </div>

              {/* Parent Dashboard Card */}
              <div className="animate-fade-in stagger-2">
                <button
                  onClick={handleParentDashboard}
                  className="w-full flex items-center gap-4 bg-white p-5 border border-[#2D3436]/[0.06] hover:border-[#6C5CE7]/20 hover:shadow-md transition-all duration-200 cursor-pointer group text-left"
                  style={{ borderRadius: "20px 16px 18px 22px" }}
                >
                  {/* Ink favicon icon */}
                  <div className="w-12 h-12 rounded-xl bg-[#6C5CE7]/[0.06] flex items-center justify-center flex-shrink-0 group-hover:bg-[#6C5CE7]/[0.1] transition-colors">
                    <img src="/brand/favicon.svg" alt="" width={28} height={28} className="opacity-70 group-hover:opacity-90 transition-opacity" />
                  </div>

                  {/* Text */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span
                        className="text-base font-semibold text-[#2D3436]"
                        style={{ fontFamily: "'Literata', serif" }}
                      >
                        Parent Dashboard
                      </span>
                      {planLabel && (
                        <span className="text-[10px] font-bold text-[#00B894] bg-[#00B894]/10 px-2 py-0.5 rounded-full">
                          {planLabel}
                        </span>
                      )}
                    </div>
                    <p
                      className="text-sm text-[#2D3436]/40 mt-0.5"
                      style={{ fontFamily: "'DM Sans', sans-serif" }}
                    >
                      Progress reports, curriculum & settings
                    </p>
                  </div>

                  {/* Attention dot + arrow */}
                  <div className="flex items-center gap-3 flex-shrink-0">
                    {totalAttention > 0 && (
                      <span className="flex items-center justify-center w-6 h-6 bg-[#F0932B] text-white text-[10px] font-bold rounded-full animate-pin-pulse">
                        {totalAttention}
                      </span>
                    )}
                    <span className="text-[#2D3436]/20 text-xl group-hover:text-[#6C5CE7]/50 transition-colors">
                      &rarr;
                    </span>
                  </div>
                </button>
              </div>
            </>
          )}
        </div>
      </main>

      {/* PIN Modal */}
      <PinModal
        mode={pinMode}
        open={pinModalOpen}
        onSuccess={handlePinSuccess}
        onCancel={() => setPinModalOpen(false)}
        onSkip={pinMode === "setup" ? handlePinSkip : undefined}
      />
    </div>
  );
}
