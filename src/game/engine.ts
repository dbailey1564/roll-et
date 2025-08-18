export type BetType = 'single' | 'split' | 'quarter' | 'range' | 'even' | 'odd' | 'high' | 'low'

export interface Bet {
  id: string
  type: BetType
  selection: number[]
  amount: number
  odds: number // e.g., 18 means 18:1
}

// Odds per project's design notes
export const OddsTable = {
  single: 18,
  split: 8,
  quarter: 3, // house odds for corner/quarter
  range: 2,
  highLow: 1,
  evenOdd: 1,
} as const

// 4x5 grid 1..20
export const numberGrid: number[][] = [
  [1,2,3,4,5],
  [6,7,8,9,10],
  [11,12,13,14,15],
  [16,17,18,19,20],
]

// columns as "range" groups (2:1)
export const rangeColumns: number[][] = [
  [1,6,11,16],
  [2,7,12,17],
  [3,8,13,18],
  [4,9,14,19],
  [5,10,15,20],
]

export function makeQuarterFromAnchor(anchor: number): number[] | null {
  // anchor must be top-left of a 2x2 block
  const idx = anchor - 1
  const r = Math.floor(idx/5), c = idx%5
  if(r>=0 && r<3 && c>=0 && c<4) {
    const a = numberGrid[r][c]
    const b = numberGrid[r][c+1]
    const d = numberGrid[r+1][c]
    const e = numberGrid[r+1][c+1]
    return [a,b,d,e]
  }
  return null
}

export function resolveRound(roll: number, bets: Bet[]): number {
  let winnings = 0
  for(const b of bets){
    if(wins(b, roll)){
      winnings += b.amount * b.odds
    }
  }
  return winnings
}

function wins(b: Bet, roll: number): boolean {
  switch(b.type){
    case 'single': return b.selection[0] === roll
    case 'split': return b.selection.includes(roll)
    case 'quarter': return b.selection.includes(roll)
    case 'range': return b.selection.includes(roll)
    case 'even': return roll % 2 === 0
    case 'odd': return roll % 2 === 1
    case 'high': return roll >= 11
    case 'low': return roll <= 10
  }
}
