#!/usr/bin/env bash
set -euo pipefail

# Create a local directory for secret key material
mkdir -p .sec

# Materialize the root public JWK from the environment
if [[ -z "${ROOT_PUBLIC_JWK:-}" ]]; then
  echo "ROOT_PUBLIC_JWK not set" >&2
  exit 1
fi

printf '%s' "$ROOT_PUBLIC_JWK" > .sec/root_public_jwk.json

cat <<'MSG'
Initialized .sec directory for secret keys.
This folder is gitignored; place your private key and JWK files here.
Created .sec/root_public_jwk.json from ROOT_PUBLIC_JWK.
MSG
