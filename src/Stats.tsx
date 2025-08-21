import React from 'react'
import { Link } from 'react-router-dom'
import { useInstallPrompt } from './pwa/useInstallPrompt'
import { useStats } from './context/GameContext'

export default function Stats() {
  const { stats } = useStats()
  const totalHits = stats.hits.slice(1).reduce((a, b) => a + b, 0)

  // ✅ hooks belong inside components
  const { canInstall, install, installed } = useInstallPrompt()

  return (
    <div className="container">
      <header className="header">
        <div className="left" />
        <h1>Roll-et Stats</h1>
        <div className="right" />
      </header>

      <section className="controls">
        <div className="amount">
          <div><strong>Rounds:</strong> {stats.rounds}</div>
          <div><strong>Total Rolls Logged:</strong> {totalHits}</div>
        </div>
      </section>

      <section className="bets">
        <h3>Number Hit Frequency (1–20)</h3>
        <div className="hits-grid">
          {Array.from({ length: 20 }, (_, i) => i + 1).map(n => (
            <div key={n} className="hit-cell">
              <div className="n">{String(n).padStart(2, '0')}</div>
              <div className="c">{stats.hits[n] || 0}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="bets">
        <h3>Player Banks (credits)</h3>
        <ul>
          {[1, 2, 3, 4].map(pid => (
            <li key={pid}>
              <span>P{pid}</span>
              <span> — </span>
              <strong>{(stats.banks && stats.banks[pid]) ? stats.banks[pid] : 0}</strong>
            </li>
          ))}
        </ul>
      </section>

      <footer className="footer-bar">
        <div className="left">
          {canInstall && <button className="install-btn" onClick={() => install()}>Install</button>}
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
