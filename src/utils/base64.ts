function base64FromBytes(bytes: Uint8Array): string {
  if (typeof btoa === 'function') {
    let binary = '';
    for (const b of bytes) binary += String.fromCharCode(b);
    return btoa(binary);
  }
  return Buffer.from(bytes).toString('base64');
}

function bytesFromBase64(base64: string): Uint8Array {
  if (typeof atob === 'function') {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes;
  }
  return Uint8Array.from(Buffer.from(base64, 'base64'));
}

export function bytesToBase64Url(bytes: Uint8Array): string {
  return base64FromBytes(bytes)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

export function base64UrlToBytes(base64url: string): Uint8Array<ArrayBuffer> {
  const base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
  // Ensure input contains only valid base64 characters. Buffer.from will
  // otherwise ignore invalid characters and return an empty buffer.
  if (!/^[A-Za-z0-9+/]*$/.test(base64)) {
    throw new Error('Invalid base64url string');
  }
  const padLength = (4 - (base64.length % 4)) % 4;
  const padded = base64 + '='.repeat(padLength);

  // Use atob in environments where it's available (browsers)
  if (typeof atob === 'function') {
    const binary = atob(padded);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  }

  // Fall back to Buffer decoding when atob is unavailable (Node.js)
  const buffer = Buffer.from(padded, 'base64');
  return new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength);
}
