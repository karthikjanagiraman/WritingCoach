/**
 * E2E Parent-Child Lifecycle Tests
 *
 * Tests full parent workflows by chaining route handler calls:
 *   signup → create child → list children → progress → delete
 *
 * Uses mocked DB/auth but exercises real route handler logic end-to-end.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { prismaMock, resetPrismaMock } from '../setup/db-mock';
import { mockAuth, mockAuthSession, resetAuthMock } from '../setup/auth-mock';
import {
  PARENT_USER, OTHER_PARENT, CHILD_MAYA, CHILD_ETHAN, CHILD_OTHER,
} from '../setup/fixtures';

vi.mock('@/lib/db', () => ({ prisma: prismaMock }));
vi.mock('@/lib/auth', () => ({ auth: mockAuth }));
vi.mock('@/lib/curriculum', () => ({
  getLessonById: vi.fn(() => ({
    id: 'N1.1.1',
    title: 'Story Hooks',
    unit: 'Getting Started',
    type: 'narrative',
    tier: 1,
  })),
  getLessonsByTier: vi.fn(() => [
    { id: 'N1.1.1', title: 'Story Hooks', unit: 'Getting Started', type: 'narrative', tier: 1 },
  ]),
  getAllLessons: vi.fn(() => [
    { id: 'N1.1.1', title: 'Story Hooks', unit: 'Getting Started', type: 'narrative', tier: 1 },
  ]),
}));

// Import route handlers after mocks
import { POST as signupPOST } from '@/app/api/auth/signup/route';
import { GET as childrenGET, POST as childrenPOST } from '@/app/api/children/route';
import { GET as childGET, DELETE as childDELETE } from '@/app/api/children/[id]/route';
import { GET as progressGET } from '@/app/api/children/[id]/progress/route';

function makeRequest(url: string, body: any) {
  return new Request(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }) as any;
}

function makeParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

describe('E2E: Parent-Child Lifecycle', () => {
  beforeEach(() => {
    resetPrismaMock();
    resetAuthMock();
  });

  it('signup → create child → list children', async () => {
    // Step 1: Signup
    prismaMock.user.findUnique.mockResolvedValue(null); // Email not taken
    prismaMock.user.create.mockResolvedValue({ ...PARENT_USER, id: 'new-user-123' });

    const signupRes = await signupPOST(makeRequest('http://localhost/api/auth/signup', {
      name: 'New Parent',
      email: 'newparent@example.com',
      password: 'password123',
    }));
    expect(signupRes.status).toBe(201);
    const signupData = await signupRes.json();
    expect(signupData.userId).toBeDefined();

    // Step 2: Create a child (now authenticated as the parent)
    const newChild = { ...CHILD_MAYA, id: 'new-child-123', parentId: PARENT_USER.id };
    prismaMock.childProfile.create.mockResolvedValue(newChild);

    const createChildRes = await childrenPOST(makeRequest('http://localhost/api/children', {
      name: 'Maya',
      age: 8,
      avatarEmoji: '🦉',
    }));
    expect(createChildRes.status).toBe(201);
    const createChildData = await createChildRes.json();
    expect(createChildData.child).toBeDefined();

    // Step 3: List children — should include the new child
    prismaMock.childProfile.findMany.mockResolvedValue([newChild]);

    const listRes = await childrenGET();
    const listData = await listRes.json();
    expect(listData.children).toHaveLength(1);
    expect(listData.children[0].name).toBe('Maya');

    // Verify parentId filter was applied
    expect(prismaMock.childProfile.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { parentId: PARENT_USER.id } }),
    );
  });

  it('create child → verify tier auto-compute for all tier boundaries', async () => {
    const tierCases = [
      { age: 8, expectedTier: 1 },
      { age: 11, expectedTier: 2 },
      { age: 14, expectedTier: 3 },
    ];

    for (const { age, expectedTier } of tierCases) {
      resetPrismaMock();
      resetAuthMock();

      prismaMock.childProfile.create.mockImplementation(async ({ data }: any) => {
        return { id: `child-tier-${expectedTier}`, ...data };
      });

      const res = await childrenPOST(makeRequest('http://localhost/api/children', {
        name: `TierTest-${age}`,
        age,
        avatarEmoji: '🦉',
      }));
      const data = await res.json();
      expect(data.child.tier).toBe(expectedTier);

      // Also verify the tier was passed to Prisma create
      expect(prismaMock.childProfile.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ tier: expectedTier }),
        }),
      );
    }
  });

  it('parent cannot access other parent\'s child via progress endpoint', async () => {
    // Authenticated as PARENT_USER
    // Try to access CHILD_OTHER's progress (belongs to OTHER_PARENT)
    // The progress route uses findFirst with parentId filter, returns null → 403
    prismaMock.childProfile.findFirst.mockResolvedValue(null);

    const progressRes = await progressGET(
      new Request('http://localhost/api/children/' + CHILD_OTHER.id + '/progress') as any,
      makeParams(CHILD_OTHER.id),
    );
    expect(progressRes.status).toBe(403);

    // Verify the query included the parentId filter
    expect(prismaMock.childProfile.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: CHILD_OTHER.id, parentId: PARENT_USER.id },
      }),
    );
  });

  it('delete child removes access to that child\'s data', async () => {
    // Step 1: Delete the child
    prismaMock.childProfile.findUnique.mockResolvedValue(CHILD_MAYA);
    prismaMock.childProfile.delete.mockResolvedValue(CHILD_MAYA);

    const deleteRes = await childDELETE(
      new Request('http://localhost/api/children/' + CHILD_MAYA.id, { method: 'DELETE' }) as any,
      makeParams(CHILD_MAYA.id),
    );
    expect(deleteRes.status).toBe(200);
    expect(prismaMock.childProfile.delete).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: CHILD_MAYA.id } }),
    );

    // Step 2: After deletion, trying to access progress should fail
    // The progress route calls childProfile.findFirst which now returns null
    prismaMock.childProfile.findFirst.mockResolvedValue(null);

    const progressRes = await progressGET(
      new Request('http://localhost/api/children/' + CHILD_MAYA.id + '/progress') as any,
      makeParams(CHILD_MAYA.id),
    );
    expect(progressRes.status).toBe(403);
  });
});
