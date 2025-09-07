import { describe, it, expect } from 'vitest';
import {
  createJoinChallenge,
  createJoinResponse,
  verifyJoinResponse,
  parseJoinChallenge,
} from '../join';
import { base64UrlToBytes, bytesToBase64Url } from '../utils/base64';

const subtle = globalThis.crypto.subtle;

async function genPlayerKeys() {
  return subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, [
    'sign',
    'verify',
  ]);
}

describe('verifyJoinResponse', () => {
  it('accepts a valid response', async () => {
    const houseCert: any = { payload: { houseId: 'h1' }, signature: '' };
    const encoded = await createJoinChallenge(houseCert, 'r1');
    const challenge = parseJoinChallenge(JSON.stringify(encoded));
    const playerKeys = await genPlayerKeys();
    const response = await createJoinResponse(challenge, playerKeys);
    expect(await verifyJoinResponse(response, challenge)).toBe(true);
  });

  it('rejects when challenge fields mismatch', async () => {
    const houseCert: any = { payload: { houseId: 'h1' }, signature: '' };
    const encoded = await createJoinChallenge(houseCert, 'r1');
    const challenge = parseJoinChallenge(JSON.stringify(encoded));
    const playerKeys = await genPlayerKeys();
    const response = await createJoinResponse(challenge, playerKeys);
    const badChallenge = { ...challenge, nonce: challenge.nonce + 'x' };
    expect(await verifyJoinResponse(response, badChallenge)).toBe(false);
  });

  it('rejects with invalid signature', async () => {
    const houseCert: any = { payload: { houseId: 'h1' }, signature: '' };
    const encoded = await createJoinChallenge(houseCert, 'r1');
    const challenge = parseJoinChallenge(JSON.stringify(encoded));
    const playerKeys = await genPlayerKeys();
    const response = await createJoinResponse(challenge, playerKeys);
    const bytes = base64UrlToBytes(response.sig);
    bytes[0] ^= 0xff; // flip first byte
    const tamperedSig = bytesToBase64Url(bytes);
    const tampered = { ...response, sig: tamperedSig };
    expect(await verifyJoinResponse(tampered, challenge)).toBe(false);
  });
});
