# Roll-et — Join Challenge/Response Contract

## Purpose

Provide a secure, offline-verifiable admission mechanism for Players to join a House-hosted round. Ensures that only valid Houses (with active certificates) can admit Players, and that Player admissions are non-forgeable, non-replayable, and bound to a specific round. Successful admission leads to issuance of a [Bet Certificate](./bet_certificate_contract.md); winnings may later be stored as a [BANK Receipt](./bank_receipt_contract.md).

## Trust Chain & Roles

- **Root Authority:** Anchor baked into PWA; signs [House Certificates](./house_certificate_contract.md).
- [House Certificate](./house_certificate_contract.md): Signed by Root; validates House’s hosting authority and public key.
- **House Device:** Holds private key referenced in Certificate; issues Join challenges.
- **Player Device:** Maintains a persistent P-256 keypair. A per-House UID is derived as `playerUid = H(playerPubKey || houseId)`.

## Lifecycle & States

1. **Challenge Issued:** House generates ephemeral challenge (nonce + time anchor + round binding).
2. **QR Display:** Challenge packaged with [House Certificate](./house_certificate_contract.md) and Round binding into Join QR.
3. **Response Computed:** Player scans QR, validates Certificate, and computes signed response bound to challenge.
4. **Verification:** House checks response validity and admits Player if seat available.
5. **Ledger Entry:** House records `{ playerUid, seat, buyIn, ts, nonce }` using its local clock (`ts`). Verifiers allow ±5 min drift when validating the timestamp.

## QR Payload Format

- **Challenge QR:** Encodes a JSON object:

```json
{
  "type": "join-challenge",
  "houseCert": "<base64 cert>",
  "round": "<round id>",
  "nonce": "<random>",
  "nbf": "<epoch ms>",
  "exp": "<epoch ms>"
}
```

- **Join Response:** Signed JSON returned by the Player:

```json
{
  "playerUid": "<H(pubKey || houseId)>",
  "playerPubKey": "<base64url p256 pubKey>",
  "round": "<round id>",
  "seat": "<requested seat index>",
  "nonce": "<challenge nonce>",
  "sig_player": "<player signature>"
}
```

All binary values—the House certificate's `signature`, the challenge `nonce`, the `playerPubKey`, and the `sig_player`—are base64url-encoded. Developers should use the shared helpers in `src/utils/base64.ts` (`bytesToBase64Url` / `base64UrlToBytes`) to handle these fields. The utilities abstract away environment differences by using browser `btoa`/`atob` when available and falling back to Node's `Buffer` APIs so the same code works across platforms.

## QR Generation & Scanning

- Join challenges, [Bet Certificates](./bet_certificate_contract.md) and [BANK Receipts](./bank_receipt_contract.md) can be rendered as QRs for portability. Helper modules in [`betCertQR.ts`](../src/betCertQR.ts) and [`bankReceiptQR.ts`](../src/bankReceiptQR.ts) generate data URL images and parse scanned payloads.
- Scanning leverages the browser `BarcodeDetector` API when supported (Chrome ≥83, Edge ≥83, Opera ≥70, Android WebView ≥88). Browsers without support (Safari, Firefox, older Chromium) fall back to [`jsQR`](https://github.com/cozmo/jsQR) using a canvas capture.
- The [`BetCertScanner`](../src/components/BetCertScanner.tsx) and [`BankReceiptScanner`](../src/components/BankReceiptScanner.tsx) components implement this detection flow for Bet Certs and BANK Receipts respectively.

## Challenge Requirements

- **Contents:**
  - House Certificate
  - Round identifier
  - Ephemeral challenge nonce
  - Time anchor (±5 min drift tolerance)
- **Rotation interval:** Frequent (≈10–15 seconds) to prevent reuse via screenshots.
- **Uniqueness:** Each nonce is single-use; once redeemed, cannot be reused.
- **Binding:** Explicitly tied to the round identifier; cannot be replayed across rounds.

## Player Processing

- **Verification:**
  - Validate [House Certificate](./house_certificate_contract.md) against Root (offline).
  - Confirm Certificate validity window.
  - **Response Computation:**
    - Derive `playerUid = H(playerPubKey || houseId)` and sign `{ playerUid, playerPubKey, round, seat, nonce }` with the Player’s private key.
    - Bind response to challenge nonce, round identifier, and seat request.

## House Verification

- **Checks performed:**
  - Certificate chain valid.
  - Certificate not expired/revoked.
  - Challenge nonce is fresh and unused.
  - `playerUid` equals H(`playerPubKey` || `houseId`).
  - `sig_player` verifies against `playerPubKey`.
  - Round seat count < 4.
- **Outcomes:**
  - **Pass:** Player admitted; ledger entry created; Player allocated 4 credits at declared round valuation.
  - **Fail:** Player denied; UX shows error (expired cert, full seats, stale QR, etc.).

## Seat Policy

- **Maximum seats:** 4 Players per round (default).
- **Duplicate admission:** Re-join attempt by the same Player in the same round is rejected.
  - **Audit:** All failed or rejected attempts logged in the House ledger for sync via the [Ledger & Sync](./ledger_sync_contract.md).

## Expiry & Renewal

- **Challenge expiry:** The `exp` value in the challenge QR (≈10–15 s from issuance) defines when it becomes invalid.
- **Renewal:** Expired challenges cannot be renewed; Players must scan a fresh QR.
- **Certificate expiry:** [House Certificates](./house_certificate_contract.md) may also expire; Players must wait for the House to renew before joining.

## [Ledger & Sync](./ledger_sync_contract.md)

- **Admission record:** `{ playerUid, seat, buyIn, ts, nonce }` plus round ID.
- **Time drift:** `ts` comes from the House clock; verifiers allow ±5 min drift relative to their local time.
- **Normalization:** Buy-in reflected in global sync, subject to $1,440/player/round ceiling.
- **Tamper-evident:** Admissions signed by House key to prevent retroactive manipulation.

## Error Semantics

- **Expired/Invalid [House Certificate](./house_certificate_contract.md):** Player sees “license invalid/expired” offline.
- **Stale QR (nonce expired):** Player sees “join code expired — rescan live QR.”
- **Replay (nonce reused):** Player denied; House logs attempt.
- **Seat full (≥4):** Player denied; UX shows “table full.”
- **Drift exceeded:** Player denied; UX prompts rescan.
- **Signature mismatch:** Denied; logged as possible tamper attempt.

## Security Invariants

- **Offline verification:** Player can always confirm House Certificate validity without internet.
- **Replay protection:** Nonce single-use + rotation interval prevents photo/reuse.
- **Round binding:** Responses valid only for the round ID in the challenge.
- **Time correctness:** House is authoritative; ±5 min Player drift tolerance enforced.
- **Non-forgeability:** Requires Player signature + House key validation.
- **Privacy:** Player UID is pseudonymous per-House; no hardware fingerprinting.

## Acceptance Criteria

- **Valid path:** Active [House Certificate](./house_certificate_contract.md) + fresh challenge + valid response → Player admitted.
- **Invalid path:** Any failed check results in denial with clear UX messaging.
- **Ledger consistency:** Every successful admission creates a durable ledger entry for later sync via the [Ledger & Sync](./ledger_sync_contract.md).
- **Seat enforcement:** No more than 4 admissions logged per round.
