"use client";

import { useState, useEffect, useRef, use } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { TierProvider } from "@/contexts/TierContext";
import type { Tier } from "@/types";
import {
  getLessonReport,
  generateLessonReport,
  type LessonReportResponse,
  type ParentReportSections,
} from "@/lib/api";

const TYPE_ICONS: Record<string, string> = {
  narrative: "\uD83D\uDCD6",
  persuasive: "\uD83D\uDCE2",
  expository: "\uD83D\uDCDD",
  descriptive: "\uD83C\uDFA8",
};

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function scoreLabel(score: number): string {
  if (score >= 3.5) return "Excellent";
  if (score >= 2.5) return "Good";
  if (score >= 1.5) return "Developing";
  return "Needs Practice";
}

// SVG-based star rating — supports half stars properly
function StarRating({ score, maxScore = 4 }: { score: number; maxScore?: number }) {
  const rounded = Math.round(score * 2) / 2;
  return (
    <span className="inline-flex items-center gap-0.5">
      {Array.from({ length: maxScore }, (_, i) => {
        const fill = Math.min(1, Math.max(0, rounded - i));
        return (
          <svg key={i} width="20" height="20" viewBox="0 0 24 24" className="flex-shrink-0">
            <defs>
              <linearGradient id={`star-fill-${i}-${Math.round(score * 10)}`}>
                <stop offset={`${fill * 100}%`} stopColor="#f59e0b" />
                <stop offset={`${fill * 100}%`} stopColor="#d1d5db" />
              </linearGradient>
            </defs>
            <path
              d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
              fill={`url(#star-fill-${i}-${Math.round(score * 10)})`}
            />
          </svg>
        );
      })}
    </span>
  );
}

// -- Collapsible section wrapper --

