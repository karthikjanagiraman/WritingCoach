# WriteWise Skill Integration Guide

## Overview

This guide shows how to integrate the WriteWise Kids skill into your application. The skill provides instructions that shape Claude's behavior as a writing coach.

---

## Option 1: Direct System Prompt Integration (Simplest)

If you're calling the Claude API directly, include the skill content in your system prompt.

### File Structure

```
your-project/
├── src/
│   ├── prompts/
│   │   ├── writewise-skill/        # Copy skill folder here
│   │   │   ├── SKILL.md
│   │   │   ├── prompts/
│   │   │   │   ├── tier_inserts.md
│   │   │   │   └── phase_prompts.md
│   │   │   ├── rubrics/
│   │   │   │   └── *.json
│   │   │   └── curriculum/
│   │   │       └── curriculum_map.md
│   │   └── prompt-builder.ts       # Your prompt assembly logic
│   ├── api/
│   │   └── chat.ts                 # API route
│   └── lib/
│       └── session.ts              # Session state management
```

### Prompt Builder (TypeScript)

```typescript
// src/prompts/prompt-builder.ts

import fs from 'fs';
import path from 'path';

const SKILL_DIR = path.join(process.cwd(), 'src/prompts/writewise-skill');

// Load skill files once at startup
const skillContent = {
  core: fs.readFileSync(path.join(SKILL_DIR, 'SKILL.md'), 'utf-8'),
  tierInserts: fs.readFileSync(path.join(SKILL_DIR, 'prompts/tier_inserts.md'), 'utf-8'),
  phasePrompts: fs.readFileSync(path.join(SKILL_DIR, 'prompts/phase_prompts.md'), 'utf-8'),
};

// Parse tier inserts into separate sections
function getTierInsert(tier: 1 | 2 | 3): string {
  const tierLabels = {
    1: '## Tier 1 Insert (Ages 7-9)',
    2: '## Tier 2 Insert (Ages 10-12)', 
    3: '## Tier 3 Insert (Ages 13-15)',
  };
  
  const content = skillContent.tierInserts;
  const startMarker = tierLabels[tier];
  const startIndex = content.indexOf(startMarker);
  
  // Find next tier section or end
  const nextTierIndex = Math.min(
    ...Object.values(tierLabels)
      .map(label => content.indexOf(label, startIndex + 1))
      .filter(i => i > startIndex)
  );
  
  return content.slice(startIndex, nextTierIndex === Infinity ? undefined : nextTierIndex);
}

// Parse phase prompts into separate sections
function getPhasePrompt(phase: 'instruction' | 'guided' | 'assessment' | 'feedback'): string {
  const phaseLabels = {
    instruction: '## Instruction Phase',
    guided: '## Guided Practice Phase',
    assessment: '## Assessment Phase',
    feedback: '## Feedback Phase',
  };
  
  const content = skillContent.phasePrompts;
  const startMarker = phaseLabels[phase];
  const startIndex = content.indexOf(startMarker);
  
  const nextPhaseIndex = Math.min(
    ...Object.values(phaseLabels)
      .map(label => content.indexOf(label, startIndex + 1))
      .filter(i => i > startIndex)
  );
  
  return content.slice(startIndex, nextPhaseIndex === Infinity ? undefined : nextPhaseIndex);
}

// Load rubric for current lesson
function getRubric(lessonId: string): object | null {
  const rubricMap: Record<string, string> = {
    'N1.1': 'N1_story_beginning',
    'N1.2': 'N1_story_middle',
    'N1.3': 'N1_story_ending',
    // Add more mappings...
  };
  
  const prefix = lessonId.split('.').slice(0, 2).join('.');
  const rubricId = rubricMap[prefix];
  
  if (!rubricId) return null;
  
  try {
    const rubricPath = path.join(SKILL_DIR, `rubrics/${rubricId}.json`);
    return JSON.parse(fs.readFileSync(rubricPath, 'utf-8'));
  } catch {
    return null;
  }
}

// Session context type
interface SessionContext {
  studentName: string;
  studentAge: number;
  studentTier: 1 | 2 | 3;
  lessonId: string;
  lessonTitle: string;
  currentPhase: 'instruction' | 'guided' | 'assessment' | 'feedback';
  phaseState: {
    instructionCompleted?: boolean;
    comprehensionPassed?: boolean;
    guidedAttempts?: number;
    hintsGiven?: number;
    assessmentSubmitted?: boolean;
  };
}

// Build the complete system prompt
export function buildSystemPrompt(session: SessionContext): string {
  const parts: string[] = [];
  
  // 1. Core skill instructions
  parts.push(skillContent.core);
  
  // 2. Tier-specific adaptations
  parts.push(getTierInsert(session.studentTier));
  
  // 3. Phase-specific behavior
  parts.push(getPhasePrompt(session.currentPhase));
  
  // 4. Current session context
  parts.push(`
