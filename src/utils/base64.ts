function base64FromBytes(bytes: Uint8Array): string {
  if (typeof btoa === 'function') {
    let binary = ''
    for (const b of bytes) binary += String.fromCharCode(b)
    return btoa(binary)
  }
  return Buffer.from(bytes).toString('base64')
}

function bytesFromBase64(base64: string): Uint8Array {
  if (typeof atob === 'function') {
    const binary = atob(base64)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
    return bytes
  }
  return Uint8Array.from(Buffer.from(base64, 'base64'))
}

export function bytesToBase64Url(bytes: Uint8Array): string {
  return base64FromBytes(bytes).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
}

export function base64UrlToBytes(base64url: string): Uint8Array {
  const base64 = base64url.replace(/-/g, '+').replace(/_/g, '/')
  const padLength = (4 - (base64.length % 4)) % 4
  const padded = base64 + '='.repeat(padLength)
  return bytesFromBase64(padded)
}
