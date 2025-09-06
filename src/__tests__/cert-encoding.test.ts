import { describe, it, expect } from 'vitest'
import { bytesToBase64Url, base64UrlToBytes } from '../utils/base64'
import { validateHouseCert } from '../certs/houseCert'
import { verifyBetCert } from '../certs/betCert'
import { verifyBankReceipt } from '../certs/bankReceipt'

const encoder = new TextEncoder()
function subtle() {
  return globalThis.crypto.subtle
}
async function genKeyPair() {
  return subtle().generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify'])
}

describe('certificate signature encoding utilities', () => {
  it('houseCert roundtrip signature', async () => {
    const root = await genKeyPair()
    const house = await genKeyPair()
    const payload = {
      houseId: 'house-1',
      kid: 'k1',
      housePubKey: await subtle().exportKey('jwk', house.publicKey),
      notBefore: Date.now() - 1000,
      notAfter: Date.now() + 60_000,
      roles: ['host rounds']
    }
    const data = encoder.encode(JSON.stringify(payload))
    const sigBuf = await subtle().sign({ name: 'ECDSA', hash: 'SHA-256' }, root.privateKey, data)
    const sigBytes = new Uint8Array(sigBuf)
    const encoded = bytesToBase64Url(sigBytes)
    const decoded = base64UrlToBytes(encoded)
    expect(decoded).toEqual(sigBytes)
    const cert = { payload, signature: encoded }
    expect(await validateHouseCert(cert, root.publicKey)).toBe(true)
  })

  it('betCert roundtrip signature', async () => {
    const house = await genKeyPair()
    const payload = {
      type: 'bet-cert' as const,
      certId: 'bet1',
      player: 'p1',
      round: 'r1',
      betHash: 'hash',
      nbf: Date.now() - 1000,
      exp: Date.now() + 60_000
    }
    const data = encoder.encode(JSON.stringify(payload))
    const sigBuf = await subtle().sign({ name: 'ECDSA', hash: 'SHA-256' }, house.privateKey, data)
    const sigBytes = new Uint8Array(sigBuf)
    const encoded = bytesToBase64Url(sigBytes)
    const decoded = base64UrlToBytes(encoded)
    expect(decoded).toEqual(sigBytes)
    const cert = { ...payload, sig: encoded }
    expect(await verifyBetCert(cert, house.publicKey)).toBe(true)
  })

    it('bankReceipt roundtrip signature', async () => {
      const house = await genKeyPair()
      const payload = {
        type: 'bank-receipt' as const,
        houseId: 'house-1',
        playerUidThumbprint: 'p1',
        receiptId: 'rec1',
        kind: 'REBUY' as const,
        amount: 100,
        issuedAt: Date.now() - 1000,
        exp: Date.now() + 60_000,
      }
      const data = encoder.encode(JSON.stringify(payload))
      const sigBuf = await subtle().sign({ name: 'ECDSA', hash: 'SHA-256' }, house.privateKey, data)
      const sigBytes = new Uint8Array(sigBuf)
      const encoded = bytesToBase64Url(sigBytes)
      const decoded = base64UrlToBytes(encoded)
      expect(decoded).toEqual(sigBytes)
      const receipt = { ...payload, sig: encoded }
      expect(await verifyBankReceipt(receipt, house.publicKey)).toBe(true)
    })
})

