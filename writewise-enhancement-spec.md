# WriteWise Kids — Enhancement Specification
## From MVP to Production App

**Version**: 1.0
**Date**: February 11, 2026
**Author**: Karthik

---

## 1. Executive Summary

WriteWise Kids is currently a functional MVP with 4 database tables, a hardcoded student, and no authentication. This spec defines the incremental path to a full production application with multi-user support, parent accounts, personalized curricula, achievement systems, and adaptive learning — expanding to 14 database tables across 6 implementation phases.

### Current State (MVP)
- 4 tables: Student, LessonProgress, Session, Assessment
- Single hardcoded student (student-maya-001, age 8, Tier 1)
- No authentication or user management
- Claude API integrated for coaching, grading, evaluation
- 100+ lessons across 4 writing types, 3 tiers
- Full lesson flow: Instruction → Guided → Assessment → Feedback

### Target State (Production)
- 14 tables with full relational model
- Parent/child account system with role-based auth
- Per-child personalized curricula (8-12 week learning paths)
- Placement assessment for initial tier assignment
- Achievement system with badges, streaks, celebrations
- Skill progress tracking with granular analytics
- Parent dashboard with reports and CSV export
- Curriculum adaptation based on performance
- Writing portfolio with revision history

---

## 2. Database Migration Plan

### 2.1 Current Schema (4 tables)

```
Student           → stays, renamed to ChildProfile
LessonProgress    → stays, enhanced with new fields
Session           → stays, enhanced with new fields  
Assessment        → stays, renamed to WritingSubmission + split
```

### 2.2 Target Schema (14 tables)

