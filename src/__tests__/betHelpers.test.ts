import { describe, it, expect } from 'vitest'
import { describeBet, potential } from '../utils/betHelpers'
import { getOdds, type Bet } from '../game/engine'

describe('betHelpers', () => {
  it('describes different bet types', () => {
    const single: Bet = { id: '1', type: 'single', selection: [5], amount: 1 }
    const split: Bet = { id: '2', type: 'split', selection: [3, 4], amount: 1 }
    const corner: Bet = { id: '3', type: 'corner', selection: [6, 7, 11, 12], amount: 1 }
    const even: Bet = { id: '4', type: 'even', selection: [], amount: 1 }

    expect(describeBet(single)).toBe('#5')
    expect(describeBet(split)).toBe('Split 3 / 4')
    expect(describeBet(corner)).toBe('Corner 6-7-11-12')
    expect(describeBet(even)).toBe('Even')
  })

  it('calculates potential payout', () => {
    const bet: Bet = { id: '5', type: 'split', selection: [1, 2], amount: 3 }
    expect(potential(bet)).toBe(3 * getOdds('split'))
  })
})
