import React from 'react'
import { Bet, makeCornerFromAnchor, getOdds } from '../game/engine'
import { usePlayers, useRoundState, PER_ROUND_POOL } from '../context/GameContext'
import type { BetMode, Player } from '../types'
import { clampInt } from '../utils'
import { useBetActions } from './useBetActions'
import { useRoundSettlement } from './useRoundSettlement'

export const MIN_BET = 1

export function useBetting() {
  const { players, setPlayers } = usePlayers()
  const { roundState } = useRoundState()
  const { enteredRoll, setEnteredRoll, history, winning, lockRound, settleRound, newRound } = useRoundSettlement()

  const DEFAULT_BET = 1
  const [amount, setAmount] = React.useState<number>(() => {
    const saved = localStorage.getItem('bet')
    const n = saved ? Number(saved) : DEFAULT_BET
    return Number.isFinite(n) ? clampInt(n, MIN_BET, PER_ROUND_POOL) : DEFAULT_BET
  })
  React.useEffect(() => { localStorage.setItem('bet', String(amount)) }, [amount])

  const [mode, setMode] = React.useState<BetMode>({ kind: 'single' })

  const [activeId, setActiveId] = React.useState<number | null>(players[0]?.id ?? null)
  React.useEffect(() => {
    if (activeId != null && players.some(p => p.id === activeId)) return
    if (players.length > 0) setActiveId(players[0].id)
    else setActiveId(null)
  }, [players])

  const active = players.find(p => p.id === activeId) || players[0]
  const maxForActive = active ? Math.max(MIN_BET, active.pool) : MIN_BET

  React.useEffect(() => {
    setAmount(a => clampInt(a, MIN_BET, maxForActive))
  }, [active?.pool])

  const canPlace = (p: Player) => roundState === 'open' && amount >= MIN_BET && amount <= p.pool

  const { addBetFor, undoLast, clearBets } = useBetActions({
    roundState,
    setPlayers,
    mode,
    setMode,
    perRoundPool: PER_ROUND_POOL,
  })

  const covered = React.useMemo(() => {
    const s = new Set<number>()
    for (const p of players) {
      for (const b of p.bets) {
        switch (b.type) {
          case 'single':
          case 'split':
          case 'corner':
            b.selection.forEach(n => s.add(n)); break
          case 'even':
            for (let n = 2; n <= 20; n += 2) s.add(n); break
          case 'odd':
            for (let n = 1; n <= 19; n += 2) s.add(n); break
          case 'high':
            for (let n = 11; n <= 20; n++) s.add(n); break
          case 'low':
            for (let n = 1; n <= 10; n++) s.add(n); break
        }
      }
    }
    return s
  }, [players])

  const onCellClick = (n: number) => {
    if (roundState !== 'open') return
    const p = active
    if (!p || !canPlace(p)) return
    switch (mode.kind) {
      case 'single':
        addBetFor(p.id, { type: 'single', selection: [n], amount })
        break
      case 'split': {
        const first = (mode as any).first as number | undefined
        if (first == null) {
          setMode({ kind: 'split', first: n })
        } else {
          if (!isAdjacent(first, n)) { setMode({ kind: 'split' }); return }
          const pair = [first, n].sort((a, b) => a - b)
          addBetFor(p.id, { type: 'split', selection: pair, amount })
          setMode({ kind: 'split' })
        }
        break
      }
      case 'corner': {
        const q = makeCornerFromAnchor(n)
        if (q) addBetFor(p.id, { type: 'corner', selection: q, amount })
        break
      }
      case 'high':
        addBetFor(p.id, { type: 'high', selection: [], amount })
        break
      case 'low':
        addBetFor(p.id, { type: 'low', selection: [], amount })
        break
      case 'even':
        addBetFor(p.id, { type: 'even', selection: [], amount })
        break
      case 'odd':
        addBetFor(p.id, { type: 'odd', selection: [], amount })
        break
    }
  }


  const describeBet = (b: Bet) => {
    switch (b.type) {
      case 'single': return `#${b.selection[0]}`
      case 'split': return `Split ${b.selection.join(' / ')}`
      case 'corner': return `Corner ${b.selection.join('-')}`
      case 'even': return 'Even'
      case 'odd': return 'Odd'
      case 'high': return 'High 11–20'
      case 'low': return 'Low 1–10'
    }
  }

  const potential = (b: Bet) => b.amount * getOdds(b.type)

  return {
    players,
    roundState,
    amount,
    setAmount,
    mode,
    setMode,
    enteredRoll,
    setEnteredRoll,
    history,
    winning,
    covered,
    active,
    activeId,
    setActiveId,
    maxForActive,
    canPlace,
    addBetFor,
    undoLast,
    clearBets,
    onCellClick,
    lockRound,
    settleRound,
    newRound,
    describeBet,
    potential,
  }
}

function isAdjacent(a: number, b: number): boolean {
  const pos = (n: number) => {
    const idx = n - 1
    return { r: Math.floor(idx / 5), c: idx % 5 }
  }
  const A = pos(a), B = pos(b)
  const dr = Math.abs(A.r - B.r), dc = Math.abs(A.c - B.c)
  return (dr + dc === 1)
}
