import React from 'react'
import type { Player, RoundState } from '../types'

export const PER_ROUND_POOL = 8

export type Stats = {
  rounds: number
  hits: number[]
  banks: Record<number, number>
}

type GameContextValue = {
  players: Player[]
  setPlayers: React.Dispatch<React.SetStateAction<Player[]>>
  addPlayer: (name: string) => void
  roundState: RoundState
  setRoundState: React.Dispatch<React.SetStateAction<RoundState>>
  stats: Stats
  setStats: React.Dispatch<React.SetStateAction<Stats>>
}

const GameContext = React.createContext<GameContextValue | undefined>(undefined)

export const GameProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [players, setPlayers] = React.useState<Player[]>([])

  const addPlayer = React.useCallback((name: string) => {
    setPlayers(prev => {
      if (prev.length >= 4) return prev
      const seat = [1, 2, 3, 4].find(i => !prev.some(p => p.id === i))
      if (!seat) return prev
      const newPlayer: Player = { id: seat, name, bets: [], pool: PER_ROUND_POOL, bank: 0 }
      return [...prev, newPlayer].sort((a, b) => a.id - b.id)
    })
  }, [])
  const [roundState, setRoundState] = React.useState<RoundState>('locked')
  const [stats, setStats] = React.useState<Stats>(() => {
    try {
      const raw = localStorage.getItem('roll_et_stats')
      if (!raw) return { rounds: 0, hits: Array(21).fill(0), banks: {} }
      const parsed = JSON.parse(raw)
      const hits = Array.isArray(parsed.hits) && parsed.hits.length >= 21 ? parsed.hits : Array(21).fill(0)
      const banks = typeof parsed.banks === 'object' && parsed.banks ? parsed.banks : {}
      const rounds = Number(parsed.rounds) || 0
      return { rounds, hits, banks }
    } catch {
      return { rounds: 0, hits: Array(21).fill(0), banks: {} }
    }
  })

  React.useEffect(() => {
    try {
      localStorage.setItem('roll_et_stats', JSON.stringify(stats))
    } catch {}
  }, [stats])

  return (
    <GameContext.Provider value={{ players, setPlayers, addPlayer, roundState, setRoundState, stats, setStats }}>
      {children}
    </GameContext.Provider>
  )
}

export function useGameContext() {
  const ctx = React.useContext(GameContext)
  if (!ctx) throw new Error('useGameContext must be used within a GameProvider')
  return ctx
}

export function usePlayers() {
  const { players, setPlayers, addPlayer } = useGameContext()
  return { players, setPlayers, addPlayer }
}

export function useRoundState() {
  const { roundState, setRoundState } = useGameContext()
  return { roundState, setRoundState }
}

export function useStats() {
  const { stats, setStats } = useGameContext()
  return { stats, setStats }
}