## Current Session Context

Student: ${session.studentName} (age ${session.studentAge}, Tier ${session.studentTier})
Lesson: ${session.lessonId} - ${session.lessonTitle}
Current Phase: ${session.currentPhase.toUpperCase()}

Phase State:
- Instruction completed: ${session.phaseState.instructionCompleted ?? false}
- Comprehension check passed: ${session.phaseState.comprehensionPassed ?? false}
- Guided practice attempts: ${session.phaseState.guidedAttempts ?? 0}
- Hints given: ${session.phaseState.hintsGiven ?? 0}
- Assessment submitted: ${session.phaseState.assessmentSubmitted ?? false}
`);

  // 5. Rubric (if in assessment or feedback phase)
  if (session.currentPhase === 'assessment' || session.currentPhase === 'feedback') {
    const rubric = getRubric(session.lessonId);
    if (rubric) {
      parts.push(`
## Assessment Rubric

Use this rubric to grade the student's submission:

\`\`\`json
${JSON.stringify(rubric, null, 2)}
\`\`\`
`);
    }
  }
  
  return parts.join('\n\n---\n\n');
}
```

### API Route (Next.js Example)

```typescript
// src/app/api/chat/route.ts

import Anthropic from '@anthropic-ai/sdk';
import { buildSystemPrompt } from '@/prompts/prompt-builder';
import { getSession, updateSession } from '@/lib/session';

const anthropic = new Anthropic();

export async function POST(request: Request) {
  const { sessionId, message } = await request.json();
  
  // Get current session state
  const session = await getSession(sessionId);
  
  // Build the system prompt with skill + context
  const systemPrompt = buildSystemPrompt(session);
  
  // Get conversation history
  const messages = session.conversationHistory.map(msg => ({
    role: msg.role as 'user' | 'assistant',
    content: msg.content,
  }));
  
  // Add new user message
  messages.push({ role: 'user', content: message });
  
  // Call Claude
  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1024,
    system: systemPrompt,
    messages: messages,
  });
  
  const assistantMessage = response.content[0].type === 'text' 
    ? response.content[0].text 
    : '';
  
  // Update session with new messages
  await updateSession(sessionId, {
    conversationHistory: [
      ...session.conversationHistory,
      { role: 'user', content: message },
      { role: 'assistant', content: assistantMessage },
    ],
  });
  
  // Detect phase transitions (simplified)
  const newPhase = detectPhaseTransition(session, assistantMessage);
  if (newPhase !== session.currentPhase) {
    await updateSession(sessionId, { currentPhase: newPhase });
  }
  
  return Response.json({ 
    message: assistantMessage,
    phase: newPhase ?? session.currentPhase,
  });
}

function detectPhaseTransition(
  session: SessionContext, 
  response: string
): SessionContext['currentPhase'] | null {
  // Simple keyword detection - you may want something more robust
  if (session.currentPhase === 'instruction') {
    if (response.toLowerCase().includes("let's practice") || 
        response.toLowerCase().includes("ready to practice")) {
      return 'guided';
    }
  }
  
  if (session.currentPhase === 'guided') {
    if (response.toLowerCase().includes("your turn") ||
        response.toLowerCase().includes("ready to write your own")) {
      return 'assessment';
    }
  }
  
  // Assessment to feedback happens on submission detection
  // (handled separately when user submits their writing)
  
  return null;
}
```

---

## Option 2: Skill as a Module (Recommended for Larger Apps)

Create a proper TypeScript module that encapsulates all skill logic.

### Project Structure

```
your-project/
├── src/
│   ├── skills/
│   │   └── writewise/
│   │       ├── index.ts            # Main exports
│   │       ├── skill.ts            # Skill content loader
│   │       ├── prompt-builder.ts   # Prompt construction
│   │       ├── session.ts          # Session state types
│   │       ├── rubrics.ts          # Rubric handling
│   │       ├── content/            # Raw skill files
│   │       │   ├── SKILL.md
│   │       │   ├── tier_inserts.md
│   │       │   ├── phase_prompts.md
│   │       │   └── rubrics/
│   │       └── __tests__/          # Tests
│   └── api/
│       └── lessons/
│           └── route.ts
```

### Module Entry Point

```typescript
// src/skills/writewise/index.ts

