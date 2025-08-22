# Roll-et — Join Challenge/Response Contract

## Purpose
Provide a secure, offline-verifiable admission mechanism for Players to join a House-hosted round. Ensures that only valid Houses (with active certificates) can admit Players, and that Player admissions are non-forgeable, non-replayable, and bound to a specific round. Successful admission leads to issuance of a [Bet Certificate](./bet_certificate_contract.md); winnings may later be stored as a [BANK receipt](./bank_receipt_contract.md).

## Trust Chain & Roles
- **Root Authority:** Anchor baked into PWA; signs House Certificates.  
- **House Certificate:** Signed by Root; validates House’s hosting authority and public key.  
- **House Device:** Holds private key referenced in Certificate; issues Join challenges.  
- **Player Device:** Holds Player’s local keypair; computes responses using pairwise secret.  

## Lifecycle & States
1. **Challenge Issued:** House generates ephemeral challenge (nonce + time anchor + round binding).  
2. **QR Display:** Challenge packaged with House Certificate and Round binding into Join QR.
3. **Response Computed:** Player scans QR, validates Certificate, and computes signed response bound to challenge.
4. **Verification:** House checks response validity and admits Player if seat available.
5. **Ledger Entry:** Admission recorded with seat assignment and buy-in.

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

- **Player Response:** Returned payload (not necessarily QR) includes:

```json
{
  "player": "<uid>",
  "round": "<round id>",
  "nonce": "<challenge nonce>",
  "hmac": "<rolling code>",
  "bankRef": "<optional receiptId>",
  "sig": "<player signature>"
}
```

`bankRef` allows a Player to fund the buy-in with a stored [BANK receipt](./bank_receipt_contract.md). When admission succeeds, this `bankRef` is logged and later embedded in the resulting [Bet Certificate](./bet_certificate_contract.md).

## Challenge Requirements
- **Contents:**  
  - House Certificate  
  - Round identifier  
  - Ephemeral challenge nonce  
  - Time anchor (for drift checks)  
- **Rotation interval:** Frequent (≈10–15 seconds) to prevent reuse via screenshots.  
- **Uniqueness:** Each nonce is single-use; once redeemed, cannot be reused.  
- **Binding:** Explicitly tied to the round identifier; cannot be replayed across rounds.  

## Player Processing
- **Verification:**  
  - Validate House Certificate against Root (offline).  
  - Confirm Certificate validity window.  
- **Response Computation:**  
  - Use pre-established pairwise secret (from Player ↔ House) to compute rolling code/HMAC.  
  - Bind response to challenge nonce, round identifier, and seat request.
  - Include Player device signature for integrity and optionally a `bankRef` if paying via BANK receipt.

## House Verification
- **Checks performed:**  
  - Certificate chain valid.  
  - Certificate not expired/revoked.  
  - Challenge nonce is fresh and unused.
  - Response matches expected rolling code within drift tolerance.
  - Player signature validates against Player UID key.
  - If `bankRef` present, associated BANK receipt is valid and unspent.
  - Round seat count < 4.
- **Outcomes:**  
  - **Pass:** Player admitted; ledger entry created; Player allocated 4 credits at declared round valuation.  
  - **Fail:** Player denied; UX shows error (expired cert, full seats, stale QR, etc.).

## Seat Policy
- **Maximum seats:** 4 Players per round (default).
- **Duplicate admission:** Re-join attempt by the same Player in the same round is rejected.
- **Audit:** All failed or rejected attempts logged in the House ledger for sync.

## Expiry & Renewal
- **Challenge expiry:** The `exp` value in the challenge QR (≈10–15 s from issuance) defines when it becomes invalid.
- **Renewal:** Expired challenges cannot be renewed; Players must scan a fresh QR.
- **Certificate expiry:** House Certificates may also expire; Players must wait for the House to renew before joining.

## Ledger & Sync
- **Admission record:** Round ID, Player UID, challenge nonce, admission timestamp, buy-in credits, seat index.  
- **Normalization:** Buy-in reflected in global sync, subject to $1,440/player/round ceiling.  
- **Tamper-evident:** Admissions signed by House key to prevent retroactive manipulation.

## Error Semantics
- **Expired/Invalid House Cert:** Player sees “license invalid/expired” offline.  
- **Stale QR (nonce expired):** Player sees “join code expired — rescan live QR.”  
- **Replay (nonce reused):** Player denied; House logs attempt.  
- **Seat full (≥4):** Player denied; UX shows “table full.”  
- **Drift exceeded:** Player denied; UX prompts rescan.  
- **Signature mismatch:** Denied; logged as possible tamper attempt.

## Security Invariants
- **Offline verification:** Player can always confirm House Certificate validity without internet.  
- **Replay protection:** Nonce single-use + rotation interval prevents photo/reuse.  
- **Round binding:** Responses valid only for the round ID in the challenge.  
- **Time correctness:** House is authoritative; Player drift tolerance enforced.  
- **Non-forgeability:** Requires valid pairwise secret + Player signature + House key validation.  
- **Privacy:** Player UID is pseudonymous per-House; no hardware fingerprinting.  

## Acceptance Criteria
- **Valid path:** Active House Certificate + fresh challenge + valid response → Player admitted.  
- **Invalid path:** Any failed check results in denial with clear UX messaging.  
- **Ledger consistency:** Every successful admission creates a durable ledger entry for later sync.  
- **Seat enforcement:** No more than 4 admissions logged per round.  
