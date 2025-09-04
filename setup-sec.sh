#!/usr/bin/env bash
set -euo pipefail

# Create a local directory for secret key material
mkdir -p .sec

if [[ -z "${ROOT_PUBLIC_JWK:-}" ]]; then
  echo "ROOT_PUBLIC_JWK not set" >&2
  exit 1
fi

printf '%s' "$ROOT_PUBLIC_JWK" > .sec/root_public_jwk.json

if [[ -n "${ROOT_PRIVATE_KEY:-}" ]]; then
  printf '%s' "$ROOT_PRIVATE_KEY" > .sec/root_private_key.pem
fi

cat <<'MSG'
Initialized .sec directory for secret keys.
This folder is gitignored; place your private key and JWK files here.
MSG
