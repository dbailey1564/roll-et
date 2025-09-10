export interface Env {
  /** PKCS#8 PEM for ECDSA-P256 (secret via `wrangler secret put`) */
  HOUSE_PRIV_KEY_PEM: string;

  /** KV for join-token usage and basic replay protection */
  CERT_LEDGER: KVNamespace;
}

type Json =
  | Record<string, unknown>
  | unknown[]
  | string
  | number
  | boolean
  | null;

const encoder = new TextEncoder();

function base64UrlEncode(data: ArrayBuffer | Uint8Array | string): string {
  let bytes: Uint8Array;
  if (typeof data === 'string') {
    bytes = encoder.encode(data);
  } else {
    bytes = data instanceof Uint8Array ? data : new Uint8Array(data);
  }
  let binary = '';
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

export function base64UrlDecode(str: string): Uint8Array {
  const pad = str.length % 4;
  const b64 =
    str.replace(/-/g, '+').replace(/_/g, '/') +
    (pad ? '='.repeat(4 - pad) : '');
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

function pemToArrayBuffer(pem: string): Uint8Array {
  const b64 = pem.replace(/-----[^-]+-----/g, '').replace(/\s+/g, '');
  return base64UrlDecode(b64);
}

export async function importPrivateKey(pem: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'pkcs8',
    pemToArrayBuffer(pem),
    { name: 'ECDSA', namedCurve: 'P-256' },
    true,
    ['sign'],
  );
}

export async function derivePublicJwk(privateKey: CryptoKey): Promise<{
  jwk: JsonWebKey & { kid: string };
}> {
  const jwk = (await crypto.subtle.exportKey('jwk', privateKey)) as JsonWebKey;
  if (!jwk.x || !jwk.y) throw new Error('invalid key');
  const publicJwk: JsonWebKey & { kid: string } = {
    kty: 'EC',
    crv: 'P-256',
    x: jwk.x,
    y: jwk.y,
    use: 'sig',
    alg: 'ES256',
    kid: '', // filled below
  };
  const pubKey = await crypto.subtle.importKey(
    'jwk',
    publicJwk,
    { name: 'ECDSA', namedCurve: 'P-256' },
    true,
    ['verify'],
  );
  const spki = await crypto.subtle.exportKey('spki', pubKey);
  const hash = await crypto.subtle.digest('SHA-256', spki);
  publicJwk.kid = base64UrlEncode(hash).slice(0, 32);
  return { jwk: publicJwk };
}

async function signJwt(
  privateKey: CryptoKey,
  kid: string,
  payload: Record<string, unknown>,
): Promise<string> {
  const header = { alg: 'ES256', typ: 'JWT', kid };
  const encHeader = base64UrlEncode(JSON.stringify(header));
  const encPayload = base64UrlEncode(JSON.stringify(payload));
  const data = encoder.encode(`${encHeader}.${encPayload}`);
  const signature = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    privateKey,
    data,
  );
  const encSig = base64UrlEncode(signature);
  return `${encHeader}.${encPayload}.${encSig}`;
}

export { signJwt };

let materialPromise: Promise<{
  privateKey: CryptoKey;
  publicJwk: JsonWebKey & { kid: string };
}> | null = null;

async function getSigningMaterial(env: Env) {
  if (!materialPromise) {
    materialPromise = (async () => {
      if (!env.HOUSE_PRIV_KEY_PEM)
        throw new Error('HOUSE_PRIV_KEY_PEM missing');
      const privateKey = await importPrivateKey(env.HOUSE_PRIV_KEY_PEM);
      const { jwk } = await derivePublicJwk(privateKey);
      return { privateKey, publicJwk: jwk };
    })();
  }
  return materialPromise;
}

function json(data: Json, init?: ResponseInit) {
  const body = typeof data === 'string' ? data : JSON.stringify(data);
  return new Response(body, {
    headers: { 'content-type': 'application/json; charset=utf-8' },
    ...init,
  });
}

async function handleJwks(env: Env) {
  try {
    const { publicJwk } = await getSigningMaterial(env);
    return json({ keys: [publicJwk] });
  } catch {
    return json({ error: 'JWKS not configured' }, { status: 404 });
  }
}

async function handleHealth() {
  return json({ ok: true });
}

async function handleHouseCert(req: Request, env: Env) {
  try {
    const body = (await req.json().catch(() => ({}))) as Record<
      string,
      unknown
    >;
    const joinToken =
      typeof body['joinToken'] === 'string'
        ? (body['joinToken'] as string)
        : undefined;
    const roundId =
      typeof body['roundId'] === 'string'
        ? (body['roundId'] as string)
        : undefined;

    if (!joinToken || !roundId) {
      return json({ error: 'joinToken and roundId required' }, { status: 400 });
    }

    const key = `jt:${roundId}:${joinToken}`;
    const seen = await env.CERT_LEDGER.get(key);
    if (seen) {
      return json({ error: 'replay detected' }, { status: 409 });
    }
    await env.CERT_LEDGER.put(key, '1', { expirationTtl: 600 });

    const { privateKey, publicJwk } = await getSigningMaterial(env);
    const now = Math.floor(Date.now() / 1000);
    const payload = { roundId, iat: now, exp: now + 60 };
    const token = await signJwt(privateKey, publicJwk.kid!, payload);
    return json({ houseCert: token });
  } catch (e) {
    return json(
      { error: 'invalid request', detail: String(e) },
      { status: 400 },
    );
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    if (request.method === 'GET' && path === '/health') return handleHealth();
    if (request.method === 'GET' && path === '/.well-known/jwks.json')
      return handleJwks(env);
    if (request.method === 'POST' && path === '/houseCert')
      return handleHouseCert(request, env);

    return json({ error: 'Not found' }, { status: 404 });
  },
};
