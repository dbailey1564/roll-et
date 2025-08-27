import { issueBankReceipt } from './certs/bankReceipt'
import { bankReceiptToQR } from './bankReceiptQR'
import type { ReceiptRecord } from './context/GameContext'

function uuid(): string {
  const c = globalThis.crypto
  if ('randomUUID' in c) return (c as any).randomUUID()
  const arr = new Uint8Array(16)
  c.getRandomValues(arr)
  arr[6] = (arr[6] & 0x0f) | 0x40
  arr[8] = (arr[8] & 0x3f) | 0x80
  const hex = Array.from(arr).map(b => b.toString(16).padStart(2, '0'))
  return `${hex.slice(0,4).join('')}-${hex.slice(4,6).join('')}-${hex.slice(6,8).join('')}-${hex.slice(8,10).join('')}-${hex.slice(10,16).join('')}`
}

export async function issueReceiptsForWinners(
  winners: Array<{ player: number; value: number; betCertRef: string }>,
  roundId: string,
  key: CryptoKey
): Promise<ReceiptRecord[]> {
  const now = Date.now()
  const receipts: ReceiptRecord[] = []
  for (const w of winners) {
    const receipt = await issueBankReceipt({
      receiptId: uuid(),
      player: String(w.player),
      round: roundId,
      value: w.value,
      nbf: now,
      betCertRef: w.betCertRef,
    }, key)
    const qr = await bankReceiptToQR(receipt)
    receipts.push({ player: String(w.player), receipt, qr })
  }
  return receipts
}
