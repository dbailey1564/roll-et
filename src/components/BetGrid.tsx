import React from 'react'

interface Props {
  grid: number[][]
  mode: string
  rangeCols: number[][]
  splitFirst?: number
  onCellClick: (n: number) => void
  onRangeClick: (colIndex: number) => void
}

export function BetGrid({ grid, mode, rangeCols, splitFirst, onCellClick, onRangeClick }: Props){
  return (
    <div className="betgrid">
      <div className="columns">
        {rangeCols.map((col, i) => (
          <button
            key={i}
            className={'colhead' + (mode==='range' ? ' active' : '')}
            onClick={()=> onRangeClick(i)}
            title={`Range Column ${i+1}: ${col.join(', ')}`}
          >
            Col {i+1}
          </button>
        ))}
      </div>
      <div className="grid">
        {grid.map((row, rIdx)=>(
          <div className="row" key={rIdx}>
            {row.map(n => (
              <button
                className={'cell' + (splitFirst===n ? ' pending' : '')}
                key={n}
                onClick={()=>onCellClick(n)}
                title={
                  mode==='quarter' ? 'Quarter anchor (top-left of a 2x2)' :
                  mode==='split' ? (splitFirst ? `Choose an adjacent cell to ${splitFirst}` : 'Choose first cell for split') :
                  'Single number'
                }
              >
                {String(n).padStart(2,'0')}
              </button>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
