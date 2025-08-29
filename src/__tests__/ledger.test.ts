import { describe, it, expect, beforeEach } from 'vitest'
import { appendLedger, getLedger, getUnsyncedEntries, markSynced } from '../ledger/localLedger'

describe('local ledger', () => {
  beforeEach(() => {
    localStorage.removeItem('roll_et_ledger_v1')
    localStorage.removeItem('roll_et_ledger_last_synced_seq')
  })

  it('appends with increasing seq and hash chain', async () => {
    const a = await appendLedger('round_locked', 'r1', { players: [] })
    const b = await appendLedger('round_settled', 'r1', { roll: 7 })
    const all = getLedger()
    expect(all.length).toBe(2)
    expect(a.seq).toBe(1)
    expect(b.seq).toBe(2)
    expect(b.prevHash).toBe(a.hash)
    expect(a.hash).toMatch(/^[0-9a-f]{64}$/)
  })

  it('tracks unsynced entries by seq', async () => {
    await appendLedger('round_locked', 'r2', {})
    await appendLedger('round_settled', 'r2', {})
    let unsynced = getUnsyncedEntries()
    expect(unsynced.length).toBe(2)
    markSynced(1)
    unsynced = getUnsyncedEntries()
    expect(unsynced.length).toBe(1)
    expect(unsynced[0].seq).toBe(2)
  })
})

