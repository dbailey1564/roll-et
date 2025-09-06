# Roll-et — Ledger & Sync Contract

## Purpose

Maintain a complete, tamper-evident record of all House operations (rounds, admissions, bets, certs, receipts, outcomes). Ensure periodic synchronization of these records with the Roll-et authority backend, while enforcing global normalization rules and license validity.

## Trust Chain & Roles

- **Root Authority:** Anchor baked into PWA; issues [House Certificates](./house_certificate_contract.md); operates backend sync endpoint.
- [House Certificate](./house_certificate_contract.md): Active license required for ledger sync.
- **House Device:** Maintains local append-only ledger; uploads batches during sync.
- **Player Devices:** Reference local ledger entries (admissions, certs, receipts) but do not maintain global sync.

## Ledger Scope

Each ledger entry MUST capture the authoritative state of Player interaction with a round. Minimum fields (conceptual):

- House identity (via [House Certificate](./house_certificate_contract.md)).
- Round ID + valuation.
- Admission events (Player UID, seat assignment, buy-in credits) via [Join Challenge/Response](./join_challenge_response_contract.md).
- Bets (normalized slips, wagered credits, counters).
- Lock events (bet hashes, [Bet Certificate](./bet_certificate_contract.md) issuance).
- Results (winning number, odds applied).
- Settlements (net value, disposition = tender/banked).
- [BANK Receipts](./bank_receipt_contract.md) (issued, spent, IDs).
- Errors/rejections (optional, for audit).

## Local Ledger Properties

- **Append-only:** No deletions or retroactive edits allowed.
- **Tamper-evident:** Each entry references prior hash or sequence ID.
- **Authoritative:** House ledger is canonical for its rounds.
- **Storage:** Retained locally for full history.

## Ledger Entry Format

Every ledger entry is a hash-chained object:

```json
{
  "entryId": string,      // SHA-256 over prevHash|type|payload|ts
  "prevHash": string|null,
  "type": string,
  "payload": object,
  "ts": number,           // milliseconds since epoch
  "sig"?: string,         // ECDSA-P256 signature (checkpoint entries only)
  "merkleRoot"?: string   // root of entries since last checkpoint
}
```

- `entryId` hashes the prior hash, event type, payload and timestamp.
- `prevHash` links to the previous `entryId`, creating a tamper-evident chain.
- `sig` and `merkleRoot` appear only on **checkpoint** entries and are covered by the `entryId` hash.
- `ts` records when the entry was appended.

### Ledger Event Payloads

Event types and their payload fields:

- **`join_challenge_issued`** `{ round, nonce, nbf, exp }` — QR challenge parameters.
- **`admission`** `{ seat, player?, name?, round?, method? }` — seat assignment with optional identifiers or join method.
- **`round_locked`** `{ seatCount, maxSeats, players: [{ id, stake }] }` — round start snapshot.
- **`bet_cert_issued`** `{ player, certId, betHash, exp }` — issued Bet Certificate details.
- **`round_settled`** `{ roll, deltas }` — winning roll and per-seat credit changes.
- **`receipt_issued`** `{ player, value, betCertRef, receiptId?, spendCode? }` — BANK receipt issuance.
- **`receipt_spent`** `{ receiptId, player, value, method? }` — receipt redemption record.

## Sync Process

- **Trigger:** Periodic or on-demand (House operator action).
- **Prerequisite:** Active [House Certificate](./house_certificate_contract.md) required.
- **Batching:** House transmits append-only segment since last sync.
- **Verification by backend:**
  - Cert validity (Root → House).
  - Entry integrity (sequential hash chain intact).
  - No duplication (idsempotent merges).
- **Outcome:** Entries merged into global ledger under that House UID.

## Checkpoints & Signed Sync Export

- **Hybrid checkpointing:** Entries are hash-chained, while periodic checkpoints capture groups of entries for signature.
  - Checkpoints occur at `round_locked`, `round_settled`, `session_closed`, and `sync_export` events.
  - Each checkpoint entry includes `sig` and `merkleRoot` fields, enabling selective proof of any covered entry.
- **SyncExportHeader:** Before upload, the House signs a header containing the current House Cert `kid`, range (`startEntryId` → `endEntryId`), and a timestamp. Backend verifies the signature against the presented House Cert before accepting the batch.

## House Certificate Lifecycle & Sync Eligibility

- **VALID/WARNING:** Ledger sync permitted.
- **LAPSED_SOFT:** Read-only; previously recorded entries may sync after renewal but no new entries can be uploaded.
- **EXPIRED/REVOKED:** Sync rejected. House must renew to resume syncing.
- Backend enforces that every entry's timestamp falls within a period covered by a valid certificate.

## Global Normalization Rules

- **Ceiling:** Analytics cap at **$1,440 max per player per round** (8 credits × 18:1 × $10).
- **Local play variance:** Houses may declare any valuation in range, but sync collapses to the normalization ceiling.
- **Comparability:** Ensures fair global analytics regardless of local stakes.

## Error Handling

- **Invalid Cert:** Sync refused; House must renew.
- **Broken hash chain:** Sync refused; operator warned of tamper/inconsistency.
- **Duplicate batch:** Ignored gracefully (idempotent).
- **Partial failure:** Affected entries flagged; House can retry.

## Replay & Integrity

- **Admission nonces, Cert IDs, Receipt IDs** prevent replay across syncs.
- **Sequential ordering** ensures no gaps.
- **Auditability:** Backend stores full history, immutable, with references to Cert identities.

## Security Invariants

- **License gating:** Sync only accepted from Houses with active Certificates.
- **Non-forgeability:** Checkpoint entries are signed by the House private key, and all intermediate entries must hash-chain to a signed checkpoint; invalid signatures or chains are rejected.
- **Immutability:** Once synced, entries cannot be altered or deleted.
- **Privacy:** Player IDs are pseudonymous, per-House; no PII in global ledger.

## Acceptance Criteria

- **Valid sync:** New ledger entries append cleanly; backend acknowledges.
- **Invalid sync:** Errors reported with cause (invalid cert, tamper, replay).
- **Global analytics:** Always respect $1,440 normalization ceiling.
- **Audit:** Every House’s full ledger traceable to Cert identity and Root authority.
