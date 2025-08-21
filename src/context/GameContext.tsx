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
  roundState: RoundState
  setRoundState: React.Dispatch<React.SetStateAction<RoundState>>
  stats: Stats
  setStats: React.Dispatch<React.SetStateAction<Stats>>
}

const GameContext = React.createContext<GameContextValue | undefined>(undefined)

export const GameProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const playersInit: Player[] = React.useMemo(() => (
    [1, 2, 3, 4].map(i => ({
      id: i,
      name: `P${i}`,
      bets: [],
      pool: PER_ROUND_POOL,
      bank: 0,
    }))
  ), [])

  const [players, setPlayers] = React.useState<Player[]>(playersInit)
  const [roundState, setRoundState] = React.useState<RoundState>('open')
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
    <GameContext.Provider value={{ players, setPlayers, roundState, setRoundState, stats, setStats }}>
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
  const { players, setPlayers } = useGameContext()
  return { players, setPlayers }
}

export function useRoundState() {
  const { roundState, setRoundState } = useGameContext()
  return { roundState, setRoundState }
}

export function useStats() {
  const { stats, setStats } = useGameContext()
  return { stats, setStats }
}

