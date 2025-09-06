import React from 'react'
import { Link } from 'react-router-dom'
import { usePlayers, useRoundState, useStats, PER_ROUND_POOL, useHouse } from './context/GameContext'
import { fmtUSDSign } from './utils'
import { useInstallPrompt } from './pwa/useInstallPrompt'
import { lockRound } from './round'
import { appendLedger } from './ledger/localLedger'
import type { HouseCert } from './certs/houseCert'
import { createJoinChallenge, joinChallengeToQR, type JoinChallenge } from './join'
import { betCertToQR } from './betCertQR'
import { MAX_SEATS } from './config'
import JoinResponseScanner from './components/JoinResponseScanner'
import BankReceiptScanner from './components/BankReceiptScanner'
import { verifyBankReceipt } from './certs/bankReceipt'
import PairingScanner from './components/PairingScanner'
import { base64UrlToBytes } from './utils/base64'
import { verifyJoinTotp } from './utils/totp'

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
  const [scanningSpend, setScanningSpend] = React.useState(false)
  const [spendCodeInput, setSpendCodeInput] = React.useState('')
  const [lastChallenge, setLastChallenge] = React.useState<JoinChallenge | null>(null)
  const [keyMismatch, setKeyMismatch] = React.useState(false)
  const [scanningPair, setScanningPair] = React.useState(false)
  const [totpInput, setTotpInput] = React.useState('')

  React.useEffect(() => {
    try {
      const raw = localStorage.getItem('houseCert')
      if (raw) setHouseCert(JSON.parse(raw) as HouseCert)
    } catch {}
  }, [])

  // Enforce that houseKey public key matches HouseCert housePubKey
  React.useEffect(() => {
    (async () => {
      if (!houseKey || !houseCert) { setKeyMismatch(false); return }
      try {
        const jwk = await crypto.subtle.exportKey('jwk', houseKey.publicKey)
        const a = JSON.stringify({ kty: jwk.kty, crv: (jwk as any).crv, x: (jwk as any).x, y: (jwk as any).y })
        const b = JSON.stringify({ kty: houseCert.payload.housePubKey.kty, crv: (houseCert.payload.housePubKey as any).crv, x: (houseCert.payload.housePubKey as any).x, y: (houseCert.payload.housePubKey as any).y })
        setKeyMismatch(a !== b)
      } catch { setKeyMismatch(true) }
    })()
  }, [houseKey, houseCert])

  const newRound = () => {
    setPlayers(prev => prev.map(p => ({ ...p, pool: PER_ROUND_POOL, bets: [] })))
    setRoundState('open')
    setBetCertQRs([])
    setBetCerts({})
  }

  const lock = async () => {
    if (!houseKey) return
    if (keyMismatch) { alert('House signing key does not match House Certificate public key. Cannot lock.'); return }
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
    setLastChallenge(challenge)
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
            <button onClick={() => setScanningSpend(true)}>Spend Receipt</button>
            <button onClick={() => setScanningPair(true)}>Scan Pairing</button>
          </div>
          <div className="manual-roll">
            <input
              type="text"
              placeholder="Spend code (10 digits)"
              value={spendCodeInput}
              onChange={e => setSpendCodeInput(e.target.value.replace(/\D/g, '').slice(0, 10))}
            />
            <button onClick={async () => {
              const code = spendCodeInput
              if (code.length < 10) return
              const rec = receipts.find(r => r.spendCode && r.spendCode === code)
              if (!rec) { alert('Receipt not found for code.'); return }
              const ok = await verifyBankReceipt(rec.receipt, houseKey!.publicKey)
              if (!ok) { alert('Invalid or expired receipt'); return }
              const spentKey = 'roll_et_spent_receipts'
              try {
                const raw = localStorage.getItem(spentKey)
                const set = new Set<string>(raw ? JSON.parse(raw) as string[] : [])
                if (set.has(rec.receipt.receiptId)) { alert('Receipt already spent.'); return }
                await appendLedger('receipt_spent', String(stats.rounds + 1), { receiptId: rec.receipt.receiptId, player: rec.player, value: rec.receipt.value, method: 'code' })
                set.add(rec.receipt.receiptId)
                localStorage.setItem(spentKey, JSON.stringify(Array.from(set)))
                alert('Receipt marked as spent.')
                setSpendCodeInput('')
              } catch { alert('Failed to record spend.'); }
            }}>Spend by code</button>
          </div>
          <div className="manual-roll">
            <input
              type="text"
              placeholder="Join TOTP (6 digits)"
              value={totpInput}
              onChange={e => setTotpInput(e.target.value.replace(/\D/g, '').slice(0, 6))}
              disabled={!lastChallenge}
            />
            <button onClick={async () => {
              if (!totpInput || !lastChallenge) return
              try {
                const raw = localStorage.getItem('roll_et_pair_secrets')
                const map = raw ? (JSON.parse(raw) as Record<string, string>) : {}
                let matched: string | null = null
                for (const [pid, b64] of Object.entries(map)) {
                  const ok = await verifyJoinTotp(totpInput, base64UrlToBytes(b64) as Uint8Array, lastChallenge.round, lastChallenge.nonce, lastChallenge.nbf, 60_000, 1)
                  if (ok) { matched = pid; break }
                }
                if (!matched) { alert('No matching pairing secret for TOTP.'); return }
                const occupied = new Set(players.map(p => p.id))
                const seat = Array.from({ length: MAX_SEATS }, (_, i) => i + 1).find(n => !occupied.has(n))
                if (seat) {
                  setPlayers(prev => [...prev, { id: seat, name: matched!, bets: [], pool: PER_ROUND_POOL, bank: 0 }].sort((a,b)=>a.id-b.id))
                  await appendLedger('admission', String(stats.rounds + 1), { seat, player: matched!, round: lastChallenge.round, method: 'totp' })
                  setTotpInput('')
                }
              } catch { alert('Admission by TOTP failed.') }
            }}>Admit by code</button>
          </div>
          {keyMismatch && (
            <div className="error" role="alert">Signing key does not match House Certificate. Lock/settle disabled.</div>
          )}
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
            if (!lastChallenge || resp.round !== lastChallenge.round || resp.nonce !== lastChallenge.nonce) {
              alert('Join response does not match current challenge.')
              setScanningJoinResp(false)
              return
            }
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

      {scanningPair && (
        <section className="bets">
          <PairingScanner onPair={async (p) => {
            try {
              const raw = localStorage.getItem('roll_et_pair_secrets')
              const map = raw ? (JSON.parse(raw) as Record<string, string>) : {}
              map[p.playerId] = p.secret
              localStorage.setItem('roll_et_pair_secrets', JSON.stringify(map))
              alert(`Paired with ${p.playerId}`)
            } catch {}
            setScanningPair(false)
          }} />
        </section>
      )}

      {scanningSpend && houseKey && (
        <section className="bets">
          <BankReceiptScanner
            housePublicKey={houseKey.publicKey}
            onReceipt={async (receipt) => {
              const ok = await verifyBankReceipt(receipt, houseKey.publicKey)
              if (!ok) { alert('Invalid or expired receipt'); setScanningSpend(false); return }
              await appendLedger('receipt_spent', String(stats.rounds + 1), { receiptId: receipt.receiptId, player: receipt.player, value: receipt.value })
              try {
                const key = 'roll_et_spent_receipts'
                const raw = localStorage.getItem(key)
                const set = new Set<string>(raw ? JSON.parse(raw) as string[] : [])
                set.add(receipt.receiptId)
                localStorage.setItem(key, JSON.stringify(Array.from(set)))
              } catch {}
              alert('Receipt marked as spent.')
              setScanningSpend(false)
            }}
          />
        </section>
      )}

      {betCertQRs.length > 0 && (
        <section className="bets">
          <h3>Bet Certs</h3>
          {betCertQRs.map(b => {
            const seatId = Number(b.player)
            const label = players.find(p => p.id === seatId)?.name
            return (
              <div key={b.player}>
                <div>{label ? `${label} (Seat ${seatId})` : `Seat ${seatId}`}</div>
                <img src={b.qr} alt={`bet cert ${b.player}`} />
              </div>
            )
          })}
        </section>
      )}

      {receipts.length > 0 && (
        <section className="bets">
          <h3>Bank Receipts</h3>
          {receipts.map(r => {
            const seatId = Number(r.player)
            const label = players.find(p => p.id === seatId)?.name
            return (
              <div key={r.player}>
                <div>{label ? `${label} (Seat ${seatId})` : `Seat ${seatId}`}</div>
                <img src={r.qr} alt={`receipt ${r.player}`} />
                {r.spendCode && <div>Spend code: <strong>{r.spendCode}</strong></div>}
                <a
                  href={`data:application/json,${encodeURIComponent(JSON.stringify(r.receipt))}`}
                  download={`receipt-${r.player}.json`}
                >
                  Download
                </a>
              </div>
            )
          })}
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

