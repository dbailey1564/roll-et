# AGENTS.md

## Purpose
Authoritative instructions for Codex Cloud when working on **dbailey1564/roll-et**. Defines roles, trust boundaries, and the exact workflow to install, test, edit, and open PRs.

## Working directory
- **Repo root:** `/workspace/roll-et`
- **Edit only:** `src/**`, `docs/**`, tests in `src/__tests__/**`
- **Never edit:** `dist/`, `node_modules/`

## Agents & Trust
**Root Authority** – issues House Certificates; never commit secrets.  
**House Agent** – hosts sessions; mints Bet Certs; secrets via env/secret store.  
**Player Agent** – places bets; no secrets.  
**Backend Agent** – validates tokens/certs; canonical ledger & state machine; secrets via env/secret store.  
**Storage Agent** – DB/KV for state & replay protection; backend-only.

**Security**
- ECDSA-P256 only.
- Join Tokens: short-lived, one-time. Bet Certs: encrypted, round-bound, expiring.
- Replay protection via ledger.

## Commands (single source of truth)
- **Install:** `npm ci`
- **Build:** `npm run build`
- **Test:** `npm test -- --run`
- **Lint:** `npm run lint`
- **Format:** `npm run format`
Codex must prefer these commands for verification & fixes.

## Branch & PR policy
- Work on a new branch: `feat/<slug>` / `fix/<slug>` / `chore/<slug>`.
- Conventional commits (e.g., `feat(pwa): add manifest`).
- Open a PR to `main` when tests pass. PR body must include:
  - Bullet summary of changes
  - Key file paths touched
  - Vitest summary snippet

## Task loop for Codex (every task)
1. **Prepare**
   - Confirm `/workspace/roll-et`
   - `git fetch --all --prune`
   - `git switch -c feat/<slug>` (or reuse if exists)
2. **Sync & verify**
   - `npm ci`
   - `npm run build`
   - `npm test -- --run`
3. **Implement**
   - Make minimal, coherent change set; update/add tests.
4. **Validate**
   - `npm run build`
   - `npm test -- --run`
   - `npm run lint || true`
5. **Commit & PR**
   - `git add .`
   - `git commit -m "<conventional message>"`
   - `git push -u origin HEAD`
   - Open PR to `main` with required summary.

## Guardrails
- Never commit secrets; use env/secret store.
- Don’t modify build outputs or lockfiles unless required.
- Prefer small, verifiable diffs with matching tests.
- On failures: show the command + last 20 lines of output; attempt a targeted fix.

## Examples
**Refactor helper**
- Move duplicated helpers into `src/utils/betHelpers.ts`.
- Update imports in `src/hooks/useBetting.ts`, `src/Player.tsx`.
- Add `src/__tests__/betHelpers.test.ts`.
- Run tests, commit, push, open PR.

**Cloudflare Worker (houseCert) scaffold**
- Create `workers/houseCert/src/index.ts`.
- Add `wrangler.toml` and `package.json` scripts.
- Document required env vars (no secrets in code).
- Build/test, commit, PR.

## Notes
- Internet allowlist: npm registry + GitHub domains only. Add others case-by-case with justification in PR.