export { WriteWiseSkill } from './skill';
export { buildWriteWisePrompt } from './prompt-builder';
export { 
  WriteWiseSession, 
  LessonPhase, 
  StudentTier,
  createSession,
  updateSession 
} from './session';
export { getRubric, gradeSubmission } from './rubrics';
```

### Skill Class

```typescript
// src/skills/writewise/skill.ts

import fs from 'fs';
import path from 'path';

export class WriteWiseSkill {
  private static instance: WriteWiseSkill;
  private content: Map<string, string> = new Map();
  private rubrics: Map<string, object> = new Map();
  
  private constructor() {
    this.loadContent();
  }
  
  static getInstance(): WriteWiseSkill {
    if (!WriteWiseSkill.instance) {
      WriteWiseSkill.instance = new WriteWiseSkill();
    }
    return WriteWiseSkill.instance;
  }
  
  private loadContent(): void {
    const contentDir = path.join(__dirname, 'content');
    
    // Load markdown files
    this.content.set('core', fs.readFileSync(
      path.join(contentDir, 'SKILL.md'), 'utf-8'
    ));
    this.content.set('tierInserts', fs.readFileSync(
      path.join(contentDir, 'tier_inserts.md'), 'utf-8'
    ));
    this.content.set('phasePrompts', fs.readFileSync(
      path.join(contentDir, 'phase_prompts.md'), 'utf-8'
    ));
    
    // Load rubrics
    const rubricsDir = path.join(contentDir, 'rubrics');
    const rubricFiles = fs.readdirSync(rubricsDir);
    for (const file of rubricFiles) {
      if (file.endsWith('.json')) {
        const rubricId = file.replace('.json', '');
        const rubricContent = JSON.parse(
          fs.readFileSync(path.join(rubricsDir, file), 'utf-8')
        );
        this.rubrics.set(rubricId, rubricContent);
      }
    }
  }
  
  getCorePrompt(): string {
    return this.content.get('core') ?? '';
  }
  
  getTierInsert(tier: 1 | 2 | 3): string {
    const content = this.content.get('tierInserts') ?? '';
    // Parse and return specific tier section
    return this.extractSection(content, `## Tier ${tier} Insert`);
  }
  
  getPhasePrompt(phase: string): string {
    const content = this.content.get('phasePrompts') ?? '';
    const phaseMap: Record<string, string> = {
      instruction: '## Instruction Phase',
      guided: '## Guided Practice Phase',
      assessment: '## Assessment Phase',
      feedback: '## Feedback Phase',
    };
    return this.extractSection(content, phaseMap[phase] ?? '');
  }
  
  getRubric(rubricId: string): object | undefined {
    return this.rubrics.get(rubricId);
  }
  
