"use client";

interface StreakDisplayProps {
  currentStreak: number;
  longestStreak: number;
  weeklyGoal: number;
  weeklyCompleted: number;
}

export default function StreakDisplay({
  currentStreak,
  longestStreak,
  weeklyGoal,
  weeklyCompleted,
}: StreakDisplayProps) {
  const clampedCompleted = Math.min(weeklyCompleted, weeklyGoal);
  const progressPct =
    weeklyGoal > 0 ? Math.round((clampedCompleted / weeklyGoal) * 100) : 0;

  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-active-primary/10 flex flex-col justify-between min-h-[240px]">
      {/* Streak count */}
      <div className="text-center">
        {currentStreak > 0 ? (
          <>
            <div className="text-4xl mb-1">
              {"🔥"}
            </div>
            <div className="text-3xl font-extrabold text-active-text">
              {currentStreak} {currentStreak === 1 ? "day" : "days"}
            </div>
            <p className="text-xs font-semibold text-active-text/50 mt-1">
              Best: {longestStreak} {longestStreak === 1 ? "day" : "days"}
            </p>
          </>
        ) : (
          <>
            <div className="text-4xl mb-1">
              {"✨"}
            </div>
            <p className="text-sm font-semibold text-active-text/60">
              Start your streak today!
            </p>
            {longestStreak > 0 && (
              <p className="text-xs text-active-text/40 mt-1">
                Previous best: {longestStreak} {longestStreak === 1 ? "day" : "days"}
              </p>
            )}
          </>
        )}
      </div>

      {/* Weekly progress */}
      <div className="mt-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold text-active-text/70">
            This week
          </span>
          <span className="text-xs font-semibold text-active-text/50">
            {clampedCompleted} of {weeklyGoal} lessons
          </span>
        </div>

        {/* Progress dots */}
        <div className="flex gap-1.5">
          {Array.from({ length: weeklyGoal }, (_, i) => (
            <div
              key={i}
              className={`flex-1 h-2.5 rounded-full transition-colors duration-300 ${
                i < clampedCompleted
                  ? "bg-active-primary"
                  : "bg-gray-100"
              }`}
            />
          ))}
        </div>

        {/* Mini progress bar fallback for large goals */}
        {weeklyGoal > 10 && (
          <div className="mt-2 w-full h-2.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-active-primary rounded-full transition-all duration-500 ease-out"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