```prisma
// ============================================
// TIER 1: Auth & Identity (Phase 1)
// ============================================

model User {
  id            String         @id @default(uuid())
  email         String         @unique
  passwordHash  String
  name          String
  role          UserRole       @default(PARENT)
  createdAt     DateTime       @default(now())
  updatedAt     DateTime       @updatedAt
  children      ChildProfile[]
}

enum UserRole {
  PARENT
  ADMIN
}

model ChildProfile {
  id              String            @id @default(uuid())
  parentId        String
  parent          User              @relation(fields: [parentId], references: [id])
  name            String
  age             Int
  tier            Int               // Computed from age: 7-9=1, 10-12=2, 13-15=3
  avatarEmoji     String            @default("🦉")
  gradeLevel      String?           // Optional: "3rd grade", "7th grade"
  interests       String?           // JSON array of writing interests for prompt personalization
  createdAt       DateTime          @default(now())
  updatedAt       DateTime          @updatedAt
  
  // Relations
  curriculum      Curriculum?
  lessonProgress  LessonProgress[]
  sessions        Session[]
  submissions     WritingSubmission[]
  skillProgress   SkillProgress[]
  achievements    Achievement[]
  streaks         Streak?
  placementResult PlacementResult?

  @@index([parentId])
}

// ============================================
// TIER 2: Curriculum & Learning Paths (Phase 2)
// ============================================

model Curriculum {
  id              String           @id @default(uuid())
  childId         String           @unique
  child           ChildProfile     @relation(fields: [childId], references: [id])
  status          CurriculumStatus @default(ACTIVE)
  weekCount       Int              @default(8)    // 8-12 week plans
  lessonsPerWeek  Int              @default(3)    // Configurable frequency
  focusAreas      String           // JSON: ["narrative", "persuasive"] — writing types to emphasize
  startDate       DateTime         @default(now())
  endDate         DateTime?
  generatedBy     String           @default("ai")  // "ai" | "manual"
  createdAt       DateTime         @default(now())
  updatedAt       DateTime         @updatedAt

  // Relations
  weeks           CurriculumWeek[]
  revisions       CurriculumRevision[]
}

enum CurriculumStatus {
  ACTIVE
  PAUSED
  COMPLETED
  REVISED
}

model CurriculumWeek {
  id            String     @id @default(uuid())
  curriculumId  String
  curriculum    Curriculum @relation(fields: [curriculumId], references: [id])
  weekNumber    Int
  theme         String     // "Hooking Your Reader", "Building Characters"
  lessonIds     String     // JSON array of lesson IDs in order: ["N1.1.1", "N1.1.2", "D1.1.1"]
  status        String     @default("upcoming")  // upcoming | current | completed
  
  @@unique([curriculumId, weekNumber])
  @@index([curriculumId])
}

model CurriculumRevision {
  id            String     @id @default(uuid())
  curriculumId  String
  curriculum    Curriculum @relation(fields: [curriculumId], references: [id])
  reason        String     // "parent_request" | "performance_adaptation" | "interest_change"
  description   String     // What changed and why
  previousPlan  String     // JSON snapshot of previous curriculum
  newPlan       String     // JSON snapshot of new curriculum
  createdAt     DateTime   @default(now())

  @@index([curriculumId])
}

// ============================================
// TIER 3: Lesson Flow (Phase 1 — enhanced existing)
// ============================================

model LessonProgress {
  id            String       @id @default(uuid())
  childId       String
  child         ChildProfile @relation(fields: [childId], references: [id])
  lessonId      String       // "N1.1.5" format
  status        String       @default("not_started")  // not_started | in_progress | completed
  currentPhase  String?      // instruction | guided | assessment | feedback
  startedAt     DateTime?
  completedAt   DateTime?
  timeSpentSec  Int          @default(0)   // NEW: Total time spent on this lesson
  attempts      Int          @default(1)   // NEW: How many times started (for retakes)

  @@unique([childId, lessonId])
  @@index([childId])
}

model Session {
  id                  String             @id @default(uuid())
  childId             String
  child               ChildProfile       @relation(fields: [childId], references: [id])
  lessonId            String
  phase               String             // instruction | guided | assessment | feedback
  phaseState          String             // JSON: PhaseState object
  conversationHistory String             // JSON: Message[]
  createdAt           DateTime           @default(now())
  updatedAt           DateTime           @updatedAt
  
  // Relations
  submissions         WritingSubmission[]

  @@index([childId])
  @@index([childId, lessonId])
}

// ============================================
// TIER 4: Writing & Assessment (Phase 3)
// ============================================

model WritingSubmission {
  id              String        @id @default(uuid())
  sessionId       String
  session         Session       @relation(fields: [sessionId], references: [id])
  childId         String
  child           ChildProfile  @relation(fields: [childId], references: [id])
  lessonId        String
  rubricId        String
  submissionText  String        // The student's actual writing
  wordCount       Int
  timeSpentSec    Int?          // Time from assessment start to submit
  revisionOf      String?       // ID of previous submission if this is a revision
  revisionNumber  Int           @default(0)  // 0 = original, 1 = first revision, etc.
  createdAt       DateTime      @default(now())

  // Relations
  feedback        AIFeedback?
  
  @@index([childId])
  @@index([sessionId])
  @@index([childId, lessonId])
}

model AIFeedback {
  id              String           @id @default(uuid())
  submissionId    String           @unique
  submission      WritingSubmission @relation(fields: [submissionId], references: [id])
  scores          String           // JSON: Record<string, number> — rubric dimension scores
  overallScore    Float            // Weighted average (1-5 scale)
  strength        String           // Quoted specific strength from their writing
  growthArea      String           // ONE specific, actionable growth area
  encouragement   String           // Motivational closing
  fullFeedback    String?          // Full raw AI response for reference
  model           String           @default("claude-sonnet-4-5-20250929")  // Which model generated this
  createdAt       DateTime         @default(now())

  @@index([submissionId])
}

// ============================================
// TIER 5: Progress & Analytics (Phase 4)
// ============================================

model SkillProgress {
  id              String       @id @default(uuid())
  childId         String
  child           ChildProfile @relation(fields: [childId], references: [id])
  skillCategory   String       // "narrative" | "persuasive" | "expository" | "descriptive"
  skillName       String       // "story_beginnings" | "character_development" | "thesis_statements"
  level           SkillLevel   @default(EMERGING)
  score           Float        @default(0)     // Rolling average of assessment scores (1-5)
  totalAttempts   Int          @default(0)     // Number of assessments in this skill
  lastAssessedAt  DateTime?
  createdAt       DateTime     @default(now())
  updatedAt       DateTime     @updatedAt

  @@unique([childId, skillCategory, skillName])
  @@index([childId])
}

enum SkillLevel {
  EMERGING      // score < 2.0 — Just starting to learn
  DEVELOPING    // score 2.0-3.4 — Making progress
  PROFICIENT    // score 3.5-4.4 — Solid understanding
  ADVANCED      // score >= 4.5 — Exceptional
}

model Streak {
  id              String       @id @default(uuid())
  childId         String       @unique
  child           ChildProfile @relation(fields: [childId], references: [id])
  currentStreak   Int          @default(0)   // Days in a row with activity
  longestStreak   Int          @default(0)   // All-time record
  lastActiveDate  DateTime?                  // Date of last lesson activity
  weeklyGoal      Int          @default(3)   // Lessons per week target
  weeklyCompleted Int          @default(0)   // Lessons completed this week
  weekStartDate   DateTime?                  // Monday of current tracking week
  updatedAt       DateTime     @updatedAt
}

// ============================================
// TIER 6: Achievements & Motivation (Phase 5)
// ============================================

model Achievement {
  id            String       @id @default(uuid())
  childId       String
  child         ChildProfile @relation(fields: [childId], references: [id])
  badgeId       String       // References a badge definition (see Badge Catalog below)
  unlockedAt    DateTime     @default(now())
  seen          Boolean      @default(false)  // Has the child seen the unlock animation?

  @@unique([childId, badgeId])
  @@index([childId])
}

// ============================================
// TIER 7: Placement (Phase 2)
// ============================================

model PlacementResult {
  id              String       @id @default(uuid())
  childId         String       @unique
  child           ChildProfile @relation(fields: [childId], references: [id])
  prompts         String       // JSON: The 3 prompts given
  responses       String       // JSON: The child's 3 responses
  aiAnalysis      String       // JSON: AI's skill assessment per dimension
  recommendedTier Int          // 1, 2, or 3
  assignedTier    Int          // What was actually assigned (parent may override)
  confidence      Float        // AI confidence in recommendation (0-1)
  createdAt       DateTime     @default(now())
}
```

### 2.3 Migration Strategy

