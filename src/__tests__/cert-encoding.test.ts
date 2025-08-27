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
      subject: 'house-1',
      publicKeyJwk: await subtle().exportKey('jwk', house.publicKey),
      nbf: Date.now() - 1000,
      exp: Date.now() + 60_000,
      capabilities: ['host rounds']
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
      receiptId: 'rec1',
      player: 'p1',
      round: 'r1',
      value: 100,
      nbf: Date.now() - 1000,
      exp: Date.now() + 60_000,
      betCertRef: 'bet1',
      spent: false
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

