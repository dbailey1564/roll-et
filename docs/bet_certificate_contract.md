# Roll-et — Bet Certificate (Bet Cert) Contract

## Purpose
Provide a portable, offline-verifiable proof of a Player’s locked bet in a specific round. Allows Players to reopen or view their bet state securely and ensures that bets are immutable once the round is locked. Admission to the round occurs via the [Join Challenge/Response](./join_challenge_response_contract.md); if the seat was funded with a stored [BANK Receipt](./bank_receipt_contract.md), that reference is bound into the Bet Cert for downstream settlement.

## Trust Chain & Roles
- **Root Authority:** Anchor baked into PWA; signs House Certificates.
- [House Certificate](./house_certificate_contract.md): Signed by Root; validates House’s hosting authority and public key.
- **House Device:** Holds private key; issues Bet Certs at lock.
- **Player Device:** Receives and stores Bet Certs; uses them to verify locked bets offline.

## Lifecycle & States
1. **Pre-lock:** Players submit bets during betting window.  
2. **Lock:** House freezes all bets; computes normalized bet hashes.  
3. **Cert Issuance:** For each Player, House issues a Bet Cert binding them to their bet.  
4. **Post-lock:** Players store Bet Cert locally; can scan/share it to reopen read-only views.  
5. **Expiry:** Cert validity ends after short TTL (renewal possible for read-only access).  

## Required Claims / Assertions (Conceptual)
- **Issuer:** House identity (via [House Certificate](./house_certificate_contract.md)).
- **Cert ID:** Unique identifier for replay protection.  
- **Player Binding:** Player UID bound into the Cert.  
- **Round Binding:** Round identifier included.  
- **Bet Hash:** Cryptographic hash of the Player’s normalized bet slip.
- **Validity Window:** Short not-before / not-after times (minutes).
- **Bank Reference:** Optional `bankRef` pointing to the [BANK Receipt](./bank_receipt_contract.md) ID used for the buy-in.
- **Optional Hints:** Minimal UI hints (e.g., bet summary) if desired.

## Issuance (Input/Output)
- **Inputs:** Normalized bet slip; Player UID; Round ID.
- **Process:** House computes bet hash, constructs Cert payload, signs with House key.
- **Outputs:** Player receives compact Cert (e.g., QR, local storage).

## QR Payload Format
Bet Certs may be exported as a compact JSON object encoded into a QR for portability:

```json
{
  "type": "bet-cert",
  "certId": "<uuid>",
  "player": "<player uid>",
  "round": "<round id>",
  "betHash": "<sha256>",
  "nbf": "<epoch ms>",
  "exp": "<epoch ms>",
  "bankRef": "<optional receiptId>",
  "sig": "<house signature>"
}
```

`bankRef` links back to the funding [BANK Receipt](./bank_receipt_contract.md) if one was used. The `exp` value sets the short TTL; after expiry the Player must renew for a read‑only view.

The `sig` field contains the House's signature over the payload. Signature bytes are base64url‑encoded using the shared helper functions in `src/utils/base64.ts` (`bytesToBase64Url` / `base64UrlToBytes`), which support both browser and Node environments.

## QR Generation & Scanning
- Bet Cert payloads can be exported or shared as QR images using [`betCertQR.ts`](../src/betCertQR.ts), which provides helpers for generating data URLs and parsing scanned strings.
- The [`BetCertScanner`](../src/components/BetCertScanner.tsx) component reads Bet Cert QRs. It prefers the native `BarcodeDetector` API (Chrome ≥83, Edge ≥83, Opera ≥70, Android WebView ≥88) and falls back to [`jsQR`](https://github.com/cozmo/jsQR) via a canvas capture when the API is unavailable (Safari, Firefox, older Chromium).

## Renewal
- **Purpose:** Allow Player to continue reopening a locked bet beyond initial short TTL.
- **Mechanism:** Player presents expired Cert (QR or stored payload) to House; House verifies ledger state and issues a fresh Cert with an updated `exp` while keeping the original `certId` and `bankRef`.
  - **Invariants:** Renewal allowed only for read-only view; no mutation possible. Renewal requests referencing spent [BANK Receipts](./bank_receipt_contract.md) are denied.

## Verification (Offline by Player or Others)
- **Inputs:** Bet Cert + [House Certificate](./house_certificate_contract.md).
- **Checks:**  
  - Cert signature verifies against House key.  
  - [House Certificate](./house_certificate_contract.md) valid and within window.
  - Cert validity window not expired (unless for read-only historical view).  
  - Round binding matches context.  
- **Outcome:**  
  - **Pass:** Player bet confirmed locked and immutable.  
  - **Fail:** Invalid or expired → UX shows “Cert invalid/expired” with option to renew (read-only).  

## Replay Protection
- **Cert ID:** Logged in the [Ledger & Sync](./ledger_sync_contract.md).
- **Consumption policy:** Certs may be re-presented for read-only views but cannot be duplicated for additional seats or altered bets.  
  - **Ledger audit:** Duplicate IDs flagged and logged in the [Ledger & Sync](./ledger_sync_contract.md).

## [Ledger & Sync](./ledger_sync_contract.md)
- **At lock:** Bet hash + Cert issuance recorded.  
- **At sync:** Cert IDs, issuance times, and bet hashes included in House’s append-only ledger.  
- **Normalization:** Global sync metrics still bounded by $1,440/player/round ceiling.  

## Error Semantics
- **Expired Cert:** Denied for fresh join; renewable for read-only view.  
- **Round mismatch:** Denied; Player informed “wrong round.”  
- **Invalid signature:** Cert rejected as tampered.  
- **Unrecognized ID:** Treated as invalid attempt; logged.  

## Security Invariants
- **Immutability:** Bet content cannot change after lock; Cert hash is canonical.  
- **Round binding:** Certs valid only for the round they were issued in.  
- **Offline verifiability:** Certs validate offline using the [House Certificate](./house_certificate_contract.md) chain.
- **Replay safe:** Unique IDs + ledger audit prevent duplication abuse.  
- **Privacy:** Optionally encrypt payload so only Player + House can view bet details; public verifiers only see integrity proof.  

## Acceptance Criteria
- **Valid issue:** Locked bets always yield a Bet Cert per Player.  
- **Valid verify:** Certs pass offline checks for Player identity, round, and hash.  
- **Invalid verify:** Expired/mismatched/forged Certs are denied gracefully.  
- **Ledger consistency:** All issued Certs appear in House ledger and global sync via the [Ledger & Sync](./ledger_sync_contract.md).
