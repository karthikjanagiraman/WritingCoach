"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useActiveChild } from "@/contexts/ActiveChildContext";
import {
  BADGE_CATALOG,
  RARITY_CATEGORIES,
  RARITY_CONFIG,
  type BadgeDefinition,
  type BadgeRarity,
} from "@/lib/badges";
import { TierProvider } from "@/contexts/TierContext";
import type { Tier } from "@/types";

interface EarnedBadge {
  id: string;
  name: string;
  emoji: string;
  description: string;
  category: string;
  rarity: BadgeRarity;
  unlockedAt: string;
  seen: boolean;
}

interface BadgesResponse {
  badges: EarnedBadge[];
  total: number;
  unseen: number;
}

// ── Ink Splat shape variants ────────────────────────────────────────────
const SPLAT_SHAPES = [
  "40% 60% 55% 45% / 50% 40% 60% 50%",
  "55% 45% 40% 60% / 45% 55% 50% 50%",
  "45% 55% 50% 50% / 60% 40% 55% 45%",
  "50% 50% 45% 55% / 40% 60% 50% 50%",
  "60% 40% 50% 50% / 55% 45% 40% 60%",
  "42% 58% 52% 48% / 48% 52% 58% 42%",
  "55% 45% 48% 52% / 42% 58% 45% 55%",
  "48% 52% 55% 45% / 58% 42% 52% 48%",
  "52% 48% 42% 58% / 45% 55% 48% 52%",
  "44% 56% 58% 42% / 52% 48% 44% 56%",
  "58% 42% 44% 56% / 56% 44% 42% 58%",
  "46% 54% 56% 44% / 44% 56% 54% 46%",
];

// Slight rotation per badge for "scattered sticker" feel
const ROTATIONS = [-3, 1, -2, 2, -1, 3, -2, 1, -3, 2, -1, 0];

const RARITY_COLORS: Record<BadgeRarity, { bg: string; border: string; glow: string; text: string }> = {
  common: {
    bg: "linear-gradient(135deg, #FF6B6B, #FFB8B8)",
    border: "rgba(255, 107, 107, 0.4)",
    glow: "none",
    text: "#FF6B6B",
  },
  rare: {
    bg: "linear-gradient(135deg, #6C5CE7, #A29BFE)",
    border: "rgba(108, 92, 231, 0.4)",
    glow: "0 0 12px rgba(108, 92, 231, 0.2)",
    text: "#6C5CE7",
  },
  epic: {
    bg: "linear-gradient(135deg, #4ECDC4, #6C5CE7, #E84393)",
    border: "rgba(78, 205, 196, 0.4)",
    glow: "0 0 16px rgba(78, 205, 196, 0.25)",
    text: "#00897B",
  },
  legendary: {
    bg: "linear-gradient(135deg, #FECA57, #FF6B6B, #6C5CE7, #4ECDC4, #FECA57)",
    border: "rgba(254, 202, 87, 0.6)",
    glow: "0 0 24px rgba(254, 202, 87, 0.35)",
    text: "#F57F17",
  },
};

const LOCKED_STYLE = {
  bg: "#E8E8E8",
  border: "rgba(0, 0, 0, 0.08)",
};

