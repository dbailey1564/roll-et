import { describe, it, expect } from 'vitest'
import { issueHouseCert, validateHouseCert } from '../certs/houseCert'
import { generateBetCert, verifyBetCert } from '../certs/betCert'
import { issueBankReceipt, verifyBankReceipt } from '../certs/bankReceipt'

function subtle() {
  return globalThis.crypto.subtle
}

async function genKeyPair() {
  return subtle().generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify'])
}

describe('certificate flows', () => {
  it('issues and validates house cert, bet cert, and bank receipt', async () => {
    const root = await genKeyPair()
    const houseKeys = await genKeyPair()
    const payload = {
      subject: 'house-1',
      publicKeyJwk: await subtle().exportKey('jwk', houseKeys.publicKey),
      nbf: Date.now() - 1000,
      exp: Date.now() + 60_000,
      capabilities: ['host rounds']
    }
    const cert = await issueHouseCert(payload, root.privateKey)
    expect(await validateHouseCert(cert, root.publicKey)).toBe(true)

    const betCert = await generateBetCert({
      certId: 'abc',
      player: 'p1',
      round: 'r1',
      betHash: 'hash',
      nbf: Date.now() - 1000,
      exp: Date.now() + 60_000
    }, houseKeys.privateKey)
    expect(await verifyBetCert(betCert, houseKeys.publicKey)).toBe(true)

    const receipt = await issueBankReceipt({
      receiptId: 'r1',
      player: 'p1',
      round: 'r1',
      value: 100,
      nbf: Date.now() - 1000,
      exp: Date.now() + 60_000,
      betCertRef: betCert.certId
    }, houseKeys.privateKey)
    expect(await verifyBankReceipt(receipt, houseKeys.publicKey)).toBe(true)
  })
})
