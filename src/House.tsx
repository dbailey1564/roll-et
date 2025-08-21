import React from 'react'
import { Link } from 'react-router-dom'
import { usePlayers, useRoundState, useStats, PER_ROUND_POOL } from './context/GameContext'
import { fmtUSDSign } from './utils'
import { useInstallPrompt } from './pwa/useInstallPrompt'

export default function House() {
  const { players, setPlayers } = usePlayers()
  const { roundState, setRoundState } = useRoundState()
  const { stats } = useStats()
  const { canInstall, install, installed } = useInstallPrompt()

  const newRound = () => {
    setPlayers(prev => prev.map(p => ({ ...p, pool: PER_ROUND_POOL, bets: [] })))
    setRoundState('open')
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
            <button onClick={() => setRoundState('locked')}>Lock</button>
            <button onClick={() => setRoundState('settled')}>Settle</button>
            <button onClick={newRound}>New Round</button>
          </div>
        </div>
      </section>

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
          <Link className="link-btn" to="/">Game</Link>
        </div>
      </footer>
    </div>
  )
}

