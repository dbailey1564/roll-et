import React from 'react'
import { BetGrid } from './BetGrid'
import type { BetMode } from '../types'

interface Props {
  grid: number[][]
  mode: BetMode['kind']
  onCellClick: (n: number) => void
  splitFirst?: number | false
  covered: Set<number>
  winning: number | null
}

export function BetBoard({ grid, mode, onCellClick, splitFirst, covered, winning }: Props){
  return (
    <section className="table-wrap">
      <BetGrid
        grid={grid}
        mode={mode}
        onCellClick={onCellClick}
        splitFirst={splitFirst}
        covered={covered}
        winning={winning}
      />
    </section>
  )
}
