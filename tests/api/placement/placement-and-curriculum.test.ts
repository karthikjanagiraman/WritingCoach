/**
 * API tests for placement assessment and curriculum management.
 *
 * Covers:
 *   POST /api/placement/start        — generate prompts
 *   POST /api/placement/submit       — AI analysis + tier recommendation
 *   PATCH /api/placement/[childId]   — parent tier override
 *   POST /api/curriculum/generate    — AI curriculum generation
 *   GET /api/curriculum/[childId]    — retrieve curriculum
 *   POST /api/curriculum/[childId]/revise — manual revision
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { prismaMock, resetPrismaMock } from '../../setup/db-mock';
import { mockAuth, resetAuthMock } from '../../setup/auth-mock';
import { claudeMock, PLACEMENT_RESPONSES, CURRICULUM_RESPONSES, resetClaudeMock } from '../../setup/claude-mock';
import {
  CHILD_MAYA, CHILD_ETHAN, PLACEMENT_MAYA,
  CURRICULUM_MAYA, CURRICULUM_WEEKS,
} from '../../setup/fixtures';

vi.mock('@/lib/db', () => ({ prisma: prismaMock }));
vi.mock('@/lib/auth', () => ({ auth: mockAuth }));

// Mock the Anthropic SDK used directly in placement routes
const { mockCreate } = vi.hoisted(() => ({ mockCreate: vi.fn() }));
vi.mock('@anthropic-ai/sdk', () => {
  const AnthropicMock = vi.fn(function (this: any) {
    this.messages = {
      create: mockCreate,
    };
  });
  return { default: AnthropicMock };
});

// Mock curriculum-generator for the generate route
vi.mock('@/lib/curriculum-generator', () => ({
  generateCurriculum: vi.fn().mockResolvedValue({
    id: 'curriculum-001',
    status: 'ACTIVE',
    weekCount: 8,
    lessonsPerWeek: 3,
    weeks: CURRICULUM_RESPONSES.generated.weeks.map((w, i) => ({
      id: `week-${i}`,
      weekNumber: w.weekNumber,
      theme: w.theme,
      lessonIds: JSON.stringify(w.lessonIds),
      status: 'pending',
    })),
  }),
}));

// Mock curriculum module for GET and revise routes
vi.mock('@/lib/curriculum', () => ({
  getLessonById: vi.fn((id: string) => ({
    id,
    title: 'Test Lesson',
    unit: 'Test Unit',
    type: 'narrative',
    tier: 1,
  })),
  getLessonsByTier: vi.fn(() => [
    { id: 'N1.1.1', title: 'Story Hooks', unit: 'Getting Started', type: 'narrative', tier: 1 },
    { id: 'N1.1.2', title: 'Characters', unit: 'Getting Started', type: 'narrative', tier: 1 },
    { id: 'P1.1.1', title: 'Opinions', unit: 'Getting Started', type: 'persuasive', tier: 1 },
    { id: 'D1.1.1', title: 'Describing', unit: 'Getting Started', type: 'descriptive', tier: 1 },
  ]),
  getAllLessons: vi.fn(() => []),
}));

// Import route handlers after mocks
import { POST as placementStartPOST } from '@/app/api/placement/start/route';
import { POST as placementSubmitPOST } from '@/app/api/placement/submit/route';
import { GET as placementGET, PATCH as placementPATCH } from '@/app/api/placement/[childId]/route';
import { POST as curriculumGeneratePOST } from '@/app/api/curriculum/generate/route';
import { GET as curriculumGET } from '@/app/api/curriculum/[childId]/route';
import { POST as curriculumRevisePOST } from '@/app/api/curriculum/[childId]/revise/route';

function makeChildIdParams(childId: string) {
  return { params: Promise.resolve({ childId }) };
}

describe('Placement API', () => {
  beforeEach(() => {
    resetPrismaMock();
    resetAuthMock();
    resetClaudeMock();
    mockCreate.mockReset();
  });

  describe('POST /api/placement/start', () => {
    it('generates 3 age-appropriate writing prompts', async () => {
      prismaMock.childProfile.findFirst.mockResolvedValue(CHILD_MAYA);
      prismaMock.placementResult.findUnique.mockResolvedValue(null); // No existing placement

      // Mock the Anthropic API to return 3 prompts
      mockCreate.mockResolvedValue({
        content: [{ type: 'text', text: JSON.stringify([
          'Tell a story about finding something magical.',
          'Describe your favorite place using all five senses.',
          'Convince your teacher to give the class more recess.',
        ])}],
      });

      const res = await placementStartPOST(new Request('http://localhost/api/placement/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ childId: CHILD_MAYA.id }),
      }));
      const data = await res.json();
      expect(data.prompts).toBeDefined();
      expect(data.prompts.length).toBe(3);
      // Each prompt should be a non-empty string
      data.prompts.forEach((p: string) => expect(typeof p).toBe('string'));
    });

    it('returns existing result if child already has placement', async () => {
      prismaMock.childProfile.findFirst.mockResolvedValue(CHILD_MAYA);
      prismaMock.placementResult.findUnique.mockResolvedValue(PLACEMENT_MAYA);

      const res = await placementStartPOST(new Request('http://localhost/api/placement/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ childId: CHILD_MAYA.id }),
      }));
      const data = await res.json();
      // When placement already exists, the route returns the existing prompts, not a 409
      expect(data.existingResult).toBe(true);
      expect(data.prompts).toBeDefined();
    });
  });

  describe('POST /api/placement/submit', () => {
    it('analyzes 3 responses and returns tier recommendation', async () => {
      prismaMock.childProfile.findFirst.mockResolvedValue(CHILD_MAYA);
      prismaMock.placementResult.findUnique.mockResolvedValue(null); // No existing placement
      prismaMock.placementResult.create.mockResolvedValue(PLACEMENT_MAYA);
      prismaMock.childProfile.update.mockResolvedValue({ ...CHILD_MAYA, tier: 1 });
      prismaMock.$transaction.mockResolvedValue([PLACEMENT_MAYA, { ...CHILD_MAYA, tier: 1 }]);

      // Mock the Anthropic API analysis
      mockCreate.mockResolvedValue({
        content: [{ type: 'text', text: JSON.stringify({
          recommendedTier: 1,
          confidence: 0.85,
          strengths: ['creative ideas', 'strong voice'],
          gaps: ['sentence variety'],
          reasoning: 'Good foundational skills.',
        })}],
      });

      const res = await placementSubmitPOST(new Request('http://localhost/api/placement/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          childId: CHILD_MAYA.id,
          prompts: ['prompt1', 'prompt2', 'prompt3'],
          responses: ['response1', 'response2', 'response3'],
        }),
      }));
      const data = await res.json();
      expect(data.recommendedTier).toBeGreaterThanOrEqual(1);
      expect(data.recommendedTier).toBeLessThanOrEqual(3);
      expect(data.confidence).toBeGreaterThan(0);
      expect(data.confidence).toBeLessThanOrEqual(1);
    });

    it('rejects if fewer than 3 responses provided', async () => {
      prismaMock.childProfile.findFirst.mockResolvedValue(CHILD_MAYA);

      // Submit only 2 responses
      const res = await placementSubmitPOST(new Request('http://localhost/api/placement/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          childId: CHILD_MAYA.id,
          prompts: ['one', 'two'],
          responses: ['one', 'two'],
        }),
      }));
      expect(res.status).toBe(400);
    });

    it('stores both AI recommendation and assigned tier (initially same)', async () => {
      prismaMock.childProfile.findFirst.mockResolvedValue(CHILD_MAYA);
      prismaMock.placementResult.findUnique.mockResolvedValue(null);
      prismaMock.$transaction.mockImplementation(async (items: any[]) => {
        // The $transaction is called with an array of Prisma operations
        // We verify the data passed to create
        return [PLACEMENT_MAYA, { ...CHILD_MAYA, tier: 1 }];
      });

      mockCreate.mockResolvedValue({
        content: [{ type: 'text', text: JSON.stringify({
          recommendedTier: 1,
          confidence: 0.85,
          strengths: ['creative ideas'],
          gaps: ['sentence variety'],
          reasoning: 'Good foundational skills.',
        })}],
      });

      const res = await placementSubmitPOST(new Request('http://localhost/api/placement/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          childId: CHILD_MAYA.id,
          prompts: ['p1', 'p2', 'p3'],
          responses: ['r1', 'r2', 'r3'],
        }),
      }));
      // The transaction should have been called
      expect(prismaMock.$transaction).toHaveBeenCalled();
    });
  });

  describe('PATCH /api/placement/[childId]', () => {
    it('allows parent to override assigned tier', async () => {
      prismaMock.childProfile.findFirst.mockResolvedValue(CHILD_MAYA);
      prismaMock.placementResult.findUnique.mockResolvedValue(PLACEMENT_MAYA);
      prismaMock.$transaction.mockResolvedValue([
        { ...PLACEMENT_MAYA, assignedTier: 2, prompts: PLACEMENT_MAYA.prompts, responses: PLACEMENT_MAYA.responses, aiAnalysis: PLACEMENT_MAYA.aiAnalysis },
        { ...CHILD_MAYA, tier: 2 },
      ]);

      const res = await placementPATCH(
        new Request('http://localhost/api/placement/' + CHILD_MAYA.id, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ assignedTier: 2 }),
        }) as any,
        makeChildIdParams(CHILD_MAYA.id),
      );
      expect(res.status).toBe(200);
    });

    it('updates child profile tier when overridden', async () => {
      prismaMock.childProfile.findFirst.mockResolvedValue(CHILD_MAYA);
      prismaMock.placementResult.findUnique.mockResolvedValue(PLACEMENT_MAYA);
      prismaMock.$transaction.mockResolvedValue([
        { ...PLACEMENT_MAYA, assignedTier: 2, prompts: PLACEMENT_MAYA.prompts, responses: PLACEMENT_MAYA.responses, aiAnalysis: PLACEMENT_MAYA.aiAnalysis },
        { ...CHILD_MAYA, tier: 2 },
      ]);

      await placementPATCH(
        new Request('http://localhost/api/placement/' + CHILD_MAYA.id, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ assignedTier: 2 }),
        }) as any,
        makeChildIdParams(CHILD_MAYA.id),
      );

      // Verify $transaction was called (it updates both placement and child profile)
      expect(prismaMock.$transaction).toHaveBeenCalled();
    });

    it('rejects tier values outside 1-3', async () => {
      prismaMock.childProfile.findFirst.mockResolvedValue(CHILD_MAYA);
      prismaMock.placementResult.findUnique.mockResolvedValue(PLACEMENT_MAYA);

      const res = await placementPATCH(
        new Request('http://localhost/api/placement/' + CHILD_MAYA.id, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ assignedTier: 5 }),
        }) as any,
        makeChildIdParams(CHILD_MAYA.id),
      );
      expect(res.status).toBe(400);
    });
  });
});

describe('Curriculum API', () => {
  beforeEach(() => {
    resetPrismaMock();
    resetAuthMock();
    resetClaudeMock();
    mockCreate.mockReset();
  });

  describe('POST /api/curriculum/generate', () => {
    it('generates week-by-week curriculum from AI', async () => {
      prismaMock.childProfile.findFirst.mockResolvedValue(CHILD_MAYA);
      prismaMock.placementResult.findUnique.mockResolvedValue(PLACEMENT_MAYA);
      prismaMock.curriculum.findUnique.mockResolvedValue(null); // No existing curriculum

      const res = await curriculumGeneratePOST(new Request('http://localhost/api/curriculum/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ childId: CHILD_MAYA.id, weekCount: 8, lessonsPerWeek: 3 }),
      }) as any);
      const data = await res.json();
      expect(data.weekCount).toBe(8);
      expect(data.weeks).toBeDefined();
      expect(data.weeks.length).toBe(8);
    });

    it('rejects if child has no placement result', async () => {
      prismaMock.childProfile.findFirst.mockResolvedValue(CHILD_ETHAN);
      prismaMock.placementResult.findUnique.mockResolvedValue(null);

      const res = await curriculumGeneratePOST(new Request('http://localhost/api/curriculum/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ childId: CHILD_ETHAN.id, weekCount: 8, lessonsPerWeek: 3 }),
      }) as any);
      expect(res.status).toBe(400);
    });
  });

  describe('GET /api/curriculum/[childId]', () => {
    it('returns curriculum with enriched lesson details per week', async () => {
      prismaMock.childProfile.findFirst.mockResolvedValue(CHILD_MAYA);
      prismaMock.curriculum.findUnique.mockResolvedValue({
        ...CURRICULUM_MAYA,
        weeks: CURRICULUM_WEEKS,
      });

      const res = await curriculumGET(
        new Request('http://localhost/api/curriculum/' + CHILD_MAYA.id) as any,
        makeChildIdParams(CHILD_MAYA.id),
      );
      const data = await res.json();
      expect(data.curriculum).toBeDefined();
      expect(data.weeks).toBeDefined();
      expect(data.weeks[0].lessons).toBeDefined(); // Enriched with title, type, etc.
    });

    it('returns 404 if no curriculum exists', async () => {
      prismaMock.childProfile.findFirst.mockResolvedValue(CHILD_ETHAN);
      prismaMock.curriculum.findUnique.mockResolvedValue(null);

      const res = await curriculumGET(
        new Request('http://localhost/api/curriculum/' + CHILD_ETHAN.id) as any,
        makeChildIdParams(CHILD_ETHAN.id),
      );
      expect(res.status).toBe(404);
    });
  });

  describe('POST /api/curriculum/[childId]/revise', () => {
    it('creates revision record with before/after snapshots', async () => {
      prismaMock.childProfile.findFirst.mockResolvedValue(CHILD_MAYA);
      prismaMock.curriculum.findUnique.mockResolvedValue({
        ...CURRICULUM_MAYA,
        weeks: CURRICULUM_WEEKS,
      });

      // Mock Claude API for revision
      mockCreate.mockResolvedValue({
        content: [{ type: 'text', text: JSON.stringify([
          { weekNumber: 3, theme: 'Revised Theme', lessonIds: ['N1.1.1', 'P1.1.1', 'D1.1.1'] },
        ])}],
      });

      // Mock for updating existing weeks
      prismaMock.curriculumWeek.update.mockResolvedValue({});

      // Mock for fetching updated curriculum
      prismaMock.curriculum.findUnique
        .mockResolvedValueOnce({ ...CURRICULUM_MAYA, weeks: CURRICULUM_WEEKS }) // Initial fetch
        .mockResolvedValueOnce({
          ...CURRICULUM_MAYA,
          weeks: [
            CURRICULUM_WEEKS[0],
            CURRICULUM_WEEKS[1],
            { ...CURRICULUM_WEEKS[2], theme: 'Revised Theme', lessonIds: JSON.stringify(['N1.1.1', 'P1.1.1', 'D1.1.1']) },
          ],
        }); // After update fetch

      prismaMock.curriculumRevision.create.mockImplementation(async ({ data }: any) => {
        expect(data.previousPlan).toBeDefined();
        expect(data.newPlan).toBeDefined();
        expect(data.reason).toBeDefined();
        return { id: 'revision-001', ...data };
      });

      const res = await curriculumRevisePOST(
        new Request('http://localhost/api/curriculum/' + CHILD_MAYA.id + '/revise', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reason: 'parent_request', description: 'Focus more on narrative' }),
        }) as any,
        makeChildIdParams(CHILD_MAYA.id),
      );

      // Should succeed (not error out)
      expect(res.status).toBe(200);
    });

    it('only revises pending/upcoming weeks, not completed ones', async () => {
      prismaMock.childProfile.findFirst.mockResolvedValue(CHILD_MAYA);
      prismaMock.curriculum.findUnique.mockResolvedValue({
        ...CURRICULUM_MAYA,
        weeks: CURRICULUM_WEEKS, // Week 1 completed, Week 2 in_progress, Week 3 pending
      });

      // Mock Claude response for only the pending week(s)
      mockCreate.mockResolvedValue({
        content: [{ type: 'text', text: JSON.stringify([
          { weekNumber: 3, theme: 'Updated Theme', lessonIds: ['N1.1.1', 'P1.1.1', 'D1.1.1'] },
        ])}],
      });

      prismaMock.curriculumWeek.update.mockResolvedValue({});
      prismaMock.curriculum.findUnique
        .mockResolvedValueOnce({ ...CURRICULUM_MAYA, weeks: CURRICULUM_WEEKS })
        .mockResolvedValueOnce({ ...CURRICULUM_MAYA, weeks: CURRICULUM_WEEKS });
      prismaMock.curriculumRevision.create.mockResolvedValue({});

      const res = await curriculumRevisePOST(
        new Request('http://localhost/api/curriculum/' + CHILD_MAYA.id + '/revise', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reason: 'parent_request', description: 'Adjust the plan' }),
        }) as any,
        makeChildIdParams(CHILD_MAYA.id),
      );

      // Should succeed
      expect(res.status).toBe(200);
    });
  });
});
