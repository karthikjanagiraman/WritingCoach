# Monitoring Dashboard — Product Requirements Document

**Product**: WriteWhiz Monitoring Dashboard
**Author**: Product Manager (AI)
**Date**: 2026-03-09
**Status**: Draft

---

## 1. Overview & Goals

### Problem Statement

WriteWhiz operators and developers currently have no way to observe the health, usage, and performance of the application without directly querying the PostgreSQL database. As the product grows beyond seed data and into real usage, there is no visibility into:

- How many users are active and how engagement is trending
- Whether the AI coaching pipeline is functioning correctly (latency, errors, token costs)
- Which lessons, tiers, or writing types are underperforming
- Whether curriculum adaptations are firing correctly
- Database health and growth rates

### Target Users

- **App Operators**: Non-engineering team members who need to monitor product health, engagement, and content effectiveness
- **Developers**: Engineers debugging issues, monitoring AI costs, and ensuring system reliability

### Key Success Metrics

- Time-to-insight reduced from "write a SQL query" to "glance at dashboard"
- AI cost anomalies detected within minutes instead of end-of-month billing surprises
- Lesson engagement drop-offs identified and acted on within a day

---

## 2. Dashboard Pages/Views

### 2.1 Overview (KPI Summary)

**Route**: `/monitor`
**Purpose**: At-a-glance health check for the entire application.

#### Metrics & Cards

| Metric | Source | Query |
|--------|--------|-------|
| Total Users | `User` table | `prisma.user.count()` |
| Total Children | `ChildProfile` table | `prisma.childProfile.count()` |
| Active Children (last 7 days) | `LessonEvent` table | `prisma.lessonEvent.findMany({ where: { createdAt: { gte: 7daysAgo } }, distinct: ['childId'] })` then count |
| Lessons Completed Today | `LessonProgress` where `status = 'completed'` and `completedAt` is today | `prisma.lessonProgress.count({ where: { status: 'completed', completedAt: { gte: startOfToday } } })` |
| Lessons Completed This Week | Same as above, `gte: startOfWeek` | Similar query |
| Lessons Completed This Month | Same as above, `gte: startOfMonth` | Similar query |
| Avg Assessment Score (last 30 days) | `Assessment` table | `prisma.assessment.aggregate({ _avg: { overallScore: true }, where: { createdAt: { gte: 30daysAgo } } })` |
| Total AI API Calls Today | `LLMInteraction` table | `prisma.lLMInteraction.count({ where: { createdAt: { gte: startOfToday } } })` |
| AI Error Rate (last 24h) | `LLMInteraction` where `error IS NOT NULL` | Count with error / total count |
| Avg AI Latency (last 24h) | `LLMInteraction` table | `prisma.lLMInteraction.aggregate({ _avg: { latencyMs: true }, where: { createdAt: { gte: 24hAgo } } })` |
| Total Tokens Used Today | `LLMInteraction` table | Sum of `inputTokens + outputTokens` for today |
| Subscriptions by Plan | `Subscription` table | `prisma.subscription.groupBy({ by: ['plan'], _count: true })` |

#### UI Layout

- **Top row**: 4 large KPI cards (Total Users, Active Children 7d, Lessons Completed Today, AI Calls Today) with trend arrows comparing to prior period
- **Middle row**: 4 medium cards (Avg Score 30d, AI Error Rate 24h, Avg Latency 24h, Tokens Today)
- **Bottom section**: 2-column layout
  - Left: Line chart showing lessons completed per day (last 30 days) using Recharts `LineChart`
  - Right: Line chart showing daily active children (last 30 days)

---

### 2.2 Users & Children

**Route**: `/monitor/users`
**Purpose**: Understand user growth, child distribution, and onboarding funnel health.

#### Metrics & Charts

**User Growth Over Time**
- Query: Group `User.createdAt` by day/week/month, cumulative count
- Chart: Recharts `AreaChart` with cumulative user count over time
- Prisma: Raw query or application-side accumulation from `prisma.user.findMany({ select: { createdAt: true }, orderBy: { createdAt: 'asc' } })`

