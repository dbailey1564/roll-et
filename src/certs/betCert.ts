import { bytesToBase64Url, base64UrlToBytes } from '../utils/base64'

const subtle = globalThis.crypto.subtle
const encoder = new TextEncoder()

export interface BetCertPayload {
  type: 'bet-cert'
  certId: string
  player: string
  round: string
  betHash: string
  nbf: number
  exp: number
  bankRef?: string
}

export interface BetCert extends BetCertPayload {
  sig: string // base64url
}

async function signPayload(payload: BetCertPayload, key: CryptoKey): Promise<string> {
  const data = encoder.encode(JSON.stringify(payload))
  const sig = await subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, key, data)
  return bytesToBase64Url(new Uint8Array(sig))
}

async function verifyPayload(payload: BetCertPayload, sig: string, key: CryptoKey): Promise<boolean> {
  const data = encoder.encode(JSON.stringify(payload))
  const signature = base64UrlToBytes(sig)
  return subtle.verify({ name: 'ECDSA', hash: 'SHA-256' }, key, signature, data)
}

export async function generateBetCert(params: Omit<BetCertPayload, 'type'>, key: CryptoKey): Promise<BetCert> {
  const payload: BetCertPayload = { type: 'bet-cert', ...params }
  const sig = await signPayload(payload, key)
  return { ...payload, sig }
}

export async function verifyBetCert(cert: BetCert, key: CryptoKey, now: number = Date.now()): Promise<boolean> {
  if (now < cert.nbf || now > cert.exp) return false
  const payload: BetCertPayload = {
    type: 'bet-cert',
    certId: cert.certId,
    player: cert.player,
    round: cert.round,
    betHash: cert.betHash,
    nbf: cert.nbf,
    exp: cert.exp,
    bankRef: cert.bankRef,
  }
  return verifyPayload(payload, cert.sig, key)
}
