import React from 'react'
import { Link } from 'react-router-dom'
import { usePlayers, useRoundState, useStats, PER_ROUND_POOL } from './context/GameContext'
import { fmtUSDSign } from './utils'
import { useInstallPrompt } from './pwa/useInstallPrompt'
import { lockRound } from './round'
import { issueHouseCert, HouseCert } from './certs/houseCert'
import { createJoinChallenge, joinChallengeToQR } from './join'

export default function House() {
  const { players, setPlayers } = usePlayers()
  const { roundState, setRoundState } = useRoundState()
  const { stats } = useStats()
  const { canInstall, install, installed } = useInstallPrompt()
  const [houseKey, setHouseKey] = React.useState<CryptoKey | null>(null)
  const [houseCert, setHouseCert] = React.useState<HouseCert | null>(null)
  const [joinQR, setJoinQR] = React.useState('')

  React.useEffect(() => {
    const subtle = globalThis.crypto.subtle
    async function setup() {
      const root = await subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify'])
      const house = await subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify'])
      const payload = {
        subject: 'demo-house',
        publicKeyJwk: await subtle.exportKey('jwk', (house as CryptoKeyPair).publicKey),
        nbf: Date.now() - 1000,
        exp: Date.now() + 24 * 60 * 60 * 1000,
        capabilities: ['host rounds']
      }
      const cert = await issueHouseCert(payload, (root as CryptoKeyPair).privateKey)
      setHouseKey((house as CryptoKeyPair).privateKey)
      setHouseCert(cert)
    }
    setup()
  }, [])

  const newRound = () => {
    setPlayers(prev => prev.map(p => ({ ...p, pool: PER_ROUND_POOL, bets: [] })))
    setRoundState('open')
  }

  const lock = async () => {
    if (!houseKey) return
    setRoundState('locked')
    const certs = await lockRound(players, houseKey, String(stats.rounds + 1))
    console.log('Bet Certs', certs)
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

