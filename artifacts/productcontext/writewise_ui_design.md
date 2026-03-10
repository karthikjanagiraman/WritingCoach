# WriteWhiz — UI Design Specification

## Design Philosophy

### Core Principles

1. **Encouraging, Not Overwhelming**: The interface should feel like a supportive friend, not a demanding teacher
2. **Clear Progress**: Students should always know where they are in their learning journey
3. **Age-Adaptive**: Visual complexity increases with tier (playful → sophisticated)
4. **Writing-Focused**: The writing area is the hero; everything else supports it
5. **Celebration of Effort**: Visual rewards for progress, not just perfection

### Design Tokens (CSS Variables)

```css
:root {
  /* Tier 1: Playful & Warm */
  --tier1-primary: #FF6B6B;      /* Coral */
  --tier1-secondary: #4ECDC4;    /* Teal */
  --tier1-accent: #FFE66D;       /* Sunny Yellow */
  --tier1-bg: #FFF9F0;           /* Warm Cream */
  --tier1-text: #2D3436;
  
  /* Tier 2: Confident & Cool */
  --tier2-primary: #6C5CE7;      /* Purple */
  --tier2-secondary: #00B894;    /* Mint */
  --tier2-accent: #FDCB6E;       /* Gold */
  --tier2-bg: #F8F9FD;           /* Cool White */
  --tier2-text: #2D3436;
  
  /* Tier 3: Sophisticated & Focused */
  --tier3-primary: #2D3436;      /* Charcoal */
  --tier3-secondary: #0984E3;    /* Blue */
  --tier3-accent: #E17055;       /* Terracotta */
  --tier3-bg: #FFFFFF;           /* Clean White */
  --tier3-text: #2D3436;
  
  /* Universal */
  --success: #00B894;
  --warning: #FDCB6E;
  --error: #FF7675;
  --shadow-soft: 0 4px 20px rgba(0,0,0,0.08);
  --shadow-medium: 0 8px 30px rgba(0,0,0,0.12);
  --radius-small: 8px;
  --radius-medium: 16px;
  --radius-large: 24px;
  
  /* Typography Scale */
  --font-display: 'Nunito', sans-serif;      /* Tier 1 */
  --font-body-t1: 'Nunito', sans-serif;
  --font-display-t2: 'DM Sans', sans-serif;  /* Tier 2 */
  --font-body-t2: 'DM Sans', sans-serif;
  --font-display-t3: 'Sora', sans-serif;     /* Tier 3 */
  --font-body-t3: 'Sora', sans-serif;
}
```

---

## Screen Architecture

### 1. Dashboard (Home)

```
┌─────────────────────────────────────────────────────────────────────┐
│  ┌──────┐                                              [Settings]   │
│  │Avatar│  Hi, Maya! Ready to write today?                         │
│  └──────┘                                                           │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  📚 CURRENT LESSON                                                  │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  Story Beginnings That Hook                                 │   │
│  │  ████████████░░░░░░░░  Phase 2 of 3                        │   │
│  │                                                             │   │
│  │  [Continue Lesson →]                                        │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  🏆 YOUR PROGRESS                                                   │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐           │
│  │ Stories  │  │ Opinions │  │   Info   │  │ Describe │           │
│  │   ⭐⭐⭐   │  │   ⭐⭐    │  │    ⭐     │  │   ⭐⭐⭐   │           │
│  │  12/20   │  │   8/15   │  │   4/18   │  │  10/15   │           │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘           │
│                                                                     │
│  📖 RECENT WORK                                                     │
│  ┌────────────────────────────────┐  ┌─────────────────────────┐   │
│  │ "The Mysterious Door"          │  │ "My Opinion on Pizza"   │   │
│  │ ⭐⭐⭐⭐ · Jan 20                │  │ ⭐⭐⭐ · Jan 18           │   │
│  └────────────────────────────────┘  └─────────────────────────┘   │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

**Key Features:**
- Personalized greeting with coach avatar
- Prominent "continue lesson" CTA
- Visual progress across writing types
- Portfolio of recent work

---

### 2. Lesson View — Three-Phase Layout

This is the core learning interface. The layout adapts based on the current phase.

#### Phase Indicator (Always Visible)

```
┌─────────────────────────────────────────────────────────────────────┐
│                                                                     │
│    ①─────────●─────────②─────────○─────────③                       │
│   Learn      Practice      Write                                   │
│   ✓ Done     In Progress   Locked                                  │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

#### Phase 1: Direct Instruction View