**CRITICAL: Migrations are incremental. Never drop existing tables. Each phase adds tables and enhances existing ones.**

```
Phase 1: Add User table, rename Student → ChildProfile, add parentId
Phase 2: Add Curriculum, CurriculumWeek, CurriculumRevision, PlacementResult
Phase 3: Split Assessment → WritingSubmission + AIFeedback, add fields
Phase 4: Add SkillProgress, Streak
Phase 5: Add Achievement
Phase 6: Enhance all tables with analytics fields
```

---

## 3. Implementation Phases

### Phase 1: Authentication & Multi-User Support
**Estimated effort**: 3-5 days
**Dependencies**: None
**Risk**: Medium — touches every existing API route

#### 1.1 User & Auth System

**Tables added**: `User`
**Tables modified**: `Student` → renamed to `ChildProfile`, adds `parentId` FK

**Auth approach**: NextAuth.js with credentials provider (email/password)
- JWT session tokens stored in httpOnly cookies
- Middleware protects all `/api/*` and `/lesson/*` routes
- Role-based access: PARENT sees dashboard + children, ADMIN sees everything

**Auth flows**:
```
Parent Sign Up:
  → /auth/signup → creates User (role: PARENT) → redirect to /onboarding

Parent Login:
  → /auth/login → validates credentials → sets JWT cookie → redirect to /dashboard

Child Access:
  → Parent selects child from dashboard → sets active childId in session → child sees their lessons
  → Children do NOT have their own login — parent selects which child is active
```

**Why children don't log in**: Ages 7-15 shouldn't manage credentials. The parent logs in and selects which child is using the app. This simplifies auth and keeps parents in control.

#### 1.2 Child Profile Management

**New pages**:
- `/dashboard` — Parent's home: list of children, quick stats per child
- `/dashboard/children/new` — Add a new child profile
- `/dashboard/children/[id]` — View/edit child profile
- `/dashboard/children/[id]/progress` — Detailed progress (replaces current `/`)

**New API routes**:
```
POST   /api/children              — Create child profile
GET    /api/children              — List parent's children
GET    /api/children/[id]         — Get child detail
PATCH  /api/children/[id]         — Update child profile
DELETE /api/children/[id]         — Remove child profile (soft delete)
```

**Child profile fields**:
```typescript
{
  name: string;           // "Maya"
  age: number;            // 8
  gradeLevel?: string;    // "3rd grade"
  interests?: string[];   // ["fantasy stories", "animals", "space"]
  avatarEmoji: string;    // "🦉" — child picks from a set
}
```

**Tier is auto-computed from age** — never manually set. If age changes (birthday), tier updates and curriculum adapts.

#### 1.3 Migration Path for Existing Data

```sql
-- Step 1: Create User table
-- Step 2: Create a default parent user for the existing Maya student
-- Step 3: Add parentId to Student table (now ChildProfile)
-- Step 4: Update all existing API routes to use auth context
-- Step 5: Replace hardcoded "student-maya-001" with dynamic childId from session
```

**Every existing API route changes**: Replace `studentId` from request body with `childId` from authenticated session. This is the riskiest part — test every endpoint after migration.

#### 1.4 Acceptance Criteria
```
[ ] Parent can sign up with email/password
[ ] Parent can log in and see their dashboard
[ ] Parent can add multiple children with name, age, interests
[ ] Tier auto-computes from age (7-9=1, 10-12=2, 13-15=3)
[ ] Selecting a child switches the app to that child's view
[ ] Child's lesson dashboard shows only their progress
[ ] Existing lesson flow works identically (instruction → guided → assessment → feedback)
[ ] Unauthenticated access redirects to /auth/login
[ ] Parent cannot see another parent's children
[ ] All existing API routes work with the new auth context
```

---

### Phase 2: Placement Assessment & Personalized Curricula
**Estimated effort**: 5-7 days
**Dependencies**: Phase 1 (auth + child profiles)
**Risk**: Medium — new AI integration for curriculum generation

#### 2.1 Placement Assessment

When a new child profile is created, before they start lessons, they complete a 3-prompt placement assessment to calibrate their starting tier and identify strengths/weaknesses.

**Tables added**: `PlacementResult`

**Flow**:
```
Parent adds child (age 9) 
  → System pre-assigns Tier 1 based on age
  → Child is directed to /placement
  → 3 writing prompts presented sequentially:
      Prompt 1: Narrative (tell a short story about...)
      Prompt 2: Descriptive (describe a place you love...)  
      Prompt 3: Persuasive (convince someone to...)
  → AI analyzes all 3 responses
  → Returns: recommended tier, skill strengths, skill gaps, confidence score
  → Parent sees recommendation and can accept or override
  → Tier and initial skill levels are set
```

**New pages**:
- `/placement/[childId]` — 3-step assessment wizard
- `/placement/[childId]/results` — Shows recommendation with option to accept/override

**New API routes**:
```
POST /api/placement/start          — Generates 3 age-appropriate prompts
POST /api/placement/submit         — Submits all 3 responses for analysis
GET  /api/placement/[childId]      — Gets existing placement result
PATCH /api/placement/[childId]     — Parent overrides tier
```

