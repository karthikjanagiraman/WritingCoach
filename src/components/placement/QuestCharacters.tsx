"use client";

// SVG character definitions for the quest trial characters (Ignis, Bloom, Rumble)
// Rendered once at page top via <QuestCharacterDefs />, referenced via <QuestCharacter id="ignis" />

interface SceneOrb {
  w: number;
  h: number;
  bg: string;
  top?: string;
  bottom?: string;
  left: string;
  delay: string;
}

export interface TrialConfig {
  charId: string;
  accent: string;
  accentLight: string;
  accentSoft: string;
  glow: string;
  tagColor: string;
  label: string;
  name: string;
  sidebarLabel: string;
  sidebarName: string;
  type: string;
  sceneBg: string;
  promptBg: string;
  ollie: string;
  celebTitle: string;
  celebSub: string;
  sceneOrbs: SceneOrb[];
  medallionBg: string;
  medallionBorder: string;
  medallionShadow: string;
  finalColor: string;
  finalColorLight: string;
}

export const TRIAL_CONFIG: TrialConfig[] = [
  {
    charId: "ignis",
    accent: "#FF6B6B",
    accentLight: "#FF8E8E",
    accentSoft: "#FF6B6B30",
    glow: "#FF6B6B15",
    tagColor: "#FF6B6B",
    label: "Trial 1 of 3",
    name: "The Story Spark",
    sidebarLabel: "Trial 1",
    sidebarName: "Story Spark",
    type: "narrative",
    sceneBg: "linear-gradient(135deg, #FF6B6B18, #FFE66D15, #FF8E5312)",
    promptBg: "#FFF5EE",
    ollie:
      "Every great quest begins with a story. Show me the spark of imagination inside you \u2014 write me a tale, and make it your own!",
    celebTitle: "Story Spark \u2014 Proven!",
    celebSub:
      "I can feel the storytelling magic in you! A new trial awaits...",
    sceneOrbs: [
      { w: 60, h: 60, bg: "#FFE66D30", top: "10%", left: "15%", delay: "0s" },
      {
        w: 40,
        h: 40,
        bg: "#FF6B6B20",
        top: "60%",
        left: "70%",
        delay: "1s",
      },
      {
        w: 50,
        h: 50,
        bg: "#FFB34720",
        bottom: "10%",
        left: "40%",
        delay: "2s",
      },
    ],
    medallionBg: "radial-gradient(circle at 50% 60%, #FFE8D6, #FFF0E0)",
    medallionBorder: "#FF6B6B30",
    medallionShadow: "#FF6B6B12",
    finalColor: "#FF6B6B",
    finalColorLight: "#FF8E8E",
  },
  {
    charId: "bloom",
    accent: "#6C5CE7",
    accentLight: "#A29BFE",
    accentSoft: "#6C5CE730",
    glow: "#6C5CE715",
    tagColor: "#6C5CE7",
    label: "Trial 2 of 3",
    name: "The Sense Weaver",
    sidebarLabel: "Trial 2",
    sidebarName: "Sense Weaver",
    type: "descriptive",
    sceneBg: "linear-gradient(135deg, #6C5CE718, #A5D6A715, #CE93D812)",
    promptBg: "#F3F0FF",
    ollie:
      "A true writer doesn't just tell \u2014 they make readers SEE, HEAR, and FEEL. Show me you can weave the senses into your words!",
    celebTitle: "Sense Weaver \u2014 Proven!",
    celebSub: "Brilliant! One final trial remains \u2014 the hardest one...",
    sceneOrbs: [
      {
        w: 50,
        h: 50,
        bg: "#A5D6A730",
        top: "15%",
        left: "20%",
        delay: "0s",
      },
      {
        w: 45,
        h: 45,
        bg: "#CE93D820",
        top: "55%",
        left: "65%",
        delay: "1.2s",
      },
      {
        w: 35,
        h: 35,
        bg: "#6C5CE720",
        bottom: "15%",
        left: "45%",
        delay: "0.5s",
      },
    ],
    medallionBg: "radial-gradient(circle at 50% 60%, #E8F5E9, #F1F8E9)",
    medallionBorder: "#6C5CE730",
    medallionShadow: "#6C5CE712",
    finalColor: "#6C5CE7",
    finalColorLight: "#A29BFE",
  },
  {
    charId: "rumble",
    accent: "#E17055",
    accentLight: "#FAB1A0",
    accentSoft: "#E1705530",
    glow: "#E1705515",
    tagColor: "#E17055",
    label: "Final Trial",
    name: "The Voice of Thunder",
    sidebarLabel: "Final Trial",
    sidebarName: "Thunder Voice",
    type: "persuasive",
    sceneBg: "linear-gradient(135deg, #546E7A18, #FFD54F12, #E1705515)",
    promptBg: "#FFF3EE",
    ollie:
      "The mightiest power a writer has is the power to change minds. Show me your voice of thunder \u2014 convince me!",
    celebTitle: "All Trials Complete!",
    celebSub: "",
    sceneOrbs: [
      {
        w: 55,
        h: 55,
        bg: "#FFD54F25",
        top: "10%",
        left: "10%",
        delay: "0s",
      },
      {
        w: 35,
        h: 35,
        bg: "#E1705520",
        top: "65%",
        left: "75%",
        delay: "0.8s",
      },
      {
        w: 45,
        h: 45,
        bg: "#90CAF915",
        bottom: "10%",
        left: "35%",
        delay: "1.5s",
      },
    ],
    medallionBg: "radial-gradient(circle at 50% 60%, #ECEFF1, #F5F5F5)",
    medallionBorder: "#E1705530",
    medallionShadow: "#E1705512",
    finalColor: "#E17055",
    finalColorLight: "#FAB1A0",
  },
];

