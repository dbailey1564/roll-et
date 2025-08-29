import type { HouseCert } from '../certs/houseCert'
import { getUnsyncedEntries, markSynced } from './localLedger'

type SyncResult = { ok: true; synced: number } | { ok: false; error: string }

export async function syncWithAuthority(houseCert: HouseCert): Promise<SyncResult> {
  const entries = getUnsyncedEntries()
  if (entries.length === 0) return { ok: true, synced: 0 }

  const base = (import.meta as any).env?.VITE_AUTH_URL as string | undefined
  if (!base) {
    // Dev fallback: mark as synced locally; production should set VITE_AUTH_URL
    const upto = entries[entries.length - 1].seq
    markSynced(upto)
    console.warn('No VITE_AUTH_URL set; marking entries as synced locally (dev mode).')
    return { ok: true, synced: entries.length }
  }

  try {
    const res = await fetch(`${base.replace(/\/$/,'')}/sync`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ houseCert, entries }),
    })
    if (!res.ok) return { ok: false, error: `sync failed: ${res.status}` }
    const json = await res.json().catch(() => ({})) as { lastSeq?: number }
    const lastSeq = json.lastSeq ?? entries[entries.length - 1].seq
    markSynced(lastSeq)
    return { ok: true, synced: entries.length }
  } catch (e: any) {
    return { ok: false, error: e?.message || 'network error' }
  }
}

