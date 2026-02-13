import { describe, it, expect, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '../../setup/component-helpers';

vi.mock('react-markdown', () => ({
  default: ({ children }: { children: string }) => <div data-testid="markdown">{children}</div>,
}));
vi.mock('remark-gfm', () => ({ default: () => {} }));

import ChatBubble from '@/components/shared/ChatBubble';

describe('ChatBubble', () => {
  const coachMessage = {
    id: '1',
    role: 'coach' as const,
    content: 'Hello!',
    timestamp: new Date().toISOString(),
  };

  const studentMessage = {
    id: '2',
    role: 'student' as const,
    content: 'Hi there!',
    timestamp: new Date().toISOString(),
  };

  it('coach message shows avatar and coach name', () => {
    renderWithProviders(<ChatBubble message={coachMessage} />, { tier: 1 });
    expect(screen.getByText('Ollie')).toBeInTheDocument();
    expect(screen.getByLabelText('Ollie the Owl')).toBeInTheDocument();
  });

  it('student message renders without avatar or coach name', () => {
    renderWithProviders(<ChatBubble message={studentMessage} />, { tier: 1 });
    expect(screen.getByText('Hi there!')).toBeInTheDocument();
    expect(screen.queryByText('Ollie')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Ollie the Owl')).not.toBeInTheDocument();
  });

  it('coach name changes with tier', () => {
    renderWithProviders(<ChatBubble message={coachMessage} />, { tier: 2 });
    expect(screen.getByText('Felix')).toBeInTheDocument();
  });
});