**Children by Tier**
- Query: `prisma.childProfile.groupBy({ by: ['tier'], _count: true })`
- Chart: Recharts `PieChart` or horizontal `BarChart` showing Tier 1 / Tier 2 / Tier 3 distribution
- Use existing tier color tokens: `#FF6B6B` (Tier 1), `#6C5CE7` (Tier 2), `#2D3436` (Tier 3)

**Children by Age Distribution**
- Query: `prisma.childProfile.groupBy({ by: ['age'], _count: true })`
- Chart: Recharts `BarChart` with age on X-axis (7-15), count on Y-axis

**Placement Completion Funnel**
- Step 1: Children created — `prisma.childProfile.count()`
- Step 2: Placement started — `prisma.placementDraft.count()`
- Step 3: Placement completed — `prisma.placementResult.count()`
- Step 4: Curriculum generated — `prisma.curriculum.count({ where: { status: 'ACTIVE' } })`
- Chart: Funnel visualization (horizontal stacked bars or vertical funnel)

**Tier Override Rate**
- Query: `prisma.placementResult.findMany()` then compare `recommendedTier` vs `assignedTier` — count where they differ
- Display: Percentage card + breakdown table

**Subscription Distribution**
- Query: `prisma.subscription.groupBy({ by: ['plan', 'status'], _count: true })`
- Chart: Stacked `BarChart` — plans on X-axis, status as stacked segments

#### Table: Recent Signups
- Last 20 users with: name, email, createdAt, # children, subscription plan/status
- Query: `prisma.user.findMany({ take: 20, orderBy: { createdAt: 'desc' }, include: { children: { select: { id: true } }, subscription: { select: { plan: true, status: true } } } })`

---

### 2.3 Lessons & Engagement

**Route**: `/monitor/lessons`
**Purpose**: Understand lesson throughput, completion rates, and where students drop off.

#### Metrics & Charts

**Lessons Started vs Completed (last 30 days)**
- Started: `LessonProgress` records where `startedAt` is in the last 30 days
- Completed: same with `status = 'completed'`
- Chart: Recharts dual-line `LineChart` (started vs completed per day)

**Completion Rate by Writing Type**
- Query: Join `LessonProgress` with lesson catalog data (derive type from `lessonId` prefix: N=narrative, P=persuasive, E=expository, D=descriptive)
- Group by type: count completed / count started
- Chart: Recharts `BarChart` with 4 bars, one per writing type

**Completion Rate by Tier**
- Same approach, deriving tier from `lessonId` second character
- Chart: Recharts `BarChart` with 3 bars

**Phase Drop-off Funnel**
- Uses `LessonEvent` table (eventType values: `lesson_start`, `phase_transition`, `assessment_submit`)
- Or uses `Session.phase` — count sessions at each phase
- Funnel steps:
  1. Sessions started (phase = instruction)
  2. Reached guided practice
  3. Reached assessment
  4. Submitted assessment (feedback phase)
- Query: `prisma.session.groupBy({ by: ['phase'], _count: true })` — note this gives current phase, which approximates where sessions stalled
- Better: Count `LessonEvent` records by `eventType` for true funnel
- Chart: Horizontal funnel bars

**Average Lesson Duration**
- Query from `LessonCompletion.timeSpentSec` — `prisma.lessonCompletion.aggregate({ _avg: { timeSpentSec: true } })`
- Breakdown by tier and writing type
- Display: Cards + grouped bar chart

**Lesson Template Usage**
- Query: `prisma.lessonCompletion.groupBy({ by: ['template'], _count: true })`
- Chart: `PieChart` showing try_first / study_apply / workshop distribution

**Hints Usage Distribution**
- Query: `prisma.lessonCompletion.groupBy({ by: ['hintsUsed'], _count: true })`
- Chart: `BarChart` — hints used (0, 1, 2, 3) on X-axis

