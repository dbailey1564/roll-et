#!/usr/bin/env bash
set -euo pipefail

# Create a local directory for secret key material
mkdir -p .sec

cat <<'MSG'
Initialized .sec directory for secret keys.
This folder is gitignored; place your private key and JWK files here.
MSG