**AI prompt for analysis**:
```
Analyze these 3 writing samples from a {age}-year-old student.
For each sample, evaluate:
- Vocabulary sophistication (1-5)
- Sentence structure complexity (1-5)
- Idea organization (1-5)
- Creativity and voice (1-5)
- Grammar and mechanics (1-5)

Then recommend:
- Overall tier (1, 2, or 3)
- Top 2 strengths (e.g., "creative ideas", "strong vocabulary")
- Top 2 growth areas (e.g., "sentence variety", "paragraph organization")
- Confidence level (0-1) in the recommendation

Respond in JSON format only.
```

#### 2.2 Personalized Curriculum Generation

After placement, the AI generates an 8-12 week learning path tailored to the child's tier, strengths, gaps, and interests.

**Tables added**: `Curriculum`, `CurriculumWeek`, `CurriculumRevision`

**Curriculum generation flow**:
```
Placement complete (tier assigned, strengths/gaps identified)
  → Parent sets preferences:
      - Lessons per week (2-5, default 3)
      - Duration (8, 10, or 12 weeks)
      - Focus areas (optional: emphasize narrative, etc.)
  → AI generates curriculum:
      - Selects lessons from the 100+ catalog
      - Orders by skill progression (foundational → advanced)
      - Front-loads growth areas, reinforces strengths
      - Distributes writing types across weeks
      - Avoids more than 2 same-type lessons in a row
  → Curriculum stored in DB as weekly lesson plans
  → Child's dashboard now shows "Week 1" with 3 lessons
```

**New pages**:
- `/curriculum/[childId]/setup` — Set preferences (frequency, duration, focus)
- `/curriculum/[childId]` — View full curriculum with weekly breakdown

**New API routes**:
```
POST  /api/curriculum/generate     — AI generates curriculum from placement + preferences
GET   /api/curriculum/[childId]    — Get active curriculum
PATCH /api/curriculum/[childId]    — Update preferences, trigger regeneration
POST  /api/curriculum/[childId]/revise  — Parent requests manual revision
```

**AI prompt for curriculum generation**:
```
Generate a {weekCount}-week writing curriculum for a {age}-year-old (Tier {tier}) student.

Student profile:
- Strengths: {strengths from placement}
- Growth areas: {gaps from placement}
- Interests: {interests from child profile}
- Lessons per week: {lessonsPerWeek}

Available lessons: {JSON of full lesson catalog with IDs, types, and skill focuses}

Rules:
- Start with the student's growth areas in week 1-2
- Alternate writing types (no more than 2 of same type consecutively)
- Include at least one lesson reinforcing strengths every 2 weeks
- Progress from foundational skills to advanced within each type
- Each week should have a theme (e.g., "Story Beginnings", "Building Arguments")

Respond with JSON: { weeks: [{ weekNumber, theme, lessonIds: [] }] }
```

#### 2.3 Acceptance Criteria
```
[ ] New child is directed to placement assessment before lessons
[ ] Placement shows 3 age-appropriate writing prompts
[ ] AI analyzes responses and recommends tier with confidence
[ ] Parent can accept or override recommended tier
[ ] After placement, parent sets curriculum preferences
[ ] AI generates 8-12 week curriculum from lesson catalog
[ ] Dashboard shows weekly view with correct lessons
[ ] Completed lessons show checkmarks in curriculum view
[ ] Curriculum can be regenerated if preferences change
[ ] Placement results are stored and viewable later
```

---

### Phase 3: Enhanced Writing Submissions & AI Feedback
**Estimated effort**: 3-4 days
**Dependencies**: Phase 1 (auth)
**Risk**: Low — mostly splitting existing data into new tables

#### 3.1 Split Assessment into WritingSubmission + AIFeedback

The current `Assessment` table combines the student's writing with the AI's feedback. Splitting these enables revision tracking, portfolio features, and independent feedback analytics.

**Tables added**: `WritingSubmission`, `AIFeedback`
**Tables removed**: `Assessment` (migrated)

**Migration**:
```
For each existing Assessment row:
  → Create WritingSubmission with submissionText, scores, childId, lessonId
  → Create AIFeedback linked to submission with scores, feedback fields
  → Calculate and store wordCount from submissionText
```

#### 3.2 Revision System Enhancement

Current system supports one revision. Enhance to support up to 3 revisions with full history.

**Revision flow**:
```
Original submission → AI feedback (revision 0)
  → Child clicks "Revise" → sees original + feedback side-by-side
  → Submits revision → AI re-grades against same rubric (revision 1)
  → Can compare scores: original vs revision
  → Up to 3 total revisions (revisionNumber: 0, 1, 2, 3)
```

**New fields on WritingSubmission**:
- `revisionOf` — links to the original submission ID
- `revisionNumber` — 0 for original, 1-3 for revisions
- `wordCount` — auto-calculated
- `timeSpentSec` — from assessment phase start to submit

#### 3.3 Writing Portfolio

Every child gets a portfolio page showing all their writing chronologically.

**New page**: `/portfolio/[childId]`

**Features**:
- All submissions grouped by lesson
- Original + revisions shown together
- Score progression visible per piece
- Can expand any piece to read in full
- Filter by writing type (narrative, persuasive, etc.)
- Filter by date range

