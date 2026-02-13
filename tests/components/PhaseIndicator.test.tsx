import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import PhaseIndicator from '@/components/PhaseIndicator';

describe('PhaseIndicator', () => {
  it('shows 3 phase steps (Learn, Practice, Write)', () => {
    render(<PhaseIndicator currentPhase="instruction" />);
    expect(screen.getByText('Learn')).toBeInTheDocument();
    expect(screen.getByText('Practice')).toBeInTheDocument();
    expect(screen.getByText('Write')).toBeInTheDocument();
  });

  it('instruction phase: first dot active, others inactive', () => {
    render(<PhaseIndicator currentPhase="instruction" />);
    const dots = screen.getAllByText(/^[123]$/);
    // First dot shows "1" and is active (bg-active-primary)
    expect(dots[0].closest('span')).toHaveClass('bg-active-primary');
    // Second dot shows "2" and is inactive (bg-[#b2bec3])
    expect(dots[1].closest('span')).toHaveClass('bg-[#b2bec3]');
    // Third dot shows "3" and is inactive
    expect(dots[2].closest('span')).toHaveClass('bg-[#b2bec3]');
  });

  it('guided phase: first dot completed, second active', () => {
    render(<PhaseIndicator currentPhase="guided" />);
    // First dot is completed — shows SVG checkmark, no number
    const dots = screen.getAllByText(/^[23]$/);
    // Second dot (Practice) shows "2" and is active
    expect(dots[0].closest('span')).toHaveClass('bg-active-primary');
    // Third dot (Write) shows "3" and is inactive
    expect(dots[1].closest('span')).toHaveClass('bg-[#b2bec3]');
  });

  it('assessment phase: first two completed, third active', () => {
    render(<PhaseIndicator currentPhase="assessment" />);
    // Only the third dot shows a number
    const dot3 = screen.getByText('3');
    expect(dot3.closest('span')).toHaveClass('bg-active-primary');
    // Numbers 1 and 2 should not be visible (replaced by checkmarks)
    expect(screen.queryByText('1')).not.toBeInTheDocument();
    expect(screen.queryByText('2')).not.toBeInTheDocument();
  });

  it('feedback phase: all three completed', () => {
    render(<PhaseIndicator currentPhase="feedback" />);
    // No numbers should be visible — all replaced by checkmarks
    expect(screen.queryByText('1')).not.toBeInTheDocument();
    expect(screen.queryByText('2')).not.toBeInTheDocument();
    expect(screen.queryByText('3')).not.toBeInTheDocument();
  });
});