#### Table: Stalled Sessions
- Sessions not updated in > 24 hours that are not in "feedback" phase
- Query: `prisma.session.findMany({ where: { phase: { not: 'feedback' }, updatedAt: { lt: 24hAgo } }, take: 50, orderBy: { updatedAt: 'desc' }, include: { child: { select: { name: true, tier: true } } } })`
- Columns: Child Name, Lesson ID, Current Phase, Last Updated, Session Age

---

### 2.4 Writing & Assessments

**Route**: `/monitor/writing`
**Purpose**: Understand writing quality trends, score distributions, and revision behavior.

#### Metrics & Charts

**Average Scores by Writing Type**
- Query: Group `Assessment` by writing type (derived from `lessonId`), compute avg `overallScore`
- Chart: Recharts `BarChart` matching the existing `ScoreTrendChart` pattern, but aggregated across all children
- Use existing type colors: `#FF6B6B` (narrative), `#6C5CE7` (persuasive), `#00B894` (expository), `#FDCB6E` (descriptive)

**Score Distribution Histogram**
- Query: `prisma.assessment.findMany({ select: { overallScore: true } })`
- Bucket into ranges: 0-1, 1-2, 2-3, 3-4
- Chart: `BarChart` histogram

**Score Trends Over Time**
- Query: Group assessments by week, compute avg score per week
- Chart: Recharts `LineChart` showing weekly average score trend

**Revision Behavior**
- Total submissions: `prisma.writingSubmission.count()`
- Revisions: `prisma.writingSubmission.count({ where: { revisionNumber: { gt: 0 } } })`
- Revision rate: revisions / total
- Avg score improvement on revision: Compare `AIFeedback.overallScore` for original vs revision submissions
- Display: KPI cards + comparison bar chart

**Word Count Distribution**
- Query: `prisma.writingSubmission.findMany({ select: { wordCount: true } })`
- Bucket into ranges: 0-50, 50-100, 100-200, 200-500, 500+
- Chart: `BarChart` histogram
- Also: avg word count by tier and by writing type

**Skill Level Distribution**
- Query: `prisma.skillProgress.groupBy({ by: ['level'], _count: true })`
- Chart: `PieChart` showing EMERGING / DEVELOPING / PROFICIENT / ADVANCED distribution

**Top/Bottom Skills**
- Query: `prisma.skillProgress.groupBy({ by: ['skillCategory', 'skillName'], _avg: { score: true } })`
- Display: Two ranked lists — top 5 highest avg scores, bottom 5 lowest avg scores
- Reference `SKILL_DEFINITIONS` from `src/lib/skill-map.ts` for display names

---

### 2.5 Streaks & Badges

**Route**: `/monitor/engagement`
**Purpose**: Understand motivation system effectiveness.

#### Metrics & Charts

**Streak Distribution**
- Query: `prisma.streak.findMany({ select: { currentStreak: true, longestStreak: true } })`
- Chart: `BarChart` histogram of current streak lengths (0, 1-2, 3-5, 6-10, 11+)

**Weekly Goal Achievement**
- Query: `prisma.streak.findMany({ select: { weeklyGoal: true, weeklyCompleted: true } })`
- Compute: % of children meeting their weekly goal
- Display: KPI card with percentage + `BarChart` of goal vs completed

**Badge Unlock Rates**
- Query: `prisma.achievement.groupBy({ by: ['badgeId'], _count: true })`
- Cross-reference with `BADGE_CATALOG` from `src/lib/badges.ts` (12 badges total)
- Chart: Horizontal `BarChart` — badge names on Y-axis, unlock count on X-axis, colored by rarity (common/rare/epic/legendary)

**Most/Least Earned Badges**
- Derived from the above groupBy
- Display: Two columns — most earned (top 5 with counts) and least earned (bottom 5)

**Badge Seen Rate**
- Query: % of achievements where `seen = true`
- Indicates whether children notice/engage with badge notifications

---

### 2.6 Curriculum

**Route**: `/monitor/curriculum`
**Purpose**: Monitor curriculum generation, adaptation, and progression.

