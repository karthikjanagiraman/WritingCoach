/**
 * Route test helpers for WriteWise Kids API tests.
 * Provides utilities for building requests and params for Next.js route handlers.
 */
import { resetPrismaMock } from './db-mock';
import { resetAuthMock } from './auth-mock';
import { resetClaudeMock } from './claude-mock';

/**
 * Build a Request object for POST route handlers.
 */
export function buildRequest(url: string, body?: Record<string, unknown>): Request {
  if (body) {
    return new Request(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  }
  return new Request(url);
}

/**
 * Build Next.js 15 route params (Promise-based).
 * For routes like /api/children/[id]/...
 */
export function buildParams<T extends Record<string, string>>(obj: T): { params: Promise<T> } {
  return { params: Promise.resolve(obj) };
}

/**
 * Reset all test mocks between tests.
 */
export function resetAllMocks() {
  resetPrismaMock();
  resetAuthMock();
  resetClaudeMock();
}
