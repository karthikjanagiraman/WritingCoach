# WriteWise Kids — Integration Guide

## Package Contents

This curriculum package contains three interconnected components:

| File | Purpose | Format |
|------|---------|--------|
| `writewise_curriculum_map.md` | Complete curriculum structure | Markdown |
| `writewise_system_prompts.md` | AI coach behavior prompts | Markdown |
| `writewise_rubrics.json` | Assessment rubrics | JSON |

---

## How They Work Together

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           CURRICULUM MAP                                    │
│                                                                             │
│   Defines WHAT to teach                                                     │
│   • Units and lessons for each tier/writing type                           │
│   • Learning objectives                                                     │
│   • Skill progressions                                                      │
│                         ↓                                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                         SYSTEM PROMPTS                                      │
│                                                                             │
│   Defines HOW the AI teaches                                               │
│   • Core personality and rules                                             │
│   • Tier-specific adaptations (language, length, engagement)               │
│   • Phase-specific behavior (instruction, guided, assessment)              │
│                         ↓                                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                            RUBRICS                                          │
│                                                                             │
│   Defines HOW to assess                                                    │
│   • Criteria for each assignment type                                      │
│   • Scoring levels (1-4)                                                   │
│   • Feedback stems for strengths and growth areas                          │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Integration Architecture

### 1. Session Initialization

When a student starts a lesson:

```javascript
// Fetch lesson metadata from curriculum
const lesson = curriculum.tiers[studentTier].units[unitId].lessons[lessonId];

// Build the system prompt
const systemPrompt = [
  CORE_SYSTEM_PROMPT,
  TIER_INSERTS[studentTier],
  PHASE_PROMPTS[currentPhase],
  formatLessonContext(lesson),
  formatSessionState(session)
].join('\n\n');

// If assessment phase, include rubric
if (currentPhase === 'assessment') {
  const rubric = rubrics[lesson.rubric_id];
  systemPrompt += formatRubric(rubric);
}
```

### 2. Database Schema (Suggested)

```sql
-- Students
CREATE TABLE students (
  id UUID PRIMARY KEY,
  name VARCHAR(100),
  age INT,
  tier INT CHECK (tier IN (1, 2, 3)),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Lesson Progress
CREATE TABLE lesson_progress (
  id UUID PRIMARY KEY,
  student_id UUID REFERENCES students(id),
  lesson_id VARCHAR(50),  -- e.g., "N1.1.5"
  status VARCHAR(20),     -- not_started, in_progress, completed
  current_phase VARCHAR(20),
  started_at TIMESTAMP,
  completed_at TIMESTAMP
);

-- Session State (for resuming)
CREATE TABLE sessions (
  id UUID PRIMARY KEY,
  student_id UUID REFERENCES students(id),
  lesson_id VARCHAR(50),
  phase VARCHAR(20),
  phase_state JSONB,      -- hints given, attempts, etc.
  conversation_history JSONB,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);

-- Assessment Results
CREATE TABLE assessments (
  id UUID PRIMARY KEY,
  session_id UUID REFERENCES sessions(id),
  student_id UUID REFERENCES students(id),
  lesson_id VARCHAR(50),
  rubric_id VARCHAR(50),
  submission_text TEXT,
  scores JSONB,           -- { "criterion_name": score, ... }
  overall_score DECIMAL(3,2),
  feedback TEXT,
  created_at TIMESTAMP
);
```

### 3. API Endpoints (Suggested)

```
POST /api/lessons/start
  Body: { student_id, lesson_id }
  Returns: { session_id, initial_prompt }

POST /api/lessons/message
  Body: { session_id, message }
  Returns: { response, phase_update?, assessment_result? }

GET /api/students/:id/progress
  Returns: { completed_lessons, current_lesson, skills_mastered }

GET /api/rubrics/:rubric_id
  Returns: Rubric object from JSON file
```

### 4. Prompt Assembly Example

```javascript
function buildPrompt(session, studentMessage) {
  const student = getStudent(session.student_id);
  const lesson = getLessonFromCurriculum(session.lesson_id);
  const rubric = session.phase === 'assessment' 
    ? getRubric(lesson.rubric_id) 
    : null;

  return `
${CORE_SYSTEM_PROMPT}

${TIER_INSERTS[student.tier]}

${PHASE_PROMPTS[session.phase]}

## Current Lesson: ${lesson.title}
Learning Objectives:
${lesson.learning_objectives.map(obj => `- ${obj}`).join('\n')}

## Session State
Student: ${student.name} (age ${student.age}, Tier ${student.tier})
Phase: ${session.phase}
Attempts this exercise: ${session.phase_state.attempts || 0}
Hints given: ${session.phase_state.hints_given || 0}

${rubric ? `## Assessment Rubric\n${formatRubric(rubric)}` : ''}

## Conversation History
${formatConversationHistory(session.conversation_history)}

## Current Student Message
${studentMessage}
`;
}
```

---

## Curriculum Reference Quick Lookup

### Writing Types → Lesson Prefixes
| Type | Prefix | Example |
|------|--------|---------|
| Narrative | N | N2.3.4 = Tier 2, Unit 3, Lesson 4 |
| Persuasive | P | P1.2.1 = Tier 1, Unit 2, Lesson 1 |
| Expository | E | E3.1.6 = Tier 3, Unit 1, Lesson 6 |
| Descriptive | D | D2.2.5 = Tier 2, Unit 2, Lesson 5 |

### Rubric ID Pattern
```
{Type}{Tier}_{skill_focus}

Examples:
- N1_story_beginning    → Narrative, Tier 1, Story Beginning assessment
- P2_persuasive_essay   → Persuasive, Tier 2, Persuasive Essay assessment  
- E3_literary_analysis  → Expository, Tier 3, Literary Analysis assessment
```

---

## Customization Points

### Adding New Lessons
1. Add lesson entry to `writewise_curriculum_map.md`
2. If new assessment type, add rubric to `writewise_rubrics.json`
3. Map `lesson_id` to `rubric_id` in your application

### Adjusting Difficulty
- Modify `word_range` in rubrics for length expectations
- Adjust criteria weights for emphasis
- Edit `levels` descriptions for tier-appropriate expectations

### Customizing Feedback
- Edit `feedback_stems` in rubrics for different phrasing
- Modify `PHASE_PROMPTS` for different coaching styles
- Adjust `TIER_INSERTS` for different age adaptations

---

## Testing Checklist

Before deploying, verify:

- [ ] System prompts produce age-appropriate responses
- [ ] Phase transitions work correctly (instruction → guided → assessment)
- [ ] Rubric scoring applies correctly
- [ ] Feedback quotes student's actual writing
- [ ] Hints escalate appropriately
- [ ] Session state persists across page refreshes
- [ ] Long conversations don't exceed context limits

---

## Quick Start

1. Load `writewise_rubrics.json` into your application
2. Create constants from `writewise_system_prompts.md`
3. Use `writewise_curriculum_map.md` as reference for lesson structure
4. Build lesson content based on curriculum specifications
5. Wire up the three-phase lesson flow with your UI

---

## Support

These files are designed to be a starting foundation. You'll likely want to:

- Flesh out individual lesson content (exercises, mentor texts)
- Build a lesson content CMS
- Add student analytics and progress visualization
- Create a placement assessment for tier assignment
- Build parent/teacher dashboards

Let me know if you need help with any of these extensions!