#### Metrics & Charts

**Curriculum Status Distribution**
- Query: `prisma.curriculum.groupBy({ by: ['status'], _count: true })`
- Chart: `PieChart` — GENERATING / ACTIVE / PAUSED / COMPLETED

**Curriculum Generation Count (over time)**
- Query: Group `Curriculum.createdAt` by week
- Chart: `BarChart` showing new curricula per week

**Revision Rates & Triggers**
- Query: `prisma.curriculumRevision.groupBy({ by: ['reason'], _count: true })`
- Reasons: `auto_struggling`, `auto_excelling`, `parent_request`
- Chart: `PieChart` or `BarChart` showing distribution of adaptation triggers

**Focus Area Distribution**
- Query: Parse `Curriculum.focusAreas` (JSON array) across all curricula
- Count frequency of each focus area (narrative, persuasive, expository, descriptive)
- Chart: `BarChart`

**Week Completion Progress**
- Query: `prisma.curriculumWeek.groupBy({ by: ['status'], _count: true })`
- Chart: Stacked bar or `PieChart` — pending / in_progress / completed

**Lessons Per Week Setting Distribution**
- Query: `prisma.curriculum.groupBy({ by: ['lessonsPerWeek'], _count: true })`
- Chart: `BarChart`

---

### 2.7 AI & Performance

**Route**: `/monitor/ai`
**Purpose**: Monitor LLM costs, latency, errors, and usage patterns. This is the most operationally critical page.

#### Data Source

The `LLMInteraction` table already captures comprehensive telemetry:
- `requestType`: `lesson_start`, `lesson_message`, `assessment_eval`, `placement_start`, `placement_analysis`, `curriculum_generate`, `curriculum_revise`, `report_summary`
- `provider`: `anthropic`, `google`, `deepinfra`, `groq`, `novita`
- `model`: specific model ID
- `inputTokens`, `outputTokens`, `cacheReadTokens`, `cacheWriteTokens`
- `latencyMs`
- `error`: non-null when the call failed
- `createdAt`: timestamp

The `SystemPromptLog` table tracks unique system prompts by hash, with byte length.

#### Metrics & Charts

**API Calls Over Time**
- Query: Group `LLMInteraction.createdAt` by hour (last 24h) or by day (last 30d)
- Chart: Recharts `AreaChart` showing call volume over time
- Toggle: 24h (hourly) / 7d (daily) / 30d (daily)

**Calls by Request Type**
- Query: `prisma.lLMInteraction.groupBy({ by: ['requestType'], _count: true, where: { createdAt: { gte: periodStart } } })`
- Chart: `BarChart` or `PieChart`

**Calls by Provider/Model**
- Query: `prisma.lLMInteraction.groupBy({ by: ['provider', 'model'], _count: true })`
- Chart: `BarChart` grouped by provider

**Token Usage**
- Query: Sum `inputTokens`, `outputTokens`, `cacheReadTokens`, `cacheWriteTokens` grouped by day
- Chart: Stacked `AreaChart` — input tokens, output tokens, cache read, cache write over time
- KPI cards: Total tokens today, estimated cost (using known pricing: Anthropic Sonnet = $3/$15 per MTok input/output, cache read at $0.30/MTok)

**Cost Estimation**
- Compute from token counts using provider pricing:
  - Anthropic Claude Sonnet 4.5: $3/MTok input, $15/MTok output, $0.30/MTok cache read, $3.75/MTok cache write
  - Google Gemini 2.5 Flash: $0.15/MTok input, $0.60/MTok output
  - DeepInfra Qwen: ~$0.35/MTok input, $0.40/MTok output
- Display: Daily cost chart + cumulative monthly cost + cost per lesson estimate
- Note: Pricing is approximate and should be configurable

**Latency Distribution**
- Query: Fetch `latencyMs` values for recent calls
- Chart: Histogram bucketed into ranges (0-500ms, 500-1000ms, 1-2s, 2-5s, 5s+)
- Also: `LineChart` of p50/p95/p99 latency over time (computed application-side from raw data)