**New API route**:
```
GET /api/children/[id]/portfolio    — Paginated list of all submissions with feedback
GET /api/children/[id]/portfolio/export  — CSV export of scores + metadata
```

#### 3.4 Acceptance Criteria
```
[ ] Existing assessments migrated to new WritingSubmission + AIFeedback tables
[ ] Submit endpoint creates WritingSubmission + AIFeedback separately
[ ] Revision creates new WritingSubmission linked to original via revisionOf
[ ] Max 3 revisions per submission enforced
[ ] Portfolio page shows all writing chronologically
[ ] Portfolio supports filtering by type and date
[ ] Word count auto-calculated on submission
[ ] CSV export includes: lesson, type, date, word count, scores, time spent
[ ] FeedbackView still works identically with new data model
```

---

### Phase 4: Skill Progress & Streak Tracking
**Estimated effort**: 3-4 days
**Dependencies**: Phase 3 (writing submissions with scores)
**Risk**: Low — new features, no existing code modified

#### 4.1 Skill Progress Tracking

After every assessment, update the child's skill progress across multiple dimensions.

**Tables added**: `SkillProgress`, `Streak`

**Skill mapping** (lesson → skills):
```typescript
// Each lesson maps to 1-3 skills it teaches
const LESSON_SKILL_MAP: Record<string, string[]> = {
  "N1.1.1": ["story_beginnings", "creative_ideas"],
  "N1.1.2": ["story_beginnings", "sentence_variety"],
  "P1.1.1": ["opinion_statements", "supporting_reasons"],
  "E1.1.1": ["topic_sentences", "factual_details"],
  "D1.1.1": ["sensory_details", "descriptive_vocabulary"],
  // ... for all 100+ lessons
};
```

**Score calculation**:
```typescript
// After each assessment, update skill progress
async function updateSkillProgress(childId: string, lessonId: string, scores: Record<string, number>) {
  const skills = LESSON_SKILL_MAP[lessonId];
  const overallScore = average(Object.values(scores));
  
  for (const skillName of skills) {
    const existing = await db.skillProgress.findUnique({
      where: { childId_skillCategory_skillName: { childId, skillCategory: getCategory(lessonId), skillName } }
    });
    
    if (existing) {
      // Rolling average: weighted toward recent (70% new, 30% old)
      const newScore = existing.score * 0.3 + overallScore * 0.7;
      const newLevel = scoreToLevel(newScore);
      await db.skillProgress.update({
        data: { score: newScore, level: newLevel, totalAttempts: existing.totalAttempts + 1, lastAssessedAt: new Date() }
      });
    } else {
      await db.skillProgress.create({
        data: { childId, skillCategory: getCategory(lessonId), skillName, score: overallScore, level: scoreToLevel(overallScore), totalAttempts: 1, lastAssessedAt: new Date() }
      });
    }
  }
}

function scoreToLevel(score: number): SkillLevel {
  if (score >= 4.5) return 'ADVANCED';
  if (score >= 3.5) return 'PROFICIENT';
  if (score >= 2.0) return 'DEVELOPING';
  return 'EMERGING';
}
```

**Skill progress UI**:
- Dashboard shows skill radar chart (narrative, persuasive, expository, descriptive)
- Each skill category expandable to show sub-skills with level badges
- Level badges: 🌱 Emerging → 🌿 Developing → 🌳 Proficient → ⭐ Advanced

#### 4.2 Streak Tracking

Track daily writing streaks to motivate consistent practice.

**Logic**:
```typescript
async function updateStreak(childId: string) {
  const streak = await db.streak.findUnique({ where: { childId } });
  const today = startOfDay(new Date());
  const lastActive = streak?.lastActiveDate ? startOfDay(streak.lastActiveDate) : null;
  
  if (!lastActive || !isSameDay(today, lastActive)) {
    const daysSinceActive = lastActive ? differenceInDays(today, lastActive) : Infinity;
    
    const newCurrent = daysSinceActive === 1 
      ? streak.currentStreak + 1    // Consecutive day — extend streak
      : daysSinceActive === 0 
        ? streak.currentStreak      // Same day — no change
        : 1;                        // Gap — reset to 1
    
    const newLongest = Math.max(newCurrent, streak?.longestStreak ?? 0);
    
    // Weekly tracking
    const weekStart = startOfWeek(today, { weekStartsOn: 1 }); // Monday
    const sameWeek = streak?.weekStartDate && isSameWeek(today, streak.weekStartDate);
    
    await db.streak.upsert({
      where: { childId },
      update: {
        currentStreak: newCurrent,
        longestStreak: newLongest,
        lastActiveDate: today,
        weeklyCompleted: sameWeek ? streak.weeklyCompleted + 1 : 1,
        weekStartDate: sameWeek ? streak.weekStartDate : weekStart,
      },
      create: {
        childId, currentStreak: 1, longestStreak: 1,
        lastActiveDate: today, weeklyGoal: 3, weeklyCompleted: 1, weekStartDate: weekStart,
      }
    });
  }
}
```

**Streak UI elements**:
- 🔥 flame icon with current streak count on dashboard
- Weekly progress bar: "2 of 3 lessons this week"
- Streak milestone celebrations: 7 days, 30 days, 100 days
- "Don't break the streak!" reminder if inactive yesterday

