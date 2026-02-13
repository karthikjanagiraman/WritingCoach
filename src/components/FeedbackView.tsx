"use client";

import { useState, useEffect } from "react";
import type { AssessmentResult } from "@/types";
import { CoachAvatar } from "./shared";
import { useTier } from "@/contexts/TierContext";
import { reviseAssessment } from "@/lib/api";
import { getBadgeById } from "@/lib/badges";
import CelebrationOverlay from "./CelebrationOverlay";

interface FeedbackViewProps {
  result: AssessmentResult;
  submittedText: string;
  sessionId: string | null;
  onNextLesson: () => void;
  newBadges?: string[];
  childId?: string;
  onRetake?: () => void;
}

function StarRating({
  score,
  maxScore = 4,
  size = "lg",
  animate = false,
}: {
  score: number;
  maxScore?: number;
  size?: "sm" | "lg";
  animate?: boolean;
}) {
  const rounded = Math.round(score);
  const starSize = size === "lg" ? "text-3xl" : "text-base";

  return (
    <span className="inline-flex items-center gap-0.5">
      {Array.from({ length: maxScore }, (_, i) => (
        <span
          key={i}
          className={`${starSize} ${
            animate ? `animate-star-pop stagger-${i + 1}` : ""
          }`}
        >
          {i < rounded ? "\u2B50" : "\u2606"}
        </span>
      ))}
    </span>
  );
}

function FeedbackCard({
  icon,
  title,
  text,
  variant,
}: {
  icon: string;
  title: string;
  text: string;
  variant: "success" | "growth";
}) {
  const styles = {
    success:
      "from-active-secondary/10 to-active-secondary/5 border-active-secondary/20",
    growth: "from-active-accent/10 to-active-accent/5 border-active-accent/20",
  };
  const titleColors = {
    success: "text-active-secondary",
    growth: "text-active-text",
  };

  return (
    <div className={`bg-gradient-to-br ${styles[variant]} rounded-2xl p-5 border`}>
      <h3
        className={`font-bold ${titleColors[variant]} mb-2 flex items-center gap-2`}
      >
        <span className="text-xl">{icon}</span> {title}
      </h3>
      <p className="text-active-text/80 text-[15px] leading-relaxed">{text}</p>
    </div>
  );
}

function ScoreComparison({
  criterion,
  previous,
  current,
}: {
  criterion: string;
  previous: number;
  current: number;
}) {
  const diff = current - previous;
  const improved = diff > 0;
  const same = diff === 0;

  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-sm font-semibold text-active-text capitalize flex-shrink-0">
        {criterion.replace(/_/g, " ")}
      </span>
      <div className="flex items-center gap-2">
        <StarRating score={previous} size="sm" />
        <span className="text-active-text/40">{"\u2192"}</span>
        <StarRating score={current} size="sm" />
        {!same && (
          <span
            className={`text-xs font-bold ${
              improved ? "text-green-500" : "text-active-primary"
            }`}
          >
            {improved ? `+${diff.toFixed(1)}` : diff.toFixed(1)}
          </span>
        )}
      </div>
    </div>
  );
}

