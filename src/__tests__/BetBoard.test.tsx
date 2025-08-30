import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import { describe, it, expect, vi } from 'vitest'
import { BetBoard } from '../components/BetBoard'
import { numberGrid } from '../game/engine'

describe('BetBoard', () => {
  it('renders BetGrid and forwards cell clicks', () => {
    const onCellClick = vi.fn()
    const covered = new Set<number>()

    render(
      <BetBoard
        grid={numberGrid}
        mode="single"
        onCellClick={onCellClick}
        covered={covered}
        winning={null}
      />
    )

    const cell = screen.getByRole('gridcell', { name: '01' })
    fireEvent.click(cell)
    expect(onCellClick).toHaveBeenCalledWith(1)
  })
})