```
┌─────────────────────────────────────────────────────────────────────┐
│  ← Back                     Lesson 1.1                    [?] Help │
├─────────────────────────────────────────────────────────────────────┤
│  ①━━━━━━━━━━━●━━━━━━━━━━━②━━━━━━━━━━━○━━━━━━━━━━━③                 │
│                                                                     │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│   ┌─────────────────────────────────────────────────────────────┐  │
│   │                                                             │  │
│   │  ┌────────┐                                                 │  │
│   │  │ Coach  │  "Today we're learning about HOOKS —           │  │
│   │  │ Avatar │   the exciting first sentence that makes       │  │
│   │  └────────┘   readers want to keep reading!"               │  │
│   │                                                             │  │
│   │  ─────────────────────────────────────────────────────────  │  │
│   │                                                             │  │
│   │  📖 EXAMPLE                                                 │  │
│   │  ┌───────────────────────────────────────────────────────┐ │  │
│   │  │ "The door wasn't there yesterday."                    │ │  │
│   │  │                                                       │ │  │
│   │  │ See how this makes you wonder: What door?            │ │  │
│   │  │ Why is it there now? You HAVE to keep reading!       │ │  │
│   │  └───────────────────────────────────────────────────────┘ │  │
│   │                                                             │  │
│   └─────────────────────────────────────────────────────────────┘  │
│                                                                     │
│   ┌─────────────────────────────────────────────────────────────┐  │
│   │  Quick Question: What makes the example hook interesting?  │  │
│   │                                                             │  │
│   │  ┌─────────────────────────────────────────────────────┐   │  │
│   │  │ Type your answer here...                            │   │  │
│   │  └─────────────────────────────────────────────────────┘   │  │
│   │                                                             │  │
│   │                                          [Check Answer →]   │  │
│   └─────────────────────────────────────────────────────────────┘  │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

**Design Notes:**
- Coach avatar is prominent and friendly
- Content area has clear visual hierarchy
- Examples are highlighted in a distinct card
- Comprehension check at bottom before advancing

---

#### Phase 2: Guided Practice View

```
┌─────────────────────────────────────────────────────────────────────┐
│  ← Back                     Lesson 1.1                    [?] Help │
├─────────────────────────────────────────────────────────────────────┤
│  ①━━━━━━━━━━━✓━━━━━━━━━━━②━━━━━━━━━━━●━━━━━━━━━━━③                 │
│                                                                     │
├───────────────────────────────────┬─────────────────────────────────┤
│                                   │                                 │
│   💬 COACH CHAT                   │   ✏️ YOUR WRITING              │
│                                   │                                 │
│   ┌────────────────────────────┐  │   ┌─────────────────────────┐  │
│   │ ┌────┐                     │  │   │                         │  │
│   │ │ 🦉 │ Let's practice!     │  │   │  The spaceship landed   │  │
│   │ └────┘                     │  │   │  with a huge BOOM!      │  │
│   │                            │  │   │                         │  │
│   │ Here's a boring beginning: │  │   │                         │  │
│   │                            │  │   │                         │  │
│   │ "It was a nice day."       │  │   │                         │  │
│   │                            │  │   │                         │  │
│   │ Can you rewrite it to      │  │   │                         │  │
│   │ make it a HOOK?            │  │   │                         │  │
│   └────────────────────────────┘  │   │                         │  │
│                                   │   │                         │  │
│   ┌────────────────────────────┐  │   │                         │  │
│   │         You wrote:         │  │   │                         │  │
│   │ "The spaceship landed..."  │  │   │                         │  │
│   └────────────────────────────┘  │   │                         │  │
│                                   │   │                         │  │
│   ┌────────────────────────────┐  │   │                         │  │
│   │ ┌────┐                     │  │   └─────────────────────────┘  │
│   │ │ 🦉 │ Ooh, exciting! 💥   │  │                                 │
│   │ └────┘                     │  │   Word count: 7                │
│   │                            │  │                                 │
│   │ Great use of action and    │  │   ┌───────────────────────┐   │
│   │ sound! Can you add WHO     │  │   │ 💡 Hint Available     │   │
│   │ sees the spaceship?        │  │   └───────────────────────┘   │
│   └────────────────────────────┘  │                                 │
│                                   │   [Save Draft]  [Submit →]     │
│   ┌────────────────────────────┐  │                                 │
│   │ Type your response...      │  │                                 │
│   │                     [Send] │  │                                 │
│   └────────────────────────────┘  │                                 │
│                                   │                                 │
└───────────────────────────────────┴─────────────────────────────────┘
```

**Design Notes:**
- Split view: chat on left, writing on right
- Chat shows back-and-forth with coach
- Hint button available but not intrusive
- Word count helps students track progress
- Can save draft or submit when ready

---

#### Phase 3: Assessment View

```
┌─────────────────────────────────────────────────────────────────────┐
│  ← Back                     Lesson 1.1                    [?] Help │
├─────────────────────────────────────────────────────────────────────┤
│  ①━━━━━━━━━━━✓━━━━━━━━━━━②━━━━━━━━━━━✓━━━━━━━━━━━③                 │
│                                                                     │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│   ┌─────────────────────────────────────────────────────────────┐  │
│   │  📝 YOUR TURN!                                              │  │
│   │                                                             │  │
│   │  Write your own story beginning with a great hook.         │  │
│   │                                                             │  │
│   │  ✓ Include a hook that makes readers curious               │  │
│   │  ✓ Introduce your main character                           │  │
│   │  ✓ Tell us where the story takes place                     │  │
│   │                                                             │  │
│   │  Goal: 50-100 words                                         │  │
│   └─────────────────────────────────────────────────────────────┘  │
│                                                                     │
│   ┌─────────────────────────────────────────────────────────────┐  │
│   │                                                             │  │
│   │  Maya's heart pounded as she stared at the ancient map     │  │
│   │  spread across her grandmother's dusty attic floor.        │  │
│   │  The X marked a spot she recognized — it was right         │  │
│   │  under her own backyard treehouse.                         │  │
│   │                                                             │  │
│   │                                                             │  │
│   │                                                             │  │
│   │                                                             │  │
│   │                                                             │  │
│   │                                                             │  │
│   └─────────────────────────────────────────────────────────────┘  │
│                                                                     │
│   Word count: 47/50-100                    [Save Draft]  [Submit →]│
│   ████████████████████░░░░░░░░░░░░░░░░░░░                          │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

