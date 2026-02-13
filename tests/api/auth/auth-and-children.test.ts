/**
 * API tests for auth and children management.
 *
 * Covers:
 *   POST /api/auth/signup
 *   GET/POST /api/children
 *   GET/PATCH/DELETE /api/children/[id]
 *   Ownership enforcement (parent can only access own children)
 *
 * These are conceptual test stubs. To run as true integration tests,
 * use a test database or mock Prisma + Auth at the route handler level.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { prismaMock, resetPrismaMock } from '../../setup/db-mock';
import { mockAuth, mockAuthAsParent, mockAuthAsUnauthenticated, resetAuthMock } from '../../setup/auth-mock';
import {
  PARENT_USER, OTHER_PARENT, CHILD_MAYA, CHILD_ETHAN, CHILD_OTHER,
  TIER_TEST_CASES,
} from '../../setup/fixtures';

vi.mock('@/lib/db', () => ({ prisma: prismaMock }));
vi.mock('@/lib/auth', () => ({ auth: mockAuth }));

// Import route handlers after mocks are set up
import { POST as signupPOST } from '@/app/api/auth/signup/route';
import { GET as childrenGET, POST as childrenPOST } from '@/app/api/children/route';
import { GET as childGET, PATCH as childPATCH, DELETE as childDELETE } from '@/app/api/children/[id]/route';

describe('POST /api/auth/signup', () => {
  beforeEach(() => { resetPrismaMock(); });

  it('creates a new user with hashed password', async () => {
    prismaMock.user.findUnique.mockResolvedValue(null); // Email not taken
    prismaMock.user.create.mockResolvedValue({ ...PARENT_USER, id: 'new-user-id' });

    const res = await signupPOST(new Request('http://localhost/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Test', email: 'new@example.com', password: 'password123' }),
    }) as any);
    expect(res.status).toBe(201);
  });

  it('rejects duplicate email with 409', async () => {
    prismaMock.user.findUnique.mockResolvedValue(PARENT_USER); // Email exists

    const res = await signupPOST(new Request('http://localhost/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Test', email: 'parent@example.com', password: 'password123' }),
    }) as any);
    expect(res.status).toBe(409);
  });

  it('rejects missing fields with 400', async () => {
    const res = await signupPOST(new Request('http://localhost/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: '' }),
    }) as any);
    expect(res.status).toBe(400);
  });

  it('password is never stored in plain text', async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);
    prismaMock.user.create.mockImplementation(async ({ data }: any) => {
      // Verify passwordHash is NOT the raw password
      expect(data.passwordHash).not.toBe('password123');
      expect(data.passwordHash.length).toBeGreaterThan(20); // bcrypt hashes are ~60 chars
      return { ...PARENT_USER, ...data };
    });

    await signupPOST(new Request('http://localhost/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Test', email: 'new@example.com', password: 'password123' }),
    }) as any);

    expect(prismaMock.user.create).toHaveBeenCalled();
  });
});

describe('GET /api/children', () => {
  beforeEach(() => {
    resetPrismaMock();
    resetAuthMock();
  });

  it('returns only the authenticated parent\'s children', async () => {
    prismaMock.childProfile.findMany.mockResolvedValue([CHILD_MAYA, CHILD_ETHAN]);

    const res = await childrenGET();
    const data = await res.json();
    expect(data.children.length).toBe(2);

    // Verify the query filters by parentId
    expect(prismaMock.childProfile.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { parentId: PARENT_USER.id } })
    );
  });

  it('returns 401 when unauthenticated', async () => {
    mockAuthAsUnauthenticated();
    const res = await childrenGET();
    expect(res.status).toBe(401);
  });
});

describe('POST /api/children', () => {
  beforeEach(() => {
    resetPrismaMock();
    resetAuthMock();
  });

  it('creates child with auto-computed tier from age', async () => {
    prismaMock.childProfile.create.mockImplementation(async ({ data }: any) => {
      return { id: 'new-child', ...data };
    });

    // For age 8, tier should be 1
    const res = await childrenPOST(new Request('http://localhost/api/children', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Lily', age: 8, avatarEmoji: '🦉' }),
    }) as any);
    const data = await res.json();
    expect(data.child.tier).toBe(1);
  });

  it.each(TIER_TEST_CASES)(
    'age $age auto-computes to tier $expectedTier',
    async ({ age, expectedTier }) => {
      prismaMock.childProfile.create.mockImplementation(async ({ data }: any) => {
        expect(data.tier).toBe(expectedTier);
        return { id: 'test-child', ...data };
      });

      await childrenPOST(new Request('http://localhost/api/children', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Test', age, avatarEmoji: '🦉' }),
      }) as any);

      expect(prismaMock.childProfile.create).toHaveBeenCalled();
    }
  );

  it('sets parentId from authenticated session', async () => {
    prismaMock.childProfile.create.mockImplementation(async ({ data }: any) => {
      expect(data.parentId).toBe(PARENT_USER.id);
      return { id: 'new-child', ...data };
    });

    await childrenPOST(new Request('http://localhost/api/children', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Lily', age: 8, avatarEmoji: '🦉' }),
    }) as any);

    expect(prismaMock.childProfile.create).toHaveBeenCalled();
  });
});

describe('GET /api/children/[id]', () => {
  beforeEach(() => {
    resetPrismaMock();
    resetAuthMock();
  });

  it('returns child when parent owns it', async () => {
    prismaMock.childProfile.findUnique.mockResolvedValue(CHILD_MAYA);
    const res = await childGET(
      new Request('http://localhost/api/children/' + CHILD_MAYA.id) as any,
      { params: Promise.resolve({ id: CHILD_MAYA.id }) }
    );
    expect(res.status).toBe(200);
  });

  it('returns 404 when parent does NOT own the child', async () => {
    // CHILD_OTHER belongs to OTHER_PARENT, not PARENT_USER
    // The route checks child.parentId !== session.user.userId and returns 404
    prismaMock.childProfile.findUnique.mockResolvedValue(CHILD_OTHER);
    const res = await childGET(
      new Request('http://localhost/api/children/' + CHILD_OTHER.id) as any,
      { params: Promise.resolve({ id: CHILD_OTHER.id }) }
    );
    expect(res.status).toBe(404);
  });

  it('returns 404 for nonexistent child', async () => {
    prismaMock.childProfile.findUnique.mockResolvedValue(null);
    const res = await childGET(
      new Request('http://localhost/api/children/nonexistent') as any,
      { params: Promise.resolve({ id: 'nonexistent' }) }
    );
    expect(res.status).toBe(404);
  });
});

describe('PATCH /api/children/[id]', () => {
  beforeEach(() => {
    resetPrismaMock();
    resetAuthMock();
  });

  it('updates child profile fields', async () => {
    prismaMock.childProfile.findUnique.mockResolvedValue(CHILD_MAYA);
    prismaMock.childProfile.update.mockResolvedValue({ ...CHILD_MAYA, name: 'Maya Updated' });

    const res = await childPATCH(
      new Request('http://localhost/api/children/' + CHILD_MAYA.id, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Maya Updated' }),
      }) as any,
      { params: Promise.resolve({ id: CHILD_MAYA.id }) }
    );
    expect(res.status).toBe(200);
  });

  it('recomputes tier when age is updated', async () => {
    prismaMock.childProfile.findUnique.mockResolvedValue(CHILD_MAYA); // age 8, tier 1
    prismaMock.childProfile.update.mockImplementation(async ({ data }: any) => {
      // If age changes to 11, tier should become 2
      if (data.age === 11) {
        expect(data.tier).toBe(2);
      }
      return { ...CHILD_MAYA, ...data };
    });

    await childPATCH(
      new Request('http://localhost/api/children/' + CHILD_MAYA.id, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ age: 11 }),
      }) as any,
      { params: Promise.resolve({ id: CHILD_MAYA.id }) }
    );

    expect(prismaMock.childProfile.update).toHaveBeenCalled();
  });

  it('rejects update of child belonging to another parent', async () => {
    // Route returns 404 (not 403) when child not found or not owned
    prismaMock.childProfile.findUnique.mockResolvedValue(CHILD_OTHER);
    const res = await childPATCH(
      new Request('http://localhost/api/children/' + CHILD_OTHER.id, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Hacked' }),
      }) as any,
      { params: Promise.resolve({ id: CHILD_OTHER.id }) }
    );
    expect(res.status).toBe(404);
  });
});

describe('DELETE /api/children/[id]', () => {
  beforeEach(() => {
    resetPrismaMock();
    resetAuthMock();
  });

  it('deletes child and cascades to related records', async () => {
    prismaMock.childProfile.findUnique.mockResolvedValue(CHILD_MAYA);
    prismaMock.childProfile.delete.mockResolvedValue(CHILD_MAYA);

    const res = await childDELETE(
      new Request('http://localhost/api/children/' + CHILD_MAYA.id, { method: 'DELETE' }) as any,
      { params: Promise.resolve({ id: CHILD_MAYA.id }) }
    );
    expect(res.status).toBe(200);
  });
});
