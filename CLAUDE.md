# CLAUDE.md — WriteWise Kids

## ⚠️ MANDATORY: Read Before Every Change

**STOP. Before modifying ANY file, do the following:**
1. Read this entire CLAUDE.md
2. Run `npm run dev` and confirm the app loads without errors
3. Identify which section below governs the file you're about to change
4. After your change, verify: dashboard loads, a lesson can start, all 4 phases work, assessment scores display

**If you just recovered from context compaction**: Re-read this file and `todos.md` (if it exists). Do NOT continue from memory — your memory is unreliable after compaction.

---

## Project Overview

WriteWise Kids is an AI-powered creative writing coach for children ages 7-15. It uses a three-phase pedagogical model ("I Do, We Do, You Do") to teach writing skills through direct instruction, guided practice, and independent assessment with AI-generated feedback.

**Current State**: Core product is functional end-to-end. Claude API is fully integrated for coaching, phase transitions, and rubric-based grading. No auth system exists — the app uses a hardcoded student ID (`student-maya-001`). Dashboard, lesson flow, and all four phases work with real AI responses.

---

## Tech Stack — DO NOT CHANGE VERSIONS WITHOUT EXPLICIT REQUEST

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4 (`@tailwindcss/postcss`) + CSS custom properties for tier-adaptive theming
- **Database**: SQLite via Prisma ORM (4 tables — Student, LessonProgress, Session, Assessment)
- **AI**: Anthropic Claude API (`claude-sonnet-4-5-20250929`) via `@anthropic-ai/sdk`
- **Fonts**: Nunito (Tier 1), DM Sans (Tier 2), Sora (Tier 3), Literata (writing areas)
- **Auth**: None — hardcoded student ID for now

**Package manager**: npm (not yarn, not pnpm)
**Dev command**: `npm run dev` (requires `ANTHROPIC_API_KEY` in `.env`)
**DB reset**: `npx prisma db push --force-reset && npx prisma db seed`
**Seed data**: Seeds student Maya (age 8, tier 1) with lesson progress

---

## Architecture Rules — DO NOT VIOLATE

### 1. Three-Phase Lesson Flow
Every lesson follows this exact sequence. Never skip or reorder phases:
```
Instruction → Guided Practice → Assessment → Feedback
```

### 2. Phase-Specific AI Behavior
- **Instruction**: AI teaches directly, uses 2-3 examples, ends with comprehension check
- **Guided Practice**: AI guides with questions, does NOT give answers, max 3 hints before more direct help
- **Assessment**: AI does NOT help during writing. Zero assistance. This is independent work.
- **Feedback**: Strength first → ONE growth area → encouragement. Always quote the student's actual writing.

### 3. Age Tier System
```
Tier 1 (ages 7-9):   Foundational — simple sentences, creative storytelling
Tier 2 (ages 10-12): Developing — multi-paragraph, persuasive writing
Tier 3 (ages 13-15): Advanced — thesis-driven, literary analysis
```
- Tier determines: vocabulary level, prompt complexity, rubric criteria, UI theme, mascot
- Tier is derived from student age. NEVER hardcode tier — always compute from age.

### 4. Session State is Sacred
The session object tracks everything. Never lose or reset session state mid-lesson:
```typescript
interface SessionState {
  id: string;
  studentId: string;
  lessonId: string;
  phase: Phase;
  phaseState: PhaseState;
  conversationHistory: Message[];
}

interface PhaseState {
  instructionCompleted?: boolean;
  comprehensionCheckPassed?: boolean;
  guidedAttempts?: number;
  hintsGiven?: number;
  guidedComplete?: boolean;
  writingStartedAt?: string;
  revisionsUsed?: number;
}
```

