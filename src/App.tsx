import React from 'react'
import { BetGrid } from './components/BetGrid'
import { Bet, BetType, OddsTable, makeQuarterFromAnchor, rangeColumns, resolveRound, numberGrid } from './game/engine'
import { useInstallPrompt } from './pwa/useInstallPrompt'

const MIN_BET = 1
const MAX_BET = 100
const PER_ROUND_POOL = 8 // max credits per player per round

type BetMode =
  | { kind: 'single' }
  | { kind: 'split'; first?: number }
  | { kind: 'quarter' }
  | { kind: 'range' }
  | { kind: 'high' }
  | { kind: 'low' }
  | { kind: 'even' }
  | { kind: 'odd' }

type RoundState = 'open' | 'locked' | 'settled'

interface Player {
  id: number
  name: string
  bets: Bet[]
  pool: number   // remaining this round (starts 8 → 0)
  bank: number   // cumulative across rounds
}

export default function App() {
  const playersInit: Player[] = React.useMemo(() => (
    [1,2,3,4].map(i => ({
      id: i,
      name: `P${i}`,
      bets: [],
      pool: PER_ROUND_POOL,
      bank: 0,
    }))
  ), [])

  const [players, setPlayers] = React.useState<Player[]>(playersInit)
  const [activePid, setActivePid] = React.useState<number>(1)

  const DEFAULT_BET = 1
  const [amount, setAmount] = React.useState<number>(() => {
    const saved = localStorage.getItem('bet')
    const n = saved ? Number(saved) : DEFAULT_BET
    return Number.isFinite(n) ? clampInt(n, MIN_BET, MAX_BET) : DEFAULT_BET
  })
  React.useEffect(()=>{ localStorage.setItem('bet', String(amount)) }, [amount])

  const [mode, setMode] = React.useState<BetMode>({ kind: 'single' })

  const [roundState, setRoundState] = React.useState<RoundState>('open')
  const [enteredRoll, setEnteredRoll] = React.useState<number | ''>('')
  const [history, setHistory] = React.useState<Array<{ roll: number, deltas: Record<number, number>, time: number }>>([])

  const { canInstall, install, installed, isiOS } = useInstallPrompt()

  const active = players.find(p => p.id === activePid)!
  const totalStake = (p: Player) => p.bets.reduce((a,b)=>a+b.amount, 0)
  const canPlace = (p: Player) => roundState==='open' && amount>=MIN_BET && amount<=MAX_BET && amount<=p.pool

  // --- Betting operations ---
  const addBetFor = (pid: number, bet: Omit<Bet, 'id'>) => {
    setPlayers(prev => prev.map(p => {
      if(p.id !== pid) return p
      if(!canPlace(p)) return p
      const id = String(Date.now()) + '-' + Math.random().toString(36).slice(2,7)
      return { ...p, bets: [...p.bets, { ...bet, id }], pool: p.pool - bet.amount }
    }))
  }

  const undoLast = (pid: number) => {
    if(roundState!=='open') return
    setPlayers(prev => prev.map(p => {
      if(p.id !== pid) return p
      const last = p.bets[p.bets.length-1]
      if(!last) return p
      const bets = p.bets.slice(0, -1)
      return { ...p, bets, pool: p.pool + last.amount }
    }))
    if((mode as any).kind==='split' && (mode as any).first){ setMode({kind:'split'}) }
  }

  const clearBets = (pid: number) => {
    if(roundState!=='open') return
    setPlayers(prev => prev.map(p => p.id===pid ? ({ ...p, pool: PER_ROUND_POOL, bets: [] }) : p))
    if((mode as any).kind==='split' && (mode as any).first){ setMode({kind:'split'}) }
  }

  const onCellClick = (n: number) => {
    if(roundState!=='open') return
    const p = active
    if(!canPlace(p)) return
    switch(mode.kind){
      case 'single':
        addBetFor(p.id, { type: 'single', selection: [n], amount, odds: OddsTable.single })
        break
      case 'split': {
        const first = (mode as any).first as number | undefined
        if(first == null){
          setMode({ kind: 'split', first: n })
        } else {
          if(!isAdjacent(first,n)){ setMode({ kind: 'split' }); return }
          const pair = [first, n].sort((a,b)=>a-b)
          addBetFor(p.id, { type:'split', selection: pair, amount, odds: OddsTable.split })
          setMode({ kind: 'split' })
        }
        break
      }
      case 'quarter': {
        const q = makeQuarterFromAnchor(n)
        if(q) addBetFor(p.id, { type:'quarter', selection: q, amount, odds: OddsTable.quarter })
        break
      }
      case 'range':
        break
      case 'even':
        addBetFor(p.id, { type:'even', selection: [], amount, odds: OddsTable.evenOdd })
        break
      case 'odd':
        addBetFor(p.id, { type:'odd', selection: [], amount, odds: OddsTable.evenOdd })
        break
      case 'high':
        addBetFor(p.id, { type:'high', selection: [], amount, odds: OddsTable.highLow })
        break
      case 'low':
        addBetFor(p.id, { type:'low', selection: [], amount, odds: OddsTable.highLow })
        break
    }
  }

  const onRangeClick = (colIndex: number) => {
    if(roundState!=='open') return
    const p = active
    if(mode.kind!=='range' || !canPlace(p)) return
    addBetFor(p.id, { type:'range', selection: rangeColumns[colIndex], amount, odds: OddsTable.range })
  }

  // --- Round flow ---
  const lockRound = () => {
    setRoundState('locked')
  }

  const settleRound = () => {
    if(roundState!=='locked') return
    const roll = Number(enteredRoll)
    if(!Number.isInteger(roll) || roll<1 || roll>20) return

    const deltas: Record<number, number> = {}
    const nextPlayers = players.map(p => {
      const stake = totalStake(p)
      const win = resolveRound(roll, p.bets)
      const delta = win - stake
      deltas[p.id] = delta
      return { ...p, bank: p.bank + delta }
    })

    setPlayers(nextPlayers)
    setHistory(h => [{ roll, deltas, time: Date.now() }, ...h].slice(0, 30))
    setRoundState('settled')
  }

  const newRound = () => {
    setPlayers(prev => prev.map(p => ({ ...p, pool: PER_ROUND_POOL, bets: [] })))
    setEnteredRoll('')
    setRoundState('open')
  }

  const describeBet = (b: Bet) => {
    switch(b.type){
      case 'single': return `#${b.selection[0]}`
      case 'split': return `Split ${b.selection.join(' / ')}`
      case 'quarter': return `Quarter ${b.selection.join('-')}`
      case 'range': {
        const col = rangeColumns.findIndex(col => col.every(n => b.selection.includes(n)))
        return `Range Col ${col+1} (${b.selection.join(', ')})`
      }
      case 'even': return 'Even'
      case 'odd': return 'Odd'
      case 'high': return 'High 11–20'
      case 'low': return 'Low 1–10'
    }
  }

  const potential = (b: Bet) => b.amount * b.odds

  return (
    <div className="container">
      <header className="header">
        <h1>Roll-et</h1>
        <div className="right">
          {canInstall && <button className="install-btn" onClick={()=>install()}>Install</button>}
          {installed && <span className="installed">Installed</span>}
          <div className="credits">Round: <strong>{roundState.toUpperCase()}</strong></div>
        </div>
      </header>

      {isiOS && !installed && (
        <div className="ios-hint">On iPhone/iPad: Share → Add to Home Screen to install.</div>
      )}

      <section className="players">
        {players.map(p => (
          <button key={p.id} className={'player ' + (p.id===activePid?'active':'')} onClick={()=>setActivePid(p.id)}>
            <div className="name">{p.name}</div>
            <div className="line"><span>Pool</span><strong>{p.pool}/{PER_ROUND_POOL}</strong></div>
            <div className="line"><span>Bank</span><strong className={p.bank>=0?'pos':'neg'}>{p.bank>=0?`+${p.bank}`:p.bank}</strong></div>
            <div className="line"><span>Stake</span><strong>{p.bets.reduce((a,b)=>a+b.amount,0)}</strong></div>
          </button>
        ))}
      </section>

      <section className="controls">
        <div className="amount">
          <label>Bet: </label>
          <input
            type="number" min={MIN_BET} max={MAX_BET} step={1}
            value={amount}
            onChange={(e)=> setAmount(clampInt(e.target.valueAsNumber || MIN_BET, MIN_BET, MAX_BET))}
          />
          <span className="hint">(min {MIN_BET}, max {MAX_BET}, per-player pool {PER_ROUND_POOL})</span>
          <span className="muted"> | Active: {players.find(p=>p.id===activePid)?.name} (pool {players.find(p=>p.id===activePid)?.pool})</span>
        </div>

        <div className="betmodes">
          {(['single','split','quarter','range','even','odd','high','low'] as BetType[]).map(k => (
            <button
              key={k}
              className={(mode as any).kind === k ? 'active' : ''}
              onClick={()=> setMode(k==='split' ? {kind:'split'} : {kind: k as any})}
              title={k==='range' ? 'Click a column header to place range bet' : undefined}
              disabled={roundState!=='open' || !canPlace(players.find(p=>p.id===activePid)!)}>
              {labelFor(k as any)}
            </button>
          ))}
        </div>

        <div className="actions">
          <button onClick={()=>undoLast(activePid)} disabled={roundState!=='open' || players.find(p=>p.id===activePid)!.bets.length===0}>Undo</button>
          <button onClick={()=>clearBets(activePid)} disabled={roundState!=='open' || players.find(p=>p.id===activePid)!.bets.length===0}>Clear</button>
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

      <section className="table-wrap">
        <BetGrid
          grid={numberGrid}
          mode={(mode as any).kind}
          rangeCols={rangeColumns}
          onCellClick={onCellClick}
          onRangeClick={onRangeClick}
          splitFirst={(mode as any).kind==='split' ? (mode as any).first : undefined}
        />
      </section>

      <section className="bets">
        <h3>{players.find(p=>p.id===activePid)?.name} Bets (potential payout)</h3>
        {players.find(p=>p.id===activePid)!.bets.length===0 ? <div className="muted">No bets placed.</div> : (
          <ul>
            {players.find(p=>p.id===activePid)!.bets.map(b => (
              <li key={b.id}>
                <span>{describeBet(b)}</span>
                <span> × {b.amount} → </span>
                <span className="muted">{b.odds}:1</span>
                <span> =&nbsp;<strong>{potential(b)}</strong></span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="bets all">
        <h3>All Players (locked state snapshot)</h3>
        <div className="allwrap">
          {players.map(p => (
            <div className="pcol" key={p.id}>
              <div className="pname">{p.name}</div>
              {p.bets.length===0 ? <div className="muted small">No bets</div> : (
                <ul>
                  {p.bets.map(b => (
                    <li key={b.id}>
                      <span>{describeBet(b)}</span>
                      <span> × {b.amount}</span>
                      <span className="muted"> (→ {potential(b)})</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      </section>

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
                    return <td key={p.id} className={cls}>{d>=0?`+${d}`:d}</td>
                  })}
                  <td>{new Date(h.time).toLocaleTimeString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <footer className="footer">© Roll-et</footer>
    </div>
  )
}

function labelFor(t: BetType) {
  switch(t){
    case 'single': return 'Single (18:1)'
    case 'split': return 'Split (8:1)'
    case 'quarter': return 'Quarter (3:1)'
    case 'range': return 'Range (2:1)'
    case 'even': return 'Even (1:1)'
    case 'odd': return 'Odd (1:1)'
    case 'high': return 'High 11–20 (1:1)'
    case 'low': return 'Low 1–10 (1:1)'
  }
}

function clampInt(n: number, min: number, max: number): number {
  if(!Number.isFinite(n)) return min
  n = Math.floor(n)
  return Math.min(max, Math.max(min, n))
}

function isAdjacent(a:number,b:number): boolean {
  const pos = (n:number) => {
    const idx = n-1
    return { r: Math.floor(idx/5), c: idx%5 }
  }
  const A = pos(a), B = pos(b)
  const dr = Math.abs(A.r-B.r), dc = Math.abs(A.c-B.c)
  return (dr+dc===1)
}
