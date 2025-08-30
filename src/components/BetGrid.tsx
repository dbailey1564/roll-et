import React from 'react'

interface Props {
  grid: number[][]
  mode: string
  splitFirst?: number | false
  onCellClick: (n: number) => void
  covered: Set<number>
  winning?: number | null
}

export function BetGrid({ grid, mode, splitFirst, onCellClick, covered, winning }: Props){
  const cellRefs = React.useRef<Record<number, HTMLButtonElement | null>>({})

  const handleKey = (
    e: React.KeyboardEvent<HTMLButtonElement>,
    rIdx: number,
    cIdx: number
  ) => {
    let target: number | undefined
    switch (e.key) {
      case 'ArrowRight':
        target = grid[rIdx][cIdx + 1]
        break
      case 'ArrowLeft':
        target = grid[rIdx][cIdx - 1]
        break
      case 'ArrowDown':
        target = grid[rIdx + 1]?.[cIdx]
        break
      case 'ArrowUp':
        target = grid[rIdx - 1]?.[cIdx]
        break
      default:
        return
    }
    if (target != null) {
      cellRefs.current[target]?.focus()
      e.preventDefault()
    }
  }

  return (
    <div className="betgrid">
      <div className="grid" role="grid">
        {grid.map((row, rIdx) => (
          <div className="row" role="row" key={rIdx}>
            {row.map((n, cIdx) => {
              const isCovered = covered.has(n)
              const isWin = winning === n
              const cls =
                'cell' +
                (splitFirst === n ? ' pending' : '') +
                (isCovered ? ' covered' : '') +
                (isWin ? ' winning' : '')
              return (
                <button
                  ref={el => (cellRefs.current[n] = el)}
                  role="gridcell"
                  tabIndex={0}
                  aria-selected={isCovered}
                  className={cls}
                  key={n}
                  onClick={() => onCellClick(n)}
                  onKeyDown={e => handleKey(e, rIdx, cIdx)}
                  title={
                    mode === 'corner'
                      ? 'Corner anchor (top-left of a 2×2)'
                      : mode === 'split'
                      ? splitFirst
                        ? `Choose an adjacent cell to ${splitFirst}`
                        : 'Choose first cell for split'
                      : 'Single number'
                  }
                >
                  {String(n).padStart(2, '0')}
                </button>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}
