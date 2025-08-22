import { describe, it, expect } from 'vitest'
import { makeCornerFromAnchor, resolveRound, wins, type Bet } from '../game/engine'

describe('makeCornerFromAnchor', () => {
  it('returns correct corner for valid anchor', () => {
    expect(makeCornerFromAnchor(1)).toEqual([1, 2, 6, 7])
  })

  it('returns null for anchor on the right edge', () => {
    expect(makeCornerFromAnchor(5)).toBeNull()
  })

  it('returns null for anchors outside the grid', () => {
    expect(makeCornerFromAnchor(0)).toBeNull()
    expect(makeCornerFromAnchor(21)).toBeNull()
  })
})

describe('wins', () => {
  const bet = (type: Bet['type'], selection: number[] = []): Bet => ({
    id: type,
    type,
    selection,
    amount: 1,
  })

  it('evaluates number based bets', () => {
    expect(wins(bet('single', [5]), 5)).toBe(true)
    expect(wins(bet('single', [5]), 6)).toBe(false)

    expect(wins(bet('split', [5, 6]), 6)).toBe(true)
    expect(wins(bet('split', [5, 6]), 7)).toBe(false)

    expect(wins(bet('corner', [1, 2, 6, 7]), 7)).toBe(true)
    expect(wins(bet('corner', [1, 2, 6, 7]), 8)).toBe(false)
  })

  it('evaluates parity and range bets', () => {
    expect(wins(bet('even'), 4)).toBe(true)
    expect(wins(bet('even'), 5)).toBe(false)

    expect(wins(bet('odd'), 3)).toBe(true)
    expect(wins(bet('odd'), 4)).toBe(false)

    expect(wins(bet('high'), 11)).toBe(true)
    expect(wins(bet('high'), 10)).toBe(false)

    expect(wins(bet('low'), 10)).toBe(true)
    expect(wins(bet('low'), 11)).toBe(false)
  })
})

describe('resolveRound', () => {
  it('sums winnings across multiple bets', () => {
    const bets: Bet[] = [
      { id: 'b1', type: 'single', selection: [7], amount: 10 },
      { id: 'b2', type: 'even', selection: [], amount: 5 },
      { id: 'b3', type: 'corner', selection: [6, 7, 11, 12], amount: 10 },
    ]
    expect(resolveRound(7, bets)).toBe(10 * 18 + 10 * 3)
  })

  it('returns 0 when no bets win', () => {
    const bets: Bet[] = [
      { id: 'b1', type: 'single', selection: [7], amount: 10 },
      { id: 'b2', type: 'odd', selection: [], amount: 5 },
    ]
    expect(resolveRound(8, bets)).toBe(0)
  })

  it('returns 0 when there are no bets', () => {
    expect(resolveRound(5, [])).toBe(0)
  })
})

