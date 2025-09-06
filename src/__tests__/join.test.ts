import { describe, it, expect } from 'vitest';
import {
  createJoinChallenge,
  createJoinResponse,
  verifyJoinResponse,
} from '../join';

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
    const challenge = await createJoinChallenge(houseCert, 'r1');
    const playerKeys = await genPlayerKeys();
    const response = await createJoinResponse('player1', challenge, playerKeys);
    expect(await verifyJoinResponse(response, challenge)).toBe(true);
  });

  it('rejects when challenge fields mismatch', async () => {
    const houseCert: any = { payload: { houseId: 'h1' }, signature: '' };
    const challenge = await createJoinChallenge(houseCert, 'r1');
    const playerKeys = await genPlayerKeys();
    const response = await createJoinResponse('player1', challenge, playerKeys);
    const badChallenge = { ...challenge, nonce: challenge.nonce + 'x' };
    expect(await verifyJoinResponse(response, badChallenge)).toBe(false);
  });

  it('rejects with invalid signature', async () => {
    const houseCert: any = { payload: { houseId: 'h1' }, signature: '' };
    const challenge = await createJoinChallenge(houseCert, 'r1');
    const playerKeys = await genPlayerKeys();
    const response = await createJoinResponse('player1', challenge, playerKeys);
    const tampered = { ...response, sig: response.sig.slice(0, -1) + 'A' };
    expect(await verifyJoinResponse(tampered, challenge)).toBe(false);
  });
});
