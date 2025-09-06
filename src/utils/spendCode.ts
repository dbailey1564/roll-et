import type { BankReceipt } from '../certs/bankReceipt'

function toDigits(n: number, len: number): number[] {
  const s = Math.abs(n).toString().padStart(len, '0').slice(-len)
  return s.split('').map(d => Number(d))
}

function luhnCheckDigit(digits: number[]): number {
  // Luhn mod-10 over the provided digits
  let sum = 0
  let dbl = true
  for (let i = digits.length - 1; i >= 0; i--) {
    let v = digits[i]
    if (dbl) {
      v = v * 2
      if (v > 9) v -= 9
    }
    sum += v
    dbl = !dbl
  }
  const cd = (10 - (sum % 10)) % 10
  return cd
}

export async function computeReceiptSpendCode(receipt: BankReceipt): Promise<string> {
  const data = new TextEncoder().encode(
    `${receipt.receiptId}|${receipt.houseId}|${receipt.playerUidThumbprint}|${receipt.amount}`
  )
  const hash = await crypto.subtle.digest('SHA-256', data)
  const bytes = new Uint8Array(hash)
  // Take first 4 bytes and next 2 to form a 9-digit number space
  const num = ((bytes[0] << 24) | (bytes[1] << 16) | (bytes[2] << 8) | bytes[3]) >>> 0
  const extra = bytes[4] ^ bytes[5]
  // Mix to spread entropy
  const mixed = (num ^ (extra << 7)) >>> 0
  const base = mixed % 1_000_000_000 // 9 digits
  const digits = toDigits(base, 9)
  const cd = luhnCheckDigit(digits)
  return digits.join('') + String(cd)
}

