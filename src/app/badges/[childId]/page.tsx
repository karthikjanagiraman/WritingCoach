"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useActiveChild } from "@/contexts/ActiveChildContext";
import { BADGE_CATALOG, type BadgeDefinition } from "@/lib/badges";
import { TierProvider } from "@/contexts/TierContext";
import type { Tier } from "@/types";

interface EarnedBadge {
  id: string;
  name: string;
  emoji: string;
  description: string;
  category: string;
  unlockedAt: string;
  seen: boolean;
}

interface BadgesResponse {
  badges: EarnedBadge[];
  total: number;
  unseen: number;
}

const CATEGORY_LABELS: Record<string, { label: string; emoji: string }> = {
  writing: { label: "Writing", emoji: "\uD83D\uDCDD" },
  progress: { label: "Progress", emoji: "\uD83D\uDCC8" },
  streak: { label: "Streaks", emoji: "\uD83D\uDD25" },
  skill: { label: "Skills", emoji: "\uD83E\uDDE0" },
  special: { label: "Special", emoji: "\u2728" },
};

const CATEGORIES = ["writing", "progress", "streak", "skill", "special"];

function BadgeCard({
  badge,
  earned,
  unlockedAt,
}: {
  badge: BadgeDefinition;
  earned: boolean;
  unlockedAt?: string;
}) {
  return (
    <div
      className={`rounded-2xl p-4 border text-center transition-all duration-200 ${
        earned
          ? "bg-white border-active-accent/30 shadow-sm hover:shadow-md"
          : "bg-gray-50 border-gray-200 opacity-60"
      }`}
    >
      <div className={`text-3xl mb-2 ${earned ? "" : "grayscale"}`}>
        {earned ? badge.emoji : "\uD83D\uDD12"}
      </div>
      <h4
        className={`font-bold text-sm ${
          earned ? "text-active-text" : "text-gray-400"
        }`}
      >
        {badge.name}
      </h4>
      <p
        className={`text-xs mt-1 leading-relaxed ${
          earned ? "text-active-text/60" : "text-gray-400"
        }`}
      >
        {badge.description}
      </p>
      {earned && unlockedAt && (
        <p className="text-[11px] text-active-secondary font-semibold mt-2">
          {new Date(unlockedAt).toLocaleDateString()}
        </p>
      )}
    </div>
  );
}

function BadgeCollectionContent({
  childId,
}: {
  childId: string;
}) {
  const [badgesData, setBadgesData] = useState<BadgesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/children/${encodeURIComponent(childId)}/badges`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load badges");
        return res.json();
      })
      .then((data) => setBadgesData(data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [childId]);

  // Mark unseen badges as seen
  useEffect(() => {
    if (!badgesData || badgesData.unseen === 0) return;
    const unseenIds = badgesData.badges
      .filter((b) => !b.seen)
      .map((b) => b.id);
    if (unseenIds.length === 0) return;

    fetch(`/api/children/${encodeURIComponent(childId)}/badges/seen`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ badgeIds: unseenIds }),
    }).catch(() => {
      // Silent fail for marking seen
    });
  }, [badgesData, childId]);

  const earnedMap = new Map(
    (badgesData?.badges ?? []).map((b) => [b.id, b])
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-active-bg flex items-center justify-center">
        <p className="text-active-text/60 font-semibold">Loading badges...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-active-bg flex items-center justify-center">
        <div className="text-center">
          <p className="text-active-primary font-semibold">{error}</p>
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

  const totalEarned = badgesData?.total ?? 0;
  const totalPossible = BADGE_CATALOG.length;

  return (
    <div className="min-h-screen bg-active-bg">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-sm border-b border-active-primary/10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-14 flex items-center gap-3">
          <Link
            href="/home"
            className="w-9 h-9 rounded-full bg-active-bg flex items-center justify-center flex-shrink-0 hover:bg-active-primary/10 transition-colors"
            aria-label="Go home"
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
          </Link>
          <h1 className="text-xl font-extrabold text-active-text">
            My Badges
          </h1>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-8">
        {/* Summary */}
        <div className="text-center">
          <div className="text-5xl mb-3">{"\uD83C\uDFC6"}</div>
          <h2 className="text-2xl font-extrabold text-active-text">
            {totalEarned} of {totalPossible} Badges
          </h2>
          <p className="text-active-text/60 text-sm mt-1">
            Keep writing to unlock them all!
          </p>
          {/* Progress bar */}
          <div className="max-w-xs mx-auto mt-4">
            <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-active-primary rounded-full transition-all duration-700 ease-out"
                style={{
                  width: `${
                    totalPossible > 0
                      ? Math.round((totalEarned / totalPossible) * 100)
                      : 0
                  }%`,
                }}
              />
            </div>
          </div>
        </div>

        {/* Badge grid by category */}
        {CATEGORIES.map((category) => {
          const categoryInfo = CATEGORY_LABELS[category];
          const categoryBadges = BADGE_CATALOG.filter(
            (b) => b.category === category
          );
          if (categoryBadges.length === 0) return null;

          return (
            <section key={category}>
              <h3 className="text-lg font-bold text-active-text flex items-center gap-2 mb-4">
                <span>{categoryInfo.emoji}</span> {categoryInfo.label}
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {categoryBadges.map((badge) => {
                  const earned = earnedMap.get(badge.id);
                  return (
                    <BadgeCard
                      key={badge.id}
                      badge={badge}
                      earned={!!earned}
                      unlockedAt={earned?.unlockedAt}
                    />
                  );
                })}
              </div>
            </section>
          );
        })}
      </main>
    </div>
  );
}

export default function BadgesPage() {
  const { data: session, status } = useSession();
  const { activeChild } = useActiveChild();
  const router = useRouter();
  const params = useParams();
  const childId = params.childId as string;

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/login");
    }
  }, [status, router]);

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-active-bg flex items-center justify-center">
        <p className="text-active-text/60 font-semibold">Loading...</p>
      </div>
    );
  }

  if (!session) return null;

  const tier = (activeChild?.tier ?? 1) as Tier;

  return (
    <TierProvider tier={tier}>
      <BadgeCollectionContent childId={childId} />
    </TierProvider>
  );
}
