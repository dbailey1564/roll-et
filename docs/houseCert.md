HouseCert Cloudflare Worker
===========================

Purpose
 - Issues round-bound, expiring Bet Certificates signed with ECDSA-P256.
 - Exposes health and JWKS endpoints for verification.

Paths
 - `workers/houseCert/src/index.ts`
 - `workers/houseCert/wrangler.toml`

Endpoints
 - `GET /health` — Basic readiness probe.
 - `GET /.well-known/jwks.json` — JWKS for verifying ES256 signatures (optional placeholder).
 - `POST /houseCert` — Mint a Bet Cert (currently 501 placeholder).

Local Dev
 - Use your logged-in Wrangler: `npm run cf:dev:house`

Deploy
 - `npm run cf:deploy:house`

Config
 - Non-secret vars: set in `wrangler.toml` `[vars]` (e.g., `HOUSE_PUB_KEY_PEM`).
 - Secrets: `wrangler secret put HOUSE_PRIV_KEY_PEM` (PKCS#8 PEM for P-256).
 - Account: Wrangler can infer from your login; set `account_id` in `wrangler.toml` if desired.

Notes
 - Do not commit secrets. Use `wrangler secret` for private keys.
 - Replace the JWKS placeholder with a computed key from your public key.