export default function FeedbackView({
  result,
  submittedText,
  sessionId,
  onNextLesson,
  newBadges,
  childId,
  onRetake,
}: FeedbackViewProps) {
  const { tier, coachName } = useTier();
  const [showWriting, setShowWriting] = useState(false);
  const [showRetakeConfirm, setShowRetakeConfirm] = useState(false);
  const [isRevising, setIsRevising] = useState(false);
  const [revisionText, setRevisionText] = useState(submittedText);
  const [submittingRevision, setSubmittingRevision] = useState(false);
  const [revisionCount, setRevisionCount] = useState(0);
  const [currentResult, setCurrentResult] = useState(result);
  const [previousScores, setPreviousScores] = useState<Record<string, number> | null>(null);
  const [revisionsRemaining, setRevisionsRemaining] = useState(2);
  const [currentText, setCurrentText] = useState(submittedText);
  const [showImprovement, setShowImprovement] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);

  // Resolve badge definitions from IDs
  const resolvedBadges = (newBadges ?? [])
    .map((id) => getBadgeById(id))
    .filter((b): b is NonNullable<typeof b> => b !== undefined);

  // Show celebration overlay after a short delay if there are new badges
  useEffect(() => {
    if (resolvedBadges.length > 0) {
      const timer = setTimeout(() => setShowCelebration(true), 500);
      return () => clearTimeout(timer);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleDismissCelebration = () => {
    setShowCelebration(false);
    // Mark badges as seen
    if (childId && newBadges && newBadges.length > 0) {
      fetch(`/api/children/${encodeURIComponent(childId)}/badges/seen`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ badgeIds: newBadges }),
      }).catch(() => {
        // Silent fail — not critical
      });
    }
  };

  const roundedOverall = Math.round(currentResult.overallScore);
  const canRevise = revisionsRemaining > 0 && sessionId;
  const reviseButtonText = tier === 1 ? "Try Again" : "Revise My Writing";

  const wordCount = revisionText
    .trim()
    .split(/\s+/)
    .filter((w) => w.length > 0).length;

  const handleStartRevision = () => {
    setIsRevising(true);
    setRevisionText(currentText);
    setShowImprovement(false);
  };

  const handleCancelRevision = () => {
    setIsRevising(false);
    setRevisionText(currentText);
  };

  const handleSubmitRevision = async () => {
    if (!sessionId || !revisionText.trim()) return;
    setSubmittingRevision(true);

    try {
      const response = await reviseAssessment(sessionId, revisionText.trim());

      setPreviousScores(response.previousScores);
      setCurrentResult({
        scores: response.scores,
        overallScore: response.overallScore,
        feedback: response.feedback,
      });
      setRevisionsRemaining(response.revisionsRemaining);
      setRevisionCount((c) => c + 1);
      setCurrentText(revisionText.trim());
      setIsRevising(false);
      setShowImprovement(true);
    } catch (err) {
      console.error("Revision failed:", err);
    } finally {
      setSubmittingRevision(false);
    }
  };

  // ── Revision Editor View ────────────────────────────────────────────────
  if (isRevising) {
    return (
      <div className="flex flex-col h-[var(--content-height)]">
        {/* Growth guidance header */}
        <div className="flex-shrink-0 bg-white border-b border-gray-100">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 py-4">
            <div className="flex items-start gap-3">
              <CoachAvatar size="sm" />
              <div className="flex-1 min-w-0">
                <p className="font-bold text-active-text text-sm">
                  Here&apos;s what to focus on:
                </p>
                <div className="mt-2 bg-gradient-to-br from-active-accent/10 to-active-accent/5 rounded-xl p-3 border border-active-accent/20">
                  <p className="text-active-text/80 text-sm leading-relaxed">
                    {currentResult.feedback.growth}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Writing area */}
        <div className="flex-1 min-h-0 overflow-y-auto bg-white">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 h-full">
            <textarea
              value={revisionText}
              onChange={(e) => setRevisionText(e.target.value)}
              className="w-full h-full writing-area writing-lined text-active-text text-base leading-[1.8] resize-none outline-none placeholder:text-gray-300"
              autoFocus
            />
          </div>
        </div>

        {/* Bottom bar */}
        <div className="flex-shrink-0 bg-white border-t border-gray-100 h-16">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 h-full flex items-center justify-between gap-4">
            <span className="text-sm font-bold text-active-text/50">
              {wordCount} words
            </span>
            <div className="flex items-center gap-3">
              <button
                onClick={handleCancelRevision}
                className="px-5 py-2.5 rounded-xl font-bold text-sm border-2 border-active-primary/20 text-active-primary hover:bg-active-primary/5 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitRevision}
                disabled={!revisionText.trim() || submittingRevision}
                className="bg-active-primary text-white px-6 py-2.5 rounded-xl font-bold text-sm hover:bg-active-primary/90 transition-colors shadow-sm disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {submittingRevision
                  ? `${coachName} is reading...`
                  : "Submit Revision"}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Main Feedback View ──────────────────────────────────────────────────
  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6 space-y-6 overflow-y-auto h-[var(--content-height)]">
      {/* Celebration Header */}
      <div className="text-center animate-fade-in">
        <div className="text-5xl mb-3">
          <span className="inline-block animate-star-pop stagger-1">
            {"\uD83C\uDF89"}
          </span>
          {" "}
          <span className="inline-block animate-star-pop stagger-2">
            {showImprovement ? "Great Revision!" : "Amazing!"}
          </span>
          {" "}
          <span className="inline-block animate-star-pop stagger-3">
            {"\uD83C\uDF89"}
          </span>
        </div>
      </div>

      {/* Star Score */}
      <div className="text-center animate-fade-in stagger-2">
        <div className="mb-2">
          <StarRating score={currentResult.overallScore} animate />
        </div>
        <p className="text-active-text/70 font-semibold text-sm">
          {roundedOverall} out of 4 stars
        </p>
      </div>

      {/* Score Comparison (after revision) */}
      {showImprovement && previousScores ? (
        <div className="bg-white rounded-2xl border border-active-primary/10 shadow-sm p-5 animate-fade-in stagger-3">
          <h3 className="font-bold text-active-text text-sm mb-3 flex items-center gap-2">
            Score Comparison
          </h3>
          <div className="space-y-3">
            {Object.entries(currentResult.scores).map(([criterion, score]) => (
              <ScoreComparison
                key={criterion}
                criterion={criterion}
                previous={previousScores[criterion] ?? 0}
                current={score}
              />
            ))}
          </div>
        </div>
      ) : (
        /* Per-Criterion Scores (initial) */
        <div className="bg-white rounded-2xl border border-active-primary/10 shadow-sm p-5 animate-fade-in stagger-3">
          <div className="space-y-3">
            {Object.entries(currentResult.scores).map(([criterion, score]) => (
              <div
                key={criterion}
                className="flex items-center justify-between gap-3"
              >
                <span className="text-sm font-semibold text-active-text capitalize flex-shrink-0">
                  {criterion.replace(/_/g, " ")}
                </span>
                <StarRating score={score} size="sm" />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Feedback Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 animate-fade-in stagger-3">
        <FeedbackCard
          icon={"\uD83D\uDCAA"}
          title="What You Did Well"
          text={currentResult.feedback.strength}
          variant="success"
        />
        <FeedbackCard
          icon={"\uD83C\uDF31"}
          title="Next Time, Try This"
          text={currentResult.feedback.growth}
          variant="growth"
        />
      </div>

      {/* Badges Earned (inline summary) */}
      {resolvedBadges.length > 0 && revisionCount === 0 && (
        <div className="bg-gradient-to-br from-active-accent/20 to-active-accent/10 rounded-2xl p-5 border border-active-accent/30 text-center animate-fade-in stagger-4">
          <div className="text-3xl mb-2">
            {resolvedBadges.length === 1 ? resolvedBadges[0].emoji : "\uD83C\uDFC6"}
          </div>
          <h3 className="font-bold text-active-text mb-1">
            {resolvedBadges.length === 1 ? "Badge Unlocked!" : `${resolvedBadges.length} Badges Unlocked!`}
          </h3>
          <p className="text-active-text/70 text-sm leading-relaxed">
            {resolvedBadges.map((b, i) => (
              <span key={b.id}>
                {i > 0 && ", "}
                <span className="font-bold">&ldquo;{b.name}&rdquo;</span>
              </span>
            ))}
          </p>
        </div>
      )}

      {/* Revision limit reached message */}
      {!canRevise && revisionCount > 0 && (
        <div className="bg-gradient-to-br from-active-accent/20 to-active-accent/10 rounded-2xl p-5 border border-active-accent/30 text-center animate-fade-in stagger-4">
          <div className="text-3xl mb-2">{"\uD83C\uDF1F"}</div>
          <h3 className="font-bold text-active-text mb-1">You gave it your best!</h3>
          <p className="text-active-text/70 text-sm leading-relaxed">
            Great work revising your writing. Every revision makes you a stronger writer!
          </p>
        </div>
      )}

      {/* Coach's Encouragement */}
      <div className="bg-active-primary/5 rounded-2xl p-5 border border-active-primary/15 flex items-start gap-3 animate-fade-in stagger-5">
        <CoachAvatar size="sm" />
        <div>
          <p className="text-active-text/80 text-[15px] leading-relaxed italic">
            &ldquo;{currentResult.feedback.encouragement}&rdquo;
          </p>
        </div>
      </div>

      {/* Writing Review */}
      {showWriting && (
        <div className="bg-white rounded-2xl p-5 border border-gray-200 animate-fade-in">
          <h3 className="font-bold text-active-text mb-3 text-sm">
            Your Writing:
          </h3>
          <div className="bg-active-bg rounded-xl p-4">
            <p className="writing-area text-active-text/80 text-[15px] leading-relaxed whitespace-pre-wrap">
              {currentText}
            </p>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2 pb-4 animate-fade-in stagger-5">
        <button
          onClick={() => setShowWriting(!showWriting)}
          className="px-5 py-2.5 rounded-xl font-bold text-sm border-2 border-active-primary/20 text-active-primary hover:bg-active-primary/5 transition-colors"
        >
          {showWriting ? "Hide My Writing" : "View My Writing"}
        </button>
        {!onRetake && canRevise && (
          <button
            onClick={handleStartRevision}
            className="px-5 py-2.5 rounded-xl font-bold text-sm border-2 border-active-secondary/30 text-active-secondary hover:bg-active-secondary/5 transition-colors"
          >
            {reviseButtonText}
          </button>
        )}
        {onRetake && (
          <button
            onClick={() => setShowRetakeConfirm(true)}
            className="px-5 py-2.5 rounded-xl font-bold text-sm border-2 border-active-secondary/30 text-active-secondary hover:bg-active-secondary/5 transition-colors"
          >
            Retake Lesson
          </button>
        )}
        <button
          onClick={onNextLesson}
          className="bg-active-primary text-white px-6 py-2.5 rounded-xl font-bold text-sm hover:bg-active-primary/90 transition-colors shadow-sm"
        >
          {onRetake ? "Back to Dashboard" : "Continue"} &rarr;
        </button>
      </div>

      {/* Retake Confirmation */}
      {showRetakeConfirm && onRetake && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl p-6 mx-4 max-w-sm w-full shadow-xl">
            <div className="text-center mb-4">
              <span className="text-4xl block mb-2">{"\u26A0\uFE0F"}</span>
              <h3 className="text-lg font-extrabold text-active-text">Retake this lesson?</h3>
              <p className="text-sm text-active-text/60 mt-2 leading-relaxed">
                Your current stars and scores for this lesson will be replaced by your new results.
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowRetakeConfirm(false)}
                className="flex-1 px-4 py-2.5 rounded-xl font-bold text-sm border-2 border-gray-200 text-active-text/60 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => { setShowRetakeConfirm(false); onRetake(); }}
                className="flex-1 px-4 py-2.5 rounded-xl font-bold text-sm bg-active-primary text-white hover:bg-active-primary/90 transition-colors shadow-sm"
              >
                Yes, retake
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Badge Celebration Overlay */}
      {showCelebration && resolvedBadges.length > 0 && (
        <CelebrationOverlay
          badges={resolvedBadges}
          onDismiss={handleDismissCelebration}
        />
      )}
    </div>
  );
}
