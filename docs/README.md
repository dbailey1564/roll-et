# Roll-et Documentation

This directory collects design and contract specifications for Roll-et, an offline-first dice game where each round resolves with a single d20 roll. The [House Certificate](house_certificate_contract.md) underpins all other contracts by authorizing a host to admit players, lock bets and sync ledgers.

## Game Overview
- [Roll-et — Master Game Design Overview](rollet_master_game_design_overview.md): complete rules, player flow and credit economy.

## Contracts
- [Join Challenge/Response](join_challenge_response_contract.md): secure admission protocol binding a player to a round and, if used, referencing a BANK receipt.
- [Bet Certificate](bet_certificate_contract.md): short-lived proof of a player's locked bet; includes `bankRef` when the seat was funded via BANK.
- [BANK Receipt](bank_receipt_contract.md): offline-verifiable record of settlement value, spendable once and optionally used to re-buy credits.
- [Ledger & Sync](ledger_sync_contract.md): append-only log of house activity and its synchronization to the backend.

## Contract Relationships
1. **Join** – player is admitted via challenge/response, optionally spending a BANK receipt.
2. **Bet Certificate** – after bets lock, the house issues a certificate binding player, round and bet, carrying any `bankRef` from the join step.
3. **BANK receipt** – at settlement, net winnings are issued as a receipt that can fund a future join or be redeemed.
4. **Ledger & Sync** – records every admission, certificate and receipt, enforcing the game's $1,440/player/round ceiling during sync.

These documents describe how each step chains to the next: Join → Bet Certificate → BANK receipt, all anchored by the House Certificate and recorded in the ledger.