### 5. Prompt Assembly Pattern
System prompts are built by composing multiple files. Follow this exact assembly order:
```typescript
const systemPrompt = [
  CORE_SYSTEM_PROMPT,                    // SKILL.md — core coach identity
  TIER_INSERTS[tier],                    // tier_inserts.md — age-specific behavior
  PHASE_PROMPTS[phase],                  // phase_prompts.md — phase-specific rules
  sessionContext,                        // Current session state formatted as context
  rubricSummary                          // Rubric (assessment/feedback phases only)
].join('\n\n---\n\n');
```
NEVER inline system prompts. NEVER skip the tier or phase inserts. See `src/lib/llm/prompt-builder.ts` for implementation.

---

## File Structure (Key Paths)

```
src/
├── lib/
│   ├── llm/
│   │   ├── client.ts             # Claude API singleton, sendMessage(), getCoachResponse()
│   │   ├── prompt-builder.ts     # Assembles system prompt from skill files
│   │   ├── evaluator.ts          # Rubric-based + general writing evaluation
│   │   ├── rubrics.ts            # Loads rubric JSON files
│   │   ├── curriculum.ts         # In-memory lesson catalog (~100+ lessons)
│   │   ├── index.ts              # Re-exports all LLM modules
│   │   └── content/
│   │       ├── SKILL.md          # Core coach instructions
│   │       ├── prompts/
│   │       │   ├── tier_inserts.md   # Age-specific behavior mods
│   │       │   └── phase_prompts.md  # Phase-specific behavior rules
│   │       ├── rubrics/
│   │       │   └── *.json            # Assessment rubrics (30+ files)
│   │       └── evals/
│   │           └── evals.json        # Evaluation test cases
│   ├── api.ts                    # Client-side API helper (fetch wrappers)
│   ├── curriculum.ts             # Public curriculum lookup (used by API routes)
│   ├── rubrics.ts                # Public rubric lookup (used by API routes)
│   └── db.ts                     # Prisma client singleton
├── app/
│   ├── page.tsx                  # Student dashboard (progress, lesson cards)
│   ├── lesson/[id]/page.tsx      # Lesson page (orchestrates all 4 phases)
│   ├── globals.css               # Tailwind config + tier tokens + animations
│   ├── layout.tsx                # Root layout with font imports
│   └── api/
│       ├── lessons/
│       │   ├── start/route.ts    # POST — creates/resumes session
│       │   ├── message/route.ts  # POST — conversation within a phase
│       │   ├── submit/route.ts   # POST — assessment submission + grading
│       │   ├── revise/route.ts   # POST — revision submission + re-grading
│       │   └── [id]/route.ts     # GET — lesson detail + rubric info
│       ├── rubrics/[id]/route.ts # GET — rubric data
│       └── students/[id]/
│           └── progress/route.ts # GET — student dashboard data
├── components/
│   ├── InstructionPhase.tsx      # Phase 1: chat + progress steps
│   ├── GuidedPracticePhase.tsx   # Phase 2: chat + writing cards
│   ├── AssessmentPhase.tsx       # Phase 3: full-width writing editor
│   ├── FeedbackView.tsx          # Phase 4: scores + quoted feedback
│   ├── PhaseIndicator.tsx        # 3-dot phase progress (Learn/Practice/Write)
│   ├── PhaseTransition.tsx       # Animated transition between phases
│   ├── CoachMessage.tsx          # Renders markdown + strips mascot emoji
│   └── shared/
│       ├── ChatBubble.tsx        # Coach/student message bubbles
│       ├── ChatInput.tsx         # Text input with send button
│       ├── CoachAvatar.tsx       # Tier-adaptive mascot avatar
│       ├── TypingIndicator.tsx   # Animated typing dots
│       ├── SectionLabel.tsx      # Section header label
│       └── index.ts              # Re-exports shared components
├── contexts/
│   └── TierContext.tsx           # React context for tier config (name, emoji, label)
└── types/
    └── index.ts                  # All TypeScript interfaces
```

---

## Component Dependency Map — CHECK BEFORE EDITING

