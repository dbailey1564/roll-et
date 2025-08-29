import type { HouseCert } from '../certs/houseCert'
import { getUnsyncedEntries, markSynced } from './localLedger'
import { bytesToBase64Url } from '../utils/base64'

const encoder = new TextEncoder()

type SyncResult = { ok: true; synced: number } | { ok: false; error: string }
type SyncChallengeResponse = { nonce: string }
type SyncCommitRequest = { houseCert: HouseCert; entries: any[]; proof: { nonce: string; sig: string } }

export async function syncWithAuthority(houseCert: HouseCert, signer: CryptoKey | null): Promise<SyncResult> {
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
    if (!signer) return { ok: false, error: 'missing signer' }

    const root = base.replace(/\/$/, '')
    const chalRes = await fetch(`${root}/sync/challenge`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ houseCert }),
    })
    if (!chalRes.ok) return { ok: false, error: `challenge failed: ${chalRes.status}` }
    const { nonce } = (await chalRes.json()) as SyncChallengeResponse
    const data = encoder.encode(nonce)
    const sigBuf = await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, signer, data)
    const sig = bytesToBase64Url(new Uint8Array(sigBuf))
    const commit: SyncCommitRequest = { houseCert, entries, proof: { nonce, sig } }
    const res = await fetch(`${root}/sync`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(commit),
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
