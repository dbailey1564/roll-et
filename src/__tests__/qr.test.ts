import { describe, it, expect } from 'vitest'
import jsQR from 'jsqr'
import Jimp from 'jimp'
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
      houseId: 'h1',
      kid: 'k1',
      housePubKey: await subtle().exportKey('jwk', house.publicKey),
      notBefore: Date.now() - 1000,
      notAfter: Date.now() + 60_000,
      roles: ['host rounds']
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

  it('encodes and decodes a bank receipt QR round trip', async () => {
    const house = await genKeyPair()
    const receipt = await issueBankReceipt({
      receiptId: 'rec2',
      player: 'p2',
      round: 'r2',
      value: 20,
      nbf: Date.now() - 1000,
      exp: Date.now() + 60_000,
      betCertRef: 'cert2',
    }, house.privateKey)

    const dataUrl = await bankReceiptToQR(receipt)
    const buf = Buffer.from(dataUrl.split(',')[1], 'base64')
    const image = await Jimp.read(buf)
    const { data, width, height } = image.bitmap
    const code = jsQR(new Uint8ClampedArray(data), width, height)
    expect(code).toBeTruthy()

    const parsed = parseBankReceipt(code!.data)
    expect(parsed).toEqual(receipt)
  })
})
