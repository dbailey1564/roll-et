import React from 'react'
import { Link } from 'react-router-dom'
import { usePlayers, useRoundState, useStats, PER_ROUND_POOL, useHouse } from './context/GameContext'
import { fmtUSDSign } from './utils'
import { useInstallPrompt } from './pwa/useInstallPrompt'
import { lockRound } from './round'
import { appendLedger } from './ledger/localLedger'
import type { HouseCert } from './certs/houseCert'
import { createJoinChallenge, joinChallengeToQR } from './join'
import { betCertToQR } from './betCertQR'
import { MAX_SEATS } from './config'
import JoinResponseScanner from './components/JoinResponseScanner'

export default function House() {
  const { players, setPlayers } = usePlayers()
  const { roundState, setRoundState } = useRoundState()
  const { stats } = useStats()
  const { canInstall, install, installed } = useInstallPrompt()
  const { houseKey, setBetCerts, receipts } = useHouse()
  const [houseCert, setHouseCert] = React.useState<HouseCert | null>(null)
  const [joinQR, setJoinQR] = React.useState('')
  const [betCertQRs, setBetCertQRs] = React.useState<Array<{ player: string; qr: string }>>([])
  const [newPlayerName, setNewPlayerName] = React.useState('')
  const [scanningJoinResp, setScanningJoinResp] = React.useState(false)

  React.useEffect(() => {
    try {
      const raw = localStorage.getItem('houseCert')
      if (raw) setHouseCert(JSON.parse(raw) as HouseCert)
    } catch {}
  }, [])

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
    await appendLedger('round_locked', roundId, { seatCount: players.length, maxSeats: MAX_SEATS, players: players.map(p => ({ id: p.id, stake: p.bets.reduce((a,b)=>a+b.amount,0) })) })
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

  const addSeat = async () => {
    const occupied = new Set(players.map(p => p.id))
    const seat = Array.from({ length: MAX_SEATS }, (_, i) => i + 1).find(n => !occupied.has(n))
    if (!seat) return
    const name = newPlayerName.trim()
    if (!name) return
    // Add locally
    setPlayers(prev => {
      if (prev.some(p => p.id === seat)) return prev
      const np = { id: seat, name, bets: [], pool: PER_ROUND_POOL, bank: 0 }
      return [...prev, np].sort((a, b) => a.id - b.id)
    })
    // Log admission to ledger for the upcoming round
    await appendLedger('admission', String(stats.rounds + 1), { seat, name })
    setNewPlayerName('')
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
            <button onClick={() => setScanningJoinResp(true)}>Scan Join Response</button>
          </div>
          <div className="add-seat">
            <input
              type="text"
              placeholder={`Add player (max ${MAX_SEATS})`}
              value={newPlayerName}
              onChange={e => setNewPlayerName(e.target.value)}
              disabled={players.length >= MAX_SEATS}
            />
            <button onClick={addSeat} disabled={!newPlayerName.trim() || players.length >= MAX_SEATS}>Add Seat</button>
          </div>
        </div>
      </section>

      {joinQR && (
        <section className="bets">
          <h3>Join Challenge QR</h3>
          <img src={joinQR} alt="join qr" />
        </section>
      )}

      {scanningJoinResp && (
        <section className="bets">
          <JoinResponseScanner onResponse={async (resp) => {
            // Minimal admission: assign next available seat and log
            const occupied = new Set(players.map(p => p.id))
            const seat = Array.from({ length: MAX_SEATS }, (_, i) => i + 1).find(n => !occupied.has(n))
            if (seat) {
              setPlayers(prev => [...prev, { id: seat, name: resp.player, bets: [], pool: PER_ROUND_POOL, bank: 0 }].sort((a,b)=>a.id-b.id))
              await appendLedger('admission', String(stats.rounds + 1), { seat, player: resp.player, round: resp.round })
            }
            setScanningJoinResp(false)
          }} />
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

