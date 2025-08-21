import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { describe, it, expect, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import Stats from '../Stats';

const mockSetStats = vi.fn();

vi.mock('../context/GameContext', () => ({
  useStats: () => ({
    stats: {
      rounds: 5,
      hits: Array.from({ length: 21 }, (_, i) => i),
      banks: { 1: 100, 2: 200, 3: 0, 4: 0 },
    },
    setStats: mockSetStats,
  }),
}));

vi.mock('../pwa/useInstallPrompt', () => ({
  useInstallPrompt: () => ({ canInstall: false, install: vi.fn(), installed: false }),
}));

describe('Stats page', () => {
  it('renders stats and resets', () => {
    render(<Stats />, { wrapper: MemoryRouter });

    const rounds = screen.getByText('Rounds:');
    expect(rounds.parentElement).toHaveTextContent('Rounds: 5');

    const bankItems = screen.getAllByRole('listitem');
    expect(bankItems[0]).toHaveTextContent('P1');
    expect(bankItems[0]).toHaveTextContent('100');

    const hitCell = screen.getByText('05');
    expect(hitCell.nextSibling).toHaveTextContent('5');

    fireEvent.click(screen.getByText('Reset Stats'));
    expect(mockSetStats).toHaveBeenCalled();
  });
});
