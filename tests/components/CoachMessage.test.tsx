import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import CoachMessage from '@/components/CoachMessage';

vi.mock('react-markdown', () => ({
  default: ({ children }: { children: string }) => <div data-testid="markdown">{children}</div>,
}));
vi.mock('remark-gfm', () => ({ default: () => {} }));

describe('CoachMessage', () => {
  it('renders content via react-markdown mock', () => {
    render(<CoachMessage content="Hello, great writer!" />);
    expect(screen.getByTestId('markdown')).toHaveTextContent('Hello, great writer!');
  });

  it('strips leading 🦉 emoji from content', () => {
    render(<CoachMessage content="🦉 Welcome to the lesson!" />);
    expect(screen.getByTestId('markdown')).toHaveTextContent('Welcome to the lesson!');
    expect(screen.getByTestId('markdown').textContent).not.toMatch(/^🦉/);
  });

  it('strips leading 🦊 emoji from content', () => {
    render(<CoachMessage content="🦊 Let us get started!" />);
    expect(screen.getByTestId('markdown')).toHaveTextContent('Let us get started!');
    expect(screen.getByTestId('markdown').textContent).not.toMatch(/^🦊/);
  });

  it('strips leading 🐺 emoji from content', () => {
    render(<CoachMessage content="🐺 Time to write!" />);
    expect(screen.getByTestId('markdown')).toHaveTextContent('Time to write!');
    expect(screen.getByTestId('markdown').textContent).not.toMatch(/^🐺/);
  });

  it('preserves emojis that appear mid-content (not leading)', () => {
    render(<CoachMessage content="Great job! 🦉 Keep going!" />);
    expect(screen.getByTestId('markdown')).toHaveTextContent('Great job! 🦉 Keep going!');
  });
});