**Error Rate & Recent Errors**
- Query: Count errors vs total, grouped by day
- Chart: `LineChart` showing error rate % over time
- Table: Last 20 errors with `requestType`, `model`, `error` message, `createdAt`

**Cache Hit Rate (Anthropic)**
- Query: For Anthropic calls, compute `cacheReadTokens / (inputTokens)` ratio
- Chart: `LineChart` over time showing cache efficiency
- KPI card: Current cache hit rate %

**System Prompt Stats**
- Query: `prisma.systemPromptLog.findMany()` — count unique prompts, avg byte length
- Table: List of unique prompt hashes with byte length, first seen date, and usage count (from `LLMInteraction` relation)

---

### 2.8 Database Health

**Route**: `/monitor/database`
**Purpose**: Quick check on database size, growth, and connectivity.

#### Metrics

**Table Row Counts**
- Query: `prisma.TABLE.count()` for each of the ~22 tables
- Display: Table with columns: Table Name, Row Count, sorted by count descending
- Color coding: normal (< 10K), warning (10K-100K), alert (> 100K)

**Recent Record Timestamps**
- For key tables (User, ChildProfile, Session, LLMInteraction, LessonEvent), show the most recent `createdAt`
- Indicates whether the system is actively receiving data
- Query: `prisma.TABLE.findFirst({ orderBy: { createdAt: 'desc' }, select: { createdAt: true } })`

**Growth Rates**
- Records created per day for key tables over last 30 days
- Chart: Multi-line `LineChart`

**Connection Status**
- Simple health check: execute `prisma.$queryRaw(SELECT 1)` and measure response time
- Display: Green/Red indicator + response time in ms
- Show which database URL is connected (masked, showing only host:port/dbname)

---

## 3. Database Connection Switching

### Strategy

Support two database connections controlled by environment variables, with a UI toggle on the monitoring dashboard.

#### Environment Variables

```
# Primary (dev) database — already exists
DATABASE_URL=postgresql://user:pass@localhost:5432/writingcoach

# Monitoring database connections
MONITOR_DEV_DATABASE_URL=postgresql://user:pass@localhost:5432/writingcoach
MONITOR_PROD_DATABASE_URL=postgresql://readonly_user:pass@prod-host:5432/writingcoach
```

#### Implementation

Create a separate Prisma client factory for the monitoring dashboard:

```typescript
// src/lib/monitor-db.ts
import { PrismaClient } from "@prisma/client";

const clients: Record<string, PrismaClient> = {};

export function getMonitorClient(env: "dev" | "prod"): PrismaClient {
  const url = env === "prod"
    ? process.env.MONITOR_PROD_DATABASE_URL
    : process.env.MONITOR_DEV_DATABASE_URL || process.env.DATABASE_URL;

  if (!url) throw new Error(`No database URL configured for ${env}`);

  if (!clients[env]) {
    clients[env] = new PrismaClient({
      datasourceUrl: url,
    });
  }
  return clients[env];
}
```

#### UI Toggle

- Dropdown selector in the monitoring dashboard header: "Dev" | "Prod"
- Selected environment persisted in `localStorage` so it survives page refreshes
- Passed as a query parameter (`?env=prod`) to all monitoring API routes
- Visual indicator: green badge for dev, red badge for prod

#### Safety Considerations

- **Production database MUST use a read-only PostgreSQL user** — the connection string should use credentials that only have `SELECT` privileges
- Monitor API routes should only execute read operations (no `create`, `update`, `delete`)
- Display a clear visual warning banner when viewing production data
- Never expose full connection strings in the UI — only show `hostname:port/database`

---

## 4. Data Refresh Strategy

### Approach: Manual Refresh + Optional Auto-Refresh

The monitoring dashboard is not a real-time dashboard. Queries are executed on-demand.

