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
- **Issuer:** House identity (via [House Certificate](./house_certificate_contract.md)).
- **Receipt ID:** Globally unique identifier for replay protection.
- **Player Binding:** Player UID associated with receipt.
- **Round Binding:** Round ID from which settlement originated.
- **Settlement Value:** Currency amount (credits × valuation).
- **Disposition:** Marked as “banked.”
- **Timestamp:** Issuance time.
- **Validity:** Optional expiry/policy window; may require renewal to remain spendable.
- **Bet Certificate Reference:** `receiptId` serves as the `bankRef` recorded in [Bet Certificates](./bet_certificate_contract.md) and [Join Challenge/Response](./join_challenge_response_contract.md) responses.

## Issuance (Input/Output)
- **Inputs:** Player UID, Round ID, net settlement amount.
- **Process:** House constructs receipt payload; signs with House private key.
- **Outputs:** Player receives compact receipt (local storage, optional QR for portability).

## QR Payload Format
Receipts can be exported or transferred as a JSON payload encoded into a QR:

```json
{
  "type": "bank-receipt",
  "receiptId": "<uuid>",
  "player": "<player uid>",
  "round": "<round id>",
  "value": "<currency>",
  "nbf": "<epoch ms>",
  "exp": "<optional epoch ms>",
  "spent": false,
  "betCertRef": "<bet cert id>"
}
```

`betCertRef` links the receipt back to the [Bet Certificate](./bet_certificate_contract.md) that produced the settlement. The `exp` field (if present) governs when the receipt must be renewed.

## Usage Paths
- **Re-buy into round:** Player presents receipt; House verifies validity and converts value into the 4-credit round entry at the declared valuation (up to 8 credits cap). Any leftover remains stored.
- **Withdraw (tender):** Player presents receipt; House verifies and pays out; marks receipt “spent.”
Both usage paths mark the `receiptId` as spent and, when re-buying, propagate it as `bankRef` for the new round’s [Bet Certificate](./bet_certificate_contract.md).

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
- **At issuance:** Receipt issuance logged with value, Player UID, round ID, and receipt ID.  
- **At usage:** Ledger updated to mark receipt as spent (with usage type: re-buy or payout).  
- **At sync:** Both issuance and spent states uploaded.
- **Normalization:** Global analytics cap still enforced at $1,440/player/round ceiling.

## Expiry & Renewal
- **Expiry:** If an `exp` is present and has passed, the receipt cannot be spent until renewed.
- **Renewal:** Player presents the expired receipt to the House; after ledger verification, the House issues a new receipt with refreshed `exp` and references the prior `receiptId` in `betCertRef`.
- **Spent receipts:** Once marked spent, receipts are ineligible for renewal.

## Error Semantics
- **Expired/Invalid [House Certificate](./house_certificate_contract.md):** Receipt verifiable cryptographically but not spendable until House renews.
- **Unknown receipt ID:** Denied and logged.  
- **Already spent:** Denied; UX shows “receipt already used.”  
- **Round mismatch:** Receipt valid only for originating round’s settlement context.  

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
