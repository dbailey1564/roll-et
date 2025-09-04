# Roll‑et PWA (React + Vite)

[![CI](https://github.com/dbailey1564/roll-et/actions/workflows/ci.yml/badge.svg)](https://github.com/dbailey1564/roll-et/actions/workflows/ci.yml)

Summary:
- React + Vite + TypeScript.
- PWA via `vite-plugin-pwa` (autoUpdate).
- GitHub Pages base path `/roll-et/`.
- Install button using `beforeinstallprompt`.

## Local dev
```bash
npm i
npm run dev
```

## Build
```bash
npm run build
npm run preview
```

## Configuration
Roll‑et runs offline by default. To enable ledger sync:

- Set `VITE_AUTH_URL` to the authority backend URL (e.g. in a `.env` file).
- Replace the placeholder root key and ledger entries in [`src/certs/authorizedHouseCertLedger.ts`](src/certs/authorizedHouseCertLedger.ts).

See [docs/README.md](docs/README.md#offline-first--sync-configuration) for full setup details.

## Deploy to GitHub Pages
1. Create repo `roll-et` under `dbailey1564`.
2. Push code.
3. In the repo settings → Pages, enable GitHub Pages by setting **Build and deployment** to **GitHub Actions**. The deploy step will fail with a 404 if Pages isn't enabled.
4. The included workflow builds `dist/` and publishes it using [`actions/deploy-pages`](https://github.com/actions/deploy-pages).
5. Site URL: https://dbailey1564.github.io/roll-et/

## Documentation
- [Master Game Design Overview](docs/rollet_master_game_design_overview.md) — consolidated rules, round flow, and contract references for Roll‑et.
- [House Certificate Contract](docs/house_certificate_contract.md) — licensing model that authorizes houses to host rounds and sign artifacts.
- [Join Challenge/Response Contract](docs/join_challenge_response_contract.md) — secure offline admission protocol binding players to a specific round.
- [Bet Certificate Contract](docs/bet_certificate_contract.md) — portable proof of a player's locked bet, tied to round and bank reference.
- [BANK Receipt Contract](docs/bank_receipt_contract.md) — signed record of settled winnings that can be redeemed or stored.
- [Ledger & Sync Contract](docs/ledger_sync_contract.md) — append-only ledger format and synchronization rules with the authority backend.

## Notes
- Start URL and scope are `/roll-et/`.
- Service worker and manifest are generated at build time by the PWA plugin.

## Agents
See [AGENTS.md](./AGENTS.md) for full architecture and workflow.
