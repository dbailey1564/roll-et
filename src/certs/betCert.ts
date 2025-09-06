import { bytesToBase64Url, base64UrlToBytes } from '../utils/base64';

const subtle = globalThis.crypto.subtle;
const encoder = new TextEncoder();

export interface BetCertPayload {
  houseId: string;
  roundId: string;
  seat: number;
  playerUidThumbprint: string;
  certId: string;
  issuedAt: number;
  exp: number;
  betHash: string;
  bankRef?: string;
  renewalOf?: string;
}

export interface BetCert extends BetCertPayload {
  sig: string; // base64url
}

async function signPayload(
  payload: BetCertPayload,
  key: CryptoKey,
): Promise<string> {
  const data = encoder.encode(JSON.stringify(payload));
  const sig = await subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, key, data);
  return bytesToBase64Url(new Uint8Array(sig));
}

async function verifyPayload(
  payload: BetCertPayload,
  sig: string,
  key: CryptoKey,
): Promise<boolean> {
  const data = encoder.encode(JSON.stringify(payload));
  const signature = base64UrlToBytes(sig) as Uint8Array<ArrayBuffer>;

  return subtle.verify(
    { name: 'ECDSA', hash: 'SHA-256' },
    key,
    signature,
    data,
  );
}

export async function generateBetCert(
  params: BetCertPayload,
  key: CryptoKey,
): Promise<BetCert> {
  const payload: BetCertPayload = {
    houseId: params.houseId,
    roundId: params.roundId,
    seat: params.seat,
    playerUidThumbprint: params.playerUidThumbprint,
    certId: params.certId,
    issuedAt: params.issuedAt,
    exp: params.exp,
    betHash: params.betHash,
    bankRef: params.bankRef,
    renewalOf: params.renewalOf,
  };
  const sig = await signPayload(payload, key);
  return { ...payload, sig };
}

export async function verifyBetCert(
  cert: BetCert,
  key: CryptoKey,
  now: number = Date.now(),
): Promise<boolean> {
  if (now < cert.issuedAt || now > cert.exp) return false;
  const payload: BetCertPayload = {
    houseId: cert.houseId,
    roundId: cert.roundId,
    seat: cert.seat,
    playerUidThumbprint: cert.playerUidThumbprint,
    certId: cert.certId,
    issuedAt: cert.issuedAt,
    exp: cert.exp,
    betHash: cert.betHash,
    bankRef: cert.bankRef,
    renewalOf: cert.renewalOf,
  };
  return verifyPayload(payload, cert.sig, key);
}
