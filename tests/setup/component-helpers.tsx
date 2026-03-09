/**
 * Component test helpers for WriteWise Kids.
 * Provides renderWithProviders, common mocks, and utilities.
 */
import React from 'react';
import { render, type RenderOptions } from '@testing-library/react';
import { vi } from 'vitest';
import type { Tier } from '@/types';

// ── TierProvider wrapper ────────────────────────────────────────────────────

// We import the real TierProvider to wrap components
import { TierProvider } from '@/contexts/TierContext';

interface ProviderOptions {
  tier?: Tier;
}

function Providers({ children, tier = 1 }: ProviderOptions & { children: React.ReactNode }) {
  return (
    <TierProvider tier={tier}>
      {children}
    </TierProvider>
  );
}

export function renderWithProviders(
  ui: React.ReactElement,
  options?: ProviderOptions & Omit<RenderOptions, 'wrapper'>
) {
  const { tier, ...renderOptions } = options ?? {};
  return render(ui, {
    wrapper: ({ children }) => <Providers tier={tier}>{children}</Providers>,
    ...renderOptions,
  });
}

// ── Mock factories for next/navigation ──────────────────────────────────────

export function createRouterMock() {
  return {
    push: vi.fn(),
    back: vi.fn(),
    replace: vi.fn(),
    refresh: vi.fn(),
    prefetch: vi.fn(),
    forward: vi.fn(),
  };
}

export function createSearchParamsMock(params: Record<string, string> = {}) {
  const searchParams = new URLSearchParams(params);
  return {
    get: (key: string) => searchParams.get(key),
    getAll: (key: string) => searchParams.getAll(key),
    has: (key: string) => searchParams.has(key),
    toString: () => searchParams.toString(),
    entries: () => searchParams.entries(),
    forEach: searchParams.forEach.bind(searchParams),
    keys: () => searchParams.keys(),
    values: () => searchParams.values(),
    [Symbol.iterator]: () => searchParams[Symbol.iterator](),
    size: searchParams.size,
    append: vi.fn(),
    delete: vi.fn(),
    set: vi.fn(),
    sort: vi.fn(),
  };
}

// ── Common module mock factories ────────────────────────────────────────────

/** Use in vi.mock('canvas-confetti', ...) */
export const canvasConfettiMock = vi.fn();

/** Use in vi.mock('react-markdown', ...) */
export function createReactMarkdownMock() {
  return {
    default: ({ children }: { children: string }) => <div data-testid="markdown">{children}</div>,
  };
}

/** Use in vi.mock('remark-gfm', ...) */
export function createRemarkGfmMock() {
  return { default: () => {} };
}

// ── Badge fixture for component tests ───────────────────────────────────────

export const BADGE_FIXTURES: Record<string, { id: string; name: string; emoji: string; description: string; category: string; rarity: string }> = {
  brave_start: { id: 'brave_start', name: 'Brave Start', emoji: '✏️', description: 'You put your ideas on paper for the first time!', category: 'first_steps', rarity: 'common' },
  ten_down: { id: 'ten_down', name: 'Ten Down', emoji: '🔟', description: "You've finished ten lessons. That's real dedication!", category: 'craft', rarity: 'rare' },
  high_marks: { id: 'high_marks', name: 'High Marks', emoji: '⭐', description: "You've scored 3.5 stars or higher three times!", category: 'craft', rarity: 'rare' },
};
