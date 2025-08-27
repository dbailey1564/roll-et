export function bytesToBase64Url(bytes: Uint8Array): string {
  // Detect if the global btoa function is available (typically in browsers)
  if (typeof btoa === 'function') {
    let binary = ''
    for (const b of bytes) {
      binary += String.fromCharCode(b)
    }
    return btoa(binary)
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/g, '')
  }

  // Fall back to Node.js Buffer when btoa is unavailable
  return Buffer.from(bytes)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '')
}

export function base64UrlToBytes(base64url: string): Uint8Array {
  const base64 = base64url.replace(/-/g, '+').replace(/_/g, '/')
  const padLength = (4 - (base64.length % 4)) % 4
  const padded = base64 + '='.repeat(padLength)

  // Use atob in environments where it's available (browsers)
  if (typeof atob === 'function') {
    const binary = atob(padded)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i)
    }
    return bytes
  }

  // Fall back to Buffer decoding when atob is unavailable (Node.js)
  const buffer = Buffer.from(padded, 'base64')
  return new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength)
}
