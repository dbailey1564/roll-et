const encoder = new TextEncoder();

export type LedgerEventType =
  | 'round_locked'
  | 'bet_cert_issued'
  | 'round_settled'
  | 'receipt_issued'
  | 'join_challenge_issued'
  | 'admission'
  | 'receipt_spent'
  | 'session_closed'
  | 'sync_export';

export interface LedgerEntry<T = any> {
  prevHash: string | null;
  entryId: string;
  ts: number;
  type: LedgerEventType;
  payload: T;
  sig?: string;
  merkleRoot?: string;
}

const LEDGER_KEY = 'roll_et_ledger_v1';
const LEDGER_SYNCED_KEY = 'roll_et_ledger_last_synced_entry_id';

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

function readLastSyncedEntryId(): string | null {
  try {
    return localStorage.getItem(LEDGER_SYNCED_KEY);
  } catch {
    return null;
  }
}

function writeLastSyncedEntryId(entryId: string): void {
  try {
    localStorage.setItem(LEDGER_SYNCED_KEY, entryId);
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
  payload: T,
  opts: { sig?: string; merkleRoot?: string } = {},
): Promise<LedgerEntry<T>> {
  const entries = readLedger();
  const prev = entries[entries.length - 1];
  const ts = Date.now();
  const prevHash = prev?.entryId ?? null;
  const toHash = `${prevHash ?? ''}|${type}|${JSON.stringify(payload)}|${ts}`;
  const entryId = await sha256Hex(toHash);
  const entry: LedgerEntry<T> = {
    prevHash,
    entryId,
    ts,
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
  const last = readLastSyncedEntryId();
  const entries = readLedger();
  if (!last) return entries;
  const idx = entries.findIndex((e) => e.entryId === last);
  return idx >= 0 ? entries.slice(idx + 1) : entries;
}

export function markSynced(entryId: string): void {
  if (entryId) writeLastSyncedEntryId(entryId);
}

export async function appendSessionClosed(
  roundId: string,
  opts: { sig?: string; merkleRoot?: string } = {},
) {
  return appendLedger('session_closed', { roundId }, opts);
}

export async function appendSyncExport(
  payload: any,
  opts: { sig?: string; merkleRoot?: string } = {},
) {
  return appendLedger('sync_export', payload, opts);
}
