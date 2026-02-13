/**
 * Edge-case tests for GET /api/children/[id]/progress
 *
 * Covers:
 *   - nextLesson resolution from active curriculum
 *   - null nextLesson when all lessons completed or no curriculum
 *   - Malformed lessonIds JSON handling
 *   - typeStats per writing type
 *   - Unauthenticated access
 *   - averageScore computation
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { prismaMock, resetPrismaMock } from '../../setup/db-mock';
import { mockAuth, mockAuthAsUnauthenticated, resetAuthMock } from '../../setup/auth-mock';
import { CHILD_MAYA, CURRICULUM_MAYA } from '../../setup/fixtures';

vi.mock('@/lib/db', () => ({ prisma: prismaMock }));
vi.mock('@/lib/auth', () => ({ auth: mockAuth }));
vi.mock('@/lib/curriculum', () => ({
  getLessonById: vi.fn((id: string) => ({
    id, title: 'Test Lesson', unit: 'Test Unit', type: 'narrative', tier: 1,
  })),
  getLessonsByTier: vi.fn(() => [
    { id: 'N1.1.1', title: 'Story Hooks', unit: 'Getting Started', type: 'narrative', tier: 1 },
    { id: 'N1.1.2', title: 'Characters', unit: 'Getting Started', type: 'narrative', tier: 1 },
    { id: 'P1.1.1', title: 'Opinions', unit: 'Getting Started', type: 'persuasive', tier: 1 },
    { id: 'D1.1.1', title: 'Describing', unit: 'Getting Started', type: 'descriptive', tier: 1 },
  ]),
  getAllLessons: vi.fn(() => [
    { id: 'N1.1.1', title: 'Story Hooks', unit: 'Getting Started', type: 'narrative', tier: 1 },
    { id: 'N1.1.2', title: 'Characters', unit: 'Getting Started', type: 'narrative', tier: 1 },
    { id: 'P1.1.1', title: 'Opinions', unit: 'Getting Started', type: 'persuasive', tier: 1 },
    { id: 'D1.1.1', title: 'Describing', unit: 'Getting Started', type: 'descriptive', tier: 1 },
  ]),
}));

import { GET as progressGET } from '@/app/api/children/[id]/progress/route';

function makeParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

describe('GET /api/children/[id]/progress — edge cases', () => {
  beforeEach(() => { resetPrismaMock(); resetAuthMock(); });

  it('nextLesson comes from first uncompleted lesson in active curriculum', async () => {
    prismaMock.childProfile.findFirst.mockResolvedValue(CHILD_MAYA);
    // N1.1.1 is completed, so nextLesson should be N1.1.2
    prismaMock.lessonProgress.findMany.mockResolvedValue([
      { id: 'p1', childId: CHILD_MAYA.id, lessonId: 'N1.1.1', status: 'completed', currentPhase: 'feedback', startedAt: new Date(), completedAt: new Date() },
    ]);
    prismaMock.assessment.findMany.mockResolvedValue([]);
    prismaMock.curriculum.findUnique.mockResolvedValue({
      ...CURRICULUM_MAYA,
      status: 'ACTIVE',
      weeks: [
        { id: 'w1', curriculumId: CURRICULUM_MAYA.id, weekNumber: 1, theme: 'Week 1', lessonIds: JSON.stringify(['N1.1.1', 'N1.1.2']), status: 'in_progress' },
        { id: 'w2', curriculumId: CURRICULUM_MAYA.id, weekNumber: 2, theme: 'Week 2', lessonIds: JSON.stringify(['P1.1.1']), status: 'pending' },
      ],
    });

    const res = await progressGET(
      new Request('http://localhost/api/children/' + CHILD_MAYA.id + '/progress') as any,
      makeParams(CHILD_MAYA.id),
    );
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.nextLesson).not.toBeNull();
    expect(data.nextLesson.lessonId).toBe('N1.1.2');
    expect(data.nextLesson.weekNumber).toBe(1);
    expect(data.nextLesson.weekTheme).toBe('Week 1');
  });

  it('nextLesson is null when all curriculum lessons are completed', async () => {
    prismaMock.childProfile.findFirst.mockResolvedValue(CHILD_MAYA);
    prismaMock.lessonProgress.findMany.mockResolvedValue([
      { id: 'p1', childId: CHILD_MAYA.id, lessonId: 'N1.1.1', status: 'completed', currentPhase: 'feedback', startedAt: new Date(), completedAt: new Date() },
      { id: 'p2', childId: CHILD_MAYA.id, lessonId: 'N1.1.2', status: 'completed', currentPhase: 'feedback', startedAt: new Date(), completedAt: new Date() },
    ]);
    prismaMock.assessment.findMany.mockResolvedValue([]);
    prismaMock.curriculum.findUnique.mockResolvedValue({
      ...CURRICULUM_MAYA,
      status: 'ACTIVE',
      weeks: [
        { id: 'w1', curriculumId: CURRICULUM_MAYA.id, weekNumber: 1, theme: 'Week 1', lessonIds: JSON.stringify(['N1.1.1', 'N1.1.2']), status: 'completed' },
      ],
    });

    const res = await progressGET(
      new Request('http://localhost/api/children/' + CHILD_MAYA.id + '/progress') as any,
      makeParams(CHILD_MAYA.id),
    );
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.nextLesson).toBeNull();
  });

  it('nextLesson is null when no curriculum exists', async () => {
    prismaMock.childProfile.findFirst.mockResolvedValue(CHILD_MAYA);
    prismaMock.lessonProgress.findMany.mockResolvedValue([]);
    prismaMock.assessment.findMany.mockResolvedValue([]);
    prismaMock.curriculum.findUnique.mockResolvedValue(null);

    const res = await progressGET(
      new Request('http://localhost/api/children/' + CHILD_MAYA.id + '/progress') as any,
      makeParams(CHILD_MAYA.id),
    );
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.nextLesson).toBeNull();
  });

  it('handles malformed lessonIds JSON gracefully', async () => {
    prismaMock.childProfile.findFirst.mockResolvedValue(CHILD_MAYA);
    prismaMock.lessonProgress.findMany.mockResolvedValue([]);
    prismaMock.assessment.findMany.mockResolvedValue([]);
    prismaMock.curriculum.findUnique.mockResolvedValue({
      ...CURRICULUM_MAYA,
      status: 'ACTIVE',
      weeks: [
        { id: 'w1', curriculumId: CURRICULUM_MAYA.id, weekNumber: 1, theme: 'Bad Week', lessonIds: 'not-valid-json', status: 'pending' },
        { id: 'w2', curriculumId: CURRICULUM_MAYA.id, weekNumber: 2, theme: 'Good Week', lessonIds: JSON.stringify(['N1.1.1']), status: 'pending' },
      ],
    });

    const res = await progressGET(
      new Request('http://localhost/api/children/' + CHILD_MAYA.id + '/progress') as any,
      makeParams(CHILD_MAYA.id),
    );
    expect(res.status).toBe(200);
    // The malformed week is skipped, nextLesson comes from week 2
    const data = await res.json();
    expect(data.nextLesson).not.toBeNull();
    expect(data.nextLesson.lessonId).toBe('N1.1.1');
    expect(data.nextLesson.weekNumber).toBe(2);
  });

  it('computes correct typeStats per writing type', async () => {
    prismaMock.childProfile.findFirst.mockResolvedValue(CHILD_MAYA);
    prismaMock.lessonProgress.findMany.mockResolvedValue([
      { id: 'p1', childId: CHILD_MAYA.id, lessonId: 'N1.1.1', status: 'completed', currentPhase: 'feedback', startedAt: new Date(), completedAt: new Date() },
    ]);
    prismaMock.assessment.findMany.mockResolvedValue([
      { id: 'a1', childId: CHILD_MAYA.id, lessonId: 'N1.1.1', overallScore: 3.5, createdAt: new Date() },
      { id: 'a2', childId: CHILD_MAYA.id, lessonId: 'N1.1.2', overallScore: 4.5, createdAt: new Date() },
    ]);
    prismaMock.curriculum.findUnique.mockResolvedValue(null);

    const res = await progressGET(
      new Request('http://localhost/api/children/' + CHILD_MAYA.id + '/progress') as any,
      makeParams(CHILD_MAYA.id),
    );
    const data = await res.json();
    expect(res.status).toBe(200);
    // Both assessments are for narrative lessons (getLessonById returns type: 'narrative')
    expect(data.typeStats.narrative.avgScore).toBe(4.0); // (3.5 + 4.5) / 2 = 4.0
    expect(data.typeStats.persuasive.avgScore).toBeNull(); // no assessments
  });

  it('returns 401 when unauthenticated', async () => {
    mockAuthAsUnauthenticated();
    const res = await progressGET(
      new Request('http://localhost/api/children/' + CHILD_MAYA.id + '/progress') as any,
      makeParams(CHILD_MAYA.id),
    );
    expect(res.status).toBe(401);
  });

  it('computes correct averageScore across all assessments', async () => {
    prismaMock.childProfile.findFirst.mockResolvedValue(CHILD_MAYA);
    prismaMock.lessonProgress.findMany.mockResolvedValue([]);
    prismaMock.assessment.findMany.mockResolvedValue([
      { id: 'a1', childId: CHILD_MAYA.id, lessonId: 'N1.1.1', overallScore: 2.0, createdAt: new Date() },
      { id: 'a2', childId: CHILD_MAYA.id, lessonId: 'N1.1.2', overallScore: 3.0, createdAt: new Date() },
      { id: 'a3', childId: CHILD_MAYA.id, lessonId: 'P1.1.1', overallScore: 4.0, createdAt: new Date() },
    ]);
    prismaMock.curriculum.findUnique.mockResolvedValue(null);

    const res = await progressGET(
      new Request('http://localhost/api/children/' + CHILD_MAYA.id + '/progress') as any,
      makeParams(CHILD_MAYA.id),
    );
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.stats.averageScore).toBe(3.0); // (2 + 3 + 4) / 3 = 3.0
  });
});
