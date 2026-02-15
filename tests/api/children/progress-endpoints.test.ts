/**
 * API tests for child progress endpoints.
 *
 * Covers:
 *   GET  /api/children/[id]/progress        — dashboard data
 *   GET  /api/children/[id]/portfolio        — writing portfolio with filters
 *   GET  /api/children/[id]/portfolio/export — CSV export
 *   GET  /api/children/[id]/skills           — skill progress
 *   GET  /api/children/[id]/streak           — streak data
 *   POST /api/children/[id]/streak/goal      — update weekly goal
 *   GET  /api/children/[id]/badges           — earned badges
 *   POST /api/children/[id]/badges/seen      — mark badges as seen
 *   GET  /api/children/[id]/report           — aggregated parent report
 *   GET  /api/children/[id]/report/export    — CSV report export
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { prismaMock, resetPrismaMock } from '../../setup/db-mock';
import { mockAuth, mockAuthAsUnauthenticated, resetAuthMock } from '../../setup/auth-mock';
import {
  CHILD_MAYA, CHILD_OTHER, ALL_SKILLS_MAYA, STREAK_ACTIVE,
  BADGE_FIRST_STORY, BADGE_STREAK_7,
  SUBMISSION_ORIGINAL, SUBMISSION_REVISION, AI_FEEDBACK_GOOD,
  PROGRESS_COMPLETED,
} from '../../setup/fixtures';

vi.mock('@/lib/db', () => ({ prisma: prismaMock }));
vi.mock('@/lib/auth', () => ({ auth: mockAuth }));
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
  ]),
  getAllLessons: vi.fn(() => [
    { id: 'N1.1.1', title: 'Story Hooks', unit: 'Getting Started', type: 'narrative', tier: 1 },
    { id: 'N1.1.2', title: 'Characters', unit: 'Getting Started', type: 'narrative', tier: 1 },
    { id: 'P1.1.1', title: 'Opinions', unit: 'Getting Started', type: 'persuasive', tier: 1 },
  ]),
}));
vi.mock('@/lib/skill-map', () => ({
  SKILL_DEFINITIONS: {
    narrative: { displayName: 'Narrative', skills: { story_beginnings: 'Story Beginnings', character_development: 'Character Development' } },
    persuasive: { displayName: 'Persuasive', skills: { opinion_statements: 'Opinion Statements' } },
    descriptive: { displayName: 'Descriptive', skills: { sensory_details: 'Sensory Details' } },
    expository: { displayName: 'Expository', skills: {} },
  },
}));
vi.mock('@/lib/llm', () => ({
  sendMessage: vi.fn().mockResolvedValue('AI summary text'),
}));
vi.mock('@/lib/badges', () => ({
  getBadgeById: vi.fn((id: string) => {
    const badges: Record<string, any> = {
      first_story: { id: 'first_story', name: 'First Story', emoji: '📝', description: 'Complete your first lesson', category: 'milestone' },
      streak_7: { id: 'streak_7', name: 'Week Warrior', emoji: '🔥', description: '7-day streak', category: 'streak' },
    };
    return badges[id] || null;
  }),
}));

// Import route handlers after mocks
import { GET as progressGET } from '@/app/api/children/[id]/progress/route';
import { GET as portfolioGET } from '@/app/api/children/[id]/portfolio/route';
import { GET as portfolioExportGET } from '@/app/api/children/[id]/portfolio/export/route';
import { GET as skillsGET } from '@/app/api/children/[id]/skills/route';
import { GET as streakGET } from '@/app/api/children/[id]/streak/route';
import { POST as streakGoalPOST } from '@/app/api/children/[id]/streak/goal/route';
import { GET as badgesGET } from '@/app/api/children/[id]/badges/route';
import { POST as badgesSeenPOST } from '@/app/api/children/[id]/badges/seen/route';
import { GET as reportGET } from '@/app/api/children/[id]/report/route';

/** Helper to create params for Next.js route handlers */
function makeParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

