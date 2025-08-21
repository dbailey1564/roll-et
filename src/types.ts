import type { Bet } from './game/engine'

export type BetMode =
  | { kind: 'single' }
  | { kind: 'split'; first?: number }
  | { kind: 'quarter' }
  | { kind: 'high' }
  | { kind: 'low' }
  | { kind: 'even' }
  | { kind: 'odd' }

export type RoundState = 'open' | 'locked' | 'settled'

export interface Player {
  id: number
  name: string
  bets: Bet[]
  pool: number
  bank: number
}