These components are tightly coupled. If you change one, you MUST verify the others still work:

```
lesson/[id]/page.tsx (orchestrator)
  ├── uses: InstructionPhase, GuidedPracticePhase, AssessmentPhase, FeedbackView
  ├── uses: PhaseIndicator, PhaseTransition
  ├── calls via src/lib/api.ts: startLesson, sendMessage, submitAssessment, getLessonDetail
  └── manages: session state, phase transitions, tier theming

/api/lessons/message/route.ts
  ├── uses: client.ts → getCoachResponse() (builds prompt, calls Claude, detects markers)
  ├── uses: db.ts (persists session + conversation history)
  └── outputs: { response, phaseUpdate, assessmentReady } — markers are stripped server-side

/api/lessons/submit/route.ts
  ├── uses: evaluator.ts (grades writing via Claude API)
  ├── uses: rubrics.ts (loads rubric criteria)
  ├── uses: db.ts (persists assessment, updates session to feedback phase)
  └── outputs: scores + feedback that FeedbackView renders

/api/lessons/revise/route.ts
  ├── uses: evaluator.ts (re-grades revised writing)
  └── outputs: new scores + comparison with previous scores

client.ts → getCoachResponse()
  ├── calls: prompt-builder.ts → buildPromptFromSession()
  ├── calls: rubrics.ts → getRubric() + formatRubricForPrompt() (assessment/feedback phases)
  ├── calls: Claude API via sendMessage()
  ├── detects: [PHASE_TRANSITION], [COMPREHENSION_CHECK], [HINT_GIVEN] markers
  └── strips markers via stripPhaseMarkers() before returning clean text

prompt-builder.ts
  ├── reads: SKILL.md, tier_inserts.md, phase_prompts.md
  ├── receives: rubric summary as parameter (not loaded here)
  └── ALL prompt content comes from here — nowhere else
```

**Rule**: If you're asked to fix something in the lesson flow, trace through this dependency chain FIRST. Don't modify the API route if the bug is in the prompt. Don't modify the component if the bug is in the API response format.

---

## Design System — DO NOT CHANGE

### Tier Color Tokens (all in globals.css)
```css
/* Tier 1: Playful & Warm */
--tier1-primary: #FF6B6B;    /* Coral */
--tier1-secondary: #4ECDC4;  /* Teal */
--tier1-accent: #FFE66D;     /* Sunny Yellow */
--tier1-bg: #FFF9F0;         /* Warm Cream */

/* Tier 2: Confident & Cool */
--tier2-primary: #6C5CE7;    /* Purple */
--tier2-secondary: #00B894;  /* Mint */
--tier2-accent: #FDCB6E;     /* Gold */
--tier2-bg: #F8F9FD;         /* Cool White */

/* Tier 3: Sophisticated & Focused */
--tier3-primary: #2D3436;    /* Charcoal */
--tier3-secondary: #0984E3;  /* Blue */
--tier3-accent: #E17055;     /* Terracotta */
--tier3-bg: #FFFFFF;         /* Clean White */
```
Active tier is set dynamically via `body.tier-{n}` class, which maps to `--active-primary`, `--active-secondary`, etc. Tailwind references these as `bg-active-primary`, `text-active-text`, etc.

### Mascots
- Tier 1: Ollie the Owl (CoachAvatar renders the emoji)
- Tier 2: Felix the Fox
- Tier 3: Sage the Wolf

The AI is instructed via `tier_inserts.md` to NOT start messages with the mascot emoji (the UI avatar already shows it). `CoachMessage.tsx` has a `stripLeadingMascot()` safety net.

---

## AI Coach Behavior Rules — NEVER OVERRIDE

1. Be warm, encouraging, age-appropriate
2. Quote student's actual writing in feedback
3. Scaffold hints: Light → Medium → Heavy (max 3 rounds)
4. Transition phrases: "Ready to try it together?" (instruction → guided)
5. Lead feedback with genuine strengths before growth areas
6. NEVER write or complete the student's work
7. NEVER help during assessment phase
8. NEVER compare students to each other
9. NEVER use sarcasm or negative language
10. NEVER skip comprehension check before moving to guided practice

