export const CREDIT_VALUE = 0.25

export function clampInt(n: number, min: number, max: number): number {
  if(!Number.isFinite(n)) return min
  n = Math.floor(n)
  return Math.min(max, Math.max(min, n))
}

export function fmtUSD(credits: number): string {
  const dollars = credits * CREDIT_VALUE
  return dollars.toLocaleString(undefined, { style: 'currency', currency: 'USD', minimumFractionDigits: 2 })
}

export function fmtUSDSign(credits: number): string {
  const dollars = credits * CREDIT_VALUE
  const str = Math.abs(dollars).toLocaleString(undefined, { style: 'currency', currency: 'USD', minimumFractionDigits: 2 })
  return (dollars >= 0 ? '+' : '−') + str
}