function CollapsibleSection({
  icon,
  title,
  defaultOpen = false,
  variant = "white",
  children,
}: {
  icon: string;
  title: string;
  defaultOpen?: boolean;
  variant?: "white" | "green" | "purple";
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  const variantStyles = {
    white: "bg-white border border-active-primary/10 shadow-sm",
    green: "bg-gradient-to-br from-green-50 to-green-50/30 border border-green-200",
    purple: "bg-gradient-to-br from-purple-50 to-purple-50/30 border border-purple-200",
  };

  const titleStyles = {
    white: "text-active-text",
    green: "text-green-900",
    purple: "text-[#6C5CE7]",
  };

  return (
    <section className={`rounded-2xl overflow-hidden ${variantStyles[variant]}`}>
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2 p-5 pb-3 text-left cursor-pointer"
        aria-expanded={open}
      >
        <span className="w-7 h-7 rounded-lg bg-active-primary/10 flex items-center justify-center text-sm flex-shrink-0">
          {icon}
        </span>
        <h3 className={`font-bold flex-1 ${titleStyles[variant]}`}>{title}</h3>
        <svg
          className={`w-4 h-4 text-active-text/40 transition-transform ${open ? "rotate-180" : ""}`}
          viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
          strokeLinecap="round" strokeLinejoin="round"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
      {open && (
        <div className="px-5 pb-5">
          <div className="text-active-text/80 text-[15px] leading-relaxed prose prose-sm max-w-none">
            {children}
          </div>
        </div>
      )}
    </section>
  );
}

// -- Rich LLM Report Sections --

function LessonExperienceSections({ report }: { report: ParentReportSections }) {
  return (
    <>
      {report.lessonJourney && (
        <CollapsibleSection icon={"\uD83D\uDCD8"} title="The Lesson at a Glance" defaultOpen>
          <div dangerouslySetInnerHTML={{ __html: report.lessonJourney }} />
        </CollapsibleSection>
      )}

      {report.effortAssessment && (
        <CollapsibleSection icon={"\uD83D\uDCAA"} title="How They Showed Up">
          <div dangerouslySetInnerHTML={{ __html: report.effortAssessment }} />
        </CollapsibleSection>
      )}

      {report.coachingHighlights && (
        <CollapsibleSection icon={"\u2728"} title="Standout Moments">
          <div dangerouslySetInnerHTML={{ __html: report.coachingHighlights }} />
        </CollapsibleSection>
      )}
    </>
  );
}

function WritingPerformanceSections({ report }: { report: ParentReportSections }) {
  return (
    <>
      {report.writingAnalysis && (
        <CollapsibleSection icon={"\uD83D\uDD0D"} title="What the Writing Shows" defaultOpen>
          <div dangerouslySetInnerHTML={{ __html: report.writingAnalysis }} />
        </CollapsibleSection>
      )}

      {report.strengthsDeepDive && (
        <CollapsibleSection icon={"\u2705"} title="Strengths in Action" variant="green">
          <div dangerouslySetInnerHTML={{ __html: report.strengthsDeepDive }} />
        </CollapsibleSection>
      )}

      {report.growthPlan && (
        <CollapsibleSection icon={"\uD83C\uDFAF"} title="Next Steps for Home" variant="purple" defaultOpen>
          <div dangerouslySetInnerHTML={{ __html: report.growthPlan }} />
        </CollapsibleSection>
      )}
    </>
  );
}

function LessonDetailContent({ childId, lessonId, childName }: { childId: string; lessonId: string; childName: string }) {
  const router = useRouter();
  const [data, setData] = useState<LessonReportResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showFullText, setShowFullText] = useState<Record<string, boolean>>({});
  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const reportTopRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    getLessonReport(childId, lessonId)
      .then(setData)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [childId, lessonId]);

  const handleGenerateReport = async () => {
    setGenerating(true);
    setGenerateError(null);
    try {
      const sections = await generateLessonReport(childId, lessonId);
      setData((prev) => prev ? { ...prev, parentReport: sections } : prev);
      // Scroll to top of report after generation
      setTimeout(() => reportTopRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    } catch (err) {
      setGenerateError(err instanceof Error ? err.message : "Failed to generate report");
    } finally {
      setGenerating(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-active-bg flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-active-primary/30 border-t-active-primary rounded-full animate-spin mx-auto" />
          <p className="mt-4 text-active-text/60 font-semibold">Loading lesson detail...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-active-bg flex items-center justify-center">
        <div className="text-center">
          <p className="text-active-primary font-semibold">{error || "Failed to load"}</p>
          <button
            onClick={() => router.back()}
            className="mt-3 px-5 py-2.5 bg-active-primary text-white rounded-xl text-sm font-bold"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  const { lesson, status, assessment, submissions, parentReport } = data;
  const hasReport = parentReport && Object.values(parentReport).some((v) => v.length > 0);

  return (
    <div className="min-h-screen bg-active-bg">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-sm border-b border-active-primary/10">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 h-14 flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="w-9 h-9 rounded-full bg-active-bg flex items-center justify-center flex-shrink-0 hover:bg-active-primary/10 transition-colors"
            aria-label="Back"
          >
            <svg className="w-5 h-5 text-active-text" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
          <div className="min-w-0">
            <h1 className="text-lg font-extrabold text-active-text truncate">
              {childName ? `${childName}'s Report` : "Lesson Report"}
            </h1>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        <div ref={reportTopRef} />

        {/* Lesson Header + Score Summary Card (combined) */}
        <section className="bg-white rounded-2xl p-5 shadow-sm border border-active-primary/10">
          <div className="flex items-start gap-3">
            <span className="text-3xl flex-shrink-0">{TYPE_ICONS[lesson.type] || "\uD83D\uDCDD"}</span>
            <div className="flex-1">
              <h2 className="text-xl font-extrabold text-active-text">{lesson.title}</h2>
              <p className="text-sm text-active-text/50 mt-0.5">{capitalize(lesson.type)} &middot; {lesson.unit}</p>
              {status === "needs_improvement" && (
                <span className="inline-block mt-2 text-xs font-bold text-amber-700 bg-amber-100 px-2.5 py-0.5 rounded-full">
                  Needs Improvement
                </span>
              )}
              {status === "completed" && (
                <span className="inline-block mt-2 text-xs font-bold text-green-700 bg-green-100 px-2.5 py-0.5 rounded-full">
                  Completed
                </span>
              )}
            </div>
          </div>

          {/* Inline score summary */}
          {assessment && (
            <div className="mt-4 pt-4 border-t border-active-primary/10 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <StarRating score={assessment.overallScore} />
                <div>
                  <span className="text-lg font-extrabold text-active-text">{assessment.overallScore.toFixed(1)}</span>
                  <span className="text-sm text-active-text/40">/4</span>
                  <span className="ml-2 text-sm font-semibold text-active-text/60">{scoreLabel(assessment.overallScore)}</span>
                </div>
              </div>
              <p className="text-xs text-active-text/40">
                {new Date(assessment.createdAt).toLocaleDateString()}
              </p>
            </div>
          )}

          {/* Collapsible learning objectives */}
          {lesson.learningObjectives.length > 0 && (
            <details className="mt-3">
              <summary className="text-xs font-bold text-active-text/50 uppercase tracking-wider cursor-pointer hover:text-active-text/70 transition-colors">
                What this lesson covered
              </summary>
              <ul className="mt-2 space-y-1">
                {lesson.learningObjectives.map((obj, i) => (
                  <li key={i} className="text-sm text-active-text/70 flex items-start gap-2">
                    <span className="text-active-secondary mt-0.5">&#8226;</span>
                    {obj}
                  </li>
                ))}
              </ul>
            </details>
          )}
        </section>

        {/* Rich LLM Report: Lesson Experience */}
        {hasReport && (
          <>
            <h4 className="text-xs font-bold text-active-text/40 uppercase tracking-wider px-1">Lesson Experience</h4>
            <LessonExperienceSections report={parentReport!} />
          </>
        )}

        {/* Rich LLM Report: Writing Performance */}
        {hasReport && (
          <>
            <h4 className="text-xs font-bold text-active-text/40 uppercase tracking-wider px-1 mt-2">Writing Performance</h4>
            <WritingPerformanceSections report={parentReport!} />
          </>
        )}

        {/* Score Breakdown — after all narrative sections */}
        {assessment && (
          <section className="bg-white rounded-2xl p-5 shadow-sm border border-active-primary/10">
            <h3 className="text-xs font-bold text-active-text/50 uppercase tracking-wider mb-3">Score Breakdown</h3>
            <div className="space-y-2">
              {Object.entries(assessment.scores).map(([criterion, score]) => (
                <div key={criterion} className="flex items-center justify-between gap-3">
                  <span className="text-sm font-semibold text-active-text capitalize flex-shrink-0">
                    {criterion.replace(/_/g, " ")}
                  </span>
                  <div className="flex items-center gap-2">
                    <StarRating score={score} />
                    <span className="text-xs text-active-text/40 w-8 text-right">{score.toFixed(1)}</span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Fallback: simple feedback when no LLM report */}
        {!hasReport && assessment?.feedback && (
          <>
            <section className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-gradient-to-br from-active-secondary/10 to-active-secondary/5 rounded-2xl p-5 border border-active-secondary/20">
                <h3 className="font-bold text-active-secondary mb-2 flex items-center gap-2">
                  <span className="text-xl">{"\uD83D\uDCAA"}</span> What They Did Well
                </h3>
                <p className="text-active-text/80 text-[15px] leading-relaxed">{assessment.feedback.strength}</p>
              </div>
              <div className="bg-gradient-to-br from-active-accent/10 to-active-accent/5 rounded-2xl p-5 border border-active-accent/20">
                <h3 className="font-bold text-active-text mb-2 flex items-center gap-2">
                  <span className="text-xl">{"\uD83C\uDF31"}</span> Area for Growth
                </h3>
                <p className="text-active-text/80 text-[15px] leading-relaxed">{assessment.feedback.growth}</p>
              </div>
            </section>

            {/* Generate Detailed Report button */}
            <section className="bg-gradient-to-br from-active-primary/5 to-active-primary/10 rounded-2xl p-5 border border-active-primary/15">
              <div className="text-center">
                {generating ? (
                  <>
                    <div className="w-6 h-6 border-3 border-active-primary/30 border-t-active-primary rounded-full animate-spin mx-auto mb-3" />
                    <p className="text-sm font-semibold text-active-text/70">
                      Analyzing {childName || "the"} lesson...
                    </p>
                    <p className="text-xs text-active-text/40 mt-1">This usually takes 15-20 seconds</p>
                  </>
                ) : (
                  <>
                    <p className="text-sm text-active-text/60 mb-3">
                      Want a more detailed analysis of this lesson?
                    </p>
                    <button
                      onClick={handleGenerateReport}
                      className="px-6 py-2.5 bg-active-primary text-white rounded-xl text-sm font-bold hover:opacity-90 transition-opacity"
                    >
                      Generate Detailed Report
                    </button>
                  </>
                )}
                {generateError && (
                  <p className="text-xs text-red-600 mt-2">{generateError}</p>
                )}
              </div>
            </section>
          </>
        )}

        {/* Writing Submissions */}
        {submissions.length > 0 && (
          <section className="bg-white rounded-2xl p-5 shadow-sm border border-active-primary/10">
            <h3 className="text-sm font-bold text-active-text mb-4">
              Writing {submissions.length > 1 ? "Submissions" : "Submission"}
            </h3>
            <div className="space-y-4">
              {submissions.map((sub) => {
                const isExpanded = showFullText[sub.id] ?? false;
                const isLong = sub.submissionText.length > 400;
                return (
                  <div key={sub.id} className="border border-gray-100 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-active-text/50">
                        {sub.revisionNumber === 0 ? "Original" : `Revision ${sub.revisionNumber}`}
                      </span>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-active-text/40">{sub.wordCount} words</span>
                        {sub.feedback && (
                          <span className="text-xs font-bold text-active-accent">
                            {"\u2B50"} {sub.feedback.overallScore.toFixed(1)}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="bg-active-bg rounded-lg p-4">
                      <p className="text-[15px] text-active-text/80 leading-relaxed whitespace-pre-wrap font-[Literata,serif]">
                        {isLong && !isExpanded
                          ? sub.submissionText.slice(0, 400) + "..."
                          : sub.submissionText}
                      </p>
                      {isLong && (
                        <button
                          onClick={() => setShowFullText((prev) => ({ ...prev, [sub.id]: !isExpanded }))}
                          className="text-sm font-bold text-active-primary mt-2 py-1 hover:underline"
                        >
                          {isExpanded ? "Show less" : "Read more"}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Revision History — score comparison */}
        {submissions.length > 1 && (
          <section className="bg-white rounded-2xl p-5 shadow-sm border border-active-primary/10">
            <h3 className="text-sm font-bold text-active-text mb-3">Revision Progress</h3>
            <div className="space-y-2">
              {submissions.filter((s) => s.feedback).map((sub) => (
                <div key={sub.id} className="flex items-center justify-between px-3 py-2 rounded-lg bg-active-bg/50">
                  <span className="text-sm font-semibold text-active-text">
                    {sub.revisionNumber === 0 ? "Original" : `Revision ${sub.revisionNumber}`}
                  </span>
                  <div className="flex items-center gap-2">
                    <StarRating score={sub.feedback!.overallScore} />
                    <span className="text-xs font-bold text-active-text/60">
                      {sub.feedback!.overallScore.toFixed(1)}/4
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Back button */}
        <section className="pb-8">
          <button
            onClick={() => router.push(`/dashboard/children/${childId}/report`)}
            className="w-full text-center px-5 py-3 bg-white text-active-primary border border-active-primary/20 rounded-xl text-sm font-bold hover:bg-active-primary/5 transition-colors"
          >
            &larr; View All Lessons
          </button>
        </section>
      </main>
    </div>
  );
}

export default function LessonDetailPage({
  params,
}: {
  params: Promise<{ id: string; lessonId: string }>;
}) {
  const { id: childId, lessonId } = use(params);
  const { data: session, status } = useSession();
  const router = useRouter();
  const [tier, setTier] = useState<Tier>(1);
  const [childName, setChildName] = useState("");

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/login");
    }
  }, [status, router]);

  useEffect(() => {
    fetch(`/api/children/${encodeURIComponent(childId)}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.child?.tier) setTier(data.child.tier as Tier);
        if (data?.child?.name) setChildName(data.child.name);
      })
      .catch(() => {});
  }, [childId]);

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-[#FFF9F0] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-[#FF6B6B]/30 border-t-[#FF6B6B] rounded-full animate-spin" />
      </div>
    );
  }

  if (!session) return null;

  return (
    <TierProvider tier={tier}>
      <LessonDetailContent childId={childId} lessonId={lessonId} childName={childName} />
    </TierProvider>
  );
}
