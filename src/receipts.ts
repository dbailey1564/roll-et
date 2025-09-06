import { issueBankReceipt } from './certs/bankReceipt'
import { bankReceiptToQR } from './bankReceiptQR'
import type { ReceiptRecord } from './context/GameContext'
import { computeReceiptSpendCode } from './utils/spendCode'

function uuid(): string {
  const c = globalThis.crypto as Crypto | undefined;
  if (c?.randomUUID) return c.randomUUID();
  if (c?.getRandomValues) {
    const arr = new Uint8Array(16);
    c.getRandomValues(arr);
    arr[6] = (arr[6] & 0x0f) | 0x40;
    arr[8] = (arr[8] & 0x3f) | 0x80;
    const hex = Array.from(arr).map(b => b.toString(16).padStart(2, '0'));
    return `${hex.slice(0,4).join('')}-${hex.slice(4,6).join('')}-${hex.slice(6,8).join('')}-${hex.slice(8,10).join('')}-${hex.slice(10,16).join('')}`;
  }
  throw new Error("Secure random number generator not available.");
}

export async function issueReceiptsForWinners(
  winners: Array<{ player: number; playerUidThumbprint: string; amount: number; kind: 'REDEEM' | 'REBUY' }>,
  roundId: string,
  houseId: string,
  key: CryptoKey
): Promise<ReceiptRecord[]> {
  const now = Date.now()
  const receipts: ReceiptRecord[] = []
  for (const w of winners) {
    const receipt = await issueBankReceipt(
      {
        receiptId: uuid(),
        houseId,
        playerUidThumbprint: w.playerUidThumbprint,
        kind: w.kind,
        amount: w.amount,
        issuedAt: now,
      },
      key
    )
    const qr = await bankReceiptToQR(receipt)
    const spendCode = await computeReceiptSpendCode(receipt)
    receipts.push({ player: String(w.player), receipt, qr, spendCode })
  }
  return receipts
}
