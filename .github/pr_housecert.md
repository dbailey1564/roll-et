- Summary of changes:
  - Scaffold minimal Cloudflare Worker for House Cert issuance (`workers/houseCert`).
  - Add `wrangler.toml` and npm scripts for dev/deploy.
  - Document setup, secrets, and endpoints in `docs/houseCert.md`.

- Key files touched:
  - `workers/houseCert/src/index.ts`
  - `workers/houseCert/wrangler.toml`
  - `package.json`
  - `docs/houseCert.md`

- Vitest summary:
  - Command: `npm test -- --run`
  - Result: Could not execute in agent sandbox due to worker process restrictions.
  - Error tail: `ERR_IPC_CHANNEL_CLOSED` from `tinypool` during test startup.
  - Build status: `npm run build` succeeded in the agent environment.
  - Action: Please run tests locally (they are unchanged by this PR).

