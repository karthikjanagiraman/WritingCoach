import { describe, it, expect, vi } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import FeedbackView from '@/components/FeedbackView';
import { renderWithProviders } from '../setup/component-helpers';
import type { AssessmentResult } from '@/types';

vi.mock('@/lib/api', () => ({ reviseAssessment: vi.fn() }));
vi.mock('@/lib/badges', () => ({
  getBadgeById: vi.fn((id: string) => {
    const badges: Record<string, any> = {
      first_story: { id: 'first_story', name: 'First Story', emoji: '📝', description: 'Complete your first lesson' },
    };
    return badges[id];
  }),
}));
vi.mock('canvas-confetti', () => ({ default: vi.fn() }));

const mockResult: AssessmentResult = {
  scores: { character: 3, setting: 4, hook: 2 },
  overallScore: 3,
  feedback: {
    strength: 'Your character description was vivid and engaging.',
    growth: 'Try adding more sensory details to your setting.',
    encouragement: 'You are becoming a wonderful writer!',
  },
};

function renderFeedback(props: Partial<React.ComponentProps<typeof FeedbackView>> = {}) {
  return renderWithProviders(
    <FeedbackView
      result={mockResult}
      submittedText="Once upon a time there was a brave knight."
      sessionId="session-1"
      onNextLesson={vi.fn()}
      {...props}
    />,
    { tier: 1 }
  );
}

describe('FeedbackView', () => {
  it('renders star rating matching overallScore', () => {
    renderFeedback();
    // overallScore is 3, rounded to 3. Should show "3 out of 4 stars"
    expect(screen.getByText('3 out of 4 stars')).toBeInTheDocument();
  });

  it('renders per-criterion scores', () => {
    renderFeedback();
    expect(screen.getByText('character')).toBeInTheDocument();
    expect(screen.getByText('setting')).toBeInTheDocument();
    expect(screen.getByText('hook')).toBeInTheDocument();
  });

  it('shows strength and growth feedback cards', () => {
    renderFeedback();
    expect(screen.getByText('What You Did Well')).toBeInTheDocument();
    expect(screen.getByText('Your character description was vivid and engaging.')).toBeInTheDocument();
    expect(screen.getByText('Next Time, Try This')).toBeInTheDocument();
    expect(screen.getByText('Try adding more sensory details to your setting.')).toBeInTheDocument();
  });

  it('toggle "View My Writing" / "Hide My Writing"', () => {
    renderFeedback();
    // Initially writing is hidden
    expect(screen.queryByText('Once upon a time there was a brave knight.')).not.toBeInTheDocument();
    // Click "View My Writing"
    fireEvent.click(screen.getByRole('button', { name: 'View My Writing' }));
    expect(screen.getByText('Once upon a time there was a brave knight.')).toBeInTheDocument();
    // Button should now say "Hide My Writing"
    fireEvent.click(screen.getByRole('button', { name: 'Hide My Writing' }));
    expect(screen.queryByText('Once upon a time there was a brave knight.')).not.toBeInTheDocument();
  });

  it('shows badge inline notification when newBadges provided', async () => {
    renderFeedback({ newBadges: ['first_story'] });
    // Should show the badge name inline
    await waitFor(() => {
      expect(screen.getByText(/Badge Unlocked/)).toBeInTheDocument();
    });
    expect(screen.getByText(/First Story/)).toBeInTheDocument();
  });

  it('shows "Retake Lesson" button when onRetake provided', () => {
    renderFeedback({ onRetake: vi.fn() });
    expect(screen.getByRole('button', { name: 'Retake Lesson' })).toBeInTheDocument();
  });

  it('retake confirmation modal appears and calls onRetake', () => {
    const onRetake = vi.fn();
    renderFeedback({ onRetake });
    fireEvent.click(screen.getByRole('button', { name: 'Retake Lesson' }));
    // Confirmation modal should appear
    expect(screen.getByText('Retake this lesson?')).toBeInTheDocument();
    // Confirm the retake
    fireEvent.click(screen.getByRole('button', { name: /Yes, retake/ }));
    expect(onRetake).toHaveBeenCalledOnce();
  });

  it('shows "Back to Dashboard" when onRetake provided, "Continue" otherwise', () => {
    const { unmount } = renderFeedback({ onRetake: vi.fn() });
    expect(screen.getByText(/Back to Dashboard/)).toBeInTheDocument();
    unmount();

    renderFeedback();
    expect(screen.getByText(/Continue/)).toBeInTheDocument();
  });
});
