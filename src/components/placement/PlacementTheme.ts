export type AgeMode = "young" | "middle" | "teen";

export interface PlacementTheme {
  ageMode: AgeMode;
  wordMinimum: number;
  timeEstimate: string;
  fontFamily: string;
  pageBg: string;
  cardRadius: string;
  cardShadow: string;
  cardBg: string;
  buttonRadius: string;
  submitLabels: [string, string, string];

  // Feature flags
  showCharacters: boolean;
  showAmbientParticles: boolean;
  showQuestTrailSidebar: boolean;
  showOllieSpeechBubble: boolean;
  showScenicHeader: boolean;
  showIntroNarration: boolean;
  showTrialCelebration: boolean;
  showQuestFinale: boolean;
  showInkMeter: boolean;
  showProgressIndicator: boolean;
  showWordCountText: boolean;
}

const YOUNG_THEME: PlacementTheme = {
  ageMode: "young",
  wordMinimum: 20,
  timeEstimate: "10-15 minutes",
  fontFamily: "'Nunito', -apple-system, BlinkMacSystemFont, sans-serif",
  pageBg: "#FFF9F0",
  cardRadius: "28px",
  cardShadow: "0 8px 40px rgba(0,0,0,0.05), 0 1px 4px rgba(0,0,0,0.02)",
  cardBg: "#FFFFFF",
  buttonRadius: "50px",
  submitLabels: ["Prove It!", "Prove It!", "Complete the Trial!"],
  showCharacters: true,
  showAmbientParticles: true,
  showQuestTrailSidebar: true,
  showOllieSpeechBubble: true,
  showScenicHeader: true,
  showIntroNarration: true,
  showTrialCelebration: true,
  showQuestFinale: true,
  showInkMeter: true,
  showProgressIndicator: false,
  showWordCountText: false,
};

const MIDDLE_THEME: PlacementTheme = {
  ageMode: "middle",
  wordMinimum: 40,
  timeEstimate: "15-20 minutes",
  fontFamily: "'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif",
  pageBg: "#F8F9FD",
  cardRadius: "20px",
  cardShadow: "0 4px 24px rgba(0,0,0,0.04), 0 1px 3px rgba(0,0,0,0.02)",
  cardBg: "#FFFFFF",
  buttonRadius: "14px",
  submitLabels: ["Submit", "Submit", "Finish Assessment"],
  showCharacters: true,
  showAmbientParticles: false,
  showQuestTrailSidebar: true,
  showOllieSpeechBubble: true,
  showScenicHeader: true,
  showIntroNarration: true,
  showTrialCelebration: false,
  showQuestFinale: false,
  showInkMeter: true,
  showProgressIndicator: false,
  showWordCountText: false,
};

const TEEN_THEME: PlacementTheme = {
  ageMode: "teen",
  wordMinimum: 60,
  timeEstimate: "15-20 minutes",
  fontFamily: "'Sora', -apple-system, BlinkMacSystemFont, sans-serif",
  pageBg: "#FFFFFF",
  cardRadius: "12px",
  cardShadow: "0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)",
  cardBg: "#FFFFFF",
  buttonRadius: "8px",
  submitLabels: ["Continue", "Continue", "Submit Assessment"],
  showCharacters: false,
  showAmbientParticles: false,
  showQuestTrailSidebar: false,
  showOllieSpeechBubble: false,
  showScenicHeader: false,
  showIntroNarration: false,
  showTrialCelebration: false,
  showQuestFinale: false,
  showInkMeter: false,
  showProgressIndicator: true,
  showWordCountText: true,
};

export function getPlacementTheme(age: number): PlacementTheme {
  if (age <= 9) return YOUNG_THEME;
  if (age <= 12) return MIDDLE_THEME;
  return TEEN_THEME;
}
