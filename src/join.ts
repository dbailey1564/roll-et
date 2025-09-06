import { HouseCert, validateHouseCert } from './certs/houseCert';
import QRCode from 'qrcode';
import { bytesToBase64Url, base64UrlToBytes } from './utils/base64';

const subtle = globalThis.crypto.subtle;
const encoder = new TextEncoder();

export interface JoinChallenge {
  type: 'join-challenge';
  houseCert: HouseCert;
  round: string;
  nonce: string;
  nbf: number;
  exp: number;
}

export async function createJoinChallenge(
  houseCert: HouseCert,
  round: string,
  ttlMs: number = 15000,
): Promise<JoinChallenge> {
  const nonceArr = new Uint8Array(16);
  globalThis.crypto.getRandomValues(nonceArr);
  const nonce = bytesToBase64Url(nonceArr);
  const now = Date.now();
  return {
    type: 'join-challenge',
    houseCert,
    round,
    nonce,
    nbf: now,
    exp: now + ttlMs,
  };
}

export async function joinChallengeToQR(
  challenge: JoinChallenge,
): Promise<string> {
  return QRCode.toDataURL(JSON.stringify(challenge));
}

export function parseJoinChallenge(str: string): JoinChallenge {
  return JSON.parse(str) as JoinChallenge;
}

export async function validateJoinChallenge(
  challenge: JoinChallenge,
  rootKey: CryptoKey,
  now: number = Date.now(),
): Promise<boolean> {
  if (now < challenge.nbf || now > challenge.exp) return false;
  return validateHouseCert(challenge.houseCert, rootKey, now);
}

export interface JoinResponsePayload {
  playerUid: string;
  playerPubKey: JsonWebKey;
  round: string;
  seat: number;
  nonce: string;
  bankRef?: string;
}

export interface JoinResponse extends JoinResponsePayload {
  alias?: string;
  sig: string;
}

async function derivePlayerUid(
  pubKey: CryptoKey,
  houseId: string,
): Promise<string> {
  const raw = new Uint8Array(await subtle.exportKey('raw', pubKey));
  const house = encoder.encode(houseId);
  const data = new Uint8Array(raw.length + house.length);
  data.set(raw, 0);
  data.set(house, raw.length);
  const hash = await subtle.digest('SHA-256', data);
  return bytesToBase64Url(new Uint8Array(hash));
}

export async function createJoinResponse(
  alias: string,
  challenge: JoinChallenge,
  keys: CryptoKeyPair,
  seat: number = 0,
  bankRef?: string,
): Promise<JoinResponse> {
  const playerPubKey = (await subtle.exportKey(
    'jwk',
    keys.publicKey,
  )) as JsonWebKey;
  const playerUid = await derivePlayerUid(
    keys.publicKey,
    challenge.houseCert.payload.houseId,
  );
  const payload: JoinResponsePayload = {
    playerUid,
    playerPubKey,
    round: challenge.round,
    seat,
    nonce: challenge.nonce,
    bankRef,
  };
  const sigBuf = await subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    keys.privateKey,
    encoder.encode(JSON.stringify(payload)),
  );
  const sig = bytesToBase64Url(new Uint8Array(sigBuf));
  return { ...payload, alias, sig };
}

export async function verifyJoinResponse(
  response: JoinResponse,
  challenge: JoinChallenge,
): Promise<boolean> {
  if (response.round !== challenge.round) return false;
  if (response.nonce !== challenge.nonce) return false;
  const playerKey = await subtle.importKey(
    'jwk',
    response.playerPubKey,
    { name: 'ECDSA', namedCurve: 'P-256' },
    true,
    ['verify'],
  );
  const expectedUid = await derivePlayerUid(
    playerKey,
    challenge.houseCert.payload.houseId,
  );
  if (expectedUid !== response.playerUid) return false;
  const payload: JoinResponsePayload = {
    playerUid: response.playerUid,
    playerPubKey: response.playerPubKey,
    round: response.round,
    seat: response.seat,
    nonce: response.nonce,
    bankRef: response.bankRef,
  };
  const sigBytes = base64UrlToBytes(response.sig) as Uint8Array<ArrayBuffer>;
  const payloadData = encoder.encode(JSON.stringify(payload));
  return subtle.verify(
    { name: 'ECDSA', hash: 'SHA-256' },
    playerKey,
    sigBytes,
    payloadData,
  );
}
