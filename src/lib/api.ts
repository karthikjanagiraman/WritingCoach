import type { AssessmentResult, Message, Phase } from "@/types";

// ── Response types from the API ─────────────────────────────────────────────

export interface StartLessonResponse {
  sessionId: string;
  resumed: boolean;
  phase: Phase;
  conversationHistory: Message[];
  initialPrompt: Message;
  lesson: {
    id: string;
    title: string;
    unit: string;
    type: string;
    learningObjectives: string[];
  };
}

export interface SendMessageResponse {
  response: Message;
  phaseUpdate: Phase | null;
  assessmentReady: boolean;
}

export interface SubmitAssessmentResponse {
  assessmentId: string;
  scores: Record<string, number>;
  overallScore: number;
  feedback: {
    strength: string;
    growth: string;
    encouragement: string;
  };
  rubric: {
    id: string;
    description: string;
    criteria: { name: string; displayName: string; weight: number }[];
  };
}

export interface StudentProgressResponse {
  child: {
    id: string;
    name: string;
    age: number;
    tier: number;
  };
  completedLessons: {
    lessonId: string;
    title: string;
    completedAt: string | null;
  }[];
  currentLesson: {
    lessonId: string;
    title: string;
    currentPhase: string | null;
    startedAt: string | null;
  } | null;
  availableLessons: {
    id: string;
    title: string;
    unit: string;
    type: string;
  }[];
  assessments: {
    lessonId: string;
    overallScore: number;
    createdAt: string;
  }[];
  typeStats: Record<string, { completed: number; total: number; avgScore: number | null }>;
  stats: {
    totalCompleted: number;
    totalAvailable: number;
    averageScore: number | null;
  };
}

export interface LessonDetailResponse {
  lesson: {
    id: string;
    title: string;
    unit: string;
    type: string;
    tier: number;
    learningObjectives: string[];
    rubricId: string | null;
  };
  rubric: {
    id: string;
    description: string;
    wordRange: [number, number];
    criteriaCount: number;
    criteria: { name: string; displayName: string; weight: number }[];
  } | null;
}

// ── API client functions ────────────────────────────────────────────────────

async function apiFetch<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, options);
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: "Request failed" }));
    throw new Error(body.error || `API error: ${res.status}`);
  }
  return res.json();
}

export async function startLesson(
  childId: string,
  lessonId: string
): Promise<StartLessonResponse> {
  return apiFetch<StartLessonResponse>("/api/lessons/start", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ childId, lessonId }),
  });
}

export async function sendMessage(
  sessionId: string,
  message: string
): Promise<SendMessageResponse> {
  return apiFetch<SendMessageResponse>("/api/lessons/message", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sessionId, message }),
  });
}

export async function submitAssessment(
  sessionId: string,
  text: string
): Promise<SubmitAssessmentResponse> {
  return apiFetch<SubmitAssessmentResponse>("/api/lessons/submit", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sessionId, text }),
  });
}

export interface ReviseAssessmentResponse {
  assessmentId: string;
  scores: Record<string, number>;
  overallScore: number;
  feedback: {
    strength: string;
    growth: string;
    encouragement: string;
  };
  previousScores: Record<string, number> | null;
  revisionsRemaining: number;
  rubric: {
    id: string;
    description: string;
    criteria: { name: string; displayName: string; weight: number }[];
  } | null;
}

export async function reviseAssessment(
  sessionId: string,
  text: string
): Promise<ReviseAssessmentResponse> {
  return apiFetch<ReviseAssessmentResponse>("/api/lessons/revise", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sessionId, text }),
  });
}

export async function getProgress(
  childId: string
): Promise<StudentProgressResponse> {
  return apiFetch<StudentProgressResponse>(
    `/api/children/${encodeURIComponent(childId)}/progress`
  );
}

export async function getLessonDetail(
  lessonId: string
): Promise<LessonDetailResponse> {
  return apiFetch<LessonDetailResponse>(
    `/api/lessons/${encodeURIComponent(lessonId)}`
  );
}

export interface CurriculumResponse {
  curriculum: {
    id: string;
    status: string;
    weekCount: number;
    lessonsPerWeek: number;
    focusAreas: string[] | null;
    startDate: string | null;
  };
  weeks: {
    weekNumber: number;
    theme: string;
    status: string;
    lessons: { id: string; title: string; type: string; unit: string }[];
  }[];
}

export async function getCurriculum(childId: string): Promise<CurriculumResponse> {
  return apiFetch<CurriculumResponse>(`/api/curriculum/${encodeURIComponent(childId)}`);
}
