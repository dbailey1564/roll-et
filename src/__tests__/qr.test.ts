import { describe, it, expect } from 'vitest'
import { issueHouseCert } from '../certs/houseCert'
import { createJoinChallenge, joinChallengeToQR, parseJoinChallenge, validateJoinChallenge } from '../join'
import { betCertToQR, parseBetCert } from '../betCertQR'
import { bankReceiptToQR, parseBankReceipt } from '../bankReceiptQR'
import { generateBetCert } from '../certs/betCert'
import { issueBankReceipt } from '../certs/bankReceipt'

function subtle() { return globalThis.crypto.subtle }
async function genKeyPair() { return subtle().generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign','verify']) }

describe('QR flows', () => {
  it('creates join challenge QR, bet cert QR, and bank receipt QR', async () => {
    const root = await genKeyPair()
    const house = await genKeyPair()
    const houseCert = await issueHouseCert({
      subject: 'h1',
      publicKeyJwk: await subtle().exportKey('jwk', house.publicKey),
      nbf: Date.now() - 1000,
      exp: Date.now() + 60_000,
      capabilities: ['host rounds']
    }, root.privateKey)
    const challenge = await createJoinChallenge(houseCert, 'r1')
    const qr = await joinChallengeToQR(challenge)
    expect(qr.startsWith('data:image/png;base64')).toBe(true)
    const scanned = parseJoinChallenge(JSON.stringify(challenge))
    expect(await validateJoinChallenge(scanned, root.publicKey)).toBe(true)

    const betCert = await generateBetCert({
      certId: 'c1',
      player: 'p1',
      round: 'r1',
      betHash: 'hash',
      nbf: Date.now() - 1000,
      exp: Date.now() + 60_000
    }, house.privateKey)
    const betQR = await betCertToQR(betCert)
    expect(betQR.startsWith('data:image/png;base64')).toBe(true)
    const parsedBet = parseBetCert(JSON.stringify(betCert))
    expect(parsedBet.certId).toBe(betCert.certId)

    const receipt = await issueBankReceipt({
      receiptId: 'rec1',
      player: 'p1',
      round: 'r1',
      value: 10,
      nbf: Date.now() - 1000,
      exp: Date.now() + 60_000,
      betCertRef: betCert.certId,
    }, house.privateKey)
    const receiptQR = await bankReceiptToQR(receipt)
    expect(receiptQR.startsWith('data:image/png;base64')).toBe(true)
    const parsedReceipt = parseBankReceipt(JSON.stringify(receipt))
    expect(parsedReceipt.receiptId).toBe(receipt.receiptId)
  })
})
