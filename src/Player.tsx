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
  const [lastCert, setLastCert] = React.useState<BetCert | null>(null)
  const [lastReceipt, setLastReceipt] = React.useState<BankReceipt | null>(null)

  return (
    <div className="container">
      <header className="header">
        <div className="left" />
        <h1>Player Summary</h1>
        <div className="right" />
      </header>

      <section className="controls">
        <button onClick={() => setScanningCert(true)}>Scan Bet Cert</button>
        <button onClick={() => setScanningReceipt(true)}>Scan Bank Receipt</button>
      </section>

      {scanningCert && (
        <section className="bets">
          <BetCertScanner onCert={cert => { setLastCert(cert); setScanningCert(false) }} />
        </section>
      )}

      {scanningReceipt && (
        <section className="bets">
          <BankReceiptScanner onReceipt={r => { setLastReceipt(r); setScanningReceipt(false) }} />
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