**Design Notes:**
- Clear task description with checklist
- Large, distraction-free writing area
- Word count with visual progress bar
- No coach chat during independent writing (per pedagogical model)

---

#### Feedback View (After Assessment Submission)

```
┌─────────────────────────────────────────────────────────────────────┐
│                                                                     │
│   🎉 GREAT WORK, MAYA!                                             │
│                                                                     │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│   ┌─────────────────────────────────────────────────────────────┐  │
│   │                                                             │  │
│   │   YOUR SCORE                                                │  │
│   │                                                             │  │
│   │   ⭐⭐⭐⭐                                                     │  │
│   │   Exceeds Expectations!                                     │  │
│   │                                                             │  │
│   │   Hook           ████████████████████  4/4                  │  │
│   │   Character      ████████████████░░░░  3/4                  │  │
│   │   Setting        ████████████████████  4/4                  │  │
│   │                                                             │  │
│   └─────────────────────────────────────────────────────────────┘  │
│                                                                     │
│   ┌─────────────────────────────────────────────────────────────┐  │
│   │  ┌────┐                                                     │  │
│   │  │ 🦉 │  COACH FEEDBACK                                     │  │
│   │  └────┘                                                     │  │
│   │                                                             │  │
│   │  ✨ What you did really well:                               │  │
│   │                                                             │  │
│   │  Your hook was fantastic! "Maya's heart pounded" — I       │  │
│   │  immediately felt the excitement. And the mystery of       │  │
│   │  the X being under HER treehouse? Perfect!                 │  │
│   │                                                             │  │
│   │  ─────────────────────────────────────────────────────────  │  │
│   │                                                             │  │
│   │  📈 One thing to work on:                                   │  │
│   │                                                             │  │
│   │  I'd love to know a tiny bit more about Maya. What does    │  │
│   │  she look like? How old is she? One small detail would     │  │
│   │  help readers picture her better.                          │  │
│   │                                                             │  │
│   │  ─────────────────────────────────────────────────────────  │  │
│   │                                                             │  │
│   │  Keep writing — you have a gift for creating mystery! 🌟    │  │
│   │                                                             │  │
│   └─────────────────────────────────────────────────────────────┘  │
│                                                                     │
│   [View My Writing]      [Next Lesson →]                           │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

**Design Notes:**
- Celebratory header with animation
- Visual score breakdown (not just numbers)
- Feedback organized: strength → growth → encouragement
- Clear next steps

---

## Component Library

### 1. Coach Avatar

```
┌─────────────────────────────┐
│                             │
│   Tier 1: Friendly Owl      │   🦉 "Ollie" - warm, wise, playful
│   (animated eyes, bouncy)   │   
│                             │
│   Tier 2: Cool Fox          │   🦊 "Felix" - confident, encouraging
│   (sleek, modern)           │
│                             │
│   Tier 3: Thoughtful Wolf   │   🐺 "Sage" - sophisticated, collegial
│   (minimal, elegant)        │
│                             │
└─────────────────────────────┘
```

**States:**
- Idle (subtle breathing animation)
- Thinking (dots or spinning)
- Celebrating (confetti, bounce)
- Encouraging (thumbs up, sparkle)

### 2. Progress Indicators

**Lesson Progress (Horizontal Steps)**
```
①━━━━━✓━━━━━②━━━━━●━━━━━③
Learn      Practice     Write
```

**Skill Progress (Radial)**
```
    ╭───────╮
   ╱  75%    ╲
  │  ████░░░  │
   ╲ Stories ╱
    ╰───────╯
