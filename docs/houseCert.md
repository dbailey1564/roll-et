# HouseCert Cloudflare Worker

Purpose

- Issues round-bound, expiring Bet Certificates signed with ECDSA-P256.
- Exposes health and JWKS endpoints for verification.

Paths

- `workers/houseCert/src/index.ts`
- `workers/houseCert/wrangler.toml`

Endpoints

- `GET /health` — Basic readiness probe.
- `GET /.well-known/jwks.json` — JWKS derived from the signing key.
- `POST /houseCert` — Mint a short‑lived, round‑bound Bet Cert (JWT).

Local Dev

- Use your logged-in Wrangler: `npm run cf:dev:house`

Deploy

- `npm run cf:deploy:house`

Config

- Secrets: `wrangler secret put HOUSE_PRIV_KEY_PEM` (PKCS#8 PEM for P‑256).
- Account: Wrangler can infer from your login; set `account_id` in `wrangler.toml` if desired.

Notes

- Do not commit secrets. Use `wrangler secret` for private keys.
- JWKS is computed from the secret signing key; no public key vars required.
