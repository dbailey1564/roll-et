import { describe, it, expect, beforeEach } from 'vitest';
import {
  appendLedger,
  getLedger,
  getUnsyncedEntries,
  markSynced,
} from '../ledger/localLedger';

const store: Record<string, string> = {};
const localStorageMock = {
  getItem(key: string) {
    return Object.prototype.hasOwnProperty.call(store, key) ? store[key] : null;
  },
  setItem(key: string, value: string) {
    store[key] = value;
  },
  removeItem(key: string) {
    delete store[key];
  },
};
(globalThis as any).localStorage = localStorageMock;

describe('local ledger', () => {
  beforeEach(() => {
    localStorage.removeItem('roll_et_ledger_v1');
    localStorage.removeItem('roll_et_ledger_last_synced_entry_id');
  });

  it('appends with hash chain', async () => {
    const a = await appendLedger('round_locked', {
      roundId: 'r1',
      players: [],
    });
    const b = await appendLedger('round_settled', { roundId: 'r1', roll: 7 });
    const all = getLedger();
    expect(all.length).toBe(2);
    expect(b.prevHash).toBe(a.entryId);
    expect(a.entryId).toMatch(/^[0-9a-f]{64}$/);
    expect(typeof a.ts).toBe('number');
  });

  it('tracks unsynced entries by entryId', async () => {
    const first = await appendLedger('round_locked', { roundId: 'r2' });
    const second = await appendLedger('round_settled', { roundId: 'r2' });
    let unsynced = getUnsyncedEntries();
    expect(unsynced.length).toBe(2);
    markSynced(first.entryId);
    unsynced = getUnsyncedEntries();
    expect(unsynced.length).toBe(1);
    expect(unsynced[0].entryId).toBe(second.entryId);
  });

  it('stores optional sig and merkleRoot', async () => {
    const e = await appendLedger(
      'round_locked',
      { roundId: 'r1' },
      {
        sig: 'sig123',
        merkleRoot: 'root456',
      },
    );
    expect(e.sig).toBe('sig123');
    expect(e.merkleRoot).toBe('root456');
  });
});
