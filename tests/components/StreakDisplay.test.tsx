import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import StreakDisplay from '@/components/StreakDisplay';

describe('StreakDisplay', () => {
  it('shows fire emoji + streak count when currentStreak > 0', () => {
    render(
      <StreakDisplay currentStreak={5} longestStreak={10} weeklyGoal={3} weeklyCompleted={1} />
    );
    expect(screen.getByText('🔥')).toBeInTheDocument();
    expect(screen.getByText(/5 days/)).toBeInTheDocument();
  });

  it('shows "Start your streak today!" when currentStreak is 0', () => {
    render(
      <StreakDisplay currentStreak={0} longestStreak={3} weeklyGoal={3} weeklyCompleted={0} />
    );
    expect(screen.getByText('Start your streak today!')).toBeInTheDocument();
  });

  it('shows longest streak', () => {
    render(
      <StreakDisplay currentStreak={5} longestStreak={12} weeklyGoal={3} weeklyCompleted={2} />
    );
    expect(screen.getByText(/Best: 12 days/)).toBeInTheDocument();
  });

  it('renders weekly progress dots matching weeklyGoal count', () => {
    const { container } = render(
      <StreakDisplay currentStreak={3} longestStreak={5} weeklyGoal={5} weeklyCompleted={2} />
    );
    // weeklyGoal = 5, so there should be 5 dot elements
    const dotsContainer = container.querySelector('.flex.gap-1\\.5');
    expect(dotsContainer).toBeTruthy();
    const dots = dotsContainer!.children;
    expect(dots.length).toBe(5);
  });

  it('fills dots for completed lessons (weeklyCompleted)', () => {
    const { container } = render(
      <StreakDisplay currentStreak={3} longestStreak={5} weeklyGoal={4} weeklyCompleted={2} />
    );
    const dotsContainer = container.querySelector('.flex.gap-1\\.5');
    const dots = Array.from(dotsContainer!.children);
    // First 2 should be filled (bg-active-primary), last 2 unfilled (bg-gray-100)
    expect(dots[0]).toHaveClass('bg-active-primary');
    expect(dots[1]).toHaveClass('bg-active-primary');
    expect(dots[2]).toHaveClass('bg-gray-100');
    expect(dots[3]).toHaveClass('bg-gray-100');
  });

  it('shows singular "day" for streak of 1', () => {
    render(
      <StreakDisplay currentStreak={1} longestStreak={5} weeklyGoal={3} weeklyCompleted={1} />
    );
    // The main streak display should show "1 day" (singular, not "1 days")
    const streakCount = screen.getByText(/^1 day$/);
    expect(streakCount).toBeInTheDocument();
    // The "Best" line should use plural since longestStreak=5
    expect(screen.getByText(/Best: 5 days/)).toBeInTheDocument();
  });
});
