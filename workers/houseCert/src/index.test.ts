import {
  importPrivateKey,
  derivePublicJwk,
  signJwt,
  base64UrlDecode,
} from './index';
import { expect, test } from 'vitest';

const decoder = new TextDecoder();

function decodePayload(segment: string) {
  return JSON.parse(decoder.decode(base64UrlDecode(segment)));
}

function decodeHeader(segment: string) {
  return JSON.parse(Buffer.from(segment, 'base64url').toString('utf8'));
}

async function makeTestPem() {
  const { privateKey } = await crypto.subtle.generateKey(
    { name: 'ECDSA', namedCurve: 'P-256' },
    true,
    ['sign', 'verify'],
  );
  const pkcs8 = await crypto.subtle.exportKey('pkcs8', privateKey);
  const b64 = Buffer.from(pkcs8).toString('base64');
  const lines = b64.match(/.{1,64}/g) || [];
  return `-----BEGIN PRIVATE KEY-----\n${lines.join('\n')}\n-----END PRIVATE KEY-----`;
}

test('signJwt issues verifiable ES256 token', async () => {
  const privPem = await makeTestPem();
  const pk = await importPrivateKey(privPem);
  const { jwk } = await derivePublicJwk(pk);
  const token = await signJwt(pk, jwk.kid!, { roundId: 'r1', iat: 0, exp: 1 });
  const [h, p, s] = token.split('.');

  expect(decodePayload(p).roundId).toBe('r1');
  expect(decodeHeader(h).alg).toBe('ES256');

  const verifyKey = await crypto.subtle.importKey(
    'jwk',
    jwk,
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['verify'],
  );
  const data = new TextEncoder().encode(`${h}.${p}`);
  const sig = base64UrlDecode(s);
  const ok = await crypto.subtle.verify(
    { name: 'ECDSA', hash: 'SHA-256' },
    verifyKey,
    sig,
    data,
  );
  expect(ok).toBe(true);
});
