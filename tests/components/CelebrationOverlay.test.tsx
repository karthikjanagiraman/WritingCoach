import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

// vi.hoisted ensures the mock is available when vi.mock is hoisted
const confettiMock = vi.hoisted(() => vi.fn());
vi.mock('canvas-confetti', () => ({ default: confettiMock }));

import CelebrationOverlay from '@/components/CelebrationOverlay';

describe('CelebrationOverlay', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    confettiMock.mockClear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const singleBadge = [
    { id: 'first_story', name: 'First Story', emoji: '📝', description: 'Complete your first lesson' },
  ];

  const twoBadges = [
    { id: 'first_story', name: 'First Story', emoji: '📝', description: 'Complete your first lesson' },
    { id: 'streak_7', name: 'Week Warrior', emoji: '🔥', description: '7-day streak' },
  ];

  it('renders badge name and description', () => {
    render(<CelebrationOverlay badges={singleBadge} onDismiss={vi.fn()} />);
    expect(screen.getByText('First Story')).toBeInTheDocument();
    expect(screen.getByText('Complete your first lesson')).toBeInTheDocument();
  });

  it('shows plural heading for multiple badges', () => {
    render(<CelebrationOverlay badges={twoBadges} onDismiss={vi.fn()} />);
    expect(screen.getByText('Badges Unlocked!')).toBeInTheDocument();
  });

  it('calls confetti on mount', () => {
    render(<CelebrationOverlay badges={singleBadge} onDismiss={vi.fn()} />);
    expect(confettiMock).toHaveBeenCalled();
  });

  it('continue button calls onDismiss', () => {
    const onDismiss = vi.fn();
    render(<CelebrationOverlay badges={singleBadge} onDismiss={onDismiss} />);

    fireEvent.click(screen.getByText('Continue'));
    // handleDismiss calls setTimeout(onDismiss, 200)
    vi.advanceTimersByTime(300);
    expect(onDismiss).toHaveBeenCalled();
  });
});
