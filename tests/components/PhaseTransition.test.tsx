import { describe, it, expect, vi } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import PhaseTransition from '@/components/PhaseTransition';
import { renderWithProviders } from '../setup/component-helpers';

// CoachAvatar uses useTier, so we need TierProvider (handled by renderWithProviders)

describe('PhaseTransition', () => {
  it('shows "Learning Complete!" for instruction fromPhase', () => {
    renderWithProviders(
      <PhaseTransition fromPhase="instruction" onContinue={vi.fn()} />,
      { tier: 1 }
    );
    expect(screen.getByText('Learning Complete!')).toBeInTheDocument();
  });

  it('shows "Practice Complete!" for guided fromPhase', () => {
    renderWithProviders(
      <PhaseTransition fromPhase="guided" onContinue={vi.fn()} />,
      { tier: 1 }
    );
    expect(screen.getByText('Practice Complete!')).toBeInTheDocument();
  });

  it('shows "Let\u2019s Practice!" button for instruction transition', () => {
    renderWithProviders(
      <PhaseTransition fromPhase="instruction" onContinue={vi.fn()} />,
      { tier: 1 }
    );
    expect(screen.getByRole('button', { name: /Let\u2019s Practice/i })).toBeInTheDocument();
  });

  it('shows "Time to Write!" button for guided transition', () => {
    renderWithProviders(
      <PhaseTransition fromPhase="guided" onContinue={vi.fn()} />,
      { tier: 1 }
    );
    expect(screen.getByRole('button', { name: /Time to Write/i })).toBeInTheDocument();
  });

  it('calls onContinue when button clicked', () => {
    const onContinue = vi.fn();
    renderWithProviders(
      <PhaseTransition fromPhase="instruction" onContinue={onContinue} />,
      { tier: 1 }
    );
    fireEvent.click(screen.getByRole('button', { name: /Let\u2019s Practice/i }));
    expect(onContinue).toHaveBeenCalledOnce();
  });
});