### Structured Markers (AI outputs these, backend strips them)
- `[PHASE_TRANSITION: guided]` / `[PHASE_TRANSITION: assessment]` — triggers phase change
- `[COMPREHENSION_CHECK: passed]` — marks comprehension check passed
- `[HINT_GIVEN]` — tracks hint count
- All markers are stripped by `stripPhaseMarkers()` in `client.ts` before display

**WARNING**: If you modify marker format, you MUST update BOTH:
1. The prompt in `phase_prompts.md` that tells the AI to emit them
2. The `stripPhaseMarkers()` regex in `client.ts` that strips them
These two files MUST stay in sync or phase transitions will silently break.

---

## Database Schema (Prisma — SQLite)

```
Student
├── id (uuid)
├── name, age, tier
├── → LessonProgress[] (one per lesson attempted)
├── → Session[] (one per active lesson session)
└── → Assessment[] (one per submitted writing)

LessonProgress
├── studentId + lessonId (unique)
├── status: not_started | in_progress | completed
├── currentPhase, startedAt, completedAt

Session
├── id (uuid)
├── studentId, lessonId
├── phase: instruction | guided | assessment | feedback
├── phaseState (JSON string)
├── conversationHistory (JSON string — full Message[])
└── → Assessment[]

Assessment
├── sessionId, studentId, lessonId, rubricId
├── submissionText, scores (JSON), overallScore, feedback (JSON)
```

**Schema change rules**:
- NEVER rename existing columns — downstream code references them by name
- ALWAYS run `npx prisma db push` after schema changes
- If adding a column, make it optional or provide a default
- After any schema change, run `npx prisma generate` to regenerate the client

---

## API Routes

### POST /api/lessons/start
```typescript
// Request
{ studentId: string, lessonId: string }
// Response
{ sessionId, resumed: boolean, phase, conversationHistory: Message[], initialPrompt: Message, lesson: { id, title, unit, type, learningObjectives } }
```

### POST /api/lessons/message
```typescript
// Request
{ sessionId: string, message: string }
// Response
{ response: Message, phaseUpdate: Phase | null, assessmentReady: boolean }
```

### POST /api/lessons/submit
```typescript
// Request
{ sessionId: string, text: string }
// Response
{ assessmentId, scores: Record<string, number>, overallScore, feedback: { strength, growth, encouragement }, rubric }
```

### POST /api/lessons/revise
```typescript
// Request
{ sessionId: string, text: string }
// Response
{ assessmentId, scores, overallScore, feedback, previousScores, revisionsRemaining, rubric }
```

### GET /api/lessons/[id]
Returns lesson detail + rubric info.

### GET /api/students/[id]/progress
Returns dashboard data: completed lessons, current lesson, available lessons, assessments, type stats.

**API contract rule**: NEVER change the response shape of an existing endpoint without also updating every component that consumes it. Search the codebase for the route path before modifying.

---

## Curriculum Structure

### Writing Types (each tier covers all of these):
- Narrative (story writing)
- Persuasive (opinion/argument)
- Expository (informational)
- Descriptive (sensory detail)

### Lesson ID Format: `{TYPE_CODE}{TIER}.{UNIT}.{LESSON}`
Example: `N1.1.5` = Narrative, Tier 1, Unit 1, Lesson 5

### Unit Progression Per Type:
Each writing type has 4 units with 5-8 lessons each, totaling ~100+ lessons across tiers. The full catalog is in `src/lib/llm/curriculum.ts`.

---

## Common Pitfalls — READ BEFORE MAKING CHANGES

