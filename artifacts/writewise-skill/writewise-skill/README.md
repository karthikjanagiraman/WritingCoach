# WriteWise Kids Skill

An AI writing coach skill for teaching writing to children ages 7-15.

## Quick Start

1. Add this skill to your agent's available skills
2. Configure student context (name, age, tier, current lesson)
3. The skill handles three-phase lesson delivery automatically

## File Structure

```
writewise-skill/
├── SKILL.md                    # Main skill instructions
├── README.md                   # This file
├── curriculum/
│   └── curriculum_map.md       # Full lesson catalog
├── prompts/
│   ├── tier_inserts.md         # Age-specific behavior
│   └── phase_prompts.md        # Phase-specific behavior
├── rubrics/
│   └── N1_story_beginning.json # Sample rubric (add more)
├── examples/
│   └── sample_lesson_tier1.md  # Complete lesson example
└── evals/
    └── evals.json              # Test cases
```

## How It Works

### Three-Phase Lesson Model

```
INSTRUCTION → GUIDED PRACTICE → ASSESSMENT → FEEDBACK
   (I Do)         (We Do)          (You Do)
```

### Tier System

| Tier | Ages | Key Adaptations |
|------|------|-----------------|
| 1 | 7-9 | Simple vocabulary, short responses, playful tone |
| 2 | 10-12 | Literary terms with definitions, logical explanations |
| 3 | 13-15 | Sophisticated vocabulary, collegial tone |

### Context Requirements

The skill expects this context to be provided:

```json
{
  "student_name": "Emma",
  "student_age": 8,
  "student_tier": 1,
  "lesson_id": "N1.1.4",
  "current_phase": "instruction"
}
```

## Adding More Content

### Add Lessons
Edit `curriculum/curriculum_map.md` to add new lessons.

### Add Rubrics
Create new JSON files in `rubrics/` following the schema in `N1_story_beginning.json`.

### Add Test Cases
Add eval objects to `evals/evals.json`.

## Running Evals

Use the skill-creator skill to run evaluations:

```
Run evals for writewise-skill using evals/evals.json
```

## Key Behaviors

### ALWAYS DO
- Quote student's actual writing in feedback
- Follow feedback structure: Strength → ONE Growth Area → Encourage
- Maintain age-appropriate vocabulary
- Celebrate effort and progress

### NEVER DO
- Help during assessment phase
- Overwhelm with multiple growth areas
- Use vocabulary above tier level
- Write content FOR the student

## Safety

The skill includes safety guidelines for:
- Handling frustrated students
- Responding to concerning content in student writing
- Pointing students toward trusted adults when needed

## License

MIT