#### Default Behavior
- Data loads on page navigation (initial fetch)
- Manual "Refresh" button in the dashboard header triggers a re-fetch
- Display "Last refreshed: X minutes ago" timestamp

#### Optional Auto-Refresh
- Toggle in the header: "Auto-refresh: Off / 30s / 1m / 5m"
- When enabled, uses `setInterval` on the client to re-fetch data
- Default: Off (to avoid unnecessary database load)

#### Caching

- **API-level**: Use Next.js 15 route segment config with `revalidate` for moderate caching
  ```typescript
  export const revalidate = 30; // Cache for 30 seconds
  ```
- **Client-level**: SWR-style stale-while-revalidate pattern — show cached data immediately, fetch fresh data in background
- **Expensive aggregations** (like full table counts across all 22 tables): Cache for 60 seconds minimum

#### Performance Considerations

- Use `COUNT(*)` rather than `findMany` + `.length` for counts
- Use `groupBy` and `aggregate` for aggregations instead of fetching all records
- For the AI page token summaries, use Prisma `aggregate` with `_sum`
- For time-series data, limit to relevant date ranges (last 30/90 days)
- For histograms, fetch only the fields needed (`select` specific columns)
- Add database indexes if needed (most critical tables already have indexes on `createdAt` — see `LLMInteraction` and `LessonEvent` schemas)

---

## 5. Access Control

### Recommended Approach: ADMIN Role Check

The existing auth system already supports a `UserRole` enum with `PARENT` and `ADMIN` values. Use this.

#### Implementation

1. **Middleware protection**: Add `/monitor/:path*` to the existing auth middleware matcher in `src/middleware.ts`
2. **API-level role check**: Every monitoring API route must verify `session.user.role === 'ADMIN'`

```typescript
// In each /api/monitor/* route
const session = await auth();
if (!session?.user?.userId) {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}
// Check admin role
const user = await prisma.user.findUnique({ where: { id: session.user.userId } });
if (user?.role !== "ADMIN") {
  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}
```

3. **Page-level guard**: The monitoring layout component should check the session role and redirect non-admins
4. **No UI link for non-admins**: The monitoring dashboard should not appear in navigation for regular users

#### Creating Admin Users

- No self-service admin creation — admins are created via direct database update or a seed script:
  ```sql
  UPDATE "User" SET role = 'ADMIN' WHERE email = 'admin@example.com';
  ```
- Add an admin user to the seed script (`prisma/seed.ts`) for development

---

## 6. Technical Implementation Recommendations

### Routing Structure

```
src/app/monitor/
  layout.tsx              # Admin guard + monitoring nav sidebar + env toggle
  page.tsx                # Overview (redirects or shows KPIs)
  users/page.tsx          # Users & Children
  lessons/page.tsx        # Lessons & Engagement
  writing/page.tsx        # Writing & Assessments
  engagement/page.tsx     # Streaks & Badges
  curriculum/page.tsx     # Curriculum
  ai/page.tsx             # AI & Performance
  database/page.tsx       # Database Health
```

### API Routes

```
src/app/api/monitor/
  overview/route.ts       # GET — KPI summary data
  users/route.ts          # GET — user growth, children distribution
  lessons/route.ts        # GET — lesson throughput, funnel, stalled sessions
  writing/route.ts        # GET — scores, revisions, word counts, skills
  engagement/route.ts     # GET — streaks, badges
  curriculum/route.ts     # GET — curriculum stats
  ai/route.ts             # GET — LLM usage, tokens, latency, errors
  database/route.ts       # GET — table counts, health check
```

Each API route should:
- Accept `?env=dev|prod` query parameter to select database
- Accept `?period=24h|7d|30d|90d` for time-range filtering
- Return JSON with consistent shape
- Use the admin role guard described in Section 5

### Middleware Update

Add monitoring routes to the middleware matcher:

```typescript
export const config = {
  matcher: [
    // ... existing matchers
    "/monitor/:path*",
  ],
};
```

### Reusable Components to Build

