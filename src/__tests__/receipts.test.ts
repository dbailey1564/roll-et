import { describe, it, expect } from 'vitest'
import { issueReceiptsForWinners } from '../receipts'

function subtle() { return globalThis.crypto.subtle }
async function genKeyPair() { return subtle().generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign','verify']) }

describe('bank receipts', () => {
  it('issues receipts for winners with correct values and references', async () => {
    const house = await genKeyPair()
    const winners = [
      { player: 1, value: 5, betCertRef: 'bet1' },
      { player: 2, value: 3, betCertRef: 'bet2' },
    ]
    const receipts = await issueReceiptsForWinners(winners, 'round1', (house as CryptoKeyPair).privateKey)
    expect(receipts).toHaveLength(2)
    expect(receipts[0].receipt.value).toBe(5)
    expect(receipts[0].receipt.betCertRef).toBe('bet1')
    expect(receipts[1].receipt.value).toBe(3)
    expect(receipts[1].receipt.betCertRef).toBe('bet2')
  })
})
