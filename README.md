# WriteWhiz

**AI-powered creative writing coach for children ages 7-15.**

WriteWhiz teaches writing through an evidence-based three-phase pedagogical model — Instruction, Guided Practice, and Assessment — with real-time AI coaching powered by Claude. The platform delivers personalized curricula, adaptive difficulty, skill tracking, and detailed parent progress reports.

## Table of Contents

- [Architecture Overview](#architecture-overview)
- [AI Architecture](#ai-architecture)
  - [Prompt Pipeline](#prompt-pipeline)
  - [Marker Protocol](#marker-protocol)
  - [Evaluation System](#evaluation-system)
  - [Learner Profile & Personalization](#learner-profile--personalization)
  - [Curriculum Intelligence](#curriculum-intelligence)
- [Three-Phase Lesson Flow](#three-phase-lesson-flow)
- [Design System](#design-system)
- [Database Schema](#database-schema)
- [API Reference](#api-reference)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
- [Project Structure](#project-structure)
- [Testing](#testing)
- [Environment Variables](#environment-variables)

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           CLIENT (Next.js App Router)                   │
│                                                                         │
│  ┌──────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐   │
│  │ Placement │  │  Curriculum   │  │   Lesson     │  │   Parent     │   │
│  │  Wizard   │  │  Setup/View   │  │ Orchestrator │  │  Dashboard   │   │
│  └────┬─────┘  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘   │
│       │               │                 │                   │           │
│       │  ┌─────────────────────────────────────────────┐    │           │
│       │  │          Phase Components                    │    │           │
│       │  │  Instruction → Guided → Assessment → Feedback│    │           │
│       │  │  (AnswerCards, ChatBubble, CoachAvatar)      │    │           │
│       │  └─────────────────────────────────────────────┘    │           │
│       │               │                 │                   │           │
│  ┌────┴───────────────┴─────────────────┴───────────────────┴────┐     │
│  │                    Context Providers                           │     │
│  │         TierProvider  ·  ActiveChildProvider  ·  Session       │     │
│  └───────────────────────────────────────────────────────────────┘     │
└───────────────────────────────┬─────────────────────────────────────────┘
                                │ API Routes (Next.js)
┌───────────────────────────────┴─────────────────────────────────────────┐
│                            SERVER                                       │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                     AI / LLM Layer                               │   │
│  │                                                                   │   │
│  │  ┌──────────────┐    ┌──────────────┐    ┌──────────────────┐   │   │
│  │  │ Prompt Builder│    │   Client     │    │   Evaluator      │   │   │
│  │  │              │    │              │    │                  │   │   │
│  │  │ SKILL.md     │    │ sendMessage  │    │ evaluateWriting  │   │   │
│  │  │ tier_inserts │───▶│ getCoachResp │    │ parseScores      │   │   │
│  │  │ phase_prompts│    │ stripMarkers │    │ computeOverall   │   │   │
│  │  │ session ctx  │    │ parseAnswers │    │ teachingContext   │   │   │
│  │  └──────────────┘    └──────┬───────┘    └────────┬─────────┘   │   │
│  │                             │                     │               │   │
│  │                    ┌────────┴─────────────────────┴──────────┐   │   │
│  │                    │         LLM Provider Abstraction         │   │   │
│  │                    │                                          │   │   │
│  │                    │  llmSend() → Anthropic Claude (default)  │   │   │
│  │                    │             Google Gemini                 │   │   │
│  │                    │             DeepInfra / Groq / Novita     │   │   │
│  │                    │                                          │   │   │
│  │                    │  Prompt caching · Token tracking          │   │   │
│  │                    │  Lazy init · Auto-detect from model name  │   │   │
│  │                    └─────────────────────────────────────────┘   │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                   Application Logic Layer                        │   │
│  │                                                                   │   │
│  │  Learner Profile  ·  Curriculum Generator  ·  Curriculum Adapter │   │
│  │  Skill Tracker    ·  Streak Tracker        ·  Badge Checker      │   │
│  │  Progress Tracker ·  Skill Map             ·  Auth (Auth.js v5)  │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                    Data Layer (Prisma + PostgreSQL)               │   │
│  │                                                                   │   │
│  │  User · ChildProfile · Session · Assessment · PlacementResult    │   │
│  │  Curriculum · CurriculumWeek · WritingSubmission · AIFeedback     │   │
│  │  SkillProgress · Streak · Achievement · LearnerProfileSnapshot   │   │
│  │  LessonCompletion · LessonScore · WritingSample · Subscription   │   │
│  └─────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## AI Architecture

The AI system is built around five interconnected subsystems: the **Prompt Pipeline** for assembling context-rich system prompts, the **Marker Protocol** for structured communication between the AI and backend, the **Evaluation System** for rubric-based assessment, the **Learner Profile** for cross-lesson personalization, and **Curriculum Intelligence** for adaptive lesson planning.

### Prompt Pipeline

All AI interactions flow through a single provider abstraction (`src/lib/llm/provider.ts`). System prompts are composed from versioned markdown files — never inlined in code.

```
Assembly Order (src/lib/llm/prompt-builder.ts):

  ┌─────────────────────────────────────┐
  │  1. SKILL.md                        │  Core coach identity, personality,
  │     (src/lib/llm/content/SKILL.md)  │  three-phase structure, mascots,
  │                                     │  golden rules (never write for
  │                                     │  student, never help in assessment)
  └────────────────┬────────────────────┘
                   │
  ┌────────────────▼────────────────────┐
  │  2. Tier Insert                     │  Age-specific behavior:
  │     (tier_inserts.md)               │  Tier 1 (7-9): simple, enthusiastic
  │                                     │  Tier 2 (10-12): proper terms, "why"
  │                                     │  Tier 3 (13-15): collegial, literary
  │                                     │  + vocabulary translation tables
  │                                     │  + response length limits per tier
  └────────────────┬────────────────────┘
                   │
  ┌────────────────▼────────────────────┐
  │  3. Learner Context (optional)      │  Injected from LearnerProfile:
  │     (formatLearnerContextForPrompt) │  strengths, growth areas, samples,
  │                                     │  preferences, ESL background,
  │                                     │  teaching connection points
  └────────────────┬────────────────────┘
                   │
  ┌────────────────▼────────────────────┐
  │  4. Phase Prompt                    │  Phase-specific rules & markers:
  │     (phase_prompts.md)              │  instruction (3 templates),
  │                                     │  guided (3 escalating stages),
  │                                     │  assessment (zero-assistance),
  │                                     │  feedback (strength-first)
  └────────────────┬────────────────────┘
                   │
  ┌────────────────▼────────────────────┐
  │  5. Session Context                 │  Current state: student name, tier,
  │     (dynamic, built per request)    │  lesson title, objectives, template,
  │                                     │  phase step, guided stage, hints,
  │                                     │  answer type diversity tracking
  └────────────────┬────────────────────┘
                   │
  ┌────────────────▼────────────────────┐
  │  6. Phase Progress Context          │  Actionable instructions:
  │     (dynamic, per phase)            │  "You are on Step 2 of 3.
  │                                     │   When finished, emit [STEP: 3]."
  └────────────────┬────────────────────┘
                   │
  ┌────────────────▼────────────────────┐
  │  7. Rubric Context                  │  Assessment/feedback phases only:
  │     (from rubric JSON files)        │  criterion names, weights, level
  │                                     │  descriptors, feedback stems
  └────────────────┬────────────────────┘
                   │
  ┌────────────────▼────────────────────┐
  │  8. Assessment Boundary Block       │  Appended LAST for maximum recency.
  │     (assessment phase only)         │  Explicitly forbids examples,
  │                                     │  suggestions, sentence starters,
  │                                     │  structure hints, vocab reminders.
  └─────────────────────────────────────┘
```

**Provider Abstraction**: The `llmSend()` function routes to the configured provider. Anthropic Claude is the default, with system prompts marked for **prompt caching** (90% cost savings on cached tokens). Providers are lazy-initialized — unused SDK clients are never loaded.

```
Supported Providers:
  Anthropic   → claude-sonnet-4-5-20250929 (default)
  Google      → gemini-2.5-flash
  DeepInfra   → Qwen/Qwen3-235B-A22B-Instruct
  Groq        → qwen/qwen3-32b
  Novita      → qwen/qwen3-235b-a22b-instruct
```

### Marker Protocol

The AI coach emits structured markers in its responses. The backend parses these for state tracking and strips them before displaying to the student. This creates a clean separation: the AI controls state transitions through its natural language output, while the backend enforces the rules.

```
Phase Transition Markers:
  [PHASE_TRANSITION: guided]         → Move to guided practice
  [PHASE_TRANSITION: assessment]     → Move to assessment

Progress Markers:
  [STEP: N]                          → Instruction step (1=Learn, 2=Practice, 3=Check)
  [GUIDED_STAGE: N]                  → Guided stage (1=Drill, 2=Combine, 3=Mini-Draft)
  [COMPREHENSION_CHECK: passed]      → Student passed comprehension check
  [HINT_GIVEN]                       → Coach provided a hint (max 3)

Interactive Answer Markers:
  [ANSWER_TYPE: choice|multiselect|poll|order|highlight]
  [OPTIONS: "Option A" | "Option B" | "Option C"]
  [ANSWER_PROMPT: "question text"]
  [PASSAGE: "text to highlight"]
  [WRITING_PROMPT: "exercise prompt"]
  [EXPECTS_RESPONSE]                 → Free-text question

Learner Profile Data:
  [SCORES]criterion:score,...[/SCORES]
  [SAMPLE: type | criterion]excerpt[/SAMPLE]
  [PREFERENCE: category | value]
```

**Marker Retry**: If a response is missing expected markers for its phase, the backend re-calls the LLM with a retry prompt requesting only the missing markers, then merges the result. Failures are graceful.

### Evaluation System

Assessment grading uses a dedicated evaluator (`src/lib/llm/evaluator.ts`) separate from the coaching pipeline. The evaluator receives rubric criteria, the student's writing, and optional teaching context extracted from the lesson conversation.

```
Evaluation Pipeline:

  Student's Writing
       │
       ▼
  ┌──────────────────┐     ┌──────────────────────┐
  │ Teaching Context  │◀────│ Conversation History  │
  │ Extraction        │     │ (best-effort analysis │
  │                   │     │  of what was taught)  │
  └────────┬──────────┘     └──────────────────────┘
           │
           ▼
  ┌──────────────────────────────────────────────────┐
  │              Evaluator System Prompt              │
  │                                                    │
  │  - Tier insert (age-appropriate feedback language) │
  │  - Lesson context (title, objectives)              │
  │  - Teaching context (techniques covered, examples) │
  │  - Rubric criteria with level descriptors          │
  │  - Feedback stem examples                          │
  │  - JSON response format                            │
  └────────────────────┬─────────────────────────────┘
                       │
                       ▼
                  Claude API
                       │
                       ▼
  ┌──────────────────────────────────────────────────┐
  │              Response Parsing                     │
  │                                                    │
  │  scores: { criterion → 1-4 (half-steps) }         │
  │  overallScore = Σ(score × weight) [COMPUTED]       │
  │  feedback: { strength, growth, encouragement }     │
  │                                                    │
  │  The overallScore is ALWAYS computed from weighted  │
  │  per-criterion scores, never from the LLM's        │
  │  self-reported value. A warning logs if they        │
  │  diverge by > 0.5 points.                          │
  └──────────────────────────────────────────────────┘
```

**Rubric System**: 30+ hand-authored rubric JSON files in `src/lib/llm/content/rubrics/`. Each rubric defines criteria with names, display names, weights, 4-level descriptors, and feedback stems. The evaluator prompt includes the full rubric, and per-criterion scores are grounded in specific level descriptions.

**Score Scale**: 1.0-4.0 with half-step increments.
- 4.0 = Exceeds Expectations
- 3.0 = Meets Expectations
- 2.0 = Approaching Expectations
- 1.0 = Beginning

### Learner Profile & Personalization

The learner profile system (`src/lib/learner-profile.ts`) creates a cross-lesson view of each student that's injected into the coaching prompt. This allows the AI coach to reference specific strengths, address known gaps, and connect with student preferences — even across different lessons.

```
Data Sources → Analysis → Prompt Injection

  Last 20 Lesson Completions ──┐
  (scores, hints, time)         │
                                │    ┌─────────────────────────────┐
  Last 5 Writing Samples  ─────┼───▶│    buildLearnerProfile()     │
  (excerpts, types)             │    │                             │
                                │    │  Criterion averages         │
  Student Preferences ──────────┤    │  Strengths (avg ≥ 3.0)     │
  (topics, genres, habits)      │    │  Growth areas (avg < 2.5)  │
                                │    │  Score trajectory           │
  Placement Assessment ─────────┤    │  Scaffolding trend          │
  (fallback when 0 lessons)     │    │  Engagement level           │
                                │    │  Writing length trend        │
  Child Profile ────────────────┘    │  ESL context                │
  (ESL status, home language)        └─────────────┬───────────────┘
                                                   │
                                     ┌─────────────▼───────────────┐
                                     │   buildLearnerContext()      │
                                     │   (pure transformation)      │
                                     │                             │
                                     │  Summary sentence           │
                                     │  Readable strengths/gaps    │
                                     │  Connection points (1-3     │
                                     │    actionable strategies)   │
                                     │  Recent writing excerpts    │
                                     │  ESL language guidance       │
                                     └─────────────┬───────────────┘
                                                   │
                                     ┌─────────────▼───────────────┐
                                     │ formatLearnerContextForPrompt│
                                     │                             │
                                     │ Rendered as markdown block   │
                                     │ injected into system prompt  │
                                     │ between tier insert and      │
                                     │ phase prompt.                │
                                     └─────────────────────────────┘
```

**Placement Fallback**: When a student has zero completed lessons (just finished placement), the profile is built from placement assessment data — per-type scores become proxy strengths/gaps so the very first lesson is already personalized.

**ESL Awareness**: When `isEsl` is true, the profile injects language background guidance: prioritize ideas over grammar, recognize L1 transfer patterns, celebrate bilingual strength, and use simpler explanation structures.

**Connection Points**: 1-3 actionable teaching strategies generated from the profile data. Examples:
- "Build on their strength in character development to boost confidence when introducing new concepts."
- "They need extra scaffolding for dialogue. Break tasks into smaller steps."
- "Scores have been dipping — prioritize encouragement and celebrate small wins."

### Curriculum Intelligence

The curriculum system combines AI-generated lesson planning with automatic performance-based adaptation.

**Generation** (`src/lib/curriculum-generator.ts`): Claude generates a week-by-week lesson plan from the 100+ lesson catalog, personalized using:
- Per-type placement scores (front-load weakest types)
- ESL status (narrative first for L2 learners, persuasive later)
- Confidence level (more foundational lessons when low)
- Parent-selected focus areas and duration

**Auto-Adaptation** (`src/lib/curriculum-adapter.ts`): After each assessment, the system checks three triggers:

| Trigger | Condition | Action |
|---------|-----------|--------|
| Struggling | Last 3 scores all < 2.0 | Swap 50% of next 2 weeks to foundational (unit 1) lessons |
| Excelling | Last 5 scores all > 3.5 | Swap 50% of next 2 weeks to advanced (unit 3+) lessons |
| Type Weakness | One type avg < 2.0 across 3+ assessments | Add extra lessons of that type to upcoming weeks |

Only pending weeks are modified. Each adaptation creates a `CurriculumRevision` record for auditing. Parents can also manually revise the curriculum at any time.

---

## Three-Phase Lesson Flow

Every lesson follows the same evidence-based structure. Sessions are database-backed — students can close the browser and resume exactly where they left off.

```
Phase 1: INSTRUCTION                    Phase 2: GUIDED PRACTICE
┌─────────────────────────────┐        ┌─────────────────────────────┐
│                             │        │                             │
│  Template: try_first        │        │  Stage 1: Focused Drill     │
│    Student writes cold →    │        │    Isolate one technique    │
│    coach teaches from it    │        │                             │
│                             │        │  Stage 2: Combination       │
│  Template: study_apply      │        │    Combine 2+ techniques   │
│    Mentor text → framework  │        │                             │
│    → micro-apply            │        │  Stage 3: Mini-Draft        │
│                             │        │    Short connected piece    │
│  Template: workshop         │        │    (prep for assessment)    │
│    Co-construct → extract   │        │                             │
│    techniques → reflect     │        │  Scaffolded hints: max 3   │
│                             │        │  Answer cards: choice,      │
│  3 steps: Learn → Practice  │        │    multiselect, poll,       │
│           → Check           │        │    order, highlight         │
│                             │        │                             │
│  Gate: comprehension check  │        │  Escape hatch: "I'm ready  │
│  must pass before advancing │        │  to write on my own"        │
└─────────────┬───────────────┘        └─────────────┬───────────────┘
              │                                      │
              ▼                                      ▼
Phase 3: ASSESSMENT                    Phase 4: FEEDBACK
┌─────────────────────────────┐        ┌─────────────────────────────┐
│                             │        │                             │
│  Full-width writing editor  │        │  Overall star rating (1-4)  │
│  Real-time word count       │        │  Per-criterion breakdown    │
│  Rubric checklist           │        │                             │
│                             │        │  Strength: "You did well    │
│  ZERO coach assistance      │        │   at..." (quotes student)   │
│  No examples, no hints,     │        │                             │
│  no suggestions, no         │        │  Growth: "Next time, try    │
│  structure guidance          │        │   this..." (one area only) │
│                             │        │                             │
│  Quality validation:        │        │  Encouragement: positive    │
│  - Min word count           │        │   closing message           │
│  - No gibberish             │        │                             │
│  - 2-step submit confirm    │        │  Revision option (max 2)    │
│                             │        │  Badge celebration overlay  │
└─────────────────────────────┘        └─────────────────────────────┘
```

### Post-Assessment Processing

After each assessment submission, the backend fires non-blocking side effects:

```
submitAssessment()
  ├── evaluateWriting()            → Rubric-based grading via Claude
  ├── updateSkillProgress()        → 70/30 rolling average per skill
  ├── updateStreak()               → Consecutive day + weekly tracking
  ├── checkAndUnlockBadges()       → Evaluate 24 badge conditions
  ├── checkCurriculumAdaptation()  → Auto-revise if score patterns detected
  └── buildLearnerProfile()        → Rebuild profile snapshot for next lesson
```

---

## Design System

### Age-Adaptive Tiers

The entire UI and AI behavior adapts based on the student's age tier:

| | Tier 1 (Ages 7-9) | Tier 2 (Ages 10-12) | Tier 3 (Ages 13-15) |
|---|---|---|---|
| **Label** | Explorer | Adventurer | Trailblazer |
| **Mascot** | Ollie the Owl | Felix the Fox | Sage the Wolf |
| **Font** | Nunito | DM Sans | Sora |
| **Primary** | Coral `#FF6B6B` | Purple `#6C5CE7` | Charcoal `#2D3436` |
| **Secondary** | Teal `#4ECDC4` | Mint `#00B894` | Blue `#0984E3` |
| **Accent** | Yellow `#FFE66D` | Gold `#FDCB6E` | Terracotta `#E17055` |
| **Background** | Warm Cream `#FFF9F0` | Cool White `#F8F9FD` | Clean White `#FFFFFF` |
| **AI Tone** | Simple, enthusiastic, emojis | Proper terms, explains "why" | Collegial, literary references |
| **Response Length** | 50-125 words | 100-175 words | 150-250 words |

Tier is derived from student age — never hardcoded. Active tier is applied via `body.tier-{n}` CSS class which maps to `--active-primary`, `--active-secondary`, etc. Components use `bg-active-primary`, `text-active-text` throughout.

Writing areas across all tiers use **Literata** (serif) for a professional writing feel.

---

## Database Schema

20 Prisma models on PostgreSQL. Key relationships:

```
User (Parent)
 └── ChildProfile[] ──────────────────────────────────────────┐
      ├── PlacementResult (1:1)                                │
      ├── Curriculum (1:1)                                     │
      │    └── CurriculumWeek[]                                │
      │    └── CurriculumRevision[]                            │
      ├── LessonProgress[]                                     │
      ├── Session[]                                            │
      │    └── Assessment[]                                    │
      ├── WritingSubmission[]                                  │
      │    └── AIFeedback (1:1)                                │
      ├── SkillProgress[] (20 skills: 4 categories x 5 each)  │
      ├── Streak (1:1)                                         │
      ├── Achievement[] (badges)                               │
      ├── LessonCompletion[]                                   │
      │    └── LessonScore[]                                   │
      ├── WritingSample[]                                      │
      ├── StudentPreference[]                                  │
      └── LearnerProfileSnapshot (1:1)                         │
                                                               │
User                                                           │
 └── Subscription (1:1, Stripe billing)                        │
                                                               │
AccessCode (friends & family codes) ───────────────────────────┘
```

### Key Models

| Model | Purpose |
|-------|---------|
| **Session** | Active lesson session with phase, phaseState (JSON), and full conversation history (JSON) |
| **PlacementResult** | 3 writing prompts, 3 responses, AI analysis with per-type scores, recommended/assigned tier, confidence |
| **SkillProgress** | Rolling average score per skill, level (EMERGING/DEVELOPING/PROFICIENT/ADVANCED), total attempts |
| **LearnerProfileSnapshot** | Cached computed profile (JSON) for efficient access without recomputing |
| **CurriculumRevision** | Audit trail for auto-adaptations and parent-requested curriculum changes |
| **WritingSubmission** | Student writing with word count, time spent, revision chain (revisionOf → parent submission) |
| **AIFeedback** | Structured feedback per submission: per-criterion scores, strength, growth area, encouragement |

---

## API Reference

All routes require authentication unless noted. Parent ownership is enforced on all child-related endpoints.

### Lessons

| Method | Route | Purpose |
|--------|-------|---------|
| `POST` | `/api/lessons/start` | Create or resume a lesson session |
| `POST` | `/api/lessons/message` | Send student message, receive AI coach response with phase/marker updates |
| `POST` | `/api/lessons/submit` | Submit assessment writing for rubric-based grading + side effects |
| `POST` | `/api/lessons/revise` | Submit revised writing (max 2 revisions) with comparison to previous scores |
| `GET` | `/api/lessons/[id]` | Get lesson detail + rubric criteria |

### Children

| Method | Route | Purpose |
|--------|-------|---------|
| `GET/POST` | `/api/children` | List / create child profiles |
| `GET/PATCH/DELETE` | `/api/children/[id]` | CRUD child profile |
| `GET` | `/api/children/[id]/progress` | Dashboard data: lessons, assessments, type stats |
| `GET` | `/api/children/[id]/skills` | Skill progress by category |
| `GET` | `/api/children/[id]/streak` | Streak data (current, longest, weekly) |
| `POST` | `/api/children/[id]/streak/goal` | Update weekly lesson goal (1-7) |
| `GET` | `/api/children/[id]/badges` | Earned badges with unseen count |
| `POST` | `/api/children/[id]/badges/seen` | Mark badges as seen |
| `GET` | `/api/children/[id]/report` | Aggregated progress report |
| `GET` | `/api/children/[id]/report/export` | CSV download |
| `GET` | `/api/children/[id]/portfolio` | Paginated writing submissions |
| `GET` | `/api/children/[id]/portfolio/export` | CSV download of submissions |

### Placement

| Method | Route | Purpose |
|--------|-------|---------|
| `POST` | `/api/placement/start` | Generate 3 age-appropriate writing prompts via AI |
| `POST` | `/api/placement/submit` | Submit 3 responses for AI tier analysis |
| `GET` | `/api/placement/[childId]` | Get placement result |
| `PATCH` | `/api/placement/[childId]` | Parent overrides assigned tier |

### Curriculum

| Method | Route | Purpose |
|--------|-------|---------|
| `POST` | `/api/curriculum/generate` | AI generates personalized week-by-week plan |
| `GET` | `/api/curriculum/[childId]` | Get curriculum with enriched lesson details |
| `PATCH` | `/api/curriculum/[childId]` | Update preferences (lessons/week, focus) |
| `POST` | `/api/curriculum/[childId]/revise` | AI revises remaining weeks |

### Auth (Unprotected)

| Method | Route | Purpose |
|--------|-------|---------|
| `POST` | `/api/auth/signup` | Create user account |
| `GET/POST` | `/api/auth/[...nextauth]` | Auth.js handlers (login, Google OAuth) |

---

## Features

### Student Experience

- **AI Coaching** — Real-time conversation with age-appropriate AI coach (3 mascot personalities)
- **Interactive Exercises** — Choice cards, multiselect, polls, drag-to-order, text highlighting — not just text input
- **Placement Assessment** — 3-prompt writing wizard with AI tier recommendation and parent override
- **Personalized Curriculum** — AI-generated week-by-week plan based on placement scores and parent preferences
- **Skill Tracking** — 20 sub-skills across 4 writing categories with rolling averages
- **Streak System** — Consecutive day tracking + configurable weekly goals
- **24 Badges** — Across 5 categories (Writing, Progress, Streak, Skill, Special) with confetti celebrations
- **Writing Portfolio** — All submissions viewable with filters and CSV export
- **Revision System** — Up to 2 revisions per lesson with score comparison

### Parent Experience

- **Progress Dashboard** — All children with status indicators, streak/badge summaries, attention items
- **Detailed Reports** — Skill radar chart, score trends, activity heatmap, assessment history, CSV export
- **Curriculum Control** — View weekly plan, adjust focus areas, trigger AI-powered revision
- **Child Management** — Create/edit/delete profiles, auto-computed tier from age
- **PIN Protection** — Optional 4-digit PIN gate on parent dashboard

### AI Capabilities

- **Multi-Provider** — Anthropic Claude (default), Google Gemini, DeepInfra, Groq, Novita
- **Prompt Caching** — 90% cost savings on cached system prompts (Anthropic)
- **Teaching Context Extraction** — Evaluator analyzes conversation to understand what techniques were taught
- **ESL Awareness** — Adjusts coaching and evaluation for English language learners
- **Curriculum Adaptation** — Auto-adjusts lesson plans based on performance patterns
- **Quality Gating** — Validates submissions before evaluation (rejects gibberish, too-short writing)
- **Learner Profiles** — Cross-lesson personalization with placement fallback for day-one students

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| **Framework** | Next.js 15 (App Router) |
| **Language** | TypeScript |
| **Styling** | Tailwind CSS v4 + CSS custom properties |
| **Database** | PostgreSQL via Prisma ORM |
| **Auth** | Auth.js v5 (credentials + Google OAuth, JWT sessions) |
| **AI** | Anthropic Claude API (default), with Google Gemini / DeepInfra / Groq / Novita support |
| **Charts** | Recharts (radar, bar, line) |
| **Payments** | Stripe |
| **Email** | Resend |
| **Testing** | Vitest + Playwright |

**Package manager**: npm

---

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL
- Anthropic API key

### Setup

```bash
# Clone and install
git clone <repo-url>
cd writingcoach
npm install

# Configure environment
cp .env.example .env
# Edit .env: set DATABASE_URL, ANTHROPIC_API_KEY, AUTH_SECRET

# Set up database
npx prisma db push
npx prisma db seed

# Start development server
npm run dev
```

Visit `http://localhost:3000`. Login with the seeded parent account:
- Email: `parent@example.com`
- Password: `password123`

Two children are seeded: Maya (age 8, Tier 1, with placement + curriculum) and Ethan (age 11, Tier 2, no placement).

### Database Reset

```bash
npx prisma db push --force-reset && npx prisma db seed
```

---

## Project Structure

```
src/
├── app/
│   ├── auth/                         # Login + signup pages
│   ├── dashboard/
│   │   ├── parent/page.tsx           # Parent dashboard
│   │   └── children/
│   │       ├── new/page.tsx          # Add child form
│   │       └── [id]/report/page.tsx  # Progress report with charts
│   ├── lesson/[id]/page.tsx          # 4-phase lesson orchestrator
│   ├── placement/[childId]/
│   │   ├── page.tsx                  # 3-step writing assessment wizard
│   │   └── results/page.tsx          # AI tier recommendation + parent override
│   ├── curriculum/[childId]/
│   │   ├── setup/page.tsx            # Curriculum preferences
│   │   ├── page.tsx                  # Weekly breakdown view
│   │   └── revise/page.tsx           # Manual curriculum revision
│   ├── badges/[childId]/page.tsx     # Badge collection
│   ├── api/                          # API routes (see API Reference)
│   ├── layout.tsx                    # Root layout (providers)
│   ├── page.tsx                      # Landing / student dashboard
│   └── globals.css                   # Tier color tokens + animations
│
├── components/
│   ├── InstructionPhase.tsx          # Phase 1: teach + comprehension check
│   ├── GuidedPracticePhase.tsx       # Phase 2: scaffolded practice
│   ├── AssessmentPhase.tsx           # Phase 3: independent writing editor
│   ├── FeedbackView.tsx              # Phase 4: scores + feedback + revision
│   ├── PhaseIndicator.tsx            # Phase progress dots
│   ├── PhaseTransition.tsx           # Animated phase transitions
│   ├── SkillRadarChart.tsx           # Recharts radar (4 writing categories)
│   ├── CelebrationOverlay.tsx        # Confetti + badge celebration
│   ├── charts/                       # ScoreTrendChart, ActivityHeatmap
│   ├── placement/                    # Assessment UI, theme, intro
│   └── shared/                       # ChatBubble, ChatInput, CoachAvatar,
│                                     # AnswerCards, TypingIndicator
│
├── lib/
│   ├── llm/
│   │   ├── provider.ts               # LLM abstraction (5 providers)
│   │   ├── client.ts                 # sendMessage, getCoachResponse, markers
│   │   ├── prompt-builder.ts         # Assembles system prompt from files
│   │   ├── evaluator.ts              # Rubric-based grading
│   │   ├── rubrics.ts                # Loads rubric JSON files
│   │   ├── curriculum.ts             # Lesson catalog (100+ lessons)
│   │   └── content/
│   │       ├── SKILL.md              # Core coach identity
│   │       ├── prompts/
│   │       │   ├── tier_inserts.md   # Age-specific behavior
│   │       │   └── phase_prompts.md  # Phase-specific rules
│   │       └── rubrics/*.json        # 30+ assessment rubrics
│   │
│   ├── learner-profile.ts            # Cross-lesson personalization
│   ├── curriculum-generator.ts       # AI curriculum generation
│   ├── curriculum-adapter.ts         # Auto-adaptation on score patterns
│   ├── skill-map.ts                  # 20 skills across 4 categories
│   ├── progress-tracker.ts           # 70/30 rolling average scoring
│   ├── streak-tracker.ts             # Consecutive day + weekly tracking
│   ├── badges.ts                     # 24 badge definitions
│   ├── badge-checker.ts              # Auto-unlock evaluation
│   ├── auth.ts                       # Auth.js v5 config
│   ├── api.ts                        # Client-side fetch wrappers
│   └── db.ts                         # Prisma client singleton
│
├── contexts/
│   ├── ActiveChildContext.tsx         # Selected child (localStorage)
│   └── TierContext.tsx               # Tier config (colors, mascot, fonts)
│
├── middleware.ts                      # Auth middleware (protects all routes)
└── types/index.ts                    # All TypeScript interfaces
```

---

## Testing

```bash
npm run test              # All tests (Vitest)
npm run test:watch        # Watch mode
npm run test:unit         # Unit tests only
npm run test:api          # API integration tests
npm run test:e2e          # Playwright E2E tests
npm run test:e2e:fast     # Quick E2E (auth, dashboards, reports)
```

---

## Environment Variables

```bash
# Required
ANTHROPIC_API_KEY=sk-ant-...          # Claude API key
DATABASE_URL=postgresql://...         # PostgreSQL connection string
AUTH_SECRET=...                       # Auth.js session secret

# Auth
AUTH_URL=http://localhost:3000        # Auth.js callback URL
GOOGLE_CLIENT_ID=...                  # Google OAuth (optional)
GOOGLE_CLIENT_SECRET=...              # Google OAuth (optional)

# LLM Provider (optional — defaults to Anthropic)
LLM_PROVIDER=anthropic               # anthropic | google | deepinfra | groq | novita
LLM_MODEL=claude-sonnet-4-5-20250929  # Override default model per provider
GOOGLE_AI_API_KEY=...                 # Required if LLM_PROVIDER=google
DEEPINFRA_API_KEY=...                 # Required if LLM_PROVIDER=deepinfra
GROQ_API_KEY=...                      # Required if LLM_PROVIDER=groq
NOVITA_API_KEY=...                    # Required if LLM_PROVIDER=novita

# Payments (optional)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_...
STRIPE_SECRET_KEY=sk_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Email (optional)
RESEND_API_KEY=re_...
```

---

## Key Design Decisions

**Prompt composition over inline prompts.** All AI behavior is defined in versioned markdown files (`SKILL.md`, `tier_inserts.md`, `phase_prompts.md`). Changes to coaching logic don't require code changes.

**Marker-based state protocol.** The AI emits structured markers (`[PHASE_TRANSITION]`, `[GUIDED_STAGE]`, etc.) within its natural language output. The backend parses these for state transitions and strips them for display. This gives the AI control over pacing while the backend enforces rules.

**Computed scores, not LLM-reported.** The overall score is always computed from weighted per-criterion scores. The LLM's self-reported overall score is ignored — only a divergence warning is logged. This prevents the "inflated holistic score" problem where an LLM rates overall higher than the sum of its parts.

**Rolling averages for skill tracking.** 70% weight on the most recent assessment, 30% on historical average. This rewards recent improvement while smoothing out single-assessment variance.

**Placement fallback for day-one personalization.** When a student has zero completed lessons, the learner profile is built from placement assessment data. This means the very first lesson is already personalized.

**Non-blocking side effects.** After assessment submission, skill updates, streak tracking, badge checking, curriculum adaptation, and learner profile rebuilding all run asynchronously. If any fails, the core lesson flow continues unaffected.

**Lazy provider initialization.** LLM SDK clients are only instantiated when their provider is selected. Unused providers add zero overhead.
