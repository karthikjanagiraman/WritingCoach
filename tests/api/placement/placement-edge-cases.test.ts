/**
 * Edge-case tests for placement API routes
 *
 * Covers:
 *   - Malformed AI response JSON in submit
 *   - Child not found in submit
 *   - GET returns 404 when no placement exists
 *   - PATCH returns 404 for another parent's child
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { prismaMock, resetPrismaMock } from '../../setup/db-mock';
import { mockAuth, resetAuthMock } from '../../setup/auth-mock';
import { CHILD_MAYA, PLACEMENT_MAYA } from '../../setup/fixtures';

vi.mock('@/lib/db', () => ({ prisma: prismaMock }));
vi.mock('@/lib/auth', () => ({ auth: mockAuth }));

const { mockCreate } = vi.hoisted(() => ({ mockCreate: vi.fn() }));
vi.mock('@anthropic-ai/sdk', () => {
  const AnthropicMock = vi.fn(function(this: any) {
    this.messages = { create: mockCreate };
  });
  return { default: AnthropicMock };
});

import { POST as placementSubmitPOST } from '@/app/api/placement/submit/route';
import { GET as placementGET, PATCH as placementPATCH } from '@/app/api/placement/[childId]/route';

function makeChildIdParams(childId: string) {
  return { params: Promise.resolve({ childId }) };
}

describe('POST /api/placement/submit — edge cases', () => {
  beforeEach(() => { resetPrismaMock(); resetAuthMock(); mockCreate.mockReset(); });

  it('returns 500 when AI response is not valid JSON', async () => {
    prismaMock.childProfile.findFirst.mockResolvedValue(CHILD_MAYA);
    prismaMock.placementResult.findUnique.mockResolvedValue(null);

    mockCreate.mockResolvedValue({
      content: [{ type: 'text', text: 'This is not JSON at all' }],
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
    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.error).toContain('analyze');
  });

  it('returns 404 when child not found', async () => {
    prismaMock.childProfile.findFirst.mockResolvedValue(null);

    const res = await placementSubmitPOST(new Request('http://localhost/api/placement/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        childId: 'nonexistent-child',
        prompts: ['p1', 'p2', 'p3'],
        responses: ['r1', 'r2', 'r3'],
      }),
    }));
    expect(res.status).toBe(404);
    const data = await res.json();
    expect(data.error).toContain('Child not found');
  });
});

describe('GET /api/placement/[childId] — edge cases', () => {
  beforeEach(() => { resetPrismaMock(); resetAuthMock(); });

  it('returns 404 when no placement result exists', async () => {
    prismaMock.childProfile.findFirst.mockResolvedValue(CHILD_MAYA);
    prismaMock.placementResult.findUnique.mockResolvedValue(null);

    const res = await placementGET(
      new Request('http://localhost/api/placement/' + CHILD_MAYA.id) as any,
      makeChildIdParams(CHILD_MAYA.id),
    );
    expect(res.status).toBe(404);
    const data = await res.json();
    expect(data.error).toContain('No placement result found');
  });
});

describe('PATCH /api/placement/[childId] — edge cases', () => {
  beforeEach(() => { resetPrismaMock(); resetAuthMock(); });

  it('returns 404 when child belongs to another parent', async () => {
    // findFirst with parentId filter returns null (ownership check fails)
    prismaMock.childProfile.findFirst.mockResolvedValue(null);

    const res = await placementPATCH(
      new Request('http://localhost/api/placement/other-child-id', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assignedTier: 2 }),
      }) as any,
      makeChildIdParams('other-child-id'),
    );
    expect(res.status).toBe(404);
    const data = await res.json();
    expect(data.error).toContain('Child not found');
  });
});
