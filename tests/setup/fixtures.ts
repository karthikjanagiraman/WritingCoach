/**
 * Shared test fixtures for WriteWise Kids.
 * Single source of truth for all test data.
 */

// ==========================================
// USERS & AUTH
// ==========================================

export const PARENT_USER = {
  id: 'user-parent-001',
  email: 'parent@example.com',
  passwordHash: '$2b$10$hashedpassword', // bcrypt of 'password123'
  name: 'Test Parent',
  role: 'PARENT' as const,
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
};

export const OTHER_PARENT = {
  id: 'user-parent-002',
  email: 'other@example.com',
  passwordHash: '$2b$10$otherhashedpassword',
  name: 'Other Parent',
  role: 'PARENT' as const,
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
};

// ==========================================
// CHILD PROFILES
// ==========================================

export const CHILD_MAYA = {
  id: 'child-maya-001',
  parentId: PARENT_USER.id,
  name: 'Maya',
  age: 8,
  tier: 1,
  avatarEmoji: '🦉',
  gradeLevel: '3rd grade',
  interests: JSON.stringify(['fantasy stories', 'animals']),
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
};

export const CHILD_ETHAN = {
  id: 'child-ethan-001',
  parentId: PARENT_USER.id,
  name: 'Ethan',
  age: 11,
  tier: 2,
  avatarEmoji: '🦊',
  gradeLevel: '6th grade',
  interests: JSON.stringify(['science fiction', 'space']),
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
};

export const CHILD_SOPHIA = {
  id: 'child-sophia-001',
  parentId: PARENT_USER.id,
  name: 'Sophia',
  age: 14,
  tier: 3,
  avatarEmoji: '🐺',
  gradeLevel: '9th grade',
  interests: JSON.stringify(['poetry', 'journalism']),
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
};

// Child belonging to another parent (for ownership tests)
export const CHILD_OTHER = {
  id: 'child-other-001',
  parentId: OTHER_PARENT.id,
  name: 'OtherKid',
  age: 9,
  tier: 1,
  avatarEmoji: '🦉',
  gradeLevel: null,
  interests: null,
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
};

// ==========================================
// TIER COMPUTATION TEST DATA
// ==========================================

export const TIER_TEST_CASES = [
  { age: 7, expectedTier: 1 },
  { age: 8, expectedTier: 1 },
  { age: 9, expectedTier: 1 },
  { age: 10, expectedTier: 2 },
  { age: 11, expectedTier: 2 },
  { age: 12, expectedTier: 2 },
  { age: 13, expectedTier: 3 },
  { age: 14, expectedTier: 3 },
  { age: 15, expectedTier: 3 },
];

// ==========================================
// SESSIONS & LESSON FLOW
// ==========================================

export const SESSION_INSTRUCTION = {
  id: 'session-001',
  childId: CHILD_MAYA.id,
  lessonId: 'N1.1.1',
  phase: 'instruction',
  phaseState: JSON.stringify({
    instructionCompleted: false,
    comprehensionCheckPassed: false,
  }),
  conversationHistory: JSON.stringify([]),
  createdAt: new Date('2026-02-01'),
  updatedAt: new Date('2026-02-01'),
};

export const SESSION_GUIDED = {
  id: 'session-002',
  childId: CHILD_MAYA.id,
  lessonId: 'N1.1.1',
  phase: 'guided',
  phaseState: JSON.stringify({
    instructionCompleted: true,
    comprehensionCheckPassed: true,
    guidedAttempts: 1,
    hintsGiven: 0,
    guidedComplete: false,
  }),
  conversationHistory: JSON.stringify([
    { role: 'assistant', content: 'Let\'s learn about story hooks!' },
    { role: 'user', content: 'A hook makes you curious' },
    { role: 'assistant', content: 'Exactly! Ready to practice?' },
  ]),
  createdAt: new Date('2026-02-01'),
  updatedAt: new Date('2026-02-01'),
};

export const SESSION_ASSESSMENT = {
  id: 'session-003',
  childId: CHILD_MAYA.id,
  lessonId: 'N1.1.1',
  phase: 'assessment',
  phaseState: JSON.stringify({
    instructionCompleted: true,
    comprehensionCheckPassed: true,
    guidedAttempts: 3,
    hintsGiven: 1,
    guidedComplete: true,
    writingStartedAt: new Date('2026-02-01T10:00:00Z').toISOString(),
  }),
  conversationHistory: JSON.stringify([
    { role: 'assistant', content: 'Let\'s learn about story hooks!' },
    { role: 'user', content: 'A hook makes you curious' },
    { role: 'assistant', content: 'Exactly!' },
    { role: 'user', content: 'The sky turned green suddenly' },
    { role: 'assistant', content: 'Great hook! Now write on your own.' },
  ]),
  createdAt: new Date('2026-02-01'),
  updatedAt: new Date('2026-02-01'),
};

