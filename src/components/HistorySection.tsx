import React from 'react'
import type { Player } from '../types'

interface Entry { roll: number, deltas: Record<number, number>, time: number }

interface Props {
  history: Entry[]
  players: Player[]
  fmtUSDSign: (credits: number) => string
}

export function HistorySection({ history, players, fmtUSDSign }: Props){
  return (
    <section className="history">
      <h3>History</h3>
      {history.length===0 ? <div className="muted">No rounds yet.</div> : (
        <table>
          <thead>
            <tr>
              <th>Roll</th>
              {players.map(p=> <th key={p.id}>{p.name} Δ</th>)}
              <th>Time</th>
            </tr>
          </thead>
          <tbody>
            {history.map((h,i)=>(
              <tr key={i}>
                <td>{h.roll}</td>
                {players.map(p => {
                  const d = h.deltas[p.id] ?? 0
                  const cls = d>=0 ? 'pos' : 'neg'
                  return <td key={p.id} className={cls}>{fmtUSDSign(d)}</td>
                })}
                <td>{new Date(h.time).toLocaleTimeString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  )
}
