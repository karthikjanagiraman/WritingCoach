"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import type { Phase, Message, AssessmentResult, Tier } from "@/types";
import { CoachAvatar } from "@/components/shared";
import { TierProvider } from "@/contexts/TierContext";
import PhaseIndicator from "@/components/PhaseIndicator";
import PhaseTransition from "@/components/PhaseTransition";
import InstructionPhase from "@/components/InstructionPhase";
import GuidedPracticePhase from "@/components/GuidedPracticePhase";
import AssessmentPhase from "@/components/AssessmentPhase";
import FeedbackView from "@/components/FeedbackView";
import {
  startLesson,
  sendMessage as apiSendMessage,
  submitAssessment,
  getLessonDetail,
  ApiError,
  type LessonDetailResponse,
} from "@/lib/api";
import { useActiveChild } from "@/contexts/ActiveChildContext";

export default function LessonPage() {
  const router = useRouter();
  const params = useParams();
  const lessonId = params.id as string;
  const { activeChild } = useActiveChild();

  const [sessionId, setSessionId] = useState<string | null>(null);
  const [currentPhase, setCurrentPhase] = useState<Phase>("instruction");
  const [messages, setMessages] = useState<Message[]>([]);
  const [lessonData, setLessonData] = useState<LessonDetailResponse | null>(null);
  const [assessmentResult, setAssessmentResult] = useState<AssessmentResult | null>(null);
  const [submittedText, setSubmittedText] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [transition, setTransition] = useState<"instruction" | "guided" | null>(null);
  const [newBadges, setNewBadges] = useState<string[]>([]);
  const [isCompletedReview, setIsCompletedReview] = useState(false);
  const [qualityError, setQualityError] = useState<string | null>(null);

  useEffect(() => {
    if (!activeChild) {
      router.push("/dashboard");
      return;
    }

    let cancelled = false;

    async function init() {
      try {
        const [detail, session] = await Promise.all([
          getLessonDetail(lessonId),
          startLesson(activeChild!.id, lessonId),
        ]);

        if (cancelled) return;

        setLessonData(detail);
        setSessionId(session.sessionId);

        // If lesson was already completed, show the feedback summary
        const sessionAny = session as any;
        if (sessionAny.completed && sessionAny.assessment) {
          setAssessmentResult(sessionAny.assessment);
          setSubmittedText(sessionAny.submittedText ?? "");
          setCurrentPhase("feedback");
          setIsCompletedReview(true);
        } else if (session.resumed) {
          setMessages(session.conversationHistory);
          setCurrentPhase(session.phase);
        } else {
          setMessages([session.initialPrompt]);
          setCurrentPhase("instruction");
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to start lesson");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    init();
    return () => { cancelled = true; };
  }, [lessonId, activeChild, router]);

  const handlePhaseAdvance = useCallback((nextPhase: Phase) => {
    if (nextPhase === "guided") {
      setTransition("instruction");
    } else if (nextPhase === "assessment") {
      setTransition("guided");
    } else {
      setCurrentPhase(nextPhase);
    }
  }, []);

  const handleSendMessage = useCallback(
    async (text: string): Promise<Message | null> => {
      if (!sessionId) return null;
      const studentMsg: Message = {
        id: `student-${Date.now()}`,
        role: "student",
        content: text,
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, studentMsg]);
      try {
        const result = await apiSendMessage(sessionId, text);
        setMessages((prev) => [...prev, result.response]);
        if (result.phaseUpdate) {
          handlePhaseAdvance(result.phaseUpdate);
        }
        return result.response;
      } catch (err) {
        console.error("Send message error:", err);
        return null;
      }
    },
    [sessionId, handlePhaseAdvance]
  );

  const handleAssessmentSubmit = useCallback(
    async (text: string) => {
      if (!sessionId) return;
      setSubmittedText(text);
      setSubmitting(true);
      setQualityError(null);
      try {
        const result = await submitAssessment(sessionId, text);
        setAssessmentResult({
          scores: result.scores,
          overallScore: result.overallScore,
          feedback: result.feedback,
        });
        if (result.newBadges && result.newBadges.length > 0) {
          setNewBadges(result.newBadges);
        }
        setCurrentPhase("feedback");
      } catch (err) {
        // Quality gate rejection — stay on assessment phase with friendly message
        if (err instanceof ApiError && err.status === 422) {
          setQualityError(err.body.message as string);
          return;
        }
        console.error("Submit assessment error:", err);
        setAssessmentResult({
          scores: {},
          overallScore: 0,
          feedback: {
            strength: "Great effort on your writing!",
            growth: "Keep practicing to improve.",
            encouragement: "You are becoming a better writer!",
          },
        });
        setCurrentPhase("feedback");
      } finally {
        setSubmitting(false);
      }
    },
    [sessionId]
  );

  const handleNextLesson = () => {
    router.push(`/home?completed=${lessonId}`);
  };

  const handleRetake = useCallback(async () => {
    if (!activeChild) return;
    setLoading(true);
    setIsCompletedReview(false);
    setAssessmentResult(null);
    setSubmittedText("");
    setNewBadges([]);
    setMessages([]);
    try {
      const session = await startLesson(activeChild.id, lessonId, true);
      setSessionId(session.sessionId);
      setMessages([session.initialPrompt]);
      setCurrentPhase("instruction");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to restart lesson");
    } finally {
      setLoading(false);
    }
  }, [activeChild, lessonId]);

  const lesson = lessonData?.lesson || { title: "Writing Lesson", unit: "Writing", type: "" };

  if (loading) {
    return (
      <div className="min-h-screen bg-active-bg flex items-center justify-center">
        <div className="text-center">
          <div className="mx-auto flex justify-center">
            <CoachAvatar size="lg" animate />
          </div>
          <p className="mt-4 text-active-text/60 font-semibold">Loading your lesson...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-active-bg flex items-center justify-center">
        <div className="text-center max-w-sm">
          <div className="mx-auto flex justify-center">
            <CoachAvatar size="lg" />
          </div>
          <p className="mt-4 text-active-primary font-semibold">{error}</p>
          <div className="mt-4 flex gap-3 justify-center">
            <button
              onClick={() => router.push("/home")}
              className="px-5 py-2.5 rounded-xl font-bold text-sm border-2 border-active-primary/20 text-active-primary hover:bg-active-primary/5 transition-colors"
            >
              Go Home
            </button>
            <button
              onClick={() => window.location.reload()}
              className="px-5 py-2.5 rounded-xl bg-active-primary text-white font-bold text-sm hover:bg-active-primary/90 transition-colors shadow-sm"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  const tier = (activeChild?.tier ?? 1) as Tier;
  const unitLabel = [lesson.unit, lesson.type].filter(Boolean).join(" \u00B7 ");

  return (
    <TierProvider tier={tier}>
      <div className="min-h-screen bg-active-bg flex flex-col">
        {/* Sticky Header — merged with phase dots */}
        <header className="sticky top-0 z-30 bg-white border-b border-[#e0dcd5] shadow-sm">
          <div className="max-w-[640px] mx-auto px-4 py-3">
            {/* Top row: back button + title */}
            <div className="flex items-center gap-3 mb-2.5">
              <button
                onClick={() => router.push("/home")}
                aria-label="Go back"
                className="w-9 h-9 rounded-full bg-active-bg flex items-center justify-center flex-shrink-0 hover:bg-[#f0ebe3] transition-colors"
              >
                <svg className="w-5 h-5 text-active-text" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="15 18 9 12 15 6" />
                </svg>
              </button>
              <div className="flex-1 min-w-0">
                {unitLabel && (
                  <div className="text-[0.75rem] font-semibold text-active-text/50 uppercase tracking-wide">
                    {unitLabel}
                  </div>
                )}
                <h1 className="text-[1.05rem] font-extrabold text-active-text leading-tight truncate">
                  {lesson.title}
                </h1>
              </div>
            </div>
            {/* Phase dots row */}
            <PhaseIndicator currentPhase={currentPhase} />
          </div>
        </header>

        {/* Phase Content */}
        <main className="flex-1 min-h-0">
          {transition ? (
            <PhaseTransition
              fromPhase={transition}
              onContinue={() => {
                const nextPhase = transition === "instruction" ? "guided" : "assessment";
                setTransition(null);
                setCurrentPhase(nextPhase);
              }}
            />
          ) : (
            <>
              {currentPhase === "instruction" && (
                <InstructionPhase
                  lessonTitle={lesson.title}
                  messages={messages}
                  onSendMessage={handleSendMessage}
                  onComplete={() => handlePhaseAdvance("guided")}
                />
              )}
              {currentPhase === "guided" && (
                <GuidedPracticePhase
                  messages={messages}
                  onSendMessage={handleSendMessage}
                  onComplete={() => handlePhaseAdvance("assessment")}
                />
              )}
              {currentPhase === "assessment" && (
                <AssessmentPhase
                  lessonTitle={lesson.title}
                  rubric={lessonData?.rubric ?? undefined}
                  onSubmit={handleAssessmentSubmit}
                  submitting={submitting}
                  qualityError={qualityError}
                />
              )}
              {currentPhase === "feedback" && assessmentResult && (
                <FeedbackView
                  result={assessmentResult}
                  submittedText={submittedText}
                  sessionId={sessionId}
                  onNextLesson={handleNextLesson}
                  newBadges={newBadges}
                  childId={activeChild?.id}
                  onRetake={isCompletedReview ? handleRetake : undefined}
                />
              )}
            </>
          )}
        </main>
      </div>
    </TierProvider>
  );
}
