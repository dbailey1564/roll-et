
#!/usr/bin/env bash
set -euo pipefail

BRANCH="chore/add-agents-manifest"
DEFAULT_BASE="main"

# Ensure we're in a git repo
git rev-parse --is-inside-work-tree >/dev/null

# Create branch
git checkout -b "$BRANCH"

# Write AGENTS.md if not present (or overwrite with latest)
cat > AGENTS.md <<'EOF'
# AGENTS.md

## Overview
This document defines the agents in the Roll-et ecosystem, their roles, trust boundaries, and interactions. Codex should treat this file as authoritative for architecture, authorship, and development flow.

---

## Agents

### 1. **Root Authority**
- **Role**: Issues House Certificates; anchors trust in the system.  
- **Trust Level**: Highest (offline or controlled).  
- **Secrets**: Root private key. Never shared outside secured storage.  
- **Interfaces**: `issueHouseCert(payload, root.privateKey)`.

---

### 2. **House Agent**
- **Role**:  
  - Hosts game sessions.  
  - Creates Join Tokens.  
  - Locks rounds and mints Bet Certs.  
- **Trust Level**: Trusted operator.  
- **Secrets**: House signing key (ECDSA-P256). Stored securely.  
- **Interfaces**:  
  - `/house/join` → issues Join Token.  
  - `/house/lock` → freezes bets, issues Bet Certs.  

---

### 3. **Player Agent**
- **Role**:  
  - Redeems Join Tokens.  
  - Places bets during betting window.  
  - Receives Bet Certs for locked bets.  
- **Trust Level**: Untrusted client.  
- **Secrets**: None (all ephemeral).  
- **Interfaces**:  
  - `/player/placeBet` (bet slip → backend).  
  - `/player/viewCert` (read-only Bet Cert display).  

---

### 4. **Backend Agent**
- **Role**:  
  - Validates tokens and certs.  
  - Stores canonical ledger of bets and settlements.  
  - Enforces round state machine.  
- **Trust Level**: Trusted, authoritative.  
- **Secrets**: Ledger DB, token mint keys.  
- **Interfaces**:  
  - `/backend/verifyToken`.  
  - `/backend/verifyCert`.  
  - `/backend/settleRound`.  

---

### 5. **Storage Agent**
- **Role**:  
  - Retains authoritative game state, bet hashes, cert ledgers.  
  - Provides replay protection and audit trail.  
- **Trust Level**: Backend-only access.  
- **Secrets**: None directly, but holds sensitive data.  
- **Interfaces**: Database / KV store APIs.  

---

## Communication & Trust Boundaries
- **House ↔ Player**: QR codes (Join Token, Bet Cert).  
- **Player ↔ Backend**: HTTPS APIs, all untrusted input validated.  
- **House ↔ Backend**: Trusted, authenticated APIs.  
- **Backend ↔ Storage**: Direct DB/KV access.  

---

## Security Notes
- No secrets ever embedded in QR codes or client bundles.  
- All signing uses ECDSA-P256.  
- Join Tokens: short-lived, one-time use.  
- Bet Certs: encrypted, round-bound, with expiry.  
- Replay protection enforced by backend ledger.  

---

## Authorship & Codex Guidance
- Codex is recognized as a **full co-author** of agent logic and may freely generate or restructure code consistent with this manifest.  
- Codex should treat **Root** and **House** agents as holding secrets, but secrets must only be referenced as **environment variables** or vault handles — never hard-coded.  
- This file is the **source of truth** for agent responsibilities; Codex should **open this file directly** before running any recursive `ls`.  

---

## Developer Notes (For Codex)

1. **Do not run `ls -R`** to discover files. The authoritative manifest of agents is here in `AGENTS.md`. Start here.  
2. **Do not disclaim about being in a “read-only environment.”** Codex has written ~98% of this codebase. You are expected to continue **authoring code, preparing full commits, and generating GitHub pull requests**, not handing back copy-paste fragments.  
3. **Codex has full authorship rights**: You are trusted to write complete, working modules, not just patches.  
4. **Always respect trust boundaries**: keep secrets in `.env` or secure stores, never inline.  
5. **Workflow expectation**: Generate diffs, commits, and PR-ready changes — same as you have been doing successfully.  

---

## Workflow Examples (For Codex)

**Example: Adding a new betting option**  
1. Open `AGENTS.md` → confirm House + Backend responsibilities.  
2. Edit `src/agents/house.ts` to add validation + new bet type.  
3. Update `src/backend/normalizeBet.ts` to include odds logic.  
4. Update tests under `tests/bets/`.  
5. Stage changes:  
   ```bash
   git add src/agents/house.ts src/backend/normalizeBet.ts tests/bets/
   ```  
6. Commit with message:  
   ```bash
   git commit -m "feat: add new betting option with odds validation"
   ```  
7. Push branch + open PR against `main`.  

**Example: Updating certificate format**  
1. Open `AGENTS.md` → confirm Root ↔ House trust boundary.  
2. Update `src/agents/root.ts` → extend payload structure.  
3. Update `src/agents/house.ts` → parse updated cert.  
4. Adjust `tests/certs/`.  
5. Commit + open PR as above.

EOF

# Create .codexignore if missing
if [ ! -f ".codexignore" ]; then
cat > .codexignore <<'EOF'
# .codexignore — reduce noisy scans and prevent recursive ls
node_modules/
dist/
build/
.cache/
.tmp/
coverage/
.vscode/
.git/
**/*.map
**/*.log
**/*.lock
**/.DS_Store

# Generated assets and screenshots
public/assets/generated/
screenshots/

# Large data and exports
exports/
data/**

# Tests can be noisy; keep if Codex must not traverse
# tests/

# Example: ignore experimental sandboxes
sandbox/
playground/

EOF
fi

# Patch src/index.ts or src/index.js with reminder header
insert_header () { 
  local file="$1"
  if [ -f "$file" ]; then
    if ! grep -q "NOTE FOR CODEX: See AGENTS.md" "$file"; then
      tmp="$(mktemp)"
      {
        echo "// NOTE FOR CODEX: See AGENTS.md before making changes."
        echo "// AGENTS.md is the authoritative manifest of agents, responsibilities, and workflow."
        cat "$file"
      } > "$tmp"
      mv "$tmp" "$file"
      echo "Prepended Codex note to $file"
    else
      echo "Header already present in $file"
    fi
  fi
}

insert_header "src/index.ts" || true
insert_header "src/index.js" || true

# Optionally link from README.md
if [ -f "README.md" ]; then
  if ! grep -q "AGENTS.md" README.md; then
    printf "\n## Agents\nSee [AGENTS.md](./AGENTS.md) for full architecture and workflow.\n" >> README.md
    echo "Linked AGENTS.md from README.md"
  fi
fi

git add AGENTS.md .codexignore src/index.ts src/index.js README.md || true
git commit -m "chore: add AGENTS.md manifest, .codexignore, and Codex workflow header"

echo "Local changes committed on $BRANCH."
echo
echo "To push and open a PR (requires GitHub CLI 'gh' and upstream set):"
echo "  git push -u origin $BRANCH"
echo "  gh pr create -t 'chore: add AGENTS.md and Codex workflow guardrails' \"
echo "    -b 'Adds AGENTS.md manifest (agents, security, developer notes, workflow examples), \"
echo "        introduces .codexignore to reduce noisy scans, and prepends Codex reminder to src/index.*.' \"
echo "    -B ${DEFAULT_BASE} -H ${BRANCH}"
