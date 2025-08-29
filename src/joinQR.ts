import QRCode from 'qrcode'
import type { JoinResponse } from './join'

export async function joinResponseToQR(resp: JoinResponse): Promise<string> {
  return QRCode.toDataURL(JSON.stringify(resp))
}

export function parseJoinResponse(str: string): JoinResponse {
  return JSON.parse(str) as JoinResponse
}

