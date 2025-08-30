// TOTP/HOTP utilities bound to join challenge context (SHA-256)

const encoder = new TextEncoder()

async function hmacSha256(keyBytes: Uint8Array, msg: string): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey('raw', keyBytes, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(msg))
  return new Uint8Array(sig)
}

export async function generateJoinTotp(secretBytes: Uint8Array, round: string, nonce: string, nbfMs: number, stepMs = 60_000): Promise<string> {
  const step = Math.floor(nbfMs / stepMs)
  const msg = `${round}|${nonce}|${step}`
  const h = await hmacSha256(secretBytes, msg)
  const offset = h[h.length - 1] & 0x0f
  const bin = ((h[offset] & 0x7f) << 24) | (h[offset + 1] << 16) | (h[offset + 2] << 8) | (h[offset + 3])
  const code = (bin % 1_000_000)
  return code.toString().padStart(6, '0')
}

export async function verifyJoinTotp(candidate: string, secretBytes: Uint8Array, round: string, nonce: string, nbfMs: number, stepMs = 60_000, window = 1): Promise<boolean> {
  for (let w = -window; w <= window; w++) {
    const step = Math.floor(nbfMs / stepMs) + w
    const msg = `${round}|${nonce}|${step}`
    const h = await hmacSha256(secretBytes, msg)
    const offset = h[h.length - 1] & 0x0f
    const bin = ((h[offset] & 0x7f) << 24) | (h[offset + 1] << 16) | (h[offset + 2] << 8) | (h[offset + 3])
    const code = (bin % 1_000_000).toString().padStart(6, '0')
    if (code === candidate) return true
  }
  return false
}

