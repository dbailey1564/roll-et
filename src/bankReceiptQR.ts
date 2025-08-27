import QRCode from 'qrcode'
import type { BankReceipt } from './certs/bankReceipt'

export async function bankReceiptToQR(receipt: BankReceipt): Promise<string> {
  return QRCode.toDataURL(JSON.stringify(receipt))
}

export function parseBankReceipt(str: string): BankReceipt {
  return JSON.parse(str) as BankReceipt
}
