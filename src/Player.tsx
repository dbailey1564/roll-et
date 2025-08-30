import React from 'react'
import { Link } from 'react-router-dom'
import { usePlayers } from './context/GameContext'
import { fmtUSD, fmtUSDSign } from './utils'
import { getOdds } from './game/engine'
import type { Bet } from './game/engine'
import { useInstallPrompt } from './pwa/useInstallPrompt'
import BetCertScanner from './components/BetCertScanner'
import BankReceiptScanner from './components/BankReceiptScanner'
import type { BetCert } from './certs/betCert'
import type { BankReceipt } from './certs/bankReceipt'
import JoinScanner from './components/JoinScanner'
import { houseCertRootPublicKeyJwk } from './certs/authorizedHouseCertLedger'
import { validateHouseCert } from './certs/houseCert'
import { joinResponseToQR } from './joinQR'
import { pairingToQR } from './pairingQR'
import { generateJoinTotp } from './utils/totp'

function describeBet(b: Bet): string {
  switch (b.type) {
    case 'single':
      return `#${b.selection[0]}`
    case 'split':
      return `Split ${b.selection.join(' / ')}`
    case 'corner':
      return `Corner ${b.selection.join('-')}`
    case 'even':
      return 'Even'
    case 'odd':
      return 'Odd'
    case 'high':
      return 'High 11–20'
    case 'low':
      return 'Low 1–10'
  }
}

function potential(b: Bet): number {
  return b.amount * getOdds(b.type)
}