  private extractSection(content: string, startMarker: string): string {
    const startIndex = content.indexOf(startMarker);
    if (startIndex === -1) return '';
    
    // Find next ## heading or end of content
    const nextHeadingMatch = content.slice(startIndex + startMarker.length)
      .match(/\n## /);
    const endIndex = nextHeadingMatch 
      ? startIndex + startMarker.length + (nextHeadingMatch.index ?? 0)
      : content.length;
    
    return content.slice(startIndex, endIndex);
  }
}
```

### Session Types

```typescript
// src/skills/writewise/session.ts

export type StudentTier = 1 | 2 | 3;
export type LessonPhase = 'instruction' | 'guided' | 'assessment' | 'feedback';

export interface PhaseState {
  instructionCompleted: boolean;
  comprehensionPassed: boolean;
  guidedAttempts: number;
  hintsGiven: number;
  assessmentSubmitted: boolean;
  scores?: Record<string, number>;
}

export interface WriteWiseSession {
  id: string;
  studentId: string;
  studentName: string;
  studentAge: number;
  studentTier: StudentTier;
  lessonId: string;
  lessonTitle: string;
  currentPhase: LessonPhase;
  phaseState: PhaseState;
  conversationHistory: Array<{
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
  }>;
  createdAt: Date;
  updatedAt: Date;
}

export function createSession(params: {
  studentId: string;
  studentName: string;
  studentAge: number;
  lessonId: string;
  lessonTitle: string;
}): WriteWiseSession {
  // Determine tier from age
  const tier: StudentTier = params.studentAge <= 9 ? 1 
    : params.studentAge <= 12 ? 2 
    : 3;
  
  return {
    id: crypto.randomUUID(),
    studentId: params.studentId,
    studentName: params.studentName,
    studentAge: params.studentAge,
    studentTier: tier,
    lessonId: params.lessonId,
    lessonTitle: params.lessonTitle,
    currentPhase: 'instruction',
    phaseState: {
      instructionCompleted: false,
      comprehensionPassed: false,
      guidedAttempts: 0,
      hintsGiven: 0,
      assessmentSubmitted: false,
    },
    conversationHistory: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}
```

---

## Option 3: Database-Stored Skill (For Dynamic Updates)

Store skill content in your database so you can update it without redeploying.

### Database Schema (Prisma Example)

```prisma
// prisma/schema.prisma

model Skill {
  id          String   @id @default(cuid())
  name        String   @unique
  version     String
  corePrompt  String   @db.Text
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  tierInserts  TierInsert[]
  phasePrompts PhasePrompt[]
  rubrics      Rubric[]
}

model TierInsert {
  id       String @id @default(cuid())
  skillId  String
  tier     Int    // 1, 2, or 3
  content  String @db.Text
  
  skill    Skill  @relation(fields: [skillId], references: [id])
  
  @@unique([skillId, tier])
}

model PhasePrompt {
  id       String @id @default(cuid())
  skillId  String
  phase    String // instruction, guided, assessment, feedback
  content  String @db.Text
  
  skill    Skill  @relation(fields: [skillId], references: [id])
  
  @@unique([skillId, phase])
}

model Rubric {
  id          String @id @default(cuid())
  skillId     String
  rubricId    String // e.g., "N1_story_beginning"
  lessonIds   String[] // lessons that use this rubric
  content     Json
  
  skill       Skill  @relation(fields: [skillId], references: [id])
  
  @@unique([skillId, rubricId])
}

model LessonSession {
  id                  String   @id @default(cuid())
  studentId           String
  lessonId            String
  currentPhase        String
  phaseState          Json
  conversationHistory Json
  createdAt           DateTime @default(now())
  updatedAt           DateTime @updatedAt
}
```

### Seed Script

```typescript
// prisma/seed-writewise.ts

import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

async function seedWriteWiseSkill() {
  const skillDir = path.join(__dirname, '../src/skills/writewise/content');
  
  // Create or update skill
  const skill = await prisma.skill.upsert({
    where: { name: 'writewise-kids' },
    create: {
      name: 'writewise-kids',
      version: '1.0.0',
      corePrompt: fs.readFileSync(path.join(skillDir, 'SKILL.md'), 'utf-8'),
    },
    update: {
      version: '1.0.0',
      corePrompt: fs.readFileSync(path.join(skillDir, 'SKILL.md'), 'utf-8'),
    },
  });
  
  // Add tier inserts
  const tierContent = fs.readFileSync(
    path.join(skillDir, 'tier_inserts.md'), 'utf-8'
  );
  
  for (const tier of [1, 2, 3]) {
    const content = extractTierSection(tierContent, tier);
    await prisma.tierInsert.upsert({
      where: { skillId_tier: { skillId: skill.id, tier } },
      create: { skillId: skill.id, tier, content },
      update: { content },
    });
  }
  
  // Add phase prompts
  const phaseContent = fs.readFileSync(
    path.join(skillDir, 'phase_prompts.md'), 'utf-8'
  );
  
  for (const phase of ['instruction', 'guided', 'assessment', 'feedback']) {
    const content = extractPhaseSection(phaseContent, phase);
    await prisma.phasePrompt.upsert({
      where: { skillId_phase: { skillId: skill.id, phase } },
      create: { skillId: skill.id, phase, content },
      update: { content },
    });
  }
  
  // Add rubrics
  const rubricsDir = path.join(skillDir, 'rubrics');
  const rubricFiles = fs.readdirSync(rubricsDir);
  
  for (const file of rubricFiles) {
    if (!file.endsWith('.json')) continue;
    
    const rubricId = file.replace('.json', '');
    const rubric = JSON.parse(
      fs.readFileSync(path.join(rubricsDir, file), 'utf-8')
    );
    
    await prisma.rubric.upsert({
      where: { skillId_rubricId: { skillId: skill.id, rubricId } },
      create: {
        skillId: skill.id,
        rubricId,
        lessonIds: rubric.lesson_ids ?? [],
        content: rubric,
      },
      update: {
        lessonIds: rubric.lesson_ids ?? [],
        content: rubric,
      },
    });
  }
  
  console.log('WriteWise skill seeded successfully');
}

seedWriteWiseSkill();
```

---

## Frontend Integration

### React Context for Session

```typescript
// src/contexts/LessonContext.tsx

import React, { createContext, useContext, useState, useCallback } from 'react';

interface LessonContextType {
  session: WriteWiseSession | null;
  isLoading: boolean;
  error: string | null;
  sendMessage: (message: string) => Promise<void>;
  startLesson: (lessonId: string) => Promise<void>;
  submitWriting: (text: string) => Promise<void>;
}

const LessonContext = createContext<LessonContextType | null>(null);

export function LessonProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<WriteWiseSession | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const startLesson = useCallback(async (lessonId: string) => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/lessons/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lessonId }),
      });
      const data = await response.json();
      setSession(data.session);
    } catch (err) {
      setError('Failed to start lesson');
    } finally {
      setIsLoading(false);
    }
  }, []);
  
  const sendMessage = useCallback(async (message: string) => {
    if (!session) return;
    
    setIsLoading(true);
    try {
      const response = await fetch('/api/lessons/message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          sessionId: session.id, 
          message,
        }),
      });
      const data = await response.json();
      
      // Update session with new message and phase
      setSession(prev => prev ? {
        ...prev,
        currentPhase: data.phase,
        conversationHistory: [
          ...prev.conversationHistory,
          { role: 'user', content: message, timestamp: new Date() },
          { role: 'assistant', content: data.message, timestamp: new Date() },
        ],
      } : null);
    } catch (err) {
      setError('Failed to send message');
    } finally {
      setIsLoading(false);
    }
  }, [session]);
  
  const submitWriting = useCallback(async (text: string) => {
    if (!session) return;
    
    // Mark as submission and send
    await sendMessage(`[SUBMISSION]\n\n${text}`);
  }, [session, sendMessage]);
  
  return (
    <LessonContext.Provider value={{
      session,
      isLoading,
      error,
      sendMessage,
      startLesson,
      submitWriting,
    }}>
      {children}
    </LessonContext.Provider>
  );
}

