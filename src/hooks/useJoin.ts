import React from 'react';
import { joinResponseToQR } from '../joinQR';
import { pairingToQR } from '../pairingQR';
import { houseCertRootPublicKeyJwk } from '../certs/authorizedHouseCertLedger';
import { validateHouseCert } from '../certs/houseCert';
import { generateJoinTotp } from '../utils/totp';
import type { JoinResponse, JoinChallenge } from '../join';

export function useJoin() {
  const [playerId, setPlayerId] = React.useState<string>(() => {
    try {
      return localStorage.getItem('roll_et_player_id') || 'Player';
    } catch {
      return 'Player';
    }
  });
  React.useEffect(() => {
    try {
      localStorage.setItem('roll_et_player_id', playerId);
    } catch {}
  }, [playerId]);

  const [joining, setJoining] = React.useState(false);
  const [joinQR, setJoinQR] = React.useState<string | null>(null);
  const [joinTotp, setJoinTotp] = React.useState<string | null>(null);
  const [pairQR, setPairQR] = React.useState<string | null>(null);
  const [housePublicKey, setHousePublicKey] = React.useState<CryptoKey | null>(
    null,
  );
  const [playerKeys, setPlayerKeys] = React.useState<CryptoKeyPair | null>(
    null,
  );
  const [playerSecret, setPlayerSecret] = React.useState<CryptoKey | null>(
    null,
  );
  const [rootKey, setRootKey] = React.useState<CryptoKey | null>(null);

  React.useEffect(() => {
    (async () => {
      const pkeys = await crypto.subtle.generateKey(
        { name: 'ECDSA', namedCurve: 'P-256' },
        true,
        ['sign', 'verify'],
      );
      const secret = await crypto.subtle.generateKey(
        { name: 'HMAC', hash: 'SHA-256' },
        true,
        ['sign'],
      );
      setPlayerKeys(pkeys as CryptoKeyPair);
      setPlayerSecret(secret);
      const rk = await crypto.subtle.importKey(
        'jwk',
        houseCertRootPublicKeyJwk,
        { name: 'ECDSA', namedCurve: 'P-256' },
        true,
        ['verify'],
      );
      setRootKey(rk);
    })();
  }, []);

  const joinScannerProps = React.useMemo(() => {
    if (!playerKeys || !rootKey) return null;
    return {
      alias: playerId || 'Player',
      playerKeys,
      rootKey,
      onResponse: async (resp: JoinResponse) => {
        const img = await joinResponseToQR(resp);
        setJoinQR(img);
        setJoining(false);
      },
      onResponseEx: async (resp: JoinResponse, challenge: JoinChallenge) => {
        if (!playerSecret || !rootKey) return;
        const valid = await validateHouseCert(challenge.houseCert, rootKey);
        if (!valid) return;
        const key = await crypto.subtle.importKey(
          'jwk',
          challenge.houseCert.payload.housePubKey,
          { name: 'ECDSA', namedCurve: 'P-256' },
          true,
          ['verify'],
        );
        setHousePublicKey(key);
        const raw = await crypto.subtle.exportKey('raw', playerSecret);
        const code = await generateJoinTotp(
          new Uint8Array(raw),
          resp.round,
          resp.nonce,
          challenge.nbf,
          60_000,
        );
        setJoinTotp(code);
      },
    };
  }, [playerId, playerKeys, playerSecret, rootKey]);

  const showPairingCode = React.useCallback(async () => {
    if (!playerSecret) return;
    const raw = await crypto.subtle.exportKey('raw', playerSecret);
    const qr = await pairingToQR(playerId || 'Player', new Uint8Array(raw));
    setPairQR(qr);
  }, [playerSecret, playerId]);

  return {
    playerId,
    setPlayerId,
    joining,
    setJoining,
    joinQR,
    joinTotp,
    pairQR,
    showPairingCode,
    joinScannerProps,
    housePublicKey,
  };
}
