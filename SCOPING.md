Roll-et Scope and Guardrails

Core principle: Offline-first, verifiable ledger for real-world play. The app is a bookkeeping and verification tool, not an RNG “game”.

In-scope
- Local multi-seat tables: variable seats per table (default 4), all on the local device, no network-synchronized betting.
- Manual rolls only; deterministic resolution from rules/odds.
- Seats/credits: per-round pool cap 8 credits; min bet 1; buy-in per rules.
- Artifacts: Join admission → Bet Cert at lock → BANK Receipt at settlement; receipts have a spent state.
- Trust: P-256 signatures, base64url, offline verification via QRs.
- Hosting: Valid HouseCert required to host/settle; local ledger sync occurs when selecting Host (internet required only then).

Out of scope
- Network-synchronized gameplay or remote betting.
- Hidden randomness or server-dependent play.

Ledger
- Append-only, hash-chained local ledger of admissions, cert issuance, rounds, outcomes, and receipts.
- Sync uploads unsynced entries and requires proof-of-possession of the House key.

Process
- Propose → Confirm → Implement → Validate. No code without explicit go-ahead.

