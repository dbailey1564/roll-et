import type { Player } from './types'
import type { Bet } from './game/engine'
import { generateBetCert, BetCert } from './certs/betCert'
const subtle = globalThis.crypto.subtle
const encoder = new TextEncoder()

function uuid(): string {
  const arr = new Uint8Array(16)
  globalThis.crypto.getRandomValues(arr)
  arr[6] = (arr[6] & 0x0f) | 0x40
  arr[8] = (arr[8] & 0x3f) | 0x80
  const hex = Array.from(arr).map(b => b.toString(16).padStart(2, '0'))
  return `${hex.slice(0,4).join('')}-${hex.slice(4,6).join('')}-${hex.slice(6,8).join('')}-${hex.slice(8,10).join('')}-${hex.slice(10,16).join('')}`
}

async function hashBets(bets: Bet[]): Promise<string> {
  const data = encoder.encode(JSON.stringify(bets))
  const hashBuf = await subtle.digest('SHA-256', data)
  return Buffer.from(hashBuf).toString('hex')
}

export async function lockRound(players: Player[], houseKey: CryptoKey, roundId: string): Promise<BetCert[]> {
  const now = Date.now()
  const certs: BetCert[] = []
  for (const p of players) {
    const betHash = await hashBets(p.bets)
    const cert = await generateBetCert({
      certId: uuid(),
      player: String(p.id),
      round: roundId,
      betHash,
      nbf: now,
      exp: now + 5 * 60 * 1000,
    }, houseKey)
    certs.push(cert)
  }
  return certs
}