#### `MonitorLayout` (`src/app/monitor/layout.tsx`)
- Sidebar navigation linking to each monitoring page
- Header with: environment toggle (dev/prod), refresh button, last-refreshed timestamp, auto-refresh toggle
- Admin role guard (redirect to `/dashboard` if not admin)
- Clean, data-focused styling — use neutral grays rather than tier colors

#### `KpiCard` (`src/components/monitor/KpiCard.tsx`)
- Props: `title`, `value`, `subtitle?`, `trend?` (up/down/flat with percentage), `color?`
- Compact card with large number, label, and optional trend indicator
- Reusable across all monitoring pages

#### `MonitorChart` (`src/components/monitor/MonitorChart.tsx`)
- Wrapper around Recharts components with consistent styling
- Props: `title`, `children` (chart content), `subtitle?`
- White card with border, consistent padding, title styling

#### `DataTable` (`src/components/monitor/DataTable.tsx`)
- Props: `columns`, `data`, `maxRows?`
- Sortable columns, alternating row colors, compact typography
- Optional pagination for large datasets

#### `FunnelChart` (`src/components/monitor/FunnelChart.tsx`)
- Horizontal bar funnel visualization
- Props: `steps: { label: string, value: number, color?: string }[]`
- Shows absolute count and % of previous step

#### `EnvironmentBadge` (`src/components/monitor/EnvironmentBadge.tsx`)
- Visual indicator: green "DEV" badge or red "PROD" badge
- Used in the header and optionally on each card

### Charts Library

Use **Recharts** (already installed and used in the app). Specific chart types needed:

- `LineChart` — time series (daily active users, scores over time, token usage)
- `BarChart` — distributions and comparisons (tier distribution, score histogram)
- `AreaChart` — cumulative metrics (user growth, token usage over time)
- `PieChart` — proportional distributions (curriculum status, badge rarity)
- `RadarChart` — already exists for skills, may be reused

### Styling Approach

- **Not tier-themed**: The monitoring dashboard should use a neutral, data-focused palette rather than the colorful tier system
- **Base colors**: Slate grays for backgrounds, with accent colors for data visualization
- **Font**: Use DM Sans (already loaded as the Tier 2 font) for a clean, professional look
- **Cards**: White backgrounds, subtle borders (`border-slate-200`), rounded corners (`rounded-xl`)
- **Charts**: Consistent color palette for data series: `#6366F1` (indigo), `#06B6D4` (cyan), `#10B981` (emerald), `#F59E0B` (amber), `#EF4444` (red)

---

## 7. Prioritized Feature List

### P0 — Must Have for v1

These are essential for basic operational visibility. Ship these first.

1. **Overview page** with core KPIs (users, active children, lessons completed, AI calls today)
2. **AI & Performance page** — token usage, latency, error rate, cost estimation. This is the most operationally urgent page since AI costs can spike unexpectedly.
3. **Database Health page** — table row counts, connection status, recent timestamps
4. **Admin role guard** — protect all monitoring routes from non-admin users
5. **MonitorLayout** — sidebar navigation, refresh button, last-refreshed timestamp
6. **KpiCard and DataTable components** — foundational reusable components

### P1 — Important, v1.1

These provide deeper product insights once basic monitoring is in place.

7. **Lessons & Engagement page** — completion rates, phase drop-off funnel, stalled sessions
8. **Writing & Assessments page** — score distributions, trends, revision rates, skill rankings
9. **Users & Children page** — user growth, tier distribution, placement funnel
10. **Database connection switching** (dev/prod toggle) — critical before connecting to production
11. **Auto-refresh toggle**
12. **Cost estimation with configurable pricing** on the AI page

### P2 — Nice to Have, Future

These are valuable but can wait for a later iteration.

13. **Streaks & Badges page** — motivation system effectiveness
14. **Curriculum page** — adaptation triggers, focus area distribution
15. **Export to CSV** for any table or chart data
16. **Alerting**: configurable thresholds that highlight metrics in red (e.g., error rate > 5%, avg latency > 3s)
17. **Comparison view**: side-by-side comparison of dev vs prod metrics
18. **Date range picker** for custom time periods on all charts
19. **Drill-down**: Click a KPI card to navigate to the relevant detail page

