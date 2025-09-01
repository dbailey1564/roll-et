export function pemToJson<T = any>(pem: string): T {
  const base64 = pem
    .replace(/-----BEGIN [^-]+-----/, '')
    .replace(/-----END [^-]+-----/, '')
    .replace(/\s+/g, '')
  const jsonStr =
    typeof atob === 'function'
      ? atob(base64)
      : Buffer.from(base64, 'base64').toString('utf-8')
  return JSON.parse(jsonStr) as T
}