**New API routes**:
```
GET  /api/children/[id]/skills     — All skill progress for child
GET  /api/children/[id]/streak     — Current streak data
POST /api/children/[id]/streak/goal  — Update weekly goal
```

#### 4.3 Acceptance Criteria
```
[ ] Skill progress updates after every assessment submission
[ ] Rolling average correctly weights recent scores (70/30)
[ ] Skill levels compute correctly: Emerging < 2.0, Developing 2.0-3.4, Proficient 3.5-4.4, Advanced 4.5+
[ ] Dashboard shows skill radar chart with 4 categories
[ ] Sub-skills show individual progress bars and level badges
[ ] Streak increments when lesson completed on consecutive days
[ ] Streak resets after 1+ day gap
[ ] Weekly progress shows lessons completed vs goal
[ ] Streak data persists across sessions
[ ] Same-day activity doesn't double-count streak
```

---

### Phase 5: Achievement & Motivation System
**Estimated effort**: 3-4 days
**Dependencies**: Phase 4 (skill progress + streaks)
**Risk**: Low — additive feature, no existing code modified

#### 5.1 Badge Catalog

Badges are defined in code (not DB) and unlocked based on computed conditions.

```typescript
interface BadgeDefinition {
  id: string;
  name: string;
  description: string;
  emoji: string;
  category: 'writing' | 'progress' | 'streak' | 'skill' | 'special';
  condition: (child: ChildWithProgress) => boolean;
}

const BADGE_CATALOG: BadgeDefinition[] = [
  // WRITING BADGES
  { id: 'first_story', name: 'Story Starter', description: 'Completed your first narrative lesson', emoji: '📖',
    category: 'writing', condition: (c) => c.submissions.some(s => s.lessonId.startsWith('N')) },
  { id: 'persuasion_power', name: 'Persuasion Power', description: 'Completed your first persuasive lesson', emoji: '💪',
    category: 'writing', condition: (c) => c.submissions.some(s => s.lessonId.startsWith('P')) },
  { id: 'word_wizard_100', name: 'Word Wizard', description: 'Wrote 100+ words in a single piece', emoji: '🧙',
    category: 'writing', condition: (c) => c.submissions.some(s => s.wordCount >= 100) },
  { id: 'word_wizard_500', name: 'Word Master', description: 'Wrote 500+ words in a single piece', emoji: '📚',
    category: 'writing', condition: (c) => c.submissions.some(s => s.wordCount >= 500) },
  { id: 'revision_hero', name: 'Revision Hero', description: 'Improved your score through revision', emoji: '✨',
    category: 'writing', condition: (c) => c.submissions.some(s => s.revisionNumber > 0 && improvedScore(s)) },
  
  // PROGRESS BADGES
  { id: 'lessons_5', name: 'Getting Started', description: 'Completed 5 lessons', emoji: '🎯',
    category: 'progress', condition: (c) => c.completedLessons >= 5 },
  { id: 'lessons_25', name: 'Quarter Century', description: 'Completed 25 lessons', emoji: '🏆',
    category: 'progress', condition: (c) => c.completedLessons >= 25 },
  { id: 'lessons_50', name: 'Halfway Hero', description: 'Completed 50 lessons', emoji: '🌟',
    category: 'progress', condition: (c) => c.completedLessons >= 50 },
  { id: 'all_types', name: 'Well Rounded', description: 'Completed at least one lesson in every writing type', emoji: '🎨',
    category: 'progress', condition: (c) => hasAllTypes(c) },
  
  // STREAK BADGES
  { id: 'streak_7', name: 'Week Warrior', description: '7-day writing streak', emoji: '🔥',
    category: 'streak', condition: (c) => c.streak?.longestStreak >= 7 },
  { id: 'streak_30', name: 'Monthly Master', description: '30-day writing streak', emoji: '🔥🔥',
    category: 'streak', condition: (c) => c.streak?.longestStreak >= 30 },
  { id: 'streak_100', name: 'Century Club', description: '100-day writing streak', emoji: '💯',
    category: 'streak', condition: (c) => c.streak?.longestStreak >= 100 },
  
  // SKILL BADGES
  { id: 'first_proficient', name: 'Skill Up', description: 'Reached Proficient level in any skill', emoji: '🌳',
    category: 'skill', condition: (c) => c.skills.some(s => s.level === 'PROFICIENT') },
  { id: 'first_advanced', name: 'Writing Master', description: 'Reached Advanced level in any skill', emoji: '⭐',
    category: 'skill', condition: (c) => c.skills.some(s => s.level === 'ADVANCED') },
  { id: 'all_proficient', name: 'Renaissance Writer', description: 'Proficient in all 4 writing types', emoji: '👑',
    category: 'skill', condition: (c) => c.skills.filter(s => s.level === 'PROFICIENT' || s.level === 'ADVANCED').length >= 4 },
];
```

#### 5.2 Badge Checking Engine

Run after every lesson completion, assessment submission, and streak update:

