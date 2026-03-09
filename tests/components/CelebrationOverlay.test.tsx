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
    { id: 'brave_start', name: 'Brave Start', emoji: '✏️', description: 'You put your ideas on paper for the first time!', rarity: 'common' as const },
  ];

  const twoBadges = [
    { id: 'brave_start', name: 'Brave Start', emoji: '✏️', description: 'You put your ideas on paper for the first time!', rarity: 'common' as const },
    { id: 'ten_down', name: 'Ten Down', emoji: '🔟', description: "You've finished ten lessons.", rarity: 'rare' as const },
  ];

  it('renders badge name and description', () => {
    render(<CelebrationOverlay badges={singleBadge} onDismiss={vi.fn()} />);
    expect(screen.getByText('Brave Start')).toBeInTheDocument();
    expect(screen.getByText('You put your ideas on paper for the first time!')).toBeInTheDocument();
  });

  it('shows plural heading for multiple badges', () => {
    render(<CelebrationOverlay badges={twoBadges} onDismiss={vi.fn()} />);
    expect(screen.getByText('Stickers Unlocked!')).toBeInTheDocument();
  });

  it('calls confetti on mount', () => {
    render(<CelebrationOverlay badges={singleBadge} onDismiss={vi.fn()} />);
    expect(confettiMock).toHaveBeenCalled();
  });

  it('auto-dismisses common badges after timeout', () => {
    const onDismiss = vi.fn();
    render(<CelebrationOverlay badges={singleBadge} onDismiss={onDismiss} />);

    // Common badges auto-dismiss after 3000ms
    vi.advanceTimersByTime(3200);
    expect(onDismiss).toHaveBeenCalled();
  });

  it('shows dismiss button that calls onDismiss', () => {
    const onDismiss = vi.fn();
    render(<CelebrationOverlay badges={singleBadge} onDismiss={onDismiss} />);

    fireEvent.click(screen.getByText('Nice!'));
    // handleDismiss calls setTimeout(onDismiss, 200)
    vi.advanceTimersByTime(300);
    expect(onDismiss).toHaveBeenCalled();
  });

  it('shows rarity label for badges', () => {
    render(<CelebrationOverlay badges={singleBadge} onDismiss={vi.fn()} />);
    expect(screen.getByText('Common')).toBeInTheDocument();
  });
});