---

## Appendix A: Database Tables Reference

All 22 tables available for monitoring queries:

| Table | Key Monitoring Use | Row Growth Rate |
|-------|-------------------|-----------------|
| `User` | User growth, signups | Low (one per parent) |
| `ChildProfile` | Child distribution, tier breakdown | Low (few per user) |
| `LessonProgress` | Lesson throughput, completion rates | Medium (one per child per lesson) |
| `Session` | Active sessions, phase distribution | Medium (one per lesson attempt) |
| `Assessment` | Score analysis, quality trends | Medium (one per completed lesson) |
| `PlacementDraft` | Placement funnel (in-progress) | Low |
| `PlacementResult` | Placement funnel (completed), tier recommendations | Low (one per child) |
| `Curriculum` | Curriculum generation, status | Low (one per child) |
| `CurriculumWeek` | Week progression | Low-Medium |
| `CurriculumRevision` | Adaptation frequency, trigger types | Low |
| `WritingSubmission` | Writing volume, word counts, revisions | Medium-High |
| `AIFeedback` | AI feedback quality, model usage | Medium |
| `SkillProgress` | Skill distribution, level progression | Medium |
| `Streak` | Engagement consistency | Low (one per child) |
| `Achievement` | Badge unlock rates | Low-Medium |
| `LessonCompletion` | Completion details, duration, hints | Medium |
| `LessonScore` | Per-criterion score data | Medium-High |
| `WritingSample` | Writing sample volume | Medium |
| `StudentPreference` | Preference tracking | Low-Medium |
| `LearnerProfileSnapshot` | Profile computation tracking | Low (one per child) |
| `Subscription` | Plan distribution, billing status | Low |
| `AccessCode` | Code redemption tracking | Very Low |
| `SystemPromptLog` | Unique prompt tracking, prompt size | Very Low |
| `LLMInteraction` | AI call volume, tokens, latency, errors | **High** (multiple per lesson) |
| `LessonEvent` | Event-level engagement tracking | **High** (multiple per session) |

## Appendix B: Existing Patterns to Reuse

| Pattern | Source File | Reuse In |
|---------|------------|----------|
| Recharts BarChart with type colors | `src/components/charts/ScoreTrendChart.tsx` | Score distributions on Writing page |
| Activity Heatmap (GitHub-style) | `src/components/charts/ActivityHeatmap.tsx` | System-wide activity on Overview page |
| Radar Chart | `src/components/SkillRadarChart.tsx` | Aggregate skill distribution on Writing page |
| Auth session check pattern | `src/app/api/children/[id]/report/route.ts` | All monitoring API routes |
| Prisma client singleton | `src/lib/db.ts` | Base pattern for `monitor-db.ts` |
| CSS tier color tokens | `src/app/globals.css` | Reference only — monitoring uses neutral palette |
| SectionLabel component | `src/components/shared/SectionLabel.tsx` | Section headers in monitoring pages |

## Appendix C: Estimated API Response Sizes

To help with performance planning:

| API Route | Estimated Response Size | Query Complexity |
|-----------|------------------------|------------------|
| `/api/monitor/overview` | ~500 bytes | 8-10 simple counts/aggregates |
| `/api/monitor/users` | ~2-5 KB | Growth data + table of 20 users |
| `/api/monitor/lessons` | ~3-5 KB | Aggregations + stalled sessions table |
| `/api/monitor/writing` | ~2-4 KB | Score aggregations + skill rankings |
| `/api/monitor/engagement` | ~1-2 KB | Streak/badge aggregations |
| `/api/monitor/curriculum` | ~1-2 KB | Curriculum status counts |
| `/api/monitor/ai` | ~5-15 KB | Time-series token data (largest) |
| `/api/monitor/database` | ~1-2 KB | Table counts + timestamps |
