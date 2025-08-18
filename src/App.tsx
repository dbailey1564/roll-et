import React, { useMemo, useRef, useState } from 'react'
import { BetGrid } from './components/BetGrid'
import { Bet, BetType, OddsTable, makeQuarterFromAnchor, rangeColumns, resolveRound, numberGrid } from './game/engine'
import { useInstallPrompt } from './pwa/useInstallPrompt'

const STARTING_CREDITS = 1000
const MIN_BET = 1
const MAX_BET = 100
const MAX_TOTAL_PER_ROUND = 500

type BetMode =
  | { kind: 'single' }
  | { kind: 'split'; first?: number }
  | { kind: 'quarter' } // choose anchor cell (top-left of a 2x2)
  | { kind: 'range' }
  | { kind: 'high' }
  | { kind: 'low' }
  | { kind: 'even' }
  | { kind: 'odd' }

export default function App() {
  const [credits, setCredits] = useState<number>(STARTING_CREDITS)
  const [bets, setBets] = useState<Bet[]>([])
  const [amount, setAmount] = useState<number>(5)
  const [mode, setMode] = useState<BetMode>({ kind: 'single' })
  const [history, setHistory] = useState<{roll: number, delta: number, timestamp: number}[]>([])
  const [rolling, setRolling] = useState(false)
  const nextId = useRef(1)

  const { canInstall, install, installed, isiOS } = useInstallPrompt()

  const totalStaked = bets.reduce((a,b)=>a+b.amount, 0)
  const canPlace = React.useMemo(()=> {
    return amount >= MIN_BET && amount <= MAX_BET && (totalStaked + amount) <= MAX_TOTAL_PER_ROUND && amount <= credits
  }, [amount, totalStaked, credits])

  const addBet = (bet: Omit<Bet, 'id'>) => {
    if(!canPlace) return
    setBets(prev => [...prev, { ...bet, id: String(nextId.current++) }])
  }

  const onCellClick = (n: number) => {
    if(!canPlace) return
    switch(mode.kind) {
      case 'single':
        addBet({ type: 'single', selection: [n], amount, odds: OddsTable.single })
        break
      case 'split': {
        const first = (mode as any).first as number | undefined
        if(first == null) {
          setMode({ kind: 'split', first: n })
        } else {
          const isAdj = isAdjacent(first, n)
          if(!isAdj) { setMode({ kind: 'split' }); return }
          const pair = [first, n].sort((a,b)=>a-b)
          addBet({ type: 'split', selection: pair, amount, odds: OddsTable.split })
          setMode({ kind: 'split' })
        }
        break
      }
      case 'quarter': {
        const q = makeQuarterFromAnchor(n)
        if(q) addBet({ type: 'quarter', selection: q, amount, odds: OddsTable.quarter })
        break
      }
      case 'range': {
        // place via column header
        break
      }
      case 'even':
        addBet({ type: 'even', selection: [], amount, odds: OddsTable.evenOdd })
        break
      case 'odd':
        addBet({ type: 'odd', selection: [], amount, odds: OddsTable.evenOdd })
        break
      case 'high':
        addBet({ type: 'high', selection: [], amount, odds: OddsTable.highLow })
        break
      case 'low':
        addBet({ type: 'low', selection: [], amount, odds: OddsTable.highLow })
        break
    }
  }

  const onRangeClick = (colIndex: number) => {
    if((mode as any).kind !== 'range' || !canPlace) return
    addBet({ type: 'range', selection: rangeColumns[colIndex], amount, odds: OddsTable.range })
  }

  const onRoll = async () => {
    if(rolling) return
    setRolling(true)
    try {
      const roundBets = bets
      setBets([])
      const stake = roundBets.reduce((a,b)=>a+b.amount,0)
      setCredits(c => c - stake)

      const roll = secureRoll()
      const delta = resolveRound(roll, roundBets)
      setCredits(c => c + stake + delta)

      setHistory(h => [{ roll, delta, timestamp: Date.now() }, ...h].slice(0, 30))
    } finally {
      setRolling(false)
    }
  }

  const undoLast = () => setBets(prev => prev.slice(0, -1))
  const clearBets = () => setBets([])

  return (
    <div className="container">
      <header className="header">
        <h1>Roll-et</h1>
        <div className="right">
          {canInstall && (
            <button className="install-btn" onClick={async ()=>{ await install() }}>
              Install
            </button>
          )}
          {installed && <span className="installed">Installed</span>}
          <div className="credits">Credits: <strong>{credits}</strong></div>
        </div>
      </header>

      {isiOS && !installed && (
        <div className="ios-hint">
          On iPhone/iPad: tap <strong>Share</strong> → <strong>Add to Home Screen</strong> to install.
        </div>
      )}

      <section className="controls">
        <div className="amount">
          <label>Bet: </label>
          <input type="number" min={MIN_BET} max={MAX_BET} value={amount} onChange={e=>setAmount(Number(e.target.value)||0)} />
          <span className="hint">(min {MIN_BET}, max {MAX_BET}, per-round cap {MAX_TOTAL_PER_ROUND})</span>
        </div>

        <div className="betmodes">
          {(['single','split','quarter','range','even','odd','high','low'] as BetType[]).map(k => (
            <button
              key={k}
              className={(mode as any).kind === k ? 'active' : ''}
              onClick={()=> setMode(k==='split' ? {kind:'split'} : {kind: k as any})}
              title={k==='range' ? 'Click a column header to place range bet' : undefined}
            >
              {labelFor(k as any)}
            </button>
          ))}
        </div>

        <div className="actions">
          <button onClick={undoLast} disabled={bets.length===0}>Undo</button>
          <button onClick={clearBets} disabled={bets.length===0}>Clear</button>
          <button onClick={onRoll} disabled={rolling || totalStaked===0 || totalStaked>credits}>
            {rolling ? 'Rolling…' : `Roll (stake ${totalStaked})`}
          </button>
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
        <h3>Current Bets</h3>
        {bets.length===0 ? <div className="muted">No bets placed.</div> : (
          <ul>
            {bets.map(b => (
              <li key={b.id}>
                <span>{describeBet(b)}</span>
                <span> × {b.amount}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="history">
        <h3>History</h3>
        {history.length===0 ? <div className="muted">No rolls yet.</div> : (
          <table>
            <thead><tr><th>Roll</th><th>Δ Credits</th><th>Time</th></tr></thead>
            <tbody>
              {history.map((h,i)=>(
                <tr key={i}>
                  <td>{h.roll}</td>
                  <td className={h.delta>=0?'pos':'neg'}>{h.delta>=0?`+${h.delta}`:h.delta}</td>
                  <td>{new Date(h.timestamp).toLocaleTimeString()}</td>
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

type BetTypeL = BetType

function labelFor(t: BetTypeL) {
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

function isAdjacent(a:number,b:number): boolean {
  const pos = (n:number) => {
    const idx = n-1
    return { r: Math.floor(idx/5), c: idx%5 }
  }
  const A = pos(a), B = pos(b)
  const dr = Math.abs(A.r-B.r), dc = Math.abs(A.c-B.c)
  return (dr+dc===1)
}

function describeBet(b: Bet){
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

function secureRoll(): number {
  const buf = new Uint32Array(1)
  crypto.getRandomValues(buf)
  return (buf[0] % 20) + 1
}