export const SESSION_FEEDBACK = {
  id: 'session-004',
  childId: CHILD_MAYA.id,
  lessonId: 'N1.1.1',
  phase: 'feedback',
  phaseState: JSON.stringify({
    instructionCompleted: true,
    comprehensionCheckPassed: true,
    guidedComplete: true,
    revisionsUsed: 0,
  }),
  conversationHistory: JSON.stringify([]),
  createdAt: new Date('2026-02-01'),
  updatedAt: new Date('2026-02-01'),
};

// ==========================================
// LESSON PROGRESS
// ==========================================

export const PROGRESS_IN_PROGRESS = {
  id: 'progress-001',
  childId: CHILD_MAYA.id,
  lessonId: 'N1.1.1',
  status: 'in_progress',
  currentPhase: 'guided',
  startedAt: new Date('2026-02-01'),
  completedAt: null,
};

export const PROGRESS_COMPLETED = {
  id: 'progress-002',
  childId: CHILD_MAYA.id,
  lessonId: 'N1.1.2',
  status: 'completed',
  currentPhase: 'feedback',
  startedAt: new Date('2026-01-28'),
  completedAt: new Date('2026-01-28'),
};

// ==========================================
// WRITING SUBMISSIONS & FEEDBACK
// ==========================================

export const SUBMISSION_ORIGINAL = {
  id: 'submission-001',
  sessionId: SESSION_ASSESSMENT.id,
  childId: CHILD_MAYA.id,
  lessonId: 'N1.1.1',
  rubricId: 'N1_story_beginning',
  submissionText: 'The door wasn\'t there yesterday. Emma stared at the old wooden door that had appeared in her bedroom wall overnight. She reached for the handle, her heart beating fast.',
  wordCount: 30,
  timeSpentSec: 300,
  revisionOf: null,
  revisionNumber: 0,
  createdAt: new Date('2026-02-01'),
};

export const SUBMISSION_REVISION = {
  id: 'submission-002',
  sessionId: SESSION_ASSESSMENT.id,
  childId: CHILD_MAYA.id,
  lessonId: 'N1.1.1',
  rubricId: 'N1_story_beginning',
  submissionText: 'The door wasn\'t there yesterday. Emma stared at the old wooden door, covered in strange silver symbols, that had appeared in her bedroom wall overnight. She reached for the ice-cold handle, her heart hammering like a drum.',
  wordCount: 42,
  timeSpentSec: 180,
  revisionOf: 'submission-001',
  revisionNumber: 1,
  createdAt: new Date('2026-02-01'),
};

export const AI_FEEDBACK_GOOD = {
  id: 'feedback-001',
  submissionId: SUBMISSION_ORIGINAL.id,
  scores: JSON.stringify({ hook: 4, character: 3, setting: 4, creativity: 5 }),
  overallScore: 4.0,
  strength: 'Your opening creates instant curiosity!',
  growthArea: 'Add one more sensory detail.',
  encouragement: 'You have a real gift for mystery. Keep writing!',
  fullFeedback: null,
  model: 'claude-sonnet-4-5-20250929',
  createdAt: new Date('2026-02-01'),
};

// ==========================================
// SKILL PROGRESS
// ==========================================

export const SKILL_NARRATIVE_EMERGING = {
  id: 'skill-001',
  childId: CHILD_MAYA.id,
  skillCategory: 'narrative',
  skillName: 'story_beginnings',
  level: 'EMERGING',
  score: 1.5,
  totalAttempts: 1,
  lastAssessedAt: new Date('2026-01-28'),
  createdAt: new Date('2026-01-28'),
  updatedAt: new Date('2026-01-28'),
};

export const SKILL_NARRATIVE_PROFICIENT = {
  id: 'skill-002',
  childId: CHILD_MAYA.id,
  skillCategory: 'narrative',
  skillName: 'character_development',
  level: 'PROFICIENT',
  score: 3.8,
  totalAttempts: 5,
  lastAssessedAt: new Date('2026-02-01'),
  createdAt: new Date('2026-01-15'),
  updatedAt: new Date('2026-02-01'),
};

export const ALL_SKILLS_MAYA = [
  SKILL_NARRATIVE_EMERGING,
  SKILL_NARRATIVE_PROFICIENT,
  {
    id: 'skill-003', childId: CHILD_MAYA.id, skillCategory: 'persuasive',
    skillName: 'opinion_statements', level: 'DEVELOPING', score: 2.5,
    totalAttempts: 3, lastAssessedAt: new Date('2026-01-25'),
    createdAt: new Date('2026-01-20'), updatedAt: new Date('2026-01-25'),
  },
  {
    id: 'skill-004', childId: CHILD_MAYA.id, skillCategory: 'descriptive',
    skillName: 'sensory_details', level: 'DEVELOPING', score: 3.0,
    totalAttempts: 2, lastAssessedAt: new Date('2026-01-30'),
    createdAt: new Date('2026-01-22'), updatedAt: new Date('2026-01-30'),
  },
];

