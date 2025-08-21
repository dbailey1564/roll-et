import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { describe, it, expect, vi } from 'vitest';
import { BetGrid } from '../components/BetGrid';
import { numberGrid } from '../game/engine';

describe('BetGrid', () => {
  it('shows covered state and handles clicks', () => {
    const onCellClick = vi.fn();
    const covered = new Set([1, 7]);

    render(
      <BetGrid
        grid={numberGrid}
        mode="single"
        onCellClick={onCellClick}
        covered={covered}
        winning={null}
      />
    );

    const cell1 = screen.getByRole('gridcell', { name: '01' });
    expect(cell1).toHaveClass('covered');
    expect(cell1).toHaveAttribute('aria-selected', 'true');

    const cell2 = screen.getByRole('gridcell', { name: '02' });
    expect(cell2).not.toHaveClass('covered');

    fireEvent.click(cell2);
    expect(onCellClick).toHaveBeenCalledWith(2);
  });
});