export function useLesson() {
  const context = useContext(LessonContext);
  if (!context) {
    throw new Error('useLesson must be used within LessonProvider');
  }
  return context;
}
```

### Usage in Component

```typescript
// src/components/LessonView.tsx

import { useLesson } from '@/contexts/LessonContext';

export function LessonView() {
  const { session, isLoading, sendMessage, submitWriting } = useLesson();
  const [input, setInput] = useState('');
  const [writingText, setWritingText] = useState('');
  
  if (!session) return <div>Loading...</div>;
  
  const handleSend = () => {
    if (input.trim()) {
      sendMessage(input);
      setInput('');
    }
  };
  
  const handleSubmit = () => {
    if (writingText.trim()) {
      submitWriting(writingText);
    }
  };
  
  return (
    <div>
      {/* Phase indicator */}
      <PhaseIndicator currentPhase={session.currentPhase} />
      
      {/* Chat messages */}
      <div className="messages">
        {session.conversationHistory.map((msg, i) => (
          <MessageBubble key={i} role={msg.role} content={msg.content} />
        ))}
      </div>
      
      {/* Input area - changes based on phase */}
      {session.currentPhase === 'assessment' ? (
        <div className="writing-area">
          <textarea
            value={writingText}
            onChange={(e) => setWritingText(e.target.value)}
            placeholder="Write your story..."
          />
          <button onClick={handleSubmit} disabled={isLoading}>
            Submit
          </button>
        </div>
      ) : (
        <div className="chat-input">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
          />
          <button onClick={handleSend} disabled={isLoading}>
            Send
          </button>
        </div>
      )}
    </div>
  );
}
```

---

## Environment Variables

```env
# .env.local

# Anthropic API
ANTHROPIC_API_KEY=your-api-key

# Database (if using Option 3)
DATABASE_URL=postgresql://...

# Session config
SESSION_SECRET=your-session-secret
```

---

## Quick Start Checklist

1. [ ] Copy `writewise-skill/` folder to your project
2. [ ] Create prompt builder that loads skill files
3. [ ] Set up session state management (memory, Redis, or database)
4. [ ] Create API route that builds prompt and calls Claude
5. [ ] Wire up frontend to send messages and display responses
6. [ ] Handle phase transitions based on Claude's responses
7. [ ] Test with sample conversations from `examples/`

---

## Testing Your Integration

```bash
# Run a quick test
curl -X POST http://localhost:3000/api/lessons/message \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "test-session",
    "message": "Hi, I am Emma and I am 8 years old. Can you teach me about story hooks?"
  }'
```

Expected response should:
- Use simple vocabulary (Tier 1)
- Explain what a hook is
- Give an example
- End with a comprehension question