function InkSplatBadge({
  badge,
  earned,
  unlockedAt,
  index,
}: {
  badge: BadgeDefinition;
  earned: boolean;
  unlockedAt?: string;
  index: number;
}) {
  const [hovered, setHovered] = useState(false);
  const shape = SPLAT_SHAPES[index % SPLAT_SHAPES.length];
  const rotation = ROTATIONS[index % ROTATIONS.length];
  const colors = earned ? RARITY_COLORS[badge.rarity] : null;
  const rarityConfig = RARITY_CONFIG[badge.rarity];

  return (
    <div
      className="flex flex-col items-center gap-2 cursor-default select-none"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Ink splat */}
      <div
        className="relative transition-all duration-300"
        style={{
          transform: `rotate(${rotation}deg) ${hovered ? "scale(1.1)" : "scale(1)"}`,
          filter: earned ? "none" : "grayscale(0.5)",
        }}
      >
        {/* Main splat shape */}
        <div
          className="flex items-center justify-center relative"
          style={{
            width: badge.rarity === "legendary" ? 100 : 84,
            height: badge.rarity === "legendary" ? 100 : 84,
            borderRadius: shape,
            background: earned ? colors!.bg : LOCKED_STYLE.bg,
            border: `2px ${earned ? "solid" : "dashed"} ${earned ? colors!.border : LOCKED_STYLE.border}`,
            boxShadow: earned
              ? `${colors!.glow}, 0 4px 12px rgba(0,0,0,0.08)`
              : "0 2px 6px rgba(0,0,0,0.04)",
            transition: "all 0.3s ease",
          }}
        >
          {/* Vinyl shine stripe */}
          {earned && (
            <div
              className="absolute inset-0 overflow-hidden"
              style={{ borderRadius: shape }}
            >
              <div
                className="absolute"
                style={{
                  top: "15%",
                  left: "-20%",
                  width: "140%",
                  height: "30%",
                  background: "linear-gradient(135deg, transparent 30%, rgba(255,255,255,0.25) 50%, transparent 70%)",
                  transform: `rotate(-30deg) ${hovered ? "translateX(30%)" : "translateX(0)"}`,
                  transition: "transform 0.5s ease",
                }}
              />
            </div>
          )}

          {/* Emoji / locked icon */}
          <span
            className="relative z-10 select-none"
            style={{
              fontSize: badge.rarity === "legendary" ? 36 : 30,
              filter: earned ? "none" : "grayscale(1) opacity(0.4)",
            }}
          >
            {earned ? badge.emoji : "?"}
          </span>

          {/* Sparkle dots for rare+ */}
          {earned && badge.rarity !== "common" && hovered && (
            <>
              <div className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-white/80 animate-ping" />
              <div className="absolute -bottom-1 -left-1 w-1.5 h-1.5 rounded-full bg-white/60 animate-ping" style={{ animationDelay: "0.3s" }} />
            </>
          )}
        </div>
      </div>

      {/* Badge name + info */}
      <div className="text-center max-w-[100px]">
        <p className={`text-xs font-bold leading-tight ${earned ? "text-gray-800" : "text-gray-400"}`}>
          {badge.name}
        </p>
        {earned && (
          <span
            className="inline-block text-[9px] font-bold uppercase tracking-wider mt-1 px-1.5 py-0.5 rounded-full"
            style={{
              color: colors!.text,
              backgroundColor: `${colors!.text}15`,
            }}
          >
            {rarityConfig.label}
          </span>
        )}
        {!earned && (
          <p className="text-[10px] text-gray-400 mt-0.5 leading-tight">
            {badge.description}
          </p>
        )}
        {earned && unlockedAt && (
          <p className="text-[10px] text-gray-400 mt-0.5">
            {new Date(unlockedAt).toLocaleDateString()}
          </p>
        )}
      </div>
    </div>
  );
}

