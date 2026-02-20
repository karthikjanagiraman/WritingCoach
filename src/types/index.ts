export type Tier = 1 | 2 | 3;
export type Phase = "instruction" | "guided" | "assessment" | "feedback";
export type LessonStatus = "not_started" | "in_progress" | "completed" | "needs_improvement";
export type WritingType = "narrative" | "persuasive" | "expository" | "descriptive";
export type AnswerType = "text" | "choice" | "multiselect" | "poll" | "order" | "highlight";
export type LessonTemplate = "try_first" | "study_apply" | "workshop";

export interface AnswerMeta {
  answerType: AnswerType;
  options?: string[];   // For choice, multiselect, poll, order
  passage?: string;     // For highlight
  prompt?: string;      // Card header text from the LLM (e.g. "Pick your favorite place")
}

export interface Student {
  id: string;
  name: string;
  age: number;
  tier: Tier;
}

export interface ChildProfile {
  id: string;
  parentId: string;
  name: string;
  age: number;
  tier: Tier;
  avatarEmoji: string;
  gradeLevel?: string;
  interests?: string;
}

export interface Lesson {
  id: string;
  title: string;
  unit: string;
  type: WritingType;
  tier: Tier;
  template: LessonTemplate;
  learningObjectives: string[];
  rubricId?: string;
}

export interface LessonProgress {
  lessonId: string;
  status: LessonStatus;
  currentPhase?: Phase;
}

export interface SessionState {
  id: string;
  childId: string;
  lessonId: string;
  phase: Phase;
  phaseState: PhaseState;
  conversationHistory: Message[];
}

export interface PhaseState {
  instructionCompleted?: boolean;
  comprehensionCheckPassed?: boolean;
  phase1Step?: number; // 1-3, current step in Phase 1
  guidedStage?: number; // 1-3, current guided practice stage
  guidedAttempts?: number;
  hintsGiven?: number;
  guidedComplete?: boolean;
  writingStartedAt?: string;
  revisionsUsed?: number;
}

export interface Message {
  id: string;
  role: "coach" | "student";
  content: string;
  timestamp: string;
  answerMeta?: AnswerMeta;
}

export interface AssessmentResult {
  scores: Record<string, number>;
  overallScore: number;
  feedback: {
    strength: string;
    growth: string;
    encouragement: string;
  };
}

export interface RubricCriterion {
  name: string;
  display_name: string;
  weight: number;
  levels: Record<string, string>;
  feedback_stems: {
    strength: string;
    growth: string;
  };
}

export interface Rubric {
  id: string;
  description: string;
  word_range: [number, number];
  criteria: RubricCriterion[];
}

// ---------------------------------------------------------------------------
// Learner Profile — cross-lesson personalization
// ---------------------------------------------------------------------------

export interface LearnerProfile {
  childId: string;
  totalLessons: number;
  strengths: Array<{ criterion: string; avgScore: number }>;
  growthAreas: Array<{ criterion: string; avgScore: number }>;
  scoreTrajectory: "improving" | "stable" | "declining";
  scaffoldingTrend: "decreasing" | "stable" | "increasing";
  engagementLevel: "high" | "medium" | "low";
  writingLengthTrend: "increasing" | "stable" | "decreasing";
  recentSamples: WritingSampleRecord[];
  preferences: StudentPreferenceRecord[];
}

export interface LearnerContext {
  summary: string;
  strengths: string[];
  growthAreas: string[];
  recentSamples: Array<{ type: string; excerpt: string }>;
  preferences: Array<{ category: string; value: string }>;
  connectionPoints: string[];
}

export interface WritingSampleRecord {
  type: string;
  criterion: string;
  excerpt: string;
  lessonId: string;
  createdAt: string;
}

export interface StudentPreferenceRecord {
  category: string;
  value: string;
  source: string;
  createdAt: string;
}