export default function Player() {
  const { players } = usePlayers()
  const { canInstall, install, installed } = useInstallPrompt()
  const [scanningCert, setScanningCert] = React.useState(false)
  const [scanningReceipt, setScanningReceipt] = React.useState(false)
  const [joining, setJoining] = React.useState(false)
  const [lastCert, setLastCert] = React.useState<BetCert | null>(null)
  const [lastReceipt, setLastReceipt] = React.useState<BankReceipt | null>(null)
  const [joinQR, setJoinQR] = React.useState<string | null>(null)
  const [playerKeys, setPlayerKeys] = React.useState<CryptoKeyPair | null>(null)
  const [playerSecret, setPlayerSecret] = React.useState<CryptoKey | null>(null)
  const [rootKey, setRootKey] = React.useState<CryptoKey | null>(null)
  const [housePublicKey, setHousePublicKey] = React.useState<CryptoKey | null>(null)
  const [pairQR, setPairQR] = React.useState<string | null>(null)
  const [joinTotp, setJoinTotp] = React.useState<string | null>(null)
  const [playerId, setPlayerId] = React.useState<string>(() => {
    try {
      return localStorage.getItem('roll_et_player_id') || 'Player'
    } catch {
      return 'Player'
    }
  })
  React.useEffect(() => {
    try { localStorage.setItem('roll_et_player_id', playerId) } catch {}
  }, [playerId])

  React.useEffect(() => {
    ;(async () => {
      // Player keys and secret for Join
      const pkeys = await crypto.subtle.generateKey(
        { name: 'ECDSA', namedCurve: 'P-256' },
        true,
        ['sign', 'verify']
      )
      const secret = await crypto.subtle.generateKey({ name: 'HMAC', hash: 'SHA-256' }, true, ['sign'])
      setPlayerKeys(pkeys as CryptoKeyPair)
      setPlayerSecret(secret)
      // Root authority key (public) for validating HouseCerts in Join challenges
      const rk = await crypto.subtle.importKey(
        'jwk',
        houseCertRootPublicKeyJwk,
        { name: 'ECDSA', namedCurve: 'P-256' },
        true,
        ['verify']
      )
      setRootKey(rk)
    })()
  }, [])

  return (
    <div className="container">
      <header className="header">
        <div className="left" />
        <h1>Player Summary</h1>
        <div className="right" />
      </header>

      <section className="controls">
        <div className="amount">
          <input
            type="text"
            placeholder="Your name"
            value={playerId}
            onChange={e => {
              const raw = e.target.value
              // Allow A-Z, a-z, 0-9, dot, dash, underscore. No spaces. Max 16 chars.
              const sanitized = raw.replace(/[^A-Za-z0-9._-]/g, '').slice(0, 16)
              setPlayerId(sanitized)
            }}
          />
          <small>Allowed: A-Z a-z 0-9 . _ - (max 16)</small>
        </div>
        <button onClick={() => setJoining(true)}>Join Table</button>
        <button onClick={() => setScanningCert(true)}>Scan Bet Cert</button>
        <button onClick={() => setScanningReceipt(true)}>Scan Bank Receipt</button>
      </section>

      {scanningCert && housePublicKey && (
        <section className="bets">
          <BetCertScanner
            housePublicKey={housePublicKey}
            onCert={cert => {
              setLastCert(cert)
              setScanningCert(false)
            }}
          />
        </section>
      )}

      {scanningReceipt && housePublicKey && (
        <section className="bets">
          <BankReceiptScanner
            housePublicKey={housePublicKey}
            onReceipt={r => {
              setLastReceipt(r)
              setScanningReceipt(false)
            }}
          />
        </section>
      )}

      {joining && playerKeys && playerSecret && rootKey && (
        <section className="bets">
          <JoinScanner
            playerId={playerId || 'Player'}
            playerKey={playerKeys.privateKey}
            playerSecret={playerSecret}
            rootKey={rootKey}
            onResponse={async (resp) => {
              const img = await joinResponseToQR(resp)
              setJoinQR(img)
              setJoining(false)
            }}
              onResponseEx={async (resp, challenge) => {
                if (!playerSecret || !rootKey) return
                const valid = await validateHouseCert(challenge.houseCert, rootKey)
                if (!valid) return
                const key = await crypto.subtle.importKey(
                  'jwk',
                  challenge.houseCert.payload.publicKeyJwk,
                  { name: 'ECDSA', namedCurve: 'P-256' },
                  true,
                  ['verify']
                )
                setHousePublicKey(key)
                const raw = await crypto.subtle.exportKey('raw', playerSecret)
                const code = await generateJoinTotp(new Uint8Array(raw), resp.round, resp.nonce, challenge.nbf, 60_000)
                setJoinTotp(code)
              }}
          />
        </section>
      )}

      {joinQR && (
        <section className="bets">
          <h3>Your Join Response</h3>
          <img src={joinQR} alt="join response" />
          {joinTotp && <div>TOTP (60s): <strong>{joinTotp}</strong></div>}
        </section>
      )}

      <section className="controls">
        <button onClick={async () => {
          if (!playerSecret) return
          const raw = await crypto.subtle.exportKey('raw', playerSecret)
          const qr = await pairingToQR(playerId || 'Player', new Uint8Array(raw))
          setPairQR(qr)
        }}>Show Pairing Code</button>
      </section>

      {pairQR && (
        <section className="bets">
          <h3>Pairing QR</h3>
          <img src={pairQR} alt="pairing" />
        </section>
      )}

      {lastCert && (
        <section className="bets">
          <h3>Last Bet Cert</h3>
          <pre>{JSON.stringify(lastCert, null, 2)}</pre>
        </section>
      )}

      {lastReceipt && (
        <section className="bets">
          <h3>Last Bank Receipt</h3>
          <pre>{JSON.stringify(lastReceipt, null, 2)}</pre>
        </section>
      )}

      <section className="bets">
        {players.map(p => (
          <div key={p.id} className="player">
            <div className="name">{p.name}</div>
            <div className="line"><span>Bank</span><strong className={p.bank>=0?'pos':'neg'}>{fmtUSDSign(p.bank)}</strong></div>
            <div className="line"><span>Pool</span><strong>{p.pool}</strong></div>
            <h4>Bets</h4>
            {p.bets.length ? (
              <ul>
                {p.bets.map((b, i) => (
                  <li key={i}>
                    <span>{describeBet(b)}</span>
                    <span> — {fmtUSD(b.amount)} → {fmtUSD(potential(b))}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <div>No bets placed</div>
            )}
          </div>
        ))}
      </section>

      <footer className="footer-bar">
        <div className="left">
          {canInstall && <button className="install-btn" onClick={install}>Install</button>}
          {installed && <span className="installed">Installed</span>}
        </div>
        <div className="center">© Kraken Consulting, LLC (Dev Team)</div>
        <div className="right">
          <Link className="link-btn" to="/game">Game</Link>
        </div>
      </footer>
    </div>
  )
}