```

**Writing Progress (Linear)**
```
Word count: 47/50-100
████████████████████░░░░░░░░░░
```

### 3. Chat Bubbles

**Coach Message:**
```css
.coach-bubble {
  background: var(--tier-primary);
  color: white;
  border-radius: 20px 20px 20px 4px;
  padding: 16px 20px;
  max-width: 80%;
  margin-left: 48px; /* space for avatar */
}
```

**Student Message:**
```css
.student-bubble {
  background: var(--tier-bg);
  border: 2px solid var(--tier-secondary);
  border-radius: 20px 20px 4px 20px;
  padding: 16px 20px;
  max-width: 80%;
  margin-left: auto;
}
```

### 4. Writing Area

```css
.writing-area {
  font-family: 'Literata', Georgia, serif; /* Readable serif for writing */
  font-size: 18px;
  line-height: 1.8;
  padding: 32px;
  border: none;
  border-radius: var(--radius-large);
  background: white;
  box-shadow: var(--shadow-soft);
  min-height: 300px;
}

.writing-area:focus {
  box-shadow: var(--shadow-medium);
  outline: 2px solid var(--tier-secondary);
}
```

### 5. Feedback Cards

**Strength Card:**
```css
.feedback-strength {
  background: linear-gradient(135deg, #E8F5E9 0%, #C8E6C9 100%);
  border-left: 4px solid var(--success);
  padding: 20px;
  border-radius: var(--radius-medium);
}
```

**Growth Card:**
```css
.feedback-growth {
  background: linear-gradient(135deg, #FFF8E1 0%, #FFECB3 100%);
  border-left: 4px solid var(--warning);
  padding: 20px;
  border-radius: var(--radius-medium);
}
```

---

## Responsive Considerations

### Mobile (< 768px)

- Stack chat and writing vertically
- Collapse phase indicator to icons only
- Full-width writing area
- Floating "Submit" button at bottom

### Tablet (768px - 1024px)

- Side-by-side layout maintained
- Slightly smaller coach avatar
- Collapsible sidebar

### Desktop (> 1024px)

- Full layout as designed
- Optional: third column for lesson outline/notes

---

## Animations & Micro-interactions

### Page Transitions
- Slide in from right when advancing
- Fade + scale when returning

### Phase Completion
- Step icon transforms: ○ → ● with pulse
- Confetti burst (subtle for Tier 2/3)
- Progress line fills with animation

### Coach Interactions
- Avatar bounces slightly when new message
- Typing indicator (three dots) while AI generates
- Celebration animation on good feedback

### Writing Area
- Subtle pulse on focus
- Word count animates on change
- Progress bar fills smoothly

### Score Reveal
- Stars appear one by one
- Bars animate from 0 to score
- Staggered reveal of feedback sections

---

## Accessibility Requirements

1. **Color Contrast**: All text meets WCAG AA (4.5:1 for body, 3:1 for large)
2. **Focus States**: Visible focus rings on all interactive elements
3. **Screen Reader**: 
   - Phase announcements ("Now entering guided practice")
   - Score read aloud
   - Coach messages announced
4. **Keyboard Navigation**: Full tab navigation through all controls
5. **Reduced Motion**: Respect `prefers-reduced-motion` for animations
6. **Font Scaling**: Supports up to 200% zoom without breaking layout

---

## State Management (Frontend)

```typescript
interface LessonState {
  lessonId: string;
  currentPhase: 'instruction' | 'guided' | 'assessment' | 'feedback';
  instructionState: {
    contentViewed: boolean;
    comprehensionCheckPassed: boolean;
  };
  guidedState: {
    messages: Message[];
    currentDraft: string;
    hintsUsed: number;
    attempts: number;
  };
  assessmentState: {
    draft: string;
    submitted: boolean;
    submissionTime?: Date;
  };
  feedbackState: {
    scores: Record<string, number>;
    feedback: string;
    viewed: boolean;
  };
}

interface Message {
  id: string;
  role: 'coach' | 'student';
  content: string;
  timestamp: Date;
}
```

---

## Next Steps

1. Create interactive prototype (Figma or React)
2. Test with target age groups
3. Refine animations and transitions
4. Build component library in Storybook
5. Implement accessibility audit
