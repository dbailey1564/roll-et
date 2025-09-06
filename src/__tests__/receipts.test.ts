import { describe, it, expect } from 'vitest'
import { issueReceiptsForWinners } from '../receipts'

function subtle() { return globalThis.crypto.subtle }
async function genKeyPair() { return subtle().generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign','verify']) }

describe('bank receipts', () => {
  it('issues receipts for winners with correct values and references', async () => {
    const house = await genKeyPair()
      const winners = [
        { player: 1, playerUidThumbprint: 'p1', amount: 5, kind: 'REBUY' as const },
        { player: 2, playerUidThumbprint: 'p2', amount: 3, kind: 'REBUY' as const },
      ]
      const receipts = await issueReceiptsForWinners(
        winners,
        'round1',
        'house-1',
        (house as CryptoKeyPair).privateKey
      )
      expect(receipts).toHaveLength(2)
      expect(receipts[0].receipt.amount).toBe(5)
      expect(receipts[1].receipt.amount).toBe(3)
    })
  })
