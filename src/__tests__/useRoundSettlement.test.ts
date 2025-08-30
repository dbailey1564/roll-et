import { describe, it, expect, beforeEach, vi } from 'vitest'

vi.mock('../receipts', () => ({ issueReceiptsForWinners: vi.fn(async () => []) }))
vi.mock('../ledger/localLedger', () => ({ appendLedger: vi.fn(async () => {}) }))

import { renderHook, act, waitFor } from '@testing-library/react'
import { GameProvider, usePlayers, useStats, useHouse } from '../context/GameContext'
import { useRoundSettlement } from '../hooks/useRoundSettlement'
import type { Player } from '../types'
import { issueReceiptsForWinners } from '../receipts'
import { appendLedger as appendLedgerMock } from '../ledger/localLedger'

const store: Record<string, string> = {}
const localStorageMock = {
  getItem(key: string) { return Object.prototype.hasOwnProperty.call(store, key) ? store[key] : null },
  setItem(key: string, value: string) { store[key] = value },
  removeItem(key: string) { delete store[key] },
  clear() { for (const k in store) delete store[k] },
}
;(globalThis as any).localStorage = localStorageMock

describe('useRoundSettlement', () => {
  beforeEach(() => {
    localStorage.clear()
    issueReceiptsForWinners.mockClear()
    appendLedgerMock.mockClear()
  })

  it('settles a round and updates state', async () => {
    const { result } = renderHook(() => {
      const settlement = useRoundSettlement()
      const { setPlayers, players } = usePlayers()
      const { setBetCerts, houseKey } = useHouse()
      const { stats } = useStats()
      return { ...settlement, setPlayers, players, setBetCerts, houseKey, stats }
    }, { wrapper: GameProvider })

    await waitFor(() => expect(result.current.houseKey).not.toBeNull())

    const players: Player[] = [
      { id: 1, name: 'P1', bets: [{ id: 'b1', type: 'single', selection: [1], amount: 1 }], pool: 0, bank: 0 },
      { id: 2, name: 'P2', bets: [], pool: 0, bank: 0 },
    ]

    act(() => { result.current.setPlayers(players) })
    act(() => { result.current.setBetCerts({ 1: 'c1', 2: 'c2' }) })
    act(() => { result.current.lockRound() })
    act(() => { result.current.setEnteredRoll(1) })
    await act(async () => { await result.current.settleRound() })

    expect(result.current.players[0].bank).toBe(17)
    expect(result.current.players[1].bank).toBe(0)
    expect(result.current.stats.rounds).toBe(1)
    expect(result.current.history.length).toBe(1)
    expect(result.current.winning).toBe(1)
    expect(appendLedgerMock).toHaveBeenCalledWith('round_settled', '1', expect.objectContaining({ roll: 1 }))
    expect(issueReceiptsForWinners).toHaveBeenCalled()
  })
})

