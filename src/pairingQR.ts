import QRCode from 'qrcode'
import { bytesToBase64Url, base64UrlToBytes } from './utils/base64'

export interface PairingPayload {
  type: 'pairing'
  playerId: string
  secret: string // base64url
}

export async function pairingToQR(playerId: string, secretBytes: Uint8Array): Promise<string> {
  const payload: PairingPayload = { type: 'pairing', playerId, secret: bytesToBase64Url(secretBytes) }
  return QRCode.toDataURL(JSON.stringify(payload))
}

export function parsePairing(str: string): PairingPayload {
  return JSON.parse(str) as PairingPayload
}