describe('GET /api/children/[id]/progress', () => {
  beforeEach(() => { resetPrismaMock(); resetAuthMock(); });

  it('returns dashboard data with lesson stats', async () => {
    prismaMock.childProfile.findFirst.mockResolvedValue(CHILD_MAYA);
    prismaMock.lessonProgress.findMany.mockResolvedValue([PROGRESS_COMPLETED]);
    prismaMock.assessment.findMany.mockResolvedValue([]);

    const res = await progressGET(
      new Request('http://localhost/api/children/' + CHILD_MAYA.id + '/progress') as any,
      makeParams(CHILD_MAYA.id),
    );
    const data = await res.json();
    expect(data.completedLessons).toBeDefined();
    expect(data.availableLessons).toBeDefined();
  });

  it('returns 403 for child of another parent', async () => {
    prismaMock.childProfile.findFirst.mockResolvedValue(null); // findFirst with parentId filter returns null
    const res = await progressGET(
      new Request('http://localhost/api/children/' + CHILD_OTHER.id + '/progress') as any,
      makeParams(CHILD_OTHER.id),
    );
    expect(res.status).toBe(403);
  });
});

describe('GET /api/children/[id]/portfolio', () => {
  beforeEach(() => { resetPrismaMock(); resetAuthMock(); });

  it('returns paginated writing submissions', async () => {
    prismaMock.childProfile.findFirst.mockResolvedValue(CHILD_MAYA);
    prismaMock.writingSubmission.findMany.mockResolvedValue([
      { ...SUBMISSION_ORIGINAL, feedback: AI_FEEDBACK_GOOD, createdAt: new Date('2026-02-01') },
    ]);
    prismaMock.writingSubmission.count.mockResolvedValue(1);

    const res = await portfolioGET(
      new NextRequest('http://localhost/api/children/' + CHILD_MAYA.id + '/portfolio'),
      makeParams(CHILD_MAYA.id),
    );
    const data = await res.json();
    expect(data.submissions).toBeDefined();
    expect(data.submissions.length).toBe(1);
    expect(data.total).toBe(1);
  });

  it('filters by writing type when type param provided', async () => {
    prismaMock.childProfile.findFirst.mockResolvedValue(CHILD_MAYA);
    prismaMock.writingSubmission.findMany.mockResolvedValue([]);
    prismaMock.writingSubmission.count.mockResolvedValue(0);

    await portfolioGET(
      new NextRequest('http://localhost/api/children/' + CHILD_MAYA.id + '/portfolio?type=narrative'),
      makeParams(CHILD_MAYA.id),
    );

    // Verify Prisma query includes where clause with lessonId filter
    expect(prismaMock.writingSubmission.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ lessonId: { startsWith: 'N' } }),
      })
    );
  });

  it('excludes revisions by default', async () => {
    prismaMock.childProfile.findFirst.mockResolvedValue(CHILD_MAYA);
    prismaMock.writingSubmission.findMany.mockResolvedValue([SUBMISSION_ORIGINAL]);
    prismaMock.writingSubmission.count.mockResolvedValue(1);

    await portfolioGET(
      new NextRequest('http://localhost/api/children/' + CHILD_MAYA.id + '/portfolio'),
      makeParams(CHILD_MAYA.id),
    );

    // Default should filter revisionNumber: 0
    expect(prismaMock.writingSubmission.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ revisionNumber: 0 }),
      })
    );
  });

  it('includes revisions when includeRevisions=true', async () => {
    prismaMock.childProfile.findFirst.mockResolvedValue(CHILD_MAYA);
    prismaMock.writingSubmission.findMany.mockResolvedValue([
      { ...SUBMISSION_ORIGINAL, feedback: AI_FEEDBACK_GOOD, createdAt: new Date('2026-02-01') },
      { ...SUBMISSION_REVISION, feedback: AI_FEEDBACK_GOOD, createdAt: new Date('2026-02-01') },
    ]);
    prismaMock.writingSubmission.count.mockResolvedValue(2);

    const res = await portfolioGET(
      new NextRequest('http://localhost/api/children/' + CHILD_MAYA.id + '/portfolio?includeRevisions=true'),
      makeParams(CHILD_MAYA.id),
    );
    const data = await res.json();
    expect(data.submissions.length).toBe(2);
  });
});

