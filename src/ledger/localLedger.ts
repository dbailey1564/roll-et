const encoder = new TextEncoder();

export type LedgerEventType =
  | 'round_locked'
  | 'bet_cert_issued'
  | 'round_settled'
  | 'receipt_issued'
  | 'join_challenge_issued'
  | 'admission'
  | 'receipt_spent';

export interface LedgerEntry<T = any> {
  seq: number;
  prevHash: string | null;
  entryId: string;
  ts: number;
  roundId: string;
  type: LedgerEventType;
  payload: T;
  sig?: string;
  merkleRoot?: string;
}

const LEDGER_KEY = 'roll_et_ledger_v1';
const LEDGER_SYNCED_KEY = 'roll_et_ledger_last_synced_seq';

function readLedger(): LedgerEntry[] {
  try {
    const raw = localStorage.getItem(LEDGER_KEY);
    return raw ? (JSON.parse(raw) as LedgerEntry[]) : [];
  } catch {
    return [];
  }
}

function writeLedger(entries: LedgerEntry[]): void {
  try {
    localStorage.setItem(LEDGER_KEY, JSON.stringify(entries));
  } catch {}
}

function readLastSyncedSeq(): number {
  try {
    const raw = localStorage.getItem(LEDGER_SYNCED_KEY);
    return raw ? Number(raw) || 0 : 0;
  } catch {
    return 0;
  }
}

function writeLastSyncedSeq(seq: number): void {
  try {
    localStorage.setItem(LEDGER_SYNCED_KEY, String(seq));
  } catch {}
}

async function sha256Hex(input: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', encoder.encode(input));
  const bytes = new Uint8Array(buf);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export async function appendLedger<T = any>(
  type: LedgerEventType,
  roundId: string,
  payload: T,
  opts: { sig?: string; merkleRoot?: string } = {},
): Promise<LedgerEntry<T>> {
  const entries = readLedger();
  const prev = entries[entries.length - 1];
  const seq = (prev?.seq ?? 0) + 1;
  const ts = Date.now();
  const prevHash = prev?.entryId ?? null;
  const toHash = `${prevHash ?? ''}|${type}|${JSON.stringify(payload)}|${ts}`;
  const entryId = await sha256Hex(toHash);
  const entry: LedgerEntry<T> = {
    seq,
    prevHash,
    entryId,
    ts,
    roundId,
    type,
    payload,
    ...(opts.sig && { sig: opts.sig }),
    ...(opts.merkleRoot && { merkleRoot: opts.merkleRoot }),
  };
  entries.push(entry);
  writeLedger(entries);
  return entry;
}

export function getLedger(): LedgerEntry[] {
  return readLedger();
}

export function getUnsyncedEntries(): LedgerEntry[] {
  const last = readLastSyncedSeq();
  return readLedger().filter((e) => e.seq > last);
}

export function markSynced(uptoSeq: number): void {
  const last = readLastSyncedSeq();
  if (uptoSeq > last) writeLastSyncedSeq(uptoSeq);
}
