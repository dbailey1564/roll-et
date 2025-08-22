const subtle = globalThis.crypto.subtle

export interface HouseCertPayload {
  subject: string
  publicKeyJwk: JsonWebKey
  nbf: number
  exp: number
  capabilities: string[]
}

export interface HouseCert {
  payload: HouseCertPayload
  signature: string // base64url string
}

const encoder = new TextEncoder()

async function signPayload(payload: any, key: CryptoKey): Promise<string> {
  const data = encoder.encode(JSON.stringify(payload))
  const sig = await subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, key, data)
  return Buffer.from(sig).toString('base64url')
}

async function verifyPayload(payload: any, signature: string, key: CryptoKey): Promise<boolean> {
  const data = encoder.encode(JSON.stringify(payload))
  const sig = Buffer.from(signature, 'base64url')
  return subtle.verify({ name: 'ECDSA', hash: 'SHA-256' }, key, sig, data)
}

export async function issueHouseCert(payload: HouseCertPayload, rootKey: CryptoKey): Promise<HouseCert> {
  const signature = await signPayload(payload, rootKey)
  return { payload, signature }
}

export async function validateHouseCert(cert: HouseCert, rootKey: CryptoKey, now: number = Date.now()): Promise<boolean> {
  const { payload, signature } = cert
  if (now < payload.nbf || now > payload.exp) return false
  return verifyPayload(payload, signature, rootKey)
}
