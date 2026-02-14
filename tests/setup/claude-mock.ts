/**
 * Claude API mock for tests.
 *
 * Usage:
 *   vi.mock('@/lib/llm/client', () => claudeMock);
 *
 * Override per-test:
 *   claudeMock.sendMessage.mockResolvedValue({ content: 'custom response' });
 */
import { vi } from 'vitest';

export const claudeMock = {
  sendMessage: vi.fn().mockResolvedValue(
    'This is a mock AI response for testing.'
  ),

  getCoachResponse: vi.fn().mockResolvedValue({
    message: 'Great job! Let\'s keep going with the next exercise.',
    phaseUpdate: undefined,
    assessmentReady: false,
    comprehensionPassed: false,
    hintGiven: false,
    stepUpdate: undefined,
  }),

  getInitialPrompt: vi.fn().mockResolvedValue(
    'Welcome! Today we are going to learn about story hooks.'
  ),

  evaluateWriting: vi.fn().mockResolvedValue({
    scores: { hook: 4, character: 3, setting: 4, creativity: 5 },
    overallScore: 4.0,
    feedback: {
      strength: 'Your opening creates instant curiosity!',
      growth: 'Add one more sensory detail.',
      encouragement: 'You have a real gift for mystery. Keep writing!',
    },
  }),

  evaluateWritingGeneral: vi.fn().mockResolvedValue({
    scores: { hook: 4, character: 3, setting: 4, creativity: 5 },
    overallScore: 4.0,
    feedback: {
      strength: 'Your opening creates instant curiosity!',
      growth: 'Add one more sensory detail.',
      encouragement: 'You have a real gift for mystery. Keep writing!',
    },
  }),

  stripPhaseMarkers: vi.fn((text: string) => text),
  generateCoachResponse: vi.fn(),
};

// Preset responses for common scenarios
export const COACH_RESPONSES = {
  instruction: {
    message: 'Today we\'re learning about story hooks! A hook is the very first sentence that grabs your reader\'s attention.',
    phaseUpdate: undefined,
    assessmentReady: false,
    comprehensionPassed: true,
    hintGiven: false,
    stepUpdate: undefined,
  },
  guidedWithHint: {
    message: 'Good try! Think about what would make a reader curious. What if something unexpected happened?',
    phaseUpdate: undefined,
    assessmentReady: false,
    comprehensionPassed: false,
    hintGiven: true,
    stepUpdate: undefined,
  },
  guidedToAssessment: {
    message: 'Excellent work on the practice! You\'re ready to write on your own now.',
    phaseUpdate: 'assessment' as const,
    assessmentReady: true,
    comprehensionPassed: false,
    hintGiven: false,
    stepUpdate: undefined,
  },
  instructionToGuided: {
    message: 'You got it! Ready to try it together?',
    phaseUpdate: 'guided' as const,
    assessmentReady: false,
    comprehensionPassed: false,
    hintGiven: false,
    stepUpdate: undefined,
  },
};

export const EVALUATION_RESPONSES = {
  goodSubmission: {
    scores: { hook: 4, character: 3, setting: 4, creativity: 5 },
    overallScore: 4.0,
    feedback: {
      strength: 'Your opening line creates instant curiosity — "The door wasn\'t there yesterday" makes the reader want to know more!',
      growth: 'Try adding one more sensory detail to help readers see the world you\'re creating.',
      encouragement: 'You have a real gift for creating mystery. Keep writing!',
    },
  },
  weakSubmission: {
    scores: { hook: 2, character: 2, setting: 1, creativity: 2 },
    overallScore: 1.75,
    feedback: {
      strength: 'You wrote a complete story with a beginning and end.',
      growth: 'Try starting with action or a question instead of "Once upon a time".',
      encouragement: 'Every great writer started somewhere. Your ideas are getting stronger!',
    },
  },
  excellentSubmission: {
    scores: { hook: 5, character: 5, setting: 5, creativity: 5 },
    overallScore: 5.0,
    feedback: {
      strength: 'This is outstanding work! Your descriptive language paints a vivid picture.',
      growth: 'Challenge yourself next time with a longer piece — you have the skills!',
      encouragement: 'You\'re writing at an advanced level. Truly impressive!',
    },
  },
};

export const PLACEMENT_RESPONSES = {
  analysis: {
    vocabularySophistication: 3,
    sentenceComplexity: 2,
    ideaOrganization: 3,
    creativityAndVoice: 4,
    grammarAndMechanics: 2,
    recommendedTier: 1,
    strengths: ['creative ideas', 'strong voice'],
    growthAreas: ['sentence variety', 'paragraph organization'],
    confidence: 0.85,
  },
};

export const CURRICULUM_RESPONSES = {
  generated: {
    weeks: [
      { weekNumber: 1, theme: 'Story Beginnings', lessonIds: ['N1.1.1', 'N1.1.2', 'D1.1.1'] },
      { weekNumber: 2, theme: 'Building Characters', lessonIds: ['N1.1.3', 'N1.1.4', 'D1.1.2'] },
      { weekNumber: 3, theme: 'Your Opinion Matters', lessonIds: ['P1.1.1', 'P1.1.2', 'N1.2.1'] },
      { weekNumber: 4, theme: 'Describing the World', lessonIds: ['D1.1.3', 'D1.1.4', 'E1.1.1'] },
      { weekNumber: 5, theme: 'Facts and Details', lessonIds: ['E1.1.2', 'E1.1.3', 'P1.1.3'] },
      { weekNumber: 6, theme: 'Story Middles', lessonIds: ['N1.2.2', 'N1.2.3', 'D1.2.1'] },
      { weekNumber: 7, theme: 'Convincing Others', lessonIds: ['P1.2.1', 'P1.2.2', 'E1.2.1'] },
      { weekNumber: 8, theme: 'Grand Finale', lessonIds: ['N1.3.1', 'D1.2.2', 'P1.2.3'] },
    ],
  },
};

export function resetClaudeMock() {
  claudeMock.sendMessage.mockReset();
  claudeMock.getCoachResponse.mockReset();
  claudeMock.getInitialPrompt.mockReset();
  claudeMock.evaluateWriting.mockReset();
  claudeMock.evaluateWritingGeneral.mockReset();
  claudeMock.stripPhaseMarkers.mockReset();
  claudeMock.generateCoachResponse.mockReset();

  claudeMock.getCoachResponse.mockResolvedValue({
    message: 'Mock coach response.',
    phaseUpdate: undefined,
    assessmentReady: false,
    comprehensionPassed: false,
    hintGiven: false,
    stepUpdate: undefined,
  });

  claudeMock.getInitialPrompt.mockResolvedValue(
    'Welcome! Today we are going to learn about story hooks.'
  );

  claudeMock.evaluateWriting.mockResolvedValue(EVALUATION_RESPONSES.goodSubmission);
  claudeMock.evaluateWritingGeneral.mockResolvedValue(EVALUATION_RESPONSES.goodSubmission);
  claudeMock.stripPhaseMarkers.mockImplementation((text: string) => text);
}
