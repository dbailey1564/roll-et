import React from 'react'
import type { Bet } from '../game/engine'
import type { Player, BetMode, RoundState } from '../types'

interface Options {
  roundState: RoundState
  setPlayers: React.Dispatch<React.SetStateAction<Player[]>>
  mode: BetMode
  setMode: React.Dispatch<React.SetStateAction<BetMode>>
  perRoundPool: number
}

export function useBetActions({ roundState, setPlayers, mode, setMode, perRoundPool }: Options){
  const addBetFor = React.useCallback((pid: number, bet: Omit<Bet, 'id'>) => {
    setPlayers(prev => prev.map(p => {
      if(p.id !== pid) return p
      if(roundState !== 'open') return p
      if(bet.amount < 1 || bet.amount > p.pool) return p
      const id = String(Date.now()) + '-' + Math.random().toString(36).slice(2,7)
      return { ...p, bets: [...p.bets, { ...bet, id }], pool: p.pool - bet.amount }
    }))
  }, [roundState, setPlayers])

  const undoLast = React.useCallback((pid: number) => {
    if(roundState !== 'open') return
    setPlayers(prev => prev.map(p => {
      if(p.id !== pid) return p
      const last = p.bets[p.bets.length-1]
      if(!last) return p
      const bets = p.bets.slice(0, -1)
      return { ...p, bets, pool: p.pool + last.amount }
    }))
    if(mode.kind==='split' && (mode as any).first){ setMode({kind:'split'}) }
  }, [roundState, setPlayers, mode, setMode])

  const clearBets = React.useCallback((pid: number) => {
    if(roundState !== 'open') return
    setPlayers(prev => prev.map(p => p.id===pid ? ({ ...p, pool: perRoundPool, bets: [] }) : p))
    if(mode.kind==='split' && (mode as any).first){ setMode({kind:'split'}) }
  }, [roundState, setPlayers, mode, setMode, perRoundPool])

  return { addBetFor, undoLast, clearBets }
}