```typescript
async function checkAndUnlockBadges(childId: string): Promise<string[]> {
  const child = await getChildWithFullProgress(childId);
  const existingBadges = await db.achievement.findMany({ where: { childId } });
  const existingIds = new Set(existingBadges.map(a => a.badgeId));
  
  const newlyUnlocked: string[] = [];
  
  for (const badge of BADGE_CATALOG) {
    if (!existingIds.has(badge.id) && badge.condition(child)) {
      await db.achievement.create({
        data: { childId, badgeId: badge.id, seen: false }
      });
      newlyUnlocked.push(badge.id);
    }
  }
  
  return newlyUnlocked;
}
```

#### 5.3 Celebration UI

When badges unlock, show a celebration overlay:
- Confetti animation (use `canvas-confetti` package)
- Badge emoji large in center
- Badge name + description
- "Keep going!" CTA
- Badge marked as `seen: true` after dismissal

**New pages**:
- Badge showcase section on child's dashboard
- `/badges/[childId]` — Full badge collection view (earned + locked)

**New API routes**:
```
GET  /api/children/[id]/badges        — All earned badges
POST /api/children/[id]/badges/seen   — Mark badges as seen
```

#### 5.4 Acceptance Criteria
```
[ ] Badges check after every lesson completion and assessment submission
[ ] Newly unlocked badges trigger celebration overlay with confetti
[ ] Badge celebration can be dismissed, marks badge as "seen"
[ ] Badge collection page shows earned badges with dates
[ ] Locked badges show as grayed out with hints on how to unlock
[ ] Streak badges unlock at correct thresholds (7, 30, 100)
[ ] Skill badges reflect actual SkillProgress levels
[ ] Writing badges check correct conditions (word count, revision improvement)
[ ] No duplicate badge unlocks
```

---

### Phase 6: Parent Dashboard & Curriculum Adaptation
**Estimated effort**: 4-5 days
**Dependencies**: Phases 1-5
**Risk**: Low — new UI, reads existing data

#### 6.1 Parent Dashboard

The parent's main interface after login — overview of all children's progress.

**New pages**:
- `/dashboard` — Parent home: children cards with quick stats
- `/dashboard/children/[id]/report` — Detailed progress report for one child
- `/dashboard/children/[id]/report/export` — CSV/PDF export

**Dashboard cards per child**:
```
┌─────────────────────────────────────────────┐
│  🦉 Maya (Age 8, Tier 1)                   │
│                                             │
│  🔥 12-day streak    📝 23 lessons done     │
│  🏆 8 badges         📊 This week: 2/3     │
│                                             │
│  Skills: Narrative ████░░ | Descriptive ██░░│
│                                             │
│  [View Progress]  [Edit Curriculum]         │
└─────────────────────────────────────────────┘
```

**Detailed report page includes**:
- Weekly activity timeline (heatmap of active days)
- Skill progress over time (line chart)
- Assessment score trends per writing type
- Recent writing samples with feedback summaries
- Achievement timeline
- Curriculum progress (X of Y weeks completed)

#### 6.2 Curriculum Adaptation

The system monitors performance and adjusts the curriculum when patterns emerge.

**Auto-adaptation triggers**:
```typescript
// Check after every assessment
async function checkCurriculumAdaptation(childId: string, lessonId: string, overallScore: number) {
  const recentScores = await db.writingSubmission.findMany({
    where: { childId },
    orderBy: { createdAt: 'desc' },
    take: 5,
    include: { feedback: true }
  });
  
  const avgRecent = average(recentScores.map(s => s.feedback.overallScore));
  
  // Trigger 1: Struggling — 3+ consecutive scores below 2.5
  const struggling = recentScores.slice(0, 3).every(s => s.feedback.overallScore < 2.5);
  if (struggling) {
    await triggerAdaptation(childId, 'struggling', {
      action: 'Insert 2 remedial lessons before next scheduled lesson',
      affectedSkills: identifyWeakSkills(recentScores)
    });
  }
  
  // Trigger 2: Excelling — 5+ consecutive scores above 4.5
  const excelling = recentScores.every(s => s.feedback.overallScore >= 4.5);
  if (excelling) {
    await triggerAdaptation(childId, 'excelling', {
      action: 'Skip next 2 foundational lessons, advance to challenging content',
      skipLessons: getNextFoundationalLessons(childId, 2)
    });
  }
  
  // Trigger 3: Type weakness — one writing type consistently 1+ points below others
  const typeScores = groupScoresByType(recentScores);
  const weakType = findWeakType(typeScores);
  if (weakType) {
    await triggerAdaptation(childId, 'type_weakness', {
      action: `Add 2 extra ${weakType} lessons to next 2 weeks`,
      weakType
    });
  }
}
```

**Parent can also manually request revision**:
- "My child is bored" → Advance difficulty
- "This is too hard" → Add scaffolding lessons
- "Focus more on stories" → Rebalance writing types
- Free-text request → AI regenerates remaining weeks

#### 6.3 Acceptance Criteria
```
[ ] Parent dashboard shows all children with quick stats
[ ] Clicking a child opens detailed progress report
[ ] Report shows skill progress over time (line chart)
[ ] Report shows weekly activity heatmap
[ ] CSV export includes all scores, dates, word counts, time spent
[ ] Auto-adaptation triggers when 3+ consecutive low scores
[ ] Auto-adaptation triggers when 5+ consecutive high scores
[ ] Parent can manually request curriculum revision
[ ] Curriculum revision preserves completed lesson progress
[ ] Revision history stored with before/after snapshots
```