function BadgeCollectionContent({ childId }: { childId: string }) {
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
    }).catch(() => {});
  }, [badgesData, childId]);

  const earnedMap = new Map(
    (badgesData?.badges ?? []).map((b) => [b.id, b])
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FFF8F0] flex items-center justify-center">
        <p className="text-gray-500 font-semibold">Loading your stickers...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#FFF8F0] flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-500 font-semibold">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-3 px-5 py-2.5 bg-[#FF6B6B] text-white rounded-xl text-sm font-bold hover:bg-[#FF6B6B]/90 transition-colors shadow-sm"
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
    <div className="min-h-screen bg-[#FFF8F0]">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-sm border-b border-[#FF6B6B]/10">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 h-14 flex items-center gap-3">
          <Link
            href="/home"
            className="w-9 h-9 rounded-full bg-[#FFF8F0] flex items-center justify-center flex-shrink-0 hover:bg-[#FF6B6B]/10 transition-colors"
            aria-label="Go home"
          >
            <svg
              className="w-5 h-5 text-gray-700"
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
          <h1 className="text-xl font-extrabold text-gray-800">
            My Sticker Album
          </h1>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-6 space-y-8">
        {/* Summary card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 text-center">
          <div className="text-4xl mb-2">📔</div>
          <h2 className="text-2xl font-extrabold text-gray-800">
            {totalEarned} of {totalPossible} Stickers
          </h2>
          <p className="text-gray-500 text-sm mt-1">
            {totalEarned === 0
              ? "Complete lessons to earn your first sticker!"
              : totalEarned === totalPossible
                ? "You collected them all! Amazing!"
                : "Keep writing to unlock more!"}
          </p>
          {/* Progress bar */}
          <div className="max-w-xs mx-auto mt-4">
            <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700 ease-out"
                style={{
                  width: `${totalPossible > 0 ? Math.round((totalEarned / totalPossible) * 100) : 0}%`,
                  background: "linear-gradient(90deg, #FF6B6B, #FECA57, #4ECDC4)",
                }}
              />
            </div>
          </div>
        </div>

        {/* Sticker sections by rarity category */}
        {RARITY_CATEGORIES.map((cat) => {
          const categoryBadges = BADGE_CATALOG.filter(
            (b) => b.category === cat.id
          );
          if (categoryBadges.length === 0) return null;

          const earnedInCategory = categoryBadges.filter((b) =>
            earnedMap.has(b.id)
          ).length;

          return (
            <section key={cat.id}>
              {/* Category header */}
              <div className="flex items-center gap-3 mb-4">
                <span className="text-xl">{cat.emoji}</span>
                <div className="flex-1">
                  <h3 className="text-base font-bold text-gray-800">
                    {cat.label}
                  </h3>
                  <p className="text-xs text-gray-400">
                    {earnedInCategory} of {categoryBadges.length} collected
                  </p>
                </div>
                {/* Rarity label */}
                <span
                  className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border"
                  style={{
                    color: RARITY_COLORS[categoryBadges[0].rarity].text,
                    backgroundColor: `${RARITY_COLORS[categoryBadges[0].rarity].text}10`,
                    borderColor: `${RARITY_COLORS[categoryBadges[0].rarity].text}20`,
                  }}
                >
                  {RARITY_CONFIG[categoryBadges[0].rarity].label}
                </span>
              </div>

              {/* Sticker paper area */}
              <div
                className="rounded-2xl p-5 sm:p-6"
                style={{
                  background: "linear-gradient(135deg, #FEFEFE, #F9F5F0)",
                  border: "1px solid rgba(0,0,0,0.06)",
                  boxShadow: "inset 0 1px 3px rgba(0,0,0,0.03), 0 2px 8px rgba(0,0,0,0.04)",
                }}
              >
                <div className="flex flex-wrap justify-center gap-5 sm:gap-7">
                  {categoryBadges.map((badge, i) => {
                    const earned = earnedMap.get(badge.id);
                    // Use a global index for unique shapes
                    const globalIndex = BADGE_CATALOG.indexOf(badge);
                    return (
                      <InkSplatBadge
                        key={badge.id}
                        badge={badge}
                        earned={!!earned}
                        unlockedAt={earned?.unlockedAt}
                        index={globalIndex}
                      />
                    );
                  })}
                </div>
              </div>
            </section>
          );
        })}

        {/* Rarity guide */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <h3 className="text-sm font-bold text-gray-800 mb-3">Sticker Rarity</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {(["common", "rare", "epic", "legendary"] as BadgeRarity[]).map((rarity) => {
              const config = RARITY_CONFIG[rarity];
              const colors = RARITY_COLORS[rarity];
              return (
                <div key={rarity} className="flex items-center gap-2">
                  <div
                    className="w-5 h-5 rounded-full flex-shrink-0"
                    style={{
                      background: colors.bg,
                      border: `1.5px solid ${colors.border}`,
                      boxShadow: colors.glow,
                    }}
                  />
                  <span className="text-xs font-semibold text-gray-600">
                    {config.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
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
      <div className="min-h-screen bg-[#FFF8F0] flex items-center justify-center">
        <p className="text-gray-500 font-semibold">Loading...</p>
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
