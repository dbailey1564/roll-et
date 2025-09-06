# Roll-et — BANK Receipt Contract

## Purpose
Provide Players with secure, offline-verifiable receipts representing end-of-round settlements (winnings or losses). Enables value to be stored for future rounds (“re-buy”) or withdrawn later, while ensuring receipts cannot be forged or replayed. When a receipt funds a new seat via the [Join Challenge/Response](./join_challenge_response_contract.md), its ID is carried forward as a `bankRef` inside the resulting [Bet Certificate](./bet_certificate_contract.md).

## Trust Chain & Roles
- **Root Authority:** Anchor baked into PWA; signs House Certificates.
- [House Certificate](./house_certificate_contract.md): Signed by Root; validates House’s hosting authority and public key.
- **House Device:** Issues BANK Receipts by signing settlement records at round end.
- **Player Device:** Stores BANK Receipts; uses them to re-buy or redeem later.

## Lifecycle & States
1. **Settlement:** At round end, Player credits liquidate into a currency amount.  
2. **Disposition choice:** Player selects *tender now* (House pays) or *store in BANK*.  
3. **Receipt issuance:** House creates signed BANK Receipt representing stored settlement value.
4. **Storage:** Player PWA stores receipt offline.  
5. **Usage:** Player can present receipt to re-buy credits or withdraw tender later.  
6. **Spent state:** House marks receipt as “spent” once used; cannot be replayed.  

## Required Claims / Assertions (Conceptual)
- **House ID:** Derived from the active [House Certificate](./house_certificate_contract.md).
- **Player Binding:** `playerUidThumbprint` (hash of Player UID) tying receipt to Player pseudonym.
- **Receipt ID:** Globally unique identifier for replay protection.
- **Kind:** `REDEEM` or `REBUY` indicating disposition.
- **Amount:** Currency amount represented by the receipt.
- **Issued At:** Timestamp of issuance.
- **Expiry:** Optional `exp` after which renewal is required before spend.
- **Bet Certificate Reference:** `receiptId` propagates as `bankRef` in [Bet Certificates](./bet_certificate_contract.md) and [Join Challenge/Response](./join_challenge_response_contract.md) responses.

## Issuance (Input/Output)
- **Inputs:** Player UID, Round ID, net settlement amount.
- **Process:** House constructs receipt payload; signs with House private key.
- **Outputs:** Player receives compact receipt (local storage, optional QR for portability).

## QR Payload Format
Receipts can be exported or transferred as a JSON payload encoded into a QR:

```json
{
  "type": "bank-receipt",
  "houseId": "<house id>",
  "playerUidThumbprint": "<thumbprint>",
  "receiptId": "<uuid>",
  "kind": "REDEEM",
  "amount": "<currency>",
  "issuedAt": "<epoch ms>",
  "exp": "<optional epoch ms>",
  "sig": "<house signature>"
}
```

`kind` denotes whether the receipt is intended for `REDEEM` (payout) or `REBUY` (future seat funding). The `sig` field is the House's signature over the payload. Signature bytes are base64url‑encoded using the shared helpers in `src/utils/base64.ts` (`bytesToBase64Url` / `base64UrlToBytes`), which operate in both browser and Node environments.

## QR Generation & Scanning
- BANK Receipts may be exported or transported as QR codes using [`bankReceiptQR.ts`](../src/bankReceiptQR.ts), which includes helpers for creating data URL images and parsing scanned payloads.
- The [`BankReceiptScanner`](../src/components/BankReceiptScanner.tsx) component reads receipt QRs. It attempts the native `BarcodeDetector` API first (Chrome ≥83, Edge ≥83, Opera ≥70, Android WebView ≥88) and falls back to [`jsQR`](https://github.com/cozmo/jsQR) via canvas capture for Safari, Firefox and older Chromium releases.

## Usage Paths
- **Re-buy into round:** Player presents receipt; House verifies validity and converts value into the 4-credit round entry at the declared valuation (up to 8 credits cap). Any leftover remains stored.
- **Withdraw (tender):** Player presents receipt; House verifies and pays out; marks receipt “spent.”
Both usage paths mark the `receiptId` as spent and, when re-buying, propagate it as `bankRef` for the new round’s [Bet Certificate](./bet_certificate_contract.md).

## Spend Challenge/Response
1. **Initiation:** Player presents the receipt to the House.
2. **Challenge:** House verifies receipt validity and issues a nonce‑based spend challenge bound to `{ receiptId, kind }`.
3. **Response:** Player signs the challenge with the key that produced `playerUidThumbprint` and returns `{ receiptId, nonce, sig_player }`.
4. **Verification:** House checks the signature, applies funds (`REDEEM` or `REBUY`), and logs a `ReceiptSpent` entry.
5. **Ledger Update:** `ReceiptSpent` entries record `{ receiptId, playerUidThumbprint, amount, kind }` for sync.

## Verification (Offline by House or Player)
- **Inputs:** Receipt + [House Certificate](./house_certificate_contract.md).
- **Checks:**  
  - Signature matches House key.  
  - [House Certificate](./house_certificate_contract.md) valid and within window.
  - Receipt ID not already spent.  
  - Value and Player UID consistent with ledger.  
- **Outcome:**  
  - **Pass:** Receipt honored (re-buy or payout).  
  - **Fail:** Invalid/expired/spent receipt denied with clear UX.  

## Replay Protection
- **Receipt IDs:** Logged in the [Ledger & Sync](./ledger_sync_contract.md).
- **Spent state:** House enforces single use (receipt marked spent once redeemed).
- **Ledger audit:** Any attempt to replay spent receipts logged at sync.

## [Ledger & Sync](./ledger_sync_contract.md)
- **At issuance:** `receipt_issued` logs `{ playerUidThumbprint, amount, receiptId }`.
- **At usage:** `receipt_spent` logs `{ receiptId, playerUidThumbprint, amount, kind }`.
- **At sync:** Both issuance and spent states uploaded.
- **Normalization:** Global analytics cap still enforced at $1,440/player/round ceiling.

## Expiry & Renewal
- **Expiry:** If an `exp` is present and has passed, the receipt cannot be spent until renewed.
- **Renewal:** Only unspent receipts may be renewed. House verifies ledger, then issues a new receipt with a fresh `receiptId` and `exp`. The new issuance references the prior ID via `replaces: <old receiptId>`.
- **Certificate gating:** Renewals are blocked while the House Certificate is in `LAPSED_SOFT` state.
- **Spent receipts:** Once marked spent, receipts are ineligible for renewal.

## Error Semantics
- **Expired/Invalid [House Certificate](./house_certificate_contract.md):** Receipt verifiable cryptographically but not spendable until House renews.
- **Unknown receipt ID:** Denied and logged.
- **Already spent:** Denied; UX shows “receipt already used.”

## Security Invariants
- **Offline verifiability:** Receipts validate without internet.  
- **Non-forgeability:** Only House private key can mint valid receipts.  
- **Replay resistance:** Unique IDs + spent/not-spent tracking prevent double spend.  
- **Player privacy:** Receipts bind only to pseudonymous Player UID; no PII.  
- **Continuity:** Receipts remain verifiable even if the [House Certificate](./house_certificate_contract.md) expires; redeeming requires an active Cert.

## Acceptance Criteria
- **Valid issue:** Every non-tendered settlement yields a BANK Receipt.
- **Valid verify:** Receipts pass offline checks and can be used once.  
- **Invalid verify:** Spent/forged/expired receipts are rejected gracefully.  
- **Ledger consistency:** Issuance and redemption events are durable and sync to backend via the [Ledger & Sync](./ledger_sync_contract.md).
