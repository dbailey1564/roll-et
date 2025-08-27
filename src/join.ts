import { HouseCert, validateHouseCert } from './certs/houseCert'
import QRCode from 'qrcode'
import { bytesToBase64Url, base64UrlToBytes } from './utils/base64'

const subtle = globalThis.crypto.subtle
const encoder = new TextEncoder()

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
  const nonce = bytesToBase64Url(nonceArr)
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

export interface JoinResponse {
  player: string
  round: string
  nonce: string
  hmac: string
  bankRef?: string
  sig: string
}

export async function createJoinResponse(
  playerId: string,
  challenge: JoinChallenge,
  secret: CryptoKey,
  playerKey: CryptoKey,
  bankRef?: string
): Promise<JoinResponse> {
  const data = encoder.encode(`${playerId}|${challenge.round}|${challenge.nonce}`)
  const hmacBuf = await subtle.sign('HMAC', secret, data)
  const hmac = bytesToBase64Url(new Uint8Array(hmacBuf))
  const payload = { player: playerId, round: challenge.round, nonce: challenge.nonce, hmac, bankRef }
  const sigBuf = await subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, playerKey, encoder.encode(JSON.stringify(payload)))
  const sig = bytesToBase64Url(new Uint8Array(sigBuf))
  return { ...payload, sig }
}

export async function verifyJoinResponse(
  response: JoinResponse,
  challenge: JoinChallenge,
  secret: CryptoKey,
  playerKey: CryptoKey
): Promise<boolean> {
  if (response.round !== challenge.round) return false
  if (response.nonce !== challenge.nonce) return false

  const data = encoder.encode(`${response.player}|${challenge.round}|${challenge.nonce}`)
  const hmacBytes = base64UrlToBytes(response.hmac) as Uint8Array<ArrayBuffer>
  const hmacOk = await subtle.verify('HMAC', secret, hmacBytes, data)
  if (!hmacOk) return false

  const payload = {
    player: response.player,
    round: response.round,
    nonce: response.nonce,
    hmac: response.hmac,
    bankRef: response.bankRef
  }
  const sigBytes = base64UrlToBytes(response.sig) as Uint8Array<ArrayBuffer>
  const payloadData = encoder.encode(JSON.stringify(payload))
  return subtle.verify({ name: 'ECDSA', hash: 'SHA-256' }, playerKey, sigBytes, payloadData)
}
