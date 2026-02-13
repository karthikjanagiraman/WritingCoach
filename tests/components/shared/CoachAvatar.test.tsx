import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '../../setup/component-helpers';
import CoachAvatar from '@/components/shared/CoachAvatar';

describe('CoachAvatar', () => {
  it('shows owl emoji for tier 1', () => {
    renderWithProviders(<CoachAvatar />, { tier: 1 });
    expect(screen.getByLabelText('Ollie the Owl')).toBeInTheDocument();
    expect(screen.getByText('🦉')).toBeInTheDocument();
  });

  it('shows fox emoji for tier 2', () => {
    renderWithProviders(<CoachAvatar />, { tier: 2 });
    expect(screen.getByLabelText('Felix the Fox')).toBeInTheDocument();
    expect(screen.getByText('🦊')).toBeInTheDocument();
  });

  it('shows wolf emoji for tier 3', () => {
    renderWithProviders(<CoachAvatar />, { tier: 3 });
    expect(screen.getByLabelText('Sage the Wolf')).toBeInTheDocument();
    expect(screen.getByText('🐺')).toBeInTheDocument();
  });
});