describe('GET /api/children/[id]/portfolio/export', () => {
  beforeEach(() => { resetPrismaMock(); resetAuthMock(); });

  it('returns CSV content type', async () => {
    prismaMock.childProfile.findFirst.mockResolvedValue(CHILD_MAYA);
    prismaMock.writingSubmission.findMany.mockResolvedValue([
      { ...SUBMISSION_ORIGINAL, feedback: AI_FEEDBACK_GOOD, createdAt: new Date('2026-02-01') },
    ]);

    const res = await portfolioExportGET(
      new Request('http://localhost/api/children/' + CHILD_MAYA.id + '/portfolio/export') as any,
      makeParams(CHILD_MAYA.id),
    );
    expect(res.headers.get('content-type')).toContain('text/csv');
    expect(res.headers.get('content-disposition')).toContain('.csv');
  });
});

describe('GET /api/children/[id]/skills', () => {
  beforeEach(() => { resetPrismaMock(); resetAuthMock(); });

  it('returns skill progress grouped by category', async () => {
    prismaMock.childProfile.findFirst.mockResolvedValue(CHILD_MAYA);
    prismaMock.skillProgress.findMany.mockResolvedValue(ALL_SKILLS_MAYA);

    const res = await skillsGET(
      new Request('http://localhost/api/children/' + CHILD_MAYA.id + '/skills') as any,
      makeParams(CHILD_MAYA.id),
    );
    const data = await res.json();
    expect(data.categories).toBeDefined();
    // Skills should be grouped into categories
    const narrativeCategory = data.categories.find((c: any) => c.name === 'narrative');
    expect(narrativeCategory).toBeDefined();
  });

  it('returns empty categories when no skills tracked yet', async () => {
    prismaMock.childProfile.findFirst.mockResolvedValue(CHILD_MAYA);
    prismaMock.skillProgress.findMany.mockResolvedValue([]);

    const res = await skillsGET(
      new Request('http://localhost/api/children/' + CHILD_MAYA.id + '/skills') as any,
      makeParams(CHILD_MAYA.id),
    );
    const data = await res.json();
    // Should still return structure, just with empty categories array
    expect(data.categories).toBeDefined();
    expect(data.categories.length).toBe(0);
  });
});

describe('Streak API', () => {
  beforeEach(() => { resetPrismaMock(); resetAuthMock(); });

  describe('GET /api/children/[id]/streak', () => {
    it('returns streak data', async () => {
      prismaMock.childProfile.findFirst.mockResolvedValue(CHILD_MAYA);
      prismaMock.streak.findUnique.mockResolvedValue(STREAK_ACTIVE);

      const res = await streakGET(
        new Request('http://localhost/api/children/' + CHILD_MAYA.id + '/streak') as any,
        makeParams(CHILD_MAYA.id),
      );
      const data = await res.json();
      expect(data.currentStreak).toBe(5);
      expect(data.longestStreak).toBe(12);
      expect(data.weeklyGoal).toBe(3);
      expect(data.weeklyCompleted).toBe(2);
    });

    it('returns zeros when no streak record exists', async () => {
      prismaMock.childProfile.findFirst.mockResolvedValue(CHILD_MAYA);
      prismaMock.streak.findUnique.mockResolvedValue(null);

      const res = await streakGET(
        new Request('http://localhost/api/children/' + CHILD_MAYA.id + '/streak') as any,
        makeParams(CHILD_MAYA.id),
      );
      const data = await res.json();
      expect(data.currentStreak).toBe(0);
    });
  });

  describe('POST /api/children/[id]/streak/goal', () => {
    it('updates weekly goal', async () => {
      prismaMock.childProfile.findFirst.mockResolvedValue(CHILD_MAYA);
      prismaMock.streak.upsert.mockResolvedValue({ ...STREAK_ACTIVE, weeklyGoal: 5 });

      const res = await streakGoalPOST(
        new Request('http://localhost/api/children/' + CHILD_MAYA.id + '/streak/goal', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ weeklyGoal: 5 }),
        }) as any,
        makeParams(CHILD_MAYA.id),
      );
      const data = await res.json();
      expect(data.weeklyGoal).toBe(5);
    });

    it('rejects goal outside 1-7 range', async () => {
      prismaMock.childProfile.findFirst.mockResolvedValue(CHILD_MAYA);

      const res = await streakGoalPOST(
        new Request('http://localhost/api/children/' + CHILD_MAYA.id + '/streak/goal', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ weeklyGoal: 10 }),
        }) as any,
        makeParams(CHILD_MAYA.id),
      );
      expect(res.status).toBe(400);
    });
  });
});

