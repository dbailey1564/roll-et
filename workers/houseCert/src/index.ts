export interface Env {
  // Secrets (set via `wrangler secret put`)
  // HOUSE_PRIV_KEY_PEM: string; // PKCS#8 PEM for ECDSA-P256

  // Optional non-secret config
  HOUSE_PUB_KEY_PEM?: string; // Public key PEM for JWKS endpoint
}

type Json = Record<string, unknown> | unknown[] | string | number | boolean | null;

function json(data: Json, init?: ResponseInit) {
  const body = typeof data === "string" ? data : JSON.stringify(data);
  return new Response(body, {
    headers: { "content-type": "application/json; charset=utf-8" },
    ...init,
  });
}

async function handleJwks(env: Env) {
  const pem = env.HOUSE_PUB_KEY_PEM;
  if (!pem) return json({ error: "JWKS not configured" }, { status: 404 });

  // Minimal JWKS from PEM; in production, precompute and store as VAR
  // Here we return a placeholder to avoid blocking initial wiring.
  return json({ keys: [{ kty: "EC", crv: "P-256", use: "sig", alg: "ES256", kid: "house-p256", x: "", y: "" }] });
}

async function handleHealth() {
  return json({ ok: true });
}

async function handleHouseCert(_req: Request, _env: Env) {
  // Placeholder endpoint. Implement ECDSA-P256 signing of a short-lived, round-bound Bet Cert.
  // Expected input example: { joinToken: string, roundId: string, payload?: object }
  // Validate joinToken (short-lived, one-time), check replay via ledger, then sign payload.
  return json({ error: "Not implemented yet" }, { status: 501 });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    if (request.method === "GET" && path === "/health") return handleHealth();
    if (request.method === "GET" && path === "/.well-known/jwks.json") return handleJwks(env);
    if (request.method === "POST" && path === "/houseCert") return handleHouseCert(request, env);

    return json({ error: "Not found" }, { status: 404 });
  },
};

