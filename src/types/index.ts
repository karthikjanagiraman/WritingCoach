export type Tier = 1 | 2 | 3;
export type Phase = "instruction" | "guided" | "assessment" | "feedback";
export type LessonStatus = "not_started" | "in_progress" | "completed";
export type WritingType = "narrative" | "persuasive" | "expository" | "descriptive";

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
  phase1Step?: number; // 1-5, current step in Phase 1
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
