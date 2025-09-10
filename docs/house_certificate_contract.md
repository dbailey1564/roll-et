# Roll‑et — House Certificate (License) — Conceptual Contract

## Purpose

Authorize a device/operator to run **House** features for Roll‑et. Enables hosting rounds, admitting seats, issuing [Bet Certificates](./bet_certificate_contract.md) and [BANK Receipts](./bank_receipt_contract.md), and syncing [ledgers](./ledger_sync_contract.md). Must be **verifiable offline** by Players.

## Trust Chain & Roles

- **Root Authority:** Platform root key baked into the PWA; anchor of trust.
- **House Certificate (“Cert”):** Signed by Root; asserts House identity, allowed capabilities, and validity window.
- **House Device(s):** Hold the private key corresponding to the public key attested in the Cert.
 - **SHDAM Constraint (Absolute):** Single House Device Authorization Model — exactly one Cert per device; sharing across devices is forbidden.
- **Players:** Verify the Cert offline before joining a round.

`HouseCert` is structured as a payload plus a `signature` field signed by the Root Authority with ES256. The signature bytes are base64url‑encoded using the shared helpers in `src/utils/base64.ts` (`bytesToBase64Url` / `base64UrlToBytes`), which support both browsers and Node (via `btoa`/`atob` or Node's `Buffer`).

## Lifecycle & States

`VALID → WARNING → LAPSED_SOFT → EXPIRED/REVOKED`

- **VALID:** allowed — hosting, issuance, ledger sync; forbidden — none.
- **WARNING:** allowed — hosting, issuance, ledger sync; forbidden — none (UI prompts renewal).
- **LAPSED_SOFT:** allowed — verification of past artifacts; forbidden — hosting, issuance, ledger sync.
- **EXPIRED/REVOKED:** allowed — offline verification only; forbidden — hosting, issuance, ledger sync.

## Validity & Policy

- **Default validity:** 28 days from issuance.
- **Future SKU:** 12‑month option (≈10% discount) — not yet active.
- **Scope:** Cert authorizes **House features** only; Player features never require the backend post‑install.
- **Seat policy interaction:** Hosting constrained by global rules (default **max 4 players per round**).
- **Clock tolerance:** Validity checks allow ±5 min drift.

## Required Fields

HouseCert payload fields: `{houseId, kid, housePubKey, notBefore, notAfter, roles}`.
Root Authority signs the canonical JSON representation with ES256, producing a base64url `signature`.

```ts
interface HouseCertPayload {
  houseId: string
  kid: string
  housePubKey: JsonWebKey
  notBefore: number
  notAfter: number
  roles: string[]
}

interface HouseCert {
  payload: HouseCertPayload
  signature: string // base64url, Root ES256 signature
}
```

## Issuance (Input/Output)

- **Inputs (from House operator):** Purchase/entitlement proof and a device provisioning request (SHDAM enforces one Cert per device).
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
  - Device identifier matches `houseId` (SHDAM).
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
- **Auditability:** Each sync batch references the issuing Cert identity for traceability.

## Error Semantics (UX + Outcomes)

- **Expired/Invalid Cert at Join:** Player sees license error (offline) and cannot join; House UI prompts renewal.
- **Hosting Attempt while Invalid:** All gated actions hard‑fail with “license invalid/expired.”
- **Revoked Cert:** Same as invalid; additionally flagged at next sync; House must renew/reissue to resume.
- **Mismatched Keys:** If signatures don’t match the public key in the presented Cert, reject and log suspected tampering.

## Security Invariants

- **Offline verifiability:** Players must be able to validate the Cert without internet.
- **Non‑forgeability:** Only Root can issue Certs; only House private key can sign artifacts under that Cert.
- **Time correctness:** Join timing relies on House’s broadcast time anchor; Cert validity uses local time with ±5 min drift tolerance.
- **Scope control:** Cert capabilities are explicit and minimal; features outside the set are denied by default.

## Acceptance Criteria (Pass/Fail)

- **Issue/Renew:** Produces a Cert that verifies offline and enables all gated operations during its window.
- **Expire:** At not‑after + tolerance, hosting is blocked; Player verification of past artifacts still works.
- **Revoke:** Hosting blocked immediately; Players still verify past artifacts; redeems require valid Cert.
- **Key Roll:** New Cert allows issuing new artifacts; old artifacts validate via original chain; no break in Player verification.
- **Player Flow:** With no internet, Player can scan Join QR, validate Cert, and either join (valid) or receive clear license error (invalid).

## Operational Considerations

- **SHDAM Enforcement:** Every device must hold its own Cert; reuse or sharing across devices is prohibited.
- **Backup & Recovery:** House should have a secure recovery path (e.g., re‑provisioning after device loss) that **revokes** old keys/certs.
- **Telemetry (privacy‑safe):** Non‑PII counters of successful/failed verifications may be queued for upload at next sync to improve abuse detection.
