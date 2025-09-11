# Roll-et Documentation

This directory collects design and contract specifications for Roll-et, an offline-first dice game where each round resolves with a single d20 roll. The [House Certificate (License)](house_certificate_contract.md#lifecycle--states) underpins all other contracts by authorizing a host to admit players, lock bets and sync ledgers, progressing through Issue → Active → Grace → Expired/Revoked states.

## Game Overview

- [Roll-et — Master Game Design Overview](rollet_master_game_design_overview.md): complete rules, player flow and credit economy.

## Contracts

- [House Certificate (License)](house_certificate_contract.md#lifecycle--states): root-signed license with Issue → Active → Grace → Expired/Revoked lifecycle gating hosting and sync.
- [Join Challenge/Response](join_challenge_response_contract.md#player-processing): secure admission protocol deriving a per-House Player UID and, if used, referencing a [BANK Receipt](bank_receipt_contract.md#usage-paths).
- [Bet Certificate](bet_certificate_contract.md#lifecycle--states): short-lived proof of a player's locked bet; canonicalizes bet slips into hashes and includes `bankRef` when the seat was funded via BANK.
- [BANK Receipt](bank_receipt_contract.md#usage-paths): offline-verifiable settlement record, spendable once via re-buy or tender and marked spent on use.
- [Ledger & Sync](ledger_sync_contract.md): append-only log of house activity and its synchronization to the backend.

## Contract Relationships

1. [Join Challenge/Response](join_challenge_response_contract.md#player-processing) – derives a per-House Player UID and optionally spends a [BANK Receipt](bank_receipt_contract.md#usage-paths).
2. [Bet Certificate](bet_certificate_contract.md#lifecycle--states) – after bets lock, the house canonicalizes the bet slip into a hash and issues a certificate binding player, round and bet, carrying any `bankRef` from the join step.
3. [BANK Receipt](bank_receipt_contract.md#lifecycle--states) – at settlement, net winnings become a receipt that can be spent once via re-buy or tender; the house marks it spent.
4. [Ledger & Sync](ledger_sync_contract.md) – records admissions, bet hashes and spent receipts, enforcing the game's $1,440/player/round ceiling during sync.

These documents describe how each step chains to the next: [Join Challenge/Response](join_challenge_response_contract.md#player-processing) → [Bet Certificate](bet_certificate_contract.md#lifecycle--states) → [BANK Receipt](bank_receipt_contract.md#usage-paths), all anchored by the [House Certificate (License)](house_certificate_contract.md#lifecycle--states) and recorded in the [Ledger & Sync](ledger_sync_contract.md).

## QR Helpers & Scanning

Roll‑et uses QRs to move join challenges, Bet Certs and BANK Receipts between devices. Helper modules and components provide a consistent experience:

- [`betCertQR.ts`](../src/betCertQR.ts) & [`bankReceiptQR.ts`](../src/bankReceiptQR.ts) generate data URL images and parse payloads for Bet Certs and BANK Receipts.
- Scanner components such as [`BetCertScanner`](../src/components/BetCertScanner.tsx) and [`BankReceiptScanner`](../src/components/BankReceiptScanner.tsx) attempt the browser `BarcodeDetector` API (Chrome ≥83, Edge ≥83, Opera ≥70, Android WebView ≥88) with a [`jsQR`](https://github.com/cozmo/jsQR) fallback for browsers lacking support.

## Offline-first & Sync Configuration

The PWA caches assets and app data so rounds can run without connectivity. Ledger entries queue locally until they are synchronized with the authority backend.

1. **Authority URL:** set `VITE_AUTH_URL` to the backend base URL (e.g. via a `.env` file). If unset, `syncWithAuthority` simply marks ledger entries as synced locally for development.
2. **Root public key & ledger:** replace the placeholder `houseCertRootPublicKeyJwk` and populate `authorizedHouseCertLedger` in [`src/certs/authorizedHouseCertLedger.ts`](../src/certs/authorizedHouseCertLedger.ts) with certificates issued by the root authority.
3. **Local key material (dev only):** if you script local setup, prefer using environment variables and a gitignored folder such as `.sec/` to hold keys:
   - `ROOT_PUBLIC_JWK`: JSON Web Key (JWK) for the Root Authority public key.
   - `ROOT_PRIVATE_KEY`: PKCS#8 PEM for the Root Authority private key (only where you mint House Certificates). Never commit these.

Placeholder keys and an empty ledger should never ship to production; provide real values before deploying. Never commit private keys; keep any local key material under a gitignored path like `.sec/`.
