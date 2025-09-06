import { describe, it, expect } from 'vitest';
import { lockRound } from '../round';
import type { Player } from '../types';

function subtle() {
  return globalThis.crypto.subtle;
}
async function genKeyPair() {
  return subtle().generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, [
    'sign',
    'verify',
  ]);
}

describe('round locking', () => {
  it('generates bet certs for players', async () => {
    const house = await genKeyPair();
    const players: Player[] = [
      {
        seat: 1,
        uid: 'p1',
        name: 'P1',
        bets: [{ id: 'b1', type: 'single', selection: [1], amount: 1 }],
        pool: 0,
        bank: 0,
        bankRef: 'bank-1',
      },
      { seat: 2, uid: 'p2', name: 'P2', bets: [], pool: 0, bank: 0 },
    ];
    const certs = await lockRound(players, house.privateKey, 'r1', 'house-1');
    expect(certs).toHaveLength(2);
    expect(certs[0].seat).toBe(1);
    expect(certs[0].bankRef).toBe('bank-1');
  });
});
