/**
 * Edge-case tests for /api/curriculum/[childId]
 *
 * Covers:
 *   - Lesson completion enrichment in GET
 *   - Unknown lessonId fallback in GET
 *   - Unauthenticated access
 *   - PATCH validation for lessonsPerWeek
 *   - PATCH validation for invalid status
 *   - PATCH with valid status transitions
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { prismaMock, resetPrismaMock } from '../../setup/db-mock';
import { mockAuth, mockAuthAsUnauthenticated, resetAuthMock } from '../../setup/auth-mock';
import { CHILD_MAYA, CURRICULUM_MAYA } from '../../setup/fixtures';

vi.mock('@/lib/db', () => ({ prisma: prismaMock }));
vi.mock('@/lib/auth', () => ({ auth: mockAuth }));
vi.mock('@/lib/curriculum', () => ({
  getLessonById: vi.fn((id: string) => {
    if (id === 'UNKNOWN') return null;
    return { id, title: 'Test Lesson', unit: 'Test Unit', type: 'narrative', tier: 1 };
  }),
}));

import { GET as curriculumGET, PATCH as curriculumPATCH } from '@/app/api/curriculum/[childId]/route';

function makeChildIdParams(childId: string) {
  return { params: Promise.resolve({ childId }) };
}

describe('GET /api/curriculum/[childId] — edge cases', () => {
  beforeEach(() => { resetPrismaMock(); resetAuthMock(); });

  it('marks completed lessons in enriched week data', async () => {
    prismaMock.childProfile.findFirst.mockResolvedValue(CHILD_MAYA);
    prismaMock.curriculum.findUnique.mockResolvedValue({
      ...CURRICULUM_MAYA,
      weeks: [
        { id: 'w1', curriculumId: CURRICULUM_MAYA.id, weekNumber: 1, theme: 'Week 1', lessonIds: JSON.stringify(['N1.1.1', 'N1.1.2']), status: 'in_progress' },
      ],
    });
    prismaMock.lessonProgress.findMany.mockResolvedValue([
      { lessonId: 'N1.1.1' },
    ]);

    const res = await curriculumGET(
      new NextRequest('http://localhost/api/curriculum/' + CHILD_MAYA.id) as any,
      makeChildIdParams(CHILD_MAYA.id),
    );
    const data = await res.json();
    expect(res.status).toBe(200);
    const lessons = data.weeks[0].lessons;
    expect(lessons[0].completed).toBe(true);  // N1.1.1 is completed
    expect(lessons[1].completed).toBe(false); // N1.1.2 is not completed
  });

  it('falls back for unknown lessonId in curriculum week', async () => {
    prismaMock.childProfile.findFirst.mockResolvedValue(CHILD_MAYA);
    prismaMock.curriculum.findUnique.mockResolvedValue({
      ...CURRICULUM_MAYA,
      weeks: [
        { id: 'w1', curriculumId: CURRICULUM_MAYA.id, weekNumber: 1, theme: 'Week 1', lessonIds: JSON.stringify(['N1.1.1', 'UNKNOWN']), status: 'pending' },
      ],
    });
    prismaMock.lessonProgress.findMany.mockResolvedValue([]);

    const res = await curriculumGET(
      new NextRequest('http://localhost/api/curriculum/' + CHILD_MAYA.id) as any,
      makeChildIdParams(CHILD_MAYA.id),
    );
    const data = await res.json();
    expect(res.status).toBe(200);
    const lessons = data.weeks[0].lessons;
    // Known lesson
    expect(lessons[0].title).toBe('Test Lesson');
    // Unknown lesson fallback
    expect(lessons[1].id).toBe('UNKNOWN');
    expect(lessons[1].title).toBe('Unknown lesson');
    expect(lessons[1].type).toBe('unknown');
    expect(lessons[1].unit).toBe('unknown');
    expect(lessons[1].completed).toBe(false);
  });

  it('returns 401 when unauthenticated', async () => {
    mockAuthAsUnauthenticated();
    const res = await curriculumGET(
      new NextRequest('http://localhost/api/curriculum/' + CHILD_MAYA.id) as any,
      makeChildIdParams(CHILD_MAYA.id),
    );
    expect(res.status).toBe(401);
  });
});

describe('PATCH /api/curriculum/[childId] — edge cases', () => {
  beforeEach(() => { resetPrismaMock(); resetAuthMock(); });

  it('rejects lessonsPerWeek of 0', async () => {
    prismaMock.childProfile.findFirst.mockResolvedValue(CHILD_MAYA);
    prismaMock.curriculum.findUnique.mockResolvedValue(CURRICULUM_MAYA);

    const res = await curriculumPATCH(
      new NextRequest('http://localhost/api/curriculum/' + CHILD_MAYA.id, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lessonsPerWeek: 0 }),
      }),
      makeChildIdParams(CHILD_MAYA.id),
    );
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain('lessonsPerWeek');
  });

  it('rejects lessonsPerWeek above 7', async () => {
    prismaMock.childProfile.findFirst.mockResolvedValue(CHILD_MAYA);
    prismaMock.curriculum.findUnique.mockResolvedValue(CURRICULUM_MAYA);

    const res = await curriculumPATCH(
      new NextRequest('http://localhost/api/curriculum/' + CHILD_MAYA.id, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lessonsPerWeek: 10 }),
      }),
      makeChildIdParams(CHILD_MAYA.id),
    );
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain('lessonsPerWeek');
  });

  it('rejects invalid status value', async () => {
    prismaMock.childProfile.findFirst.mockResolvedValue(CHILD_MAYA);
    prismaMock.curriculum.findUnique.mockResolvedValue(CURRICULUM_MAYA);

    const res = await curriculumPATCH(
      new NextRequest('http://localhost/api/curriculum/' + CHILD_MAYA.id, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'INVALID' }),
      }),
      makeChildIdParams(CHILD_MAYA.id),
    );
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain('status');
  });

  it('allows valid status transition to PAUSED', async () => {
    prismaMock.childProfile.findFirst.mockResolvedValue(CHILD_MAYA);
    prismaMock.curriculum.findUnique.mockResolvedValue(CURRICULUM_MAYA);
    prismaMock.curriculum.update.mockResolvedValue({
      ...CURRICULUM_MAYA,
      status: 'PAUSED',
    });

    const res = await curriculumPATCH(
      new NextRequest('http://localhost/api/curriculum/' + CHILD_MAYA.id, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'PAUSED' }),
      }),
      makeChildIdParams(CHILD_MAYA.id),
    );
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.curriculum.status).toBe('PAUSED');
  });
});
