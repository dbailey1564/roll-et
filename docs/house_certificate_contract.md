# Roll‑et — House Certificate (License) — Conceptual Contract

## Purpose
Authorize a device/operator to run **House** features for Roll‑et. Enables hosting rounds, admitting seats, issuing [Bet Certificates](./bet_certificate_contract.md) and [BANK Receipts](./bank_receipt_contract.md), and syncing [ledgers](./ledger_sync_contract.md). Must be **verifiable offline** by Players.

## Trust Chain & Roles
- **Root Authority:** Platform root key baked into the PWA; anchor of trust.
- **House Certificate (“Cert”):** Signed by Root; asserts House identity, allowed capabilities, and validity window.
- **House Device(s):** Hold the private key corresponding to the public key attested in the Cert.
- **Players:** Verify the Cert offline before joining a round.

`HouseCert` is structured as a payload plus a `signature` field. The signature bytes are base64url‑encoded using the shared helpers in `src/utils/base64.ts` (`bytesToBase64Url` / `base64UrlToBytes`), which support both browsers and Node (via `btoa`/`atob` or Node's `Buffer`).

## Lifecycle & States
1. **Issue** (monetized): Cert created after purchase/entitlement check.
2. **Active:** Within validity window; grants hosting capabilities.
3. **Grace (optional, policy‑gated):** Short post‑expiry time for renewal attempts; hosting blocked, verification still readable.
4. **Expired/Revoked:** Hosting blocked; Players see license error; previously issued artifacts remain cryptographically verifiable but may not be spendable until a valid Cert is present.

## Validity & Policy
- **Default validity:** 28 days from issuance.
- **Future SKU:** 12‑month option (≈10% discount) — not yet active.
- **Scope:** Cert authorizes **House features** only; Player features never require the backend post‑install.
- **Seat policy interaction:** Hosting constrained by global rules (default **max 4 players per round**).

## Required Claims / Assertions (Conceptual)
- **Issuer:** Root Authority identity.
- **Subject:** House identity (operator or device namespace).
- **Public Key:** House’s verification key (for signatures on [Bet Certificates](./bet_certificate_contract.md), [BANK Receipts](./bank_receipt_contract.md), etc.).
- **Validity Window:** Not‑before / Not‑after timestamps.
- **Capabilities:** Minimum set includes: host rounds, issue [Join Challenge/Response](./join_challenge_response_contract.md), mint [Bet Certificates](./bet_certificate_contract.md), issue [BANK Receipts](./bank_receipt_contract.md), sync [ledgers](./ledger_sync_contract.md).
- **License SKU / Plan:** Identifies 28‑day vs. other tiers when added.
- **Key Identifier / Rotation Hook:** Linkage for future key roll without breaking trust.
- **Anti‑replay ID:** Unique certificate identifier.

## Issuance (Input/Output)
- **Inputs (from House operator):** Purchase/entitlement proof, device provisioning request, optional multi‑device binding policy.
- **Process:** Backend authorizes purchase → generates Cert bound to the House public key → records issuance event in authority ledger.
- **Outputs:** House receives Cert + (optionally) a provisioning bundle to install the private key securely on its device(s).

## Renewal / Rotation
- **Renewal:** New Cert supersedes the old; old may enter a brief **grace (read‑only)** state for verification of past artifacts, but cannot host.
- **Key rotation:** Allowed at renewal; Cert carries a rotation hook so Players can still verify chains for artifacts issued under prior keys.
- **Continuity:** Previously issued [Bet Certificates](./bet_certificate_contract.md) and [BANK Receipts](./bank_receipt_contract.md) remain verifiable via their original chain.

## Revocation
- **Triggers:** Fraud, payment reversal, policy breach.
- **Effects:** Hosting immediately blocked; Players still verify artifacts cryptographically, but **spend/redeem** requires a **currently valid** House Cert.
- **Propagation:** Reflected at next Player interaction (offline signage via expiry mismatch) and at next [ledger sync](./ledger_sync_contract.md) (online).

## Verification (by Players — Offline)
- **Inputs:** House presents Cert during [Join Challenge/Response](./join_challenge_response_contract.md) (bundled in Join QR).
- **Checks:**  
  - Chain validity (Root → Cert signature).  
  - Validity window (current time within not‑before/after).  
  - Capability claim includes “host rounds.”  
  - Optional device binding policy satisfied (if you support multi‑device).
- **Outcome:**  
  - **Pass:** Player proceeds with [Join Challenge/Response](./join_challenge_response_contract.md).
  - **Fail:** Player sees “license invalid/expired” UX and a purchase/renewal link (for prospective House operators).

## Hosting Gating (by House App)
- **Preconditions for hosting actions:**  
  - Cert active.  
  - Device holds matching private key.  
- **Gated operations:**  
  - Start round (and set valuation).
  - Admit seats (verify [Join Challenge/Response](./join_challenge_response_contract.md) responses).
  - Lock and mint [Bet Certificates](./bet_certificate_contract.md).
  - Issue [BANK Receipts](./bank_receipt_contract.md).
  - [Sync](./ledger_sync_contract.md) local ledger to authority backend.

## Artifacts Issued Under a Cert
- [Bet Certificates](./bet_certificate_contract.md): Must be signed by the House key referenced in the active Cert; include round binding; verifiable offline. Short validity for reopen/view.
- [BANK Receipts](./bank_receipt_contract.md): Signed settlement records; unique and spend/not‑spent tracked by House ledger; verifiable offline; redemption requires an **active** Cert at time of spend.
- [Join Challenge/Response](./join_challenge_response_contract.md): Contain the Cert and rotating challenge; Players verify before responding.

## [Ledger & Sync](./ledger_sync_contract.md) Rules (Cert Interaction)
- **Eligibility:** Sync accepted only if the submitting House presents a **currently active** Cert.
- **Scope:** House uploads an append‑only ledger of rounds, admissions, bets, outcomes, settlements, and receipt states.
- **Normalization:** Backend enforces the **$1,440 max per player per round** ceiling in aggregated analytics.
- **Auditability:** Each sync batch references the issuing Cert identity for traceability.

## Error Semantics (UX + Outcomes)
- **Expired/Invalid Cert at Join:** Player sees license error (offline) and cannot join; House UI prompts renewal.
- **Hosting Attempt while Invalid:** All gated actions hard‑fail with “license invalid/expired.”
- **Revoked Cert:** Same as invalid; additionally flagged at next sync; House must renew/reissue to resume.
- **Mismatched Keys:** If signatures don’t match the public key in the presented Cert, reject and log suspected tampering.

## Security Invariants
- **Offline verifiability:** Players must be able to validate the Cert without internet.
- **No secrets in QR:** Cert and nonces only; no private material leaves the House device(s).
- **Non‑forgeability:** Only Root can issue Certs; only House private key can sign artifacts under that Cert.
- **Time correctness:** Join timing relies on House’s broadcast time anchor; Cert validity uses local time with drift tolerance policy (define a small window).
- **Scope control:** Cert capabilities are explicit and minimal; features outside the set are denied by default.

## Acceptance Criteria (Pass/Fail)
- **Issue/Renew:** Produces a Cert that verifies offline and enables all gated operations during its window.
- **Expire:** At not‑after + tolerance, hosting is blocked; Player verification of past artifacts still works.
- **Revoke:** Hosting blocked immediately; Players still verify past artifacts; redeems require valid Cert.
- **Key Roll:** New Cert allows issuing new artifacts; old artifacts validate via original chain; no break in Player verification.
- **Player Flow:** With no internet, Player can scan Join QR, validate Cert, and either join (valid) or receive clear license error (invalid).

## Operational Considerations
- **Multi‑device Houses (optional):** Policy decides whether the same Cert can authorize multiple devices (each holding its own private key) or a single key per Cert.
- **Backup & Recovery:** House should have a secure recovery path (e.g., re‑provisioning after device loss) that **revokes** old keys/certs.
- **Telemetry (privacy‑safe):** Non‑PII counters of successful/failed verifications may be queued for upload at next sync to improve abuse detection.
