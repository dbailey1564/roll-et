import React from 'react'
import { Link } from 'react-router-dom'
import { usePlayers, useRoundState, useStats, PER_ROUND_POOL, useHouse } from './context/GameContext'
import { fmtUSDSign } from './utils'
import { useInstallPrompt } from './pwa/useInstallPrompt'
import { lockRound } from './round'
import { appendLedger } from './ledger/localLedger'
import { issueHouseCert, HouseCert } from './certs/houseCert'
import { createJoinChallenge, joinChallengeToQR } from './join'
import { betCertToQR } from './betCertQR'

export default function House() {
  const { players, setPlayers } = usePlayers()
  const { roundState, setRoundState } = useRoundState()
  const { stats } = useStats()
  const { canInstall, install, installed } = useInstallPrompt()
  const { houseKey, setBetCerts, receipts } = useHouse()
  const [houseCert, setHouseCert] = React.useState<HouseCert | null>(null)
  const [joinQR, setJoinQR] = React.useState('')
  const [betCertQRs, setBetCertQRs] = React.useState<Array<{ player: string; qr: string }>>([])

  React.useEffect(() => {
    const subtle = globalThis.crypto.subtle
    async function setup() {
      if (!houseKey) return
      const root = await subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify'])
      const payload = {
        subject: 'demo-house',
        publicKeyJwk: await subtle.exportKey('jwk', houseKey.publicKey),
        nbf: Date.now() - 1000,
        exp: Date.now() + 24 * 60 * 60 * 1000,
        capabilities: ['host rounds']
      }
      const cert = await issueHouseCert(payload, (root as CryptoKeyPair).privateKey)
      setHouseCert(cert)
    }
    setup()
  }, [houseKey])

  const newRound = () => {
    setPlayers(prev => prev.map(p => ({ ...p, pool: PER_ROUND_POOL, bets: [] })))
    setRoundState('open')
    setBetCertQRs([])
    setBetCerts({})
  }

  const lock = async () => {
    if (!houseKey) return
    setRoundState('locked')
    const roundId = String(stats.rounds + 1)
    await appendLedger('round_locked', roundId, { players: players.map(p => ({ id: p.id, stake: p.bets.reduce((a,b)=>a+b.amount,0) })) })
    const certs = await lockRound(players, houseKey.privateKey, roundId)
    const qrs = await Promise.all(
      certs.map(async c => ({ player: c.player, qr: await betCertToQR(c) }))
    )
    setBetCertQRs(qrs)
    setBetCerts(certs.reduce<Record<number, string>>((acc, c) => {
      acc[Number(c.player)] = c.certId
      return acc
    }, {}))
    for (const c of certs) {
      await appendLedger('bet_cert_issued', roundId, { player: c.player, certId: c.certId, betHash: c.betHash, exp: c.exp })
    }
  }

  const makeJoinQR = async () => {
    if (!houseCert) return
    const challenge = await createJoinChallenge(houseCert, String(stats.rounds + 1))
    const qr = await joinChallengeToQR(challenge)
    setJoinQR(qr)
  }

  return (
    <div className="container">
      <header className="header">
        <div className="left" />
        <h1>House Management</h1>
        <div className="right" />
      </header>

      <section className="controls">
        <div className="amount">
          <div>
            <strong>Round State:</strong>{' '}
            <span className={`roundstate ${roundState}`}>{roundState.toUpperCase()}</span>
          </div>
          <div className="ctrl-btns">
            <button onClick={lock}>Lock</button>
            <button onClick={() => setRoundState('settled')}>Settle</button>
            <button onClick={newRound}>New Round</button>
            <button onClick={makeJoinQR}>Join QR</button>
          </div>
        </div>
      </section>

      {joinQR && (
        <section className="bets">
          <h3>Join Challenge QR</h3>
          <img src={joinQR} alt="join qr" />
        </section>
      )}

      {betCertQRs.length > 0 && (
        <section className="bets">
          <h3>Bet Certs</h3>
          {betCertQRs.map(b => (
            <div key={b.player}>
              <div>Player {b.player}</div>
              <img src={b.qr} alt={`bet cert ${b.player}`} />
            </div>
          ))}
        </section>
      )}

      {receipts.length > 0 && (
        <section className="bets">
          <h3>Bank Receipts</h3>
          {receipts.map(r => (
            <div key={r.player}>
              <div>Player {r.player}</div>
              <img src={r.qr} alt={`receipt ${r.player}`} />
              <a
                href={`data:application/json,${encodeURIComponent(JSON.stringify(r.receipt))}`}
                download={`receipt-${r.player}.json`}
              >
                Download
              </a>
            </div>
          ))}
        </section>
      )}

      <section className="bets">
        <h3>Overall Stats</h3>
        <div><strong>Rounds Played:</strong> {stats.rounds}</div>
        <h4>Player Banks</h4>
        <ul>
          {players.map(p => (
            <li key={p.id}>
              <span>{p.name}</span>
              <span> — </span>
              <strong className={p.bank>=0?'pos':'neg'}>{fmtUSDSign(p.bank)}</strong>
            </li>
          ))}
        </ul>
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

