import React from 'react'
import type { BetType } from '../game/engine'
import type { BetMode, Player, RoundState } from '../types'
import { clampInt } from '../utils'

interface Props {
  amount: number
  setAmount: (n: number) => void
  minBet: number
  maxForActive: number
  active: Player
  mode: BetMode
  setMode: React.Dispatch<React.SetStateAction<BetMode>>
  roundState: RoundState
  undoLast: (pid: number) => void
  clearBets: (pid: number) => void
  lockRound: () => void
  enteredRoll: number | ''
  setEnteredRoll: (n: number | '') => void
  settleRound: () => void
  newRound: () => void
}

export function BetControls({ amount, setAmount, minBet, maxForActive, active, mode, setMode, roundState, undoLast, clearBets, lockRound, enteredRoll, setEnteredRoll, settleRound, newRound }: Props){
  const canPlaceActive = roundState==='open' && amount>=minBet && amount<=active.pool

  return (
    <section className="controls">
      <div className="amount">
        <input
          type="number" min={minBet} max={maxForActive} step={1}
          value={amount}
          onChange={(e)=> setAmount(clampInt(e.target.valueAsNumber || minBet, minBet, maxForActive))}
          disabled={active.pool === 0}
        />
        <span className="hint">(min {minBet}, remaining pool {active.pool})</span>
      </div>

      <div className="betmodes">
        {(['single','split','corner','even','odd','high','low'] as BetType[]).map(k => (
          <button
            key={k}
            className={(mode as any).kind === k ? 'active' : ''}
            onClick={()=> setMode(k==='split' ? {kind:'split'} : {kind: k as any})}
            disabled={roundState!=='open' || !canPlaceActive}>
            {labelFor(k)}
          </button>
        ))}
      </div>

      <div className="actions">
        <button onClick={()=>undoLast(active.id)} disabled={roundState!=='open' || active.bets.length===0}>Undo</button>
        <button onClick={()=>clearBets(active.id)} disabled={roundState!=='open' || active.bets.length===0}>Clear</button>
        <button onClick={lockRound} disabled={roundState!=='open'}>Lock Bets</button>
        <div className="manual-roll">
          <input
            type="number" min={1} max={20} placeholder="roll 1–20"
            value={enteredRoll}
            onChange={e=> setEnteredRoll((() => {
              const v = e.target.valueAsNumber
              if(!Number.isFinite(v)) return '' as const
              const n = clampInt(v, 1, 20)
              return n as unknown as number
            })())}
            disabled={roundState!=='locked'}
          />
          <button onClick={settleRound} disabled={roundState!=='locked' || !enteredRoll}>Settle</button>
          <button onClick={newRound} disabled={roundState!=='settled'}>New Round</button>
        </div>
      </div>
    </section>
  )
}

function labelFor(t: BetType) {
  switch(t){
    case 'single': return 'Single (18:1)'
    case 'split': return 'Split (8:1)'
    case 'corner': return 'Corner (3:1)'
    case 'even': return 'Even (1:1)'
    case 'odd': return 'Odd (1:1)'
    case 'high': return 'High 11–20 (1:1)'
    case 'low': return 'Low 1–10 (1:1)'
  }
}
