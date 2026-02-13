/**
 * Edge-case tests for POST /api/auth/signup
 *
 * Covers:
 *   - Short password rejection
 *   - Email lowercasing (no trim in actual code)
 *   - Invalid email format rejection
 *   - Database error handling
 *   - userId in response
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { prismaMock, resetPrismaMock } from '../../setup/db-mock';
import { PARENT_USER } from '../../setup/fixtures';

vi.mock('@/lib/db', () => ({ prisma: prismaMock }));

import { POST as signupPOST } from '@/app/api/auth/signup/route';

describe('POST /api/auth/signup — edge cases', () => {
  beforeEach(() => { resetPrismaMock(); });

  it('rejects password shorter than 8 characters', async () => {
    const res = await signupPOST(new Request('http://localhost/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Test', email: 'test@example.com', password: 'short12' }),
    }) as any);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain('8 characters');
  });

  it('lowercases email before lookup (does not trim)', async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);
    prismaMock.user.create.mockResolvedValue({ ...PARENT_USER, id: 'new-id' });

    await signupPOST(new Request('http://localhost/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Test', email: 'TEST@Example.com', password: 'password123' }),
    }) as any);

    // The code does email.toLowerCase() so findUnique should be called with lowercased email
    expect(prismaMock.user.findUnique).toHaveBeenCalledWith({
      where: { email: 'test@example.com' },
    });
  });

  it('rejects invalid email format', async () => {
    const res = await signupPOST(new Request('http://localhost/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Test', email: 'notanemail', password: 'password123' }),
    }) as any);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain('email');
  });

  it('returns 500 when database create throws', async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);
    prismaMock.user.create.mockRejectedValue(new Error('DB connection failed'));

    const res = await signupPOST(new Request('http://localhost/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Test', email: 'test@example.com', password: 'password123' }),
    }) as any);
    expect(res.status).toBe(500);
  });

  it('returns userId in successful response', async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);
    prismaMock.user.create.mockResolvedValue({ ...PARENT_USER, id: 'created-user-id' });

    const res = await signupPOST(new Request('http://localhost/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Test', email: 'new@example.com', password: 'password123' }),
    }) as any);
    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.userId).toBe('created-user-id');
  });
});
