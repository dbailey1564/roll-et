import React from 'react'
import { Link } from 'react-router-dom'

type StatsStore = {
  rounds: number
  hits: number[]
  banks: Record<number, number>
}

function loadStats(): StatsStore {
  try {
    const raw = localStorage.getItem('roll_et_stats')
    if(!raw) return { rounds: 0, hits: Array(21).fill(0), banks: {} }
    const parsed = JSON.parse(raw)
    const hits = Array.isArray(parsed.hits) && parsed.hits.length>=21 ? parsed.hits : Array(21).fill(0)
    const banks = typeof parsed.banks==='object' && parsed.banks ? parsed.banks : {}
    const rounds = Number(parsed.rounds) || 0
    return { rounds, hits, banks }
  } catch {
    return { rounds: 0, hits: Array(21).fill(0), banks: {} }
  }
}

export default function Stats(){
  const [stats] = React.useState<StatsStore>(loadStats())
  const totalHits = stats.hits.slice(1).reduce((a,b)=>a+b, 0)

  return (
    <div className="container">
      <header className="header">
        <div className="left"><Link className="link-btn" to="/">← Back</Link></div>
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
          {Array.from({length:20}, (_,i)=>i+1).map(n => (
            <div key={n} className="hit-cell">
              <div className="n">{String(n).padStart(2,'0')}</div>
              <div className="c">{stats.hits[n] || 0}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="bets">
        <h3>Player Banks (credits)</h3>
        <ul>
          {[1,2,3,4].map(pid => (
            <li key={pid}>
              <span>P{pid}</span>
              <span> — </span>
              <strong>{(stats.banks && stats.banks[pid]) ? stats.banks[pid] : 0}</strong>
            </li>
          ))}
        </ul>
      </section>

      <footer className="footer">© Roll-et</footer>
    </div>
  )
}