describe('Badges API', () => {
  beforeEach(() => { resetPrismaMock(); resetAuthMock(); });

  describe('GET /api/children/[id]/badges', () => {
    it('returns earned badges with metadata', async () => {
      prismaMock.childProfile.findFirst.mockResolvedValue(CHILD_MAYA);
      prismaMock.achievement.findMany.mockResolvedValue([
        { ...BADGE_FIRST_STORY, unlockedAt: new Date('2026-01-28') },
        { ...BADGE_STREAK_7, unlockedAt: new Date('2026-02-05') },
      ]);

      const res = await badgesGET(
        new Request('http://localhost/api/children/' + CHILD_MAYA.id + '/badges') as any,
        makeParams(CHILD_MAYA.id),
      );
      const data = await res.json();
      expect(data.badges.length).toBe(2);
      expect(data.total).toBe(2);
      expect(data.unseen).toBe(1); // BADGE_STREAK_7 has seen: false
    });
  });

  describe('POST /api/children/[id]/badges/seen', () => {
    it('marks specified badges as seen', async () => {
      prismaMock.childProfile.findFirst.mockResolvedValue(CHILD_MAYA);
      prismaMock.achievement.updateMany.mockResolvedValue({ count: 1 });

      await badgesSeenPOST(
        new Request('http://localhost/api/children/' + CHILD_MAYA.id + '/badges/seen', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ badgeIds: ['streak_7'] }),
        }) as any,
        makeParams(CHILD_MAYA.id),
      );

      expect(prismaMock.achievement.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            childId: CHILD_MAYA.id,
            badgeId: { in: ['streak_7'] },
            seen: false,
          }),
          data: { seen: true },
        })
      );
    });
  });
});

describe('GET /api/children/[id]/report', () => {
  beforeEach(() => { resetPrismaMock(); resetAuthMock(); });

  it('returns aggregated progress report', async () => {
    prismaMock.childProfile.findFirst.mockResolvedValue(CHILD_MAYA);
    prismaMock.skillProgress.findMany.mockResolvedValue(ALL_SKILLS_MAYA);
    prismaMock.streak.findUnique.mockResolvedValue(STREAK_ACTIVE);
    prismaMock.achievement.findMany.mockResolvedValue([BADGE_FIRST_STORY]);
    prismaMock.achievement.count.mockResolvedValue(1);
    prismaMock.writingSubmission.findMany.mockResolvedValue([{
      ...SUBMISSION_ORIGINAL,
      feedback: AI_FEEDBACK_GOOD,
      createdAt: new Date('2026-02-01'),
    }]);
    prismaMock.lessonProgress.findMany.mockResolvedValue([PROGRESS_COMPLETED]);
    prismaMock.assessment.findMany.mockResolvedValue([{
      id: 'a1',
      lessonId: 'N1.1.1',
      overallScore: 4.0,
      createdAt: new Date('2026-02-01'),
    }]);

    const res = await reportGET(
      new Request('http://localhost/api/children/' + CHILD_MAYA.id + '/report') as any,
      makeParams(CHILD_MAYA.id),
    );
    const data = await res.json();
    expect(data.summary).toBeDefined();
    expect(data.skills).toBeDefined();
    expect(data.streak).toBeDefined();
    expect(data.recentAssessments).toBeDefined();
    expect(data.activityTimeline).toBeDefined();
  });

  it('returns 401 when unauthenticated', async () => {
    mockAuthAsUnauthenticated();
    const res = await reportGET(
      new Request('http://localhost/api/children/' + CHILD_MAYA.id + '/report') as any,
      makeParams(CHILD_MAYA.id),
    );
    expect(res.status).toBe(401);
  });
});
