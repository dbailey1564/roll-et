export interface Env {
  // Secrets (set via `wrangler secret put`)
  // HOUSE_PRIV_KEY_PEM: string; // PKCS#8 PEM for ECDSA-P256

  // Optional non-secret config
  HOUSE_PUB_KEY_PEM?: string; // Public key PEM for JWKS endpoint

  // KV for replay protection / join tokens
  CERT_LEDGER: KVNamespace;
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

async function handleHouseCert(req: Request, env: Env) {
  // Placeholder endpoint. Implement ECDSA-P256 signing of a short-lived, round-bound Bet Cert.
  // Expected input example: { joinToken: string, roundId: string, payload?: object }
  // Validate joinToken (short-lived, one-time), check replay via ledger, then sign payload.
  try {
    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    const joinToken = typeof body["joinToken"] === "string" ? (body["joinToken"] as string) : undefined;
    const roundId = typeof body["roundId"] === "string" ? (body["roundId"] as string) : undefined;

    if (!joinToken || !roundId) {
      return json({ error: "joinToken and roundId required" }, { status: 400 });
    }

    // Basic best-effort replay guard using KV (non-atomic; for strict protection use DO/D1)
    const key = `jt:${roundId}:${joinToken}`;
    const seen = await env.CERT_LEDGER.get(key);
    if (seen) {
      return json({ error: "replay detected" }, { status: 409 });
    }
    await env.CERT_LEDGER.put(key, "1", { expirationTtl: 600 });

    // Signing not yet implemented
    return json({ error: "Not implemented yet", kvRecorded: true }, { status: 501 });
  } catch (e) {
    return json({ error: "invalid request", detail: String(e) }, { status: 400 });
  }
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
