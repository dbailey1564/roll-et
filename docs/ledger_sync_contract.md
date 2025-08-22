# Roll-et — Ledger & Sync Contract

## Purpose
Maintain a complete, tamper-evident record of all House operations (rounds, admissions, bets, certs, receipts, outcomes). Ensure periodic synchronization of these records with the Roll-et authority backend, while enforcing global normalization rules and license validity.

## Trust Chain & Roles
- **Root Authority:** Anchor baked into PWA; issues House Certificates; operates backend sync endpoint.  
- **House Certificate:** Active license required for ledger sync.  
- **House Device:** Maintains local append-only ledger; uploads batches during sync.  
- **Player Devices:** Reference local ledger entries (admissions, certs, receipts) but do not maintain global sync.  

## Ledger Scope
Each ledger entry MUST capture the authoritative state of Player interaction with a round. Minimum fields (conceptual):  
- House identity (via House Cert).  
- Round ID + valuation.  
- Admission events (Player UID, seat assignment, buy-in credits).  
- Bets (normalized slips, wagered credits, counters).  
- Lock events (bet hashes, Bet Cert issuance).  
- Results (winning number, odds applied).  
- Settlements (net value, disposition = tender/banked).  
- BANK receipts (issued, spent, IDs).  
- Errors/rejections (optional, for audit).  

## Local Ledger Properties
- **Append-only:** No deletions or retroactive edits allowed.  
- **Tamper-evident:** Each entry references prior hash or sequence ID.  
- **Authoritative:** House ledger is canonical for its rounds.  
- **Storage:** Retained locally for full history.  

## Sync Process
- **Trigger:** Periodic or on-demand (House operator action).  
- **Prerequisite:** Active House Certificate required.  
- **Batching:** House transmits append-only segment since last sync.  
- **Verification by backend:**  
  - Cert validity (Root → House).  
  - Entry integrity (sequential hash chain intact).  
  - No duplication (idsempotent merges).  
- **Outcome:** Entries merged into global ledger under that House UID.  

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
- **Non-forgeability:** Entries signed by House private key; backend rejects unsigned or invalid.  
- **Immutability:** Once synced, entries cannot be altered or deleted.  
- **Privacy:** Player IDs are pseudonymous, per-House; no PII in global ledger.  

## Acceptance Criteria
- **Valid sync:** New ledger entries append cleanly; backend acknowledges.  
- **Invalid sync:** Errors reported with cause (invalid cert, tamper, replay).  
- **Global analytics:** Always respect $1,440 normalization ceiling.  
- **Audit:** Every House’s full ledger traceable to Cert identity and Root authority.  
