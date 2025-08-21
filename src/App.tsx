import React from 'react'
import { BetBoard } from './components/BetBoard'
import { BetControls } from './components/BetControls'
import { HistorySection } from './components/HistorySection'
import { FooterBar } from './components/FooterBar'
import { Bet, makeQuarterFromAnchor, resolveRound, numberGrid, getOdds } from './game/engine'
import { useInstallPrompt } from './pwa/useInstallPrompt'
import type { BetMode, Player } from './types'
import { clampInt, fmtUSD, fmtUSDSign } from './utils'
import { useBetActions } from './hooks/useBetActions'
import { usePlayers, useRoundState, useStats, PER_ROUND_POOL } from './context/GameContext'

const MIN_BET = 1

export default function App() {
  const { players, setPlayers } = usePlayers()
  const { roundState, setRoundState } = useRoundState()
  const { setStats } = useStats()
  const [activePid, setActivePid] = React.useState<number>(1)

  const DEFAULT_BET = 1
  const [amount, setAmount] = React.useState<number>(() => {
    const saved = localStorage.getItem('bet')
    const n = saved ? Number(saved) : DEFAULT_BET
    return Number.isFinite(n) ? clampInt(n, MIN_BET, PER_ROUND_POOL) : DEFAULT_BET
  })
  React.useEffect(()=>{ localStorage.setItem('bet', String(amount)) }, [amount])

  const [mode, setMode] = React.useState<BetMode>({ kind: 'single' })

  const [enteredRoll, setEnteredRoll] = React.useState<number | ''>('')
  const [history, setHistory] = React.useState<Array<{ roll: number, deltas: Record<number, number>, time: number }>>([])
  const [winning, setWinning] = React.useState<number | null>(null)

  const { canInstall, install, installed, isiOS } = useInstallPrompt()

  const active = players.find(p => p.id === activePid)!
  const totalStake = (p: Player) => p.bets.reduce((a,b)=>a+b.amount, 0)
  const maxForActive = Math.max(MIN_BET, active.pool)
  const canPlace = (p: Player) => roundState==='open' && amount>=MIN_BET && amount<=p.pool

  React.useEffect(() => {
    setAmount(a => clampInt(a, MIN_BET, maxForActive))
  }, [activePid, active.pool])

  const covered = React.useMemo(() => {
    const s = new Set<number>()
    for(const p of players){
      for(const b of p.bets){
        switch(b.type){
          case 'single': case 'split': case 'quarter':
            b.selection.forEach(n => s.add(n)); break
          case 'even':
            for(let n=2;n<=20;n+=2) s.add(n); break
          case 'odd':
            for(let n=1;n<=19;n+=2) s.add(n); break
          case 'high':
            for(let n=11;n<=20;n++) s.add(n); break
          case 'low':
            for(let n=1;n<=10;n++) s.add(n); break
        }
      }
    }
    return s
  }, [players])

  const { addBetFor, undoLast, clearBets } = useBetActions({
    roundState,
    setPlayers,
    mode,
    setMode,
    perRoundPool: PER_ROUND_POOL,
  })

  const onCellClick = (n: number) => {
    if(roundState!=='open') return
    const p = active
    if(!canPlace(p)) return
    switch(mode.kind){
      case 'single':
        addBetFor(p.id, { type: 'single', selection: [n], amount })
        break
      case 'split': {
        const first = (mode as any).first as number | undefined
        if(first == null){
          setMode({ kind: 'split', first: n })
        } else {
          if(!isAdjacent(first,n)){ setMode({ kind: 'split' }); return }
          const pair = [first, n].sort((a,b)=>a-b)
          addBetFor(p.id, { type:'split', selection: pair, amount })
          setMode({ kind: 'split' })
        }
        break
      }
      case 'quarter': {
        const q = makeQuarterFromAnchor(n)
        if(q) addBetFor(p.id, { type:'quarter', selection: q, amount })
        break
      }
      case 'high':
        addBetFor(p.id, { type:'high', selection: [], amount })
        break
      case 'low':
        addBetFor(p.id, { type:'low', selection: [], amount })
        break
      case 'even':
        addBetFor(p.id, { type:'even', selection: [], amount })
        break
      case 'odd':
        addBetFor(p.id, { type:'odd', selection: [], amount })
        break
    }
  }

  const lockRound = () => { setRoundState('locked') }

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

    setStats(prev => {
      const hits = [...prev.hits]
      hits[roll] = (hits[roll] || 0) + 1
      const banks = { ...prev.banks }
      nextPlayers.forEach(p => { banks[p.id] = p.bank })
      return { rounds: prev.rounds + 1, hits, banks }
    })

    setPlayers(nextPlayers)
    setHistory(h => [{ roll, deltas, time: Date.now() }, ...h].slice(0, 30))
    setWinning(roll)
    setRoundState('settled')
  }

  const newRound = () => {
    setPlayers(prev => prev.map(p => ({ ...p, pool: PER_ROUND_POOL, bets: [] })))
    setEnteredRoll('')
    setWinning(null)
    setRoundState('open')
  }

  const describeBet = (b: Bet) => {
    switch(b.type){
      case 'single': return `#${b.selection[0]}`
      case 'split': return `Split ${b.selection.join(' / ')}`
      case 'quarter': return `Corners ${b.selection.join('-')}`
      case 'even': return 'Even'
      case 'odd': return 'Odd'
      case 'high': return 'High 11–20'
      case 'low': return 'Low 1–10'
    }
  }

  const potential = (b: Bet) => b.amount * getOdds(b.type)

  return (
    <div className="container">
      <header className="header">
        <div className="left" />
        <h1>Roll-et</h1>
        <div className="right">
          <div className="credits">
            Round: <span className={`roundstate ${roundState}`}>{roundState.toUpperCase()}</span>
          </div>
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
            <div className="line"><span>Bank</span><strong className={p.bank>=0?'pos':'neg'}>{fmtUSDSign(p.bank)}</strong></div>
            <div className="line"><span>Stake</span><strong>{fmtUSD(totalStake(p))}</strong></div>
          </button>
        ))}
      </section>

      <BetControls
        amount={amount}
        setAmount={setAmount}
        minBet={MIN_BET}
        maxForActive={maxForActive}
        active={active}
        mode={mode}
        setMode={setMode}
        roundState={roundState}
        undoLast={undoLast}
        clearBets={clearBets}
        lockRound={lockRound}
        enteredRoll={enteredRoll}
        setEnteredRoll={setEnteredRoll}
        settleRound={settleRound}
        newRound={newRound}
      />

      <BetBoard
        grid={numberGrid}
        mode={(mode as any).kind}
        onCellClick={onCellClick}
        splitFirst={(mode as any).kind==='split' ? (mode as any).first : undefined}
        covered={covered}
        winning={winning}
      />

      <section className="bets">
        <h3>{players.find(p=>p.id===activePid)?.name} Bets (potential payout)</h3>
        {players.find(p=>p.id===activePid)!.bets.length===0 ? <div className="muted">No bets placed.</div> : (
          <ul>
            {players.find(p=>p.id===activePid)!.bets.map(b => (
              <li key={b.id}>
                <span>{describeBet(b)}</span>
                <span> × {b.amount} → </span>
                <span className="muted">{getOdds(b.type)}:1</span>
                <span> =&nbsp;<strong>{fmtUSD(potential(b))}</strong></span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <HistorySection history={history} players={players} fmtUSDSign={fmtUSDSign} />

      <FooterBar canInstall={canInstall} install={install} installed={installed} />
    </div>
  )
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