---

## 4. New API Route Summary

```
AUTH
  POST /api/auth/signup
  POST /api/auth/login
  POST /api/auth/logout
  GET  /api/auth/me

CHILDREN
  POST   /api/children
  GET    /api/children
  GET    /api/children/[id]
  PATCH  /api/children/[id]
  DELETE /api/children/[id]

PLACEMENT
  POST  /api/placement/start
  POST  /api/placement/submit
  GET   /api/placement/[childId]
  PATCH /api/placement/[childId]

CURRICULUM
  POST  /api/curriculum/generate
  GET   /api/curriculum/[childId]
  PATCH /api/curriculum/[childId]
  POST  /api/curriculum/[childId]/revise

LESSONS (existing — enhanced)
  POST /api/lessons/start          — now uses auth childId
  POST /api/lessons/message        — now uses auth childId
  POST /api/lessons/submit         — now creates WritingSubmission + AIFeedback
  POST /api/lessons/revise         — now links revision chain
  GET  /api/lessons/[id]           — unchanged

PROGRESS
  GET  /api/children/[id]/progress — enhanced dashboard data
  GET  /api/children/[id]/skills   — skill progress breakdown
  GET  /api/children/[id]/streak   — streak data
  POST /api/children/[id]/streak/goal — update weekly goal
  GET  /api/children/[id]/portfolio — all writing submissions
  GET  /api/children/[id]/portfolio/export — CSV export
  GET  /api/children/[id]/badges   — earned achievements
  POST /api/children/[id]/badges/seen — mark badges as seen
  GET  /api/children/[id]/report   — parent report data
```

---

## 5. Implementation Order for Claude Code

**Use this as the task sequence when building with Claude Code. Complete each phase fully before starting the next. Commit after each numbered task.**

```
PHASE 1 — Auth & Multi-User
  1.1  Add NextAuth.js with credentials provider
  1.2  Create User model in Prisma, run migration
  1.3  Rename Student → ChildProfile, add parentId FK
  1.4  Build /auth/signup and /auth/login pages
  1.5  Add auth middleware to all API routes
  1.6  Replace hardcoded student-maya-001 with dynamic childId
  1.7  Build parent dashboard with child list
  1.8  Build add/edit child profile pages
  1.9  Verify: all existing lesson flow works with new auth
  1.10 Seed script: create default parent + migrate Maya

PHASE 2 — Placement & Curriculum
  2.1  Create PlacementResult model, run migration
  2.2  Build placement assessment page (3-prompt wizard)
  2.3  Build placement AI analysis endpoint
  2.4  Build placement results page with tier override
  2.5  Create Curriculum, CurriculumWeek, CurriculumRevision models
  2.6  Build curriculum generation AI endpoint
  2.7  Build curriculum setup page (preferences)
  2.8  Build curriculum view page (weekly breakdown)
  2.9  Update dashboard to show curriculum progress
  2.10 Verify: new child → placement → curriculum → lessons flow

PHASE 3 — Writing Submissions
  3.1  Create WritingSubmission + AIFeedback models
  3.2  Migrate existing Assessment data to new tables
  3.3  Update /api/lessons/submit to create both records
  3.4  Update /api/lessons/revise to create linked submissions
  3.5  Add wordCount and timeSpentSec tracking
  3.6  Build portfolio page with filters
  3.7  Build CSV export endpoint
  3.8  Verify: submit → feedback → revision chain works

PHASE 4 — Skill Progress & Streaks
  4.1  Create SkillProgress + Streak models
  4.2  Build LESSON_SKILL_MAP for all 100+ lessons
  4.3  Add updateSkillProgress() hook to submit endpoint
  4.4  Add updateStreak() hook to lesson completion
  4.5  Build skill progress UI on dashboard (radar chart)
  4.6  Build streak display with flame icon + weekly progress
  4.7  Verify: complete lesson → skills update → streak updates

PHASE 5 — Achievements
  5.1  Create Achievement model
  5.2  Define BADGE_CATALOG (20+ badges)
  5.3  Build checkAndUnlockBadges() engine
  5.4  Hook badge check to submit + lesson completion + streak update
  5.5  Build celebration overlay with confetti
  5.6  Build badge collection page
  5.7  Verify: earn badge → see celebration → badge in collection

PHASE 6 — Parent Dashboard & Adaptation
  6.1  Build parent dashboard with child cards
  6.2  Build detailed progress report page
  6.3  Add charts (skill over time, activity heatmap)
  6.4  Build CSV/PDF export
  6.5  Implement auto-adaptation triggers
  6.6  Build manual curriculum revision flow
  6.7  Verify: parent sees all children → reports → can adapt curriculum
```

---

## 6. CLAUDE.md Updates Required

After completing each phase, update CLAUDE.md with:
- New tables added to the schema section
- New API routes added to the API section
- New pages added to the file structure
- New components added to the dependency map
- Move completed items from "Remaining" to "Done" in Active Work Items
- Add entry to Change Log