export function QuestCharacterDefs() {
  return (
    <svg
      style={{ position: "absolute", width: 0, height: 0 }}
      aria-hidden="true"
    >
      <defs>
        {/* Trail gradient for connecting line */}
        <linearGradient id="trailGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#4ECDC4" />
          <stop offset="100%" stopColor="#26D0CE" />
        </linearGradient>

        {/* Ignis: Flame Sprite with Quill */}
        <symbol id="char-ignis" viewBox="0 0 100 100">
          {/* Open storybook base */}
          <path
            d="M20 72 Q50 65 80 72 L82 78 Q50 72 18 78Z"
            fill="#C49A2A"
            opacity="0.8"
          />
          <path
            d="M22 68 Q50 62 78 68 L80 74 Q50 68 20 74Z"
            fill="#D4AA3A"
          />
          <line
            x1="50"
            y1="63"
            x2="50"
            y2="74"
            stroke="#B8941A"
            strokeWidth="0.8"
            opacity="0.4"
          />
          <path
            d="M24 70 Q36 66 48 69"
            stroke="#E8D5A0"
            strokeWidth="0.5"
            fill="none"
            opacity="0.6"
          />
          <path
            d="M52 69 Q64 66 76 70"
            stroke="#E8D5A0"
            strokeWidth="0.5"
            fill="none"
            opacity="0.6"
          />
          {/* Flame body */}
          <path
            d="M50 14 C65 28, 70 40, 65 52 C62 58, 56 62, 50 62 C44 62, 38 58, 35 52 C30 40, 35 28, 50 14Z"
            fill="url(#flameGrad)"
          />
          <path
            d="M50 24 C59 34, 62 42, 59 50 C57 54, 54 56, 50 56 C46 56, 43 54, 41 50 C38 42, 41 34, 50 24Z"
            fill="#FFD93D"
            opacity="0.9"
          />
          <path
            d="M50 32 C55 38, 56 43, 54 48 C53 50, 51 51, 50 51 C49 51, 47 50, 46 48 C44 43, 45 38, 50 32Z"
            fill="#FFF4CC"
          />
          <ellipse cx="50" cy="44" rx="4" ry="5" fill="white" opacity="0.4" />
          {/* Eyes */}
          <ellipse cx="44" cy="42" rx="3.5" ry="4" fill="#2D3436" />
          <ellipse cx="56" cy="42" rx="3.5" ry="4" fill="#2D3436" />
          <ellipse cx="45" cy="40.5" rx="1.5" ry="1.8" fill="white" />
          <ellipse cx="57" cy="40.5" rx="1.5" ry="1.8" fill="white" />
          <ellipse
            cx="43"
            cy="43"
            rx="0.8"
            ry="0.8"
            fill="white"
            opacity="0.6"
          />
          <ellipse
            cx="55"
            cy="43"
            rx="0.8"
            ry="0.8"
            fill="white"
            opacity="0.6"
          />
          {/* Cheeks */}
          <ellipse
            cx="39"
            cy="47"
            rx="3.5"
            ry="2"
            fill="#FF6B6B"
            opacity="0.2"
          />
          <ellipse
            cx="61"
            cy="47"
            rx="3.5"
            ry="2"
            fill="#FF6B6B"
            opacity="0.2"
          />
          {/* Smile */}
          <path
            d="M44 49 Q50 54, 56 49"
            stroke="#C44D34"
            strokeWidth="1.5"
            fill="none"
            strokeLinecap="round"
          />
          {/* Arms + quill */}
          <path
            d="M35 54 Q30 50 27 52"
            stroke="#FFB347"
            strokeWidth="2"
            fill="none"
            strokeLinecap="round"
          />
          <path
            d="M65 54 Q70 50 73 47"
            stroke="#FFB347"
            strokeWidth="2"
            fill="none"
            strokeLinecap="round"
          />
          <line
            x1="73"
            y1="47"
            x2="80"
            y2="35"
            stroke="#8B6914"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          <path d="M80 35 L84 30 L78 33Z" fill="#FF6B6B" opacity="0.7" />
          {/* Sparkles */}
          <path
            d="M18 22 L20 16 L22 22 L28 24 L22 26 L20 32 L18 26 L12 24Z"
            fill="#FFE66D"
            opacity="0.8"
          >
            <animate
              attributeName="opacity"
              values="0.8;0.3;0.8"
              dur="2s"
              repeatCount="indefinite"
            />
          </path>
          <path
            d="M78 18 L79.5 14 L81 18 L85 19.5 L81 21 L79.5 25 L78 21 L74 19.5Z"
            fill="#FF8E8E"
            opacity="0.7"
          >
            <animate
              attributeName="opacity"
              values="0.7;0.2;0.7"
              dur="2.5s"
              repeatCount="indefinite"
            />
          </path>
          <circle cx="14" cy="44" r="2" fill="#FFE66D" opacity="0.5">
            <animate
              attributeName="r"
              values="2;3;2"
              dur="3s"
              repeatCount="indefinite"
            />
          </circle>
          <circle cx="86" cy="50" r="1.5" fill="#FF8E8E" opacity="0.5">
            <animate
              attributeName="r"
              values="1.5;2.5;1.5"
              dur="2.8s"
              repeatCount="indefinite"
            />
          </circle>
          <rect
            x="82"
            y="58"
            width="8"
            height="6"
            rx="1"
            fill="#F5E6C8"
            opacity="0.5"
            transform="rotate(15 86 61)"
          />
          <rect
            x="10"
            y="56"
            width="7"
            height="5"
            rx="1"
            fill="#F5E6C8"
            opacity="0.4"
            transform="rotate(-20 13 58)"
          />
        </symbol>

        {/* Bloom: Nature Spirit on Mushroom */}
        <symbol id="char-bloom" viewBox="0 0 100 100">
          <ellipse
            cx="50"
            cy="78"
            rx="18"
            ry="5"
            fill="#8D6E63"
            opacity="0.3"
          />
          <rect x="44" y="68" width="12" height="14" rx="3" fill="#BCAAA4" />
          <ellipse
            cx="50"
            cy="68"
            rx="20"
            ry="10"
            fill="#E57373"
            opacity="0.5"
          />
          <ellipse
            cx="50"
            cy="68"
            rx="20"
            ry="10"
            fill="url(#mushroomGrad)"
          />
          <circle cx="43" cy="66" r="2.5" fill="white" opacity="0.6" />
          <circle cx="56" cy="64" r="2" fill="white" opacity="0.5" />
          <circle cx="50" cy="68" r="1.5" fill="white" opacity="0.4" />
          {/* Leaf body */}
          <ellipse cx="50" cy="48" rx="16" ry="20" fill="url(#bloomGrad)" />
          <path
            d="M50 32 C50 32, 50 64, 50 64"
            stroke="#43A047"
            strokeWidth="0.6"
            opacity="0.2"
          />
          <path
            d="M50 38 L41 34"
            stroke="#43A047"
            strokeWidth="0.4"
            opacity="0.15"
          />
          <path
            d="M50 38 L59 34"
            stroke="#43A047"
            strokeWidth="0.4"
            opacity="0.15"
          />
          <path
            d="M50 48 L39 44"
            stroke="#43A047"
            strokeWidth="0.4"
            opacity="0.15"
          />
          <path
            d="M50 48 L61 44"
            stroke="#43A047"
            strokeWidth="0.4"
            opacity="0.15"
          />
          <ellipse
            cx="50"
            cy="46"
            rx="11"
            ry="12"
            fill="#C8E6C9"
            opacity="0.5"
          />
          {/* Eyes */}
          <ellipse cx="44" cy="44" rx="3.2" ry="3.8" fill="#2D3436" />
          <ellipse cx="56" cy="44" rx="3.2" ry="3.8" fill="#2D3436" />
          <ellipse cx="44.8" cy="42.5" rx="1.3" ry="1.6" fill="white" />
          <ellipse cx="56.8" cy="42.5" rx="1.3" ry="1.6" fill="white" />
          <ellipse
            cx="43.2"
            cy="45"
            rx="0.7"
            ry="0.7"
            fill="white"
            opacity="0.5"
          />
          <ellipse
            cx="55.2"
            cy="45"
            rx="0.7"
            ry="0.7"
            fill="white"
            opacity="0.5"
          />
          {/* Cheeks */}
          <ellipse
            cx="39"
            cy="49"
            rx="3.5"
            ry="2.2"
            fill="#FF8A80"
            opacity="0.35"
          />
          <ellipse
            cx="61"
            cy="49"
            rx="3.5"
            ry="2.2"
            fill="#FF8A80"
            opacity="0.35"
          />
          {/* Smile */}
          <path
            d="M46 51 Q50 55, 54 51"
            stroke="#2D3436"
            strokeWidth="1.3"
            fill="none"
            strokeLinecap="round"
          />
          {/* Petal wings */}
          <ellipse
            cx="26"
            cy="42"
            rx="12"
            ry="7"
            fill="#A5D6A7"
            opacity="0.55"
            transform="rotate(-15 26 42)"
          />
          <ellipse
            cx="25"
            cy="43"
            rx="8"
            ry="5"
            fill="#81C784"
            opacity="0.4"
            transform="rotate(-15 25 43)"
          />
          <ellipse
            cx="74"
            cy="42"
            rx="12"
            ry="7"
            fill="#A5D6A7"
            opacity="0.55"
            transform="rotate(15 74 42)"
          />
          <ellipse
            cx="75"
            cy="43"
            rx="8"
            ry="5"
            fill="#81C784"
            opacity="0.4"
            transform="rotate(15 75 43)"
          />
          {/* Flower crown */}
          <circle cx="42" cy="30" r="4" fill="#CE93D8" opacity="0.7" />
          <circle cx="42" cy="30" r="2" fill="#FFE66D" />
          <circle cx="50" cy="27" r="5" fill="#E040FB" opacity="0.6" />
          <circle cx="50" cy="27" r="2.5" fill="#FFE66D" />
          <circle cx="58" cy="30" r="4" fill="#F48FB1" opacity="0.6" />
          <circle cx="58" cy="30" r="2" fill="#FFE66D" />
          <ellipse
            cx="36"
            cy="32"
            rx="3"
            ry="1.5"
            fill="#66BB6A"
            opacity="0.5"
            transform="rotate(-30 36 32)"
          />
          <ellipse
            cx="64"
            cy="32"
            rx="3"
            ry="1.5"
            fill="#66BB6A"
            opacity="0.5"
            transform="rotate(30 64 32)"
          />
          {/* Floating pollen */}
          <circle cx="16" cy="28" r="2" fill="#A5D6A7" opacity="0.5">
            <animate
              attributeName="cy"
              values="28;22;28"
              dur="3s"
              repeatCount="indefinite"
            />
          </circle>
          <circle cx="84" cy="24" r="1.8" fill="#CE93D8" opacity="0.5">
            <animate
              attributeName="cy"
              values="24;18;24"
              dur="3.5s"
              repeatCount="indefinite"
            />
          </circle>
          <circle cx="12" cy="56" r="1.5" fill="#81C784" opacity="0.4">
            <animate
              attributeName="cy"
              values="56;50;56"
              dur="2.8s"
              repeatCount="indefinite"
            />
          </circle>
          <circle cx="88" cy="54" r="2" fill="#A5D6A7" opacity="0.4">
            <animate
              attributeName="cy"
              values="54;48;54"
              dur="3.2s"
              repeatCount="indefinite"
            />
          </circle>
          {/* Butterfly */}
          <g transform="translate(82,36)" opacity="0.6">
            <ellipse
              cx="-3"
              cy="0"
              rx="3"
              ry="2"
              fill="#CE93D8"
              transform="rotate(-20)"
            />
            <ellipse
              cx="3"
              cy="0"
              rx="3"
              ry="2"
              fill="#CE93D8"
              transform="rotate(20)"
            />
            <line
              x1="0"
              y1="-2"
              x2="0"
              y2="2"
              stroke="#9C27B0"
              strokeWidth="0.5"
            />
            <animate
              attributeName="opacity"
              values="0.6;0.3;0.6"
              dur="2s"
              repeatCount="indefinite"
            />
          </g>
          <path
            d="M20 16 L21.5 12 L23 16 L27 17.5 L23 19 L21.5 23 L20 19 L16 17.5Z"
            fill="#81C784"
            opacity="0.5"
          >
            <animate
              attributeName="opacity"
              values="0.5;0.2;0.5"
              dur="2.5s"
              repeatCount="indefinite"
            />
          </path>
        </symbol>

        {/* Rumble: Thunder Cloud with Cape */}
        <symbol id="char-rumble" viewBox="0 0 100 100">
          <ellipse
            cx="50"
            cy="82"
            rx="24"
            ry="4"
            fill="#546E7A"
            opacity="0.15"
          />
          {/* Cape */}
          <path
            d="M28 50 C22 55, 20 65, 24 78 Q30 82, 36 76 C32 65, 30 58, 32 52Z"
            fill="#E17055"
            opacity="0.6"
          />
          <path
            d="M72 50 C78 55, 80 65, 76 78 Q70 82, 64 76 C68 65, 70 58, 68 52Z"
            fill="#E17055"
            opacity="0.6"
          />
          <path
            d="M28 50 C22 55, 20 65, 24 78 Q30 82, 36 76"
            stroke="#C0392B"
            strokeWidth="0.5"
            fill="none"
            opacity="0.3"
          />
          <path
            d="M72 50 C78 55, 80 65, 76 78 Q70 82, 64 76"
            stroke="#C0392B"
            strokeWidth="0.5"
            fill="none"
            opacity="0.3"
          />
          {/* Cloud body */}
          <ellipse cx="50" cy="42" rx="26" ry="20" fill="#B0BEC5" />
          <ellipse cx="34" cy="44" rx="16" ry="14" fill="#B0BEC5" />
          <ellipse cx="66" cy="44" rx="16" ry="14" fill="#B0BEC5" />
          <ellipse cx="50" cy="38" rx="22" ry="18" fill="#CFD8DC" />
          <ellipse cx="40" cy="34" rx="14" ry="12" fill="#E0E5E8" />
          <ellipse cx="58" cy="36" rx="13" ry="11" fill="#E0E5E8" />
          <ellipse
            cx="46"
            cy="30"
            rx="10"
            ry="6"
            fill="#ECEFF1"
            opacity="0.7"
          />
          {/* Eyes */}
          <ellipse cx="42" cy="42" rx="3.5" ry="4" fill="#2D3436" />
          <ellipse cx="58" cy="42" rx="3.5" ry="4" fill="#2D3436" />
          <ellipse cx="42.8" cy="40.5" rx="1.5" ry="1.8" fill="white" />
          <ellipse cx="58.8" cy="40.5" rx="1.5" ry="1.8" fill="white" />
          <ellipse
            cx="41.2"
            cy="43"
            rx="0.7"
            ry="0.7"
            fill="white"
            opacity="0.5"
          />
          <ellipse
            cx="57.2"
            cy="43"
            rx="0.7"
            ry="0.7"
            fill="white"
            opacity="0.5"
          />
          {/* Eyebrows */}
          <path
            d="M37 34 L44 36.5"
            stroke="#455A64"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
          <path
            d="M63 34 L56 36.5"
            stroke="#455A64"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
          {/* Grin */}
          <path
            d="M44 49 Q50 54, 56 49"
            stroke="#2D3436"
            strokeWidth="1.5"
            fill="none"
            strokeLinecap="round"
          />
          {/* Lightning staff */}
          <path
            d="M68 48 Q72 44 74 38"
            stroke="#FFD54F"
            strokeWidth="3"
            fill="none"
            strokeLinecap="round"
          />
          <polygon
            points="74,38 78,28 72,36 76,36 68,48 73,40 70,40"
            fill="#FFD54F"
          />
          <polygon
            points="74,38 78,28 72,36 76,36 68,48 73,40 70,40"
            fill="url(#boltGrad)"
            opacity="0.5"
          />
          {/* Main bolt */}
          <polygon
            points="44,58 48,58 46,66 52,66 40,82 44,70 38,70"
            fill="#FFD54F"
          />
          <polygon
            points="44,58 48,58 46,66 52,66 40,82 44,70 38,70"
            fill="url(#boltGrad)"
            opacity="0.4"
          />
          <polygon
            points="56,60 59,60 57.5,66 62,66 54,76 56.5,68 53,68"
            fill="#FFD54F"
            opacity="0.7"
          />
          {/* Sparks */}
          <circle cx="20" cy="30" r="2.5" fill="#FFD54F" opacity="0.6">
            <animate
              attributeName="opacity"
              values="0.6;0.2;0.6"
              dur="1.5s"
              repeatCount="indefinite"
            />
          </circle>
          <circle cx="80" cy="28" r="2" fill="#FFD54F" opacity="0.5">
            <animate
              attributeName="opacity"
              values="0.5;0.1;0.5"
              dur="1.8s"
              repeatCount="indefinite"
            />
          </circle>
          <path
            d="M16 48 L18 44 L20 48 L24 50 L20 52 L18 56 L16 52 L12 50Z"
            fill="#FFD54F"
            opacity="0.5"
          >
            <animate
              attributeName="opacity"
              values="0.5;0.15;0.5"
              dur="2s"
              repeatCount="indefinite"
            />
          </path>
          <path
            d="M82 52 L83.5 49 L85 52 L88 53.5 L85 55 L83.5 58 L82 55 L79 53.5Z"
            fill="#FFD54F"
            opacity="0.4"
          >
            <animate
              attributeName="opacity"
              values="0.4;0.1;0.4"
              dur="2.2s"
              repeatCount="indefinite"
            />
          </path>
          <line
            x1="28"
            y1="60"
            x2="26"
            y2="66"
            stroke="#90CAF9"
            strokeWidth="1"
            opacity="0.3"
            strokeLinecap="round"
          />
          <line
            x1="62"
            y1="62"
            x2="60"
            y2="68"
            stroke="#90CAF9"
            strokeWidth="1"
            opacity="0.25"
            strokeLinecap="round"
          />
        </symbol>

        {/* Ollie the Owl (mentor) */}
        <symbol id="char-ollie" viewBox="0 0 64 64">
          <ellipse cx="32" cy="42" rx="18" ry="20" fill="#8B6914" />
          <ellipse cx="32" cy="40" rx="15" ry="17" fill="#A67C28" />
          <ellipse
            cx="32"
            cy="46"
            rx="10"
            ry="12"
            fill="#D4AA3A"
            opacity="0.5"
          />
          {/* Wings */}
          <ellipse
            cx="14"
            cy="40"
            rx="8"
            ry="12"
            fill="#8B6914"
            transform="rotate(-10 14 40)"
          />
          <ellipse
            cx="50"
            cy="40"
            rx="8"
            ry="12"
            fill="#8B6914"
            transform="rotate(10 50 40)"
          />
          {/* Eyes */}
          <circle cx="24" cy="30" r="9" fill="white" />
          <circle cx="40" cy="30" r="9" fill="white" />
          <circle cx="24" cy="30" r="5.5" fill="#3D2E1E" />
          <circle cx="40" cy="30" r="5.5" fill="#3D2E1E" />
          <circle cx="25.5" cy="28" r="2" fill="white" />
          <circle cx="41.5" cy="28" r="2" fill="white" />
          <circle
            cx="24"
            cy="30"
            r="10"
            fill="none"
            stroke="#5D4037"
            strokeWidth="1.5"
          />
          <circle
            cx="40"
            cy="30"
            r="10"
            fill="none"
            stroke="#5D4037"
            strokeWidth="1.5"
          />
          {/* Bridge between eyes */}
          <line
            x1="34"
            y1="30"
            x2="30"
            y2="30"
            stroke="#5D4037"
            strokeWidth="1.5"
          />
          {/* Eyebrow tufts */}
          <line
            x1="14"
            y1="28"
            x2="10"
            y2="26"
            stroke="#5D4037"
            strokeWidth="1.5"
          />
          <line
            x1="50"
            y1="28"
            x2="54"
            y2="26"
            stroke="#5D4037"
            strokeWidth="1.5"
          />
          {/* Beak */}
          <path d="M29 36 L32 40 L35 36Z" fill="#FF8E53" />
          {/* Ear tufts */}
          <path d="M18 18 Q20 12, 24 20" fill="#8B6914" />
          <path d="M46 18 Q44 12, 40 20" fill="#8B6914" />
          {/* Feet */}
          <path
            d="M24 60 L20 63 M24 60 L24 63 M24 60 L28 63"
            stroke="#D4AA3A"
            strokeWidth="1.5"
            fill="none"
            strokeLinecap="round"
          />
          <path
            d="M40 60 L36 63 M40 60 L40 63 M40 60 L44 63"
            stroke="#D4AA3A"
            strokeWidth="1.5"
            fill="none"
            strokeLinecap="round"
          />
        </symbol>

        {/* Gradients */}
        <linearGradient id="flameGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FF6B6B" />
          <stop offset="40%" stopColor="#FF8E53" />
          <stop offset="100%" stopColor="#FFB347" />
        </linearGradient>
        <linearGradient id="bloomGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#66BB6A" />
          <stop offset="100%" stopColor="#81C784" />
        </linearGradient>
        <linearGradient id="rumbleGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#90A4AE" />
          <stop offset="100%" stopColor="#B0BEC5" />
        </linearGradient>
        <linearGradient id="boltGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FFF9C4" />
          <stop offset="100%" stopColor="#FFD54F" />
        </linearGradient>
        <linearGradient id="mushroomGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#EF5350" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#E57373" stopOpacity="0.3" />
        </linearGradient>
      </defs>
    </svg>
  );
}

export function QuestCharacter({
  id,
  width = 52,
  height = 52,
}: {
  id: string;
  width?: number;
  height?: number;
}) {
  return (
    <svg
      width={width}
      height={height}
      style={{ filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.1))" }}
    >
      <use href={`#char-${id}`} />
    </svg>
  );
}
