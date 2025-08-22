const subtle = globalThis.crypto.subtle
const encoder = new TextEncoder()

export interface BankReceiptPayload {
  type: 'bank-receipt'
  receiptId: string
  player: string
  round: string
  value: number
  nbf: number
  exp?: number
  spent: boolean
  betCertRef: string
}

export interface BankReceipt extends BankReceiptPayload {
  sig: string
}

async function signPayload(payload: BankReceiptPayload, key: CryptoKey): Promise<string> {
  const data = encoder.encode(JSON.stringify(payload))
  const sig = await subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, key, data)
  return Buffer.from(sig).toString('base64url')
}

async function verifyPayload(payload: BankReceiptPayload, sig: string, key: CryptoKey): Promise<boolean> {
  const data = encoder.encode(JSON.stringify(payload))
  const signature = Buffer.from(sig, 'base64url')
  return subtle.verify({ name: 'ECDSA', hash: 'SHA-256' }, key, signature, data)
}

export async function issueBankReceipt(params: Omit<BankReceiptPayload, 'type' | 'spent'>, key: CryptoKey): Promise<BankReceipt> {
  const payload: BankReceiptPayload = { type: 'bank-receipt', ...params, spent: false }
  const sig = await signPayload(payload, key)
  return { ...payload, sig }
}

export async function verifyBankReceipt(receipt: BankReceipt, key: CryptoKey, now: number = Date.now()): Promise<boolean> {
  if (now < receipt.nbf || (receipt.exp && now > receipt.exp)) return false
  const payload: BankReceiptPayload = {
    type: 'bank-receipt',
    receiptId: receipt.receiptId,
    player: receipt.player,
    round: receipt.round,
    value: receipt.value,
    nbf: receipt.nbf,
    exp: receipt.exp,
    betCertRef: receipt.betCertRef,
    spent: receipt.spent,
  }
  return verifyPayload(payload, receipt.sig, key)
}