1. **Don't inline prompts**: Always use the prompt-builder pattern. Hardcoded prompts in API routes WILL drift from the skill files.
2. **Don't modify rubric JSON structure**: Other components depend on the exact shape. If you need new criteria, ADD — don't restructure.
3. **Don't skip phase validation**: Every API route must verify the session is in the correct phase before processing.
4. **Don't lose conversation history**: The full history must be sent to Claude on every API call. Truncating it breaks context.
5. **Don't change tier boundaries**: Ages 7-9 = Tier 1, 10-12 = Tier 2, 13-15 = Tier 3. These are pedagogically grounded.
6. **Don't remove comprehension checks**: Students must pass the check before advancing from instruction to guided practice.
7. **Don't duplicate mascot emoji**: The UI avatar already shows the mascot. The AI is told not to start messages with it. `CoachMessage.tsx` strips it as a safety net.
8. **Don't change structured marker format without updating both sides**: `phase_prompts.md` AND `stripPhaseMarkers()` in `client.ts` must stay in sync.
9. **Don't modify `types/index.ts` interfaces without searching for all usages**: These types are used across API routes, components, and lib functions.
10. **Don't add new npm packages without checking for existing alternatives**: The bundle is lean by design.

---

## Verification Checklist — RUN AFTER EVERY CHANGE

Before considering any task complete, verify ALL of these:

```
[ ] npm run dev starts without errors
[ ] Dashboard loads at / and shows lesson cards
[ ] Clicking a lesson navigates to /lesson/[id]
[ ] Instruction phase: coach teaches, comprehension check appears
[ ] Guided phase: coach responds to student messages, hints increment
[ ] Assessment phase: writing editor renders, NO coach help available
[ ] Submit works: scores and feedback display in FeedbackView
[ ] Phase transitions animate correctly (PhaseTransition component)
[ ] Tier theming applies (check body class and CSS variables)
[ ] No TypeScript errors: npx tsc --noEmit
[ ] No console errors in browser dev tools
```

---

## Active Work Items

### Done
- [x] Claude API integration (coaching, grading, evaluation)
- [x] Prompt-builder with skill file loading
- [x] Session persistence (database-backed via Prisma)
- [x] Rubric-based grading in /api/lessons/submit
- [x] Student dashboard with progress visualization
- [x] Full curriculum catalog (100+ lessons across 4 types, 3 tiers)

### Remaining
- [ ] Authentication system (parent/child login, JWT or session-based)
- [ ] Multi-student support (currently hardcoded to student-maya-001)
- [ ] Placement assessment for initial tier assignment
- [ ] Streak tracking and achievement system
- [ ] Curriculum adaptation (adjust difficulty based on performance)
- [ ] Writing editor with auto-save and draft persistence
- [ ] Parent dashboard (view children's progress)

---

## How to Work on This Project

1. **Read this file first** on every new session
2. **Start dev server**: `npm run dev` (requires `ANTHROPIC_API_KEY` in `.env`)
3. **Reset database**: `npx prisma db push --force-reset && npx prisma db seed`
4. **Seed data**: Seeds student Maya (age 8, tier 1) with lesson progress
5. **Commit after each working feature** — small, atomic commits
6. **Never modify multiple systems at once** — change one thing, verify, then move on
7. **If you're unsure about a design decision**, check the skill files in `src/lib/llm/content/` — they are the source of truth for AI behavior
8. **Run the verification checklist above** before saying a task is done
9. **If fixing a bug**: reproduce it first, trace through the dependency map, fix at the root cause — don't patch symptoms
10. **If adding a new feature**: propose the plan first, get approval, then implement incrementally

---

## Change Log

<!-- Format: YYYY-MM-DD | What changed | Files modified -->

| Date | Change | Files |
|------|--------|-------|
| 2026-02-11 | Initial commit — full app with Claude API integration, 4-phase lesson flow, dashboard, 100+ lesson curriculum | All files |
| 2026-02-11 | Created CLAUDE.md matching actual project state | CLAUDE.md |