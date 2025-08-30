import { getOdds } from '../game/engine'
import type { Bet } from '../game/engine'

export function describeBet(b: Bet): string {
  switch (b.type) {
    case 'single':
      return `#${b.selection[0]}`
    case 'split':
      return `Split ${b.selection.join(' / ')}`
    case 'corner':
      return `Corner ${b.selection.join('-')}`
    case 'even':
      return 'Even'
    case 'odd':
      return 'Odd'
    case 'high':
      return 'High 11–20'
    case 'low':
      return 'Low 1–10'
  }
}

export function potential(b: Bet): number {
  return b.amount * getOdds(b.type)
}

