/**
 * Auth.js session mock for API route tests.
 *
 * Usage:
 *   vi.mock('@/lib/auth', () => ({ auth: mockAuth }));
 *
 * Override per-test:
 *   mockAuthSession({ userId: 'different-user' });
 *   mockAuthSession(null); // unauthenticated
 */
import { vi } from 'vitest';
import { PARENT_USER } from './fixtures';

let currentSession: any = {
  user: {
    id: PARENT_USER.id,
    userId: PARENT_USER.id,
    email: PARENT_USER.email,
    name: PARENT_USER.name,
    role: PARENT_USER.role,
  },
};

export const mockAuth = vi.fn(() => Promise.resolve(currentSession));

export function mockAuthSession(session: any) {
  currentSession = session;
  mockAuth.mockResolvedValue(session);
}

export function mockAuthAsParent() {
  mockAuthSession({
    user: {
      id: PARENT_USER.id,
      userId: PARENT_USER.id,
      email: PARENT_USER.email,
      name: PARENT_USER.name,
      role: 'PARENT',
    },
  });
}

export function mockAuthAsUnauthenticated() {
  mockAuthSession(null);
}

export function resetAuthMock() {
  mockAuthAsParent();
}
