import QRCode from 'qrcode'
import type { BetCert } from './certs/betCert'

export async function betCertToQR(cert: BetCert): Promise<string> {
  return QRCode.toDataURL(JSON.stringify(cert))
}

export function parseBetCert(str: string): BetCert {
  return JSON.parse(str) as BetCert
}
