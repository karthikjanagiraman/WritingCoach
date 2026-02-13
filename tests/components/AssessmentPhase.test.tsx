import { describe, it, expect, vi } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import AssessmentPhase from '@/components/AssessmentPhase';
import { renderWithProviders } from '../setup/component-helpers';

describe('AssessmentPhase', () => {
  const defaultProps = {
    lessonTitle: 'Story Beginnings',
    onSubmit: vi.fn(),
  };

  it('shows word count that updates as user types', () => {
    renderWithProviders(<AssessmentPhase {...defaultProps} />, { tier: 1 });
    // Initially 0 words — should show encouraging message
    const textarea = screen.getByPlaceholderText(/Start writing here/);
    // Type some words
    fireEvent.change(textarea, { target: { value: 'One two three four five' } });
    // Word count message should reflect the words
    expect(screen.getByText(/Write \d+ more word/)).toBeInTheDocument();
  });

  it('shows encouraging "Write X more words!" below minimum', () => {
    renderWithProviders(<AssessmentPhase {...defaultProps} />, { tier: 1 });
    const textarea = screen.getByPlaceholderText(/Start writing here/);
    // Type 10 words (below min of 50)
    fireEvent.change(textarea, { target: { value: 'word '.repeat(10).trim() } });
    expect(screen.getByText(/Write \d+ more word/)).toBeInTheDocument();
  });

  it('shows "Nice! You\'re in the sweet spot!" when in range', () => {
    renderWithProviders(<AssessmentPhase {...defaultProps} />, { tier: 1 });
    const textarea = screen.getByPlaceholderText(/Start writing here/);
    // Type 60 words (in range 50-100)
    fireEvent.change(textarea, { target: { value: 'word '.repeat(60).trim() } });
    expect(screen.getByText(/Nice! You're in the sweet spot!/)).toBeInTheDocument();
  });

  it('submit button disabled when under 30 words', () => {
    renderWithProviders(<AssessmentPhase {...defaultProps} />, { tier: 1 });
    const textarea = screen.getByPlaceholderText(/Start writing here/);
    // Type 10 words (under minimum to submit of 30)
    fireEvent.change(textarea, { target: { value: 'word '.repeat(10).trim() } });
    const submitButton = screen.getByRole('button', { name: /Show Ollie/ });
    expect(submitButton).toBeDisabled();
  });

  it('submit button enabled when 30+ words', () => {
    renderWithProviders(<AssessmentPhase {...defaultProps} />, { tier: 1 });
    const textarea = screen.getByPlaceholderText(/Start writing here/);
    // Type 35 words (above minimum to submit of 30)
    fireEvent.change(textarea, { target: { value: 'word '.repeat(35).trim() } });
    const submitButton = screen.getByRole('button', { name: /Show Ollie/ });
    expect(submitButton).not.toBeDisabled();
  });

  it('clicking submit shows confirmation modal', () => {
    renderWithProviders(<AssessmentPhase {...defaultProps} />, { tier: 1 });
    const textarea = screen.getByPlaceholderText(/Start writing here/);
    fireEvent.change(textarea, { target: { value: 'word '.repeat(35).trim() } });
    fireEvent.click(screen.getByRole('button', { name: /Show Ollie/ }));
    // Confirmation modal should appear
    expect(screen.getByText(/Ready to show Ollie/)).toBeInTheDocument();
  });

  it('confirming modal calls onSubmit with text', () => {
    const onSubmit = vi.fn();
    renderWithProviders(
      <AssessmentPhase lessonTitle="Story Beginnings" onSubmit={onSubmit} />,
      { tier: 1 }
    );
    const textarea = screen.getByPlaceholderText(/Start writing here/);
    const text = 'word '.repeat(35).trim();
    fireEvent.change(textarea, { target: { value: text } });
    // Click submit to show modal
    fireEvent.click(screen.getByRole('button', { name: /Show Ollie/ }));
    // Click confirm
    fireEvent.click(screen.getByRole('button', { name: /Yes, Show Ollie/ }));
    expect(onSubmit).toHaveBeenCalledWith(text);
  });

  it('canceling modal dismisses it without calling onSubmit', () => {
    const onSubmit = vi.fn();
    renderWithProviders(
      <AssessmentPhase lessonTitle="Story Beginnings" onSubmit={onSubmit} />,
      { tier: 1 }
    );
    const textarea = screen.getByPlaceholderText(/Start writing here/);
    fireEvent.change(textarea, { target: { value: 'word '.repeat(35).trim() } });
    // Click submit to show modal
    fireEvent.click(screen.getByRole('button', { name: /Show Ollie/ }));
    expect(screen.getByText(/Ready to show Ollie/)).toBeInTheDocument();
    // Click "Keep Writing" to cancel
    fireEvent.click(screen.getByRole('button', { name: /Keep Writing/ }));
    // Modal should be dismissed
    expect(screen.queryByText(/Ready to show Ollie/)).not.toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });
});
