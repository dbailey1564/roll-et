import { describe, it, expect } from 'vitest'
import { createJoinChallenge, createJoinResponse, verifyJoinResponse } from '../join'

const subtle = globalThis.crypto.subtle

async function genHmacKey() {
  return subtle.generateKey({ name: 'HMAC', hash: 'SHA-256' }, true, ['sign', 'verify'])
}

async function genPlayerKeys() {
  return subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify'])
}

describe('verifyJoinResponse', () => {
  it('accepts a valid response', async () => {
    const houseCert: any = { payload: {}, signature: '' }
    const challenge = await createJoinChallenge(houseCert, 'r1')
    const secret = await genHmacKey()
    const playerKeys = await genPlayerKeys()
    const response = await createJoinResponse('player1', challenge, secret, playerKeys.privateKey)
    expect(await verifyJoinResponse(response, challenge, secret, playerKeys.publicKey)).toBe(true)
  })

  it('rejects when challenge fields mismatch', async () => {
    const houseCert: any = { payload: {}, signature: '' }
    const challenge = await createJoinChallenge(houseCert, 'r1')
    const secret = await genHmacKey()
    const playerKeys = await genPlayerKeys()
    const response = await createJoinResponse('player1', challenge, secret, playerKeys.privateKey)
    const badChallenge = { ...challenge, nonce: challenge.nonce + 'x' }
    expect(await verifyJoinResponse(response, badChallenge, secret, playerKeys.publicKey)).toBe(false)
  })

  it('rejects with invalid hmac', async () => {
    const houseCert: any = { payload: {}, signature: '' }
    const challenge = await createJoinChallenge(houseCert, 'r1')
    const secret = await genHmacKey()
    const wrongSecret = await genHmacKey()
    const playerKeys = await genPlayerKeys()
    const response = await createJoinResponse('player1', challenge, secret, playerKeys.privateKey)
    expect(await verifyJoinResponse(response, challenge, wrongSecret, playerKeys.publicKey)).toBe(false)
  })

  it('rejects with invalid signature', async () => {
    const houseCert: any = { payload: {}, signature: '' }
    const challenge = await createJoinChallenge(houseCert, 'r1')
    const secret = await genHmacKey()
    const playerKeys = await genPlayerKeys()
    const otherKeys = await genPlayerKeys()
    const response = await createJoinResponse('player1', challenge, secret, playerKeys.privateKey)
    expect(await verifyJoinResponse(response, challenge, secret, otherKeys.publicKey)).toBe(false)
  })
})
