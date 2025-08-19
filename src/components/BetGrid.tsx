import React from 'react'

interface Props {
  grid: number[][]
  mode: string
  splitFirst?: number
  onCellClick: (n: number) => void
  covered: Set<number>
  winning?: number | null
}

export function BetGrid({ grid, mode, splitFirst, onCellClick, covered, winning }: Props){
  return (
    <div className="betgrid">
      <div className="grid">
        {grid.map((row, rIdx)=>(
          <div className="row" key={rIdx}>
            {row.map(n => {
              const isCovered = covered.has(n)
              const isWin = winning === n
              const cls = 'cell' + (splitFirst===n ? ' pending' : '') + (isCovered ? ' covered' : '') + (isWin ? ' winning' : '')
              return (
                <button
                  className={cls}
                  key={n}
                  onClick={()=>onCellClick(n)}
                  title={
                    mode==='quarter' ? 'Corners anchor (top-left of a 2x2)' :
                    mode==='split' ? (splitFirst ? `Choose an adjacent cell to ${splitFirst}` : 'Choose first cell for split') :
                    'Single number'
                  }
                >
                  {String(n).padStart(2,'0')}
                </button>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}