// ==========================================
// STREAKS
// ==========================================

export const STREAK_ACTIVE = {
  id: 'streak-001',
  childId: CHILD_MAYA.id,
  currentStreak: 5,
  longestStreak: 12,
  lastActiveDate: new Date('2026-02-11'), // yesterday
  weeklyGoal: 3,
  weeklyCompleted: 2,
  weekStartDate: new Date('2026-02-10'), // Monday
  updatedAt: new Date('2026-02-11'),
};

export const STREAK_BROKEN = {
  id: 'streak-002',
  childId: CHILD_ETHAN.id,
  currentStreak: 0,
  longestStreak: 7,
  lastActiveDate: new Date('2026-02-05'), // 7 days ago
  weeklyGoal: 3,
  weeklyCompleted: 0,
  weekStartDate: new Date('2026-02-03'),
  updatedAt: new Date('2026-02-05'),
};

// ==========================================
// ACHIEVEMENTS
// ==========================================

export const BADGE_FIRST_STORY = {
  id: 'achievement-001',
  childId: CHILD_MAYA.id,
  badgeId: 'first_story',
  unlockedAt: new Date('2026-01-28'),
  seen: true,
};

export const BADGE_STREAK_7 = {
  id: 'achievement-002',
  childId: CHILD_MAYA.id,
  badgeId: 'streak_7',
  unlockedAt: new Date('2026-02-05'),
  seen: false,
};

// ==========================================
// PLACEMENT
// ==========================================

export const PLACEMENT_MAYA = {
  id: 'placement-001',
  childId: CHILD_MAYA.id,
  prompts: JSON.stringify([
    'Tell a short story about finding something magical.',
    'Describe your favorite place using all five senses.',
    'Convince your teacher to give the class more recess.',
  ]),
  responses: JSON.stringify([
    'I found a magic rock in the garden...',
    'My favorite place is the beach...',
    'Dear teacher, we need more recess because...',
  ]),
  aiAnalysis: JSON.stringify({
    vocabularySophistication: 3,
    sentenceComplexity: 2,
    ideaOrganization: 3,
    creativityAndVoice: 4,
    grammarAndMechanics: 2,
  }),
  recommendedTier: 1,
  assignedTier: 1,
  confidence: 0.85,
  createdAt: new Date('2026-01-01'),
};

// ==========================================
// CURRICULUM
// ==========================================

export const CURRICULUM_MAYA = {
  id: 'curriculum-001',
  childId: CHILD_MAYA.id,
  status: 'ACTIVE',
  weekCount: 8,
  lessonsPerWeek: 3,
  focusAreas: JSON.stringify(['narrative', 'descriptive']),
  startDate: new Date('2026-01-06'),
  endDate: null,
  createdAt: new Date('2026-01-06'),
  updatedAt: new Date('2026-01-06'),
};

export const CURRICULUM_WEEKS = [
  {
    id: 'week-001', curriculumId: CURRICULUM_MAYA.id, weekNumber: 1,
    theme: 'Story Beginnings', lessonIds: JSON.stringify(['N1.1.1', 'N1.1.2', 'D1.1.1']),
    status: 'completed',
  },
  {
    id: 'week-002', curriculumId: CURRICULUM_MAYA.id, weekNumber: 2,
    theme: 'Building Characters', lessonIds: JSON.stringify(['N1.1.3', 'N1.1.4', 'D1.1.2']),
    status: 'in_progress',
  },
  {
    id: 'week-003', curriculumId: CURRICULUM_MAYA.id, weekNumber: 3,
    theme: 'Your Opinion Matters', lessonIds: JSON.stringify(['P1.1.1', 'P1.1.2', 'N1.2.1']),
    status: 'pending',
  },
];

// ==========================================
// HELPER: Build submission history for adaptation tests
// ==========================================

export function makeSubmissionHistory(count: number, scoreOverride?: number) {
  return Array.from({ length: count }, (_, i) => ({
    id: `sub-hist-${i}`,
    sessionId: `session-hist-${i}`,
    childId: CHILD_MAYA.id,
    lessonId: `N1.1.${i + 1}`,
    rubricId: 'N1_story_beginning',
    submissionText: `Test submission ${i}`,
    wordCount: 50 + i * 10,
    timeSpentSec: 300,
    revisionOf: null,
    revisionNumber: 0,
    createdAt: new Date(2026, 1, i + 1),
    feedback: {
      id: `fb-hist-${i}`,
      submissionId: `sub-hist-${i}`,
      scores: JSON.stringify({ hook: scoreOverride ?? 3, creativity: scoreOverride ?? 3 }),
      overallScore: scoreOverride ?? 3.0,
      strength: 'Test strength',
      growthArea: 'Test growth',
      encouragement: 'Test encouragement',
      fullFeedback: null,
      model: 'claude-sonnet-4-5-20250929',
      createdAt: new Date(2026, 1, i + 1),
    },
  }));
}
