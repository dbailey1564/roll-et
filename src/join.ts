import { HouseCert, validateHouseCert } from './certs/houseCert'
import QRCode from 'qrcode'

export interface JoinChallenge {
  type: 'join-challenge'
  houseCert: HouseCert
  round: string
  nonce: string
  nbf: number
  exp: number
}

export async function createJoinChallenge(houseCert: HouseCert, round: string, ttlMs: number = 15000): Promise<JoinChallenge> {
  const nonceArr = new Uint8Array(16)
  globalThis.crypto.getRandomValues(nonceArr)
  const nonce = Buffer.from(nonceArr).toString('base64url')
  const now = Date.now()
  return { type: 'join-challenge', houseCert, round, nonce, nbf: now, exp: now + ttlMs }
}

export async function joinChallengeToQR(challenge: JoinChallenge): Promise<string> {
  return QRCode.toDataURL(JSON.stringify(challenge))
}

export function parseJoinChallenge(str: string): JoinChallenge {
  return JSON.parse(str) as JoinChallenge
}

export async function validateJoinChallenge(challenge: JoinChallenge, rootKey: CryptoKey, now: number = Date.now()): Promise<boolean> {
  if (now < challenge.nbf || now > challenge.exp) return false
  return validateHouseCert(challenge.houseCert, rootKey, now)
}
