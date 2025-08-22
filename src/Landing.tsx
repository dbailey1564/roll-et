import React from 'react'
import { Link } from 'react-router-dom'
import './styles.css'

export default function Landing() {
  return (
    <div className="container">
      <header className="header">
        <div className="left" />
        <h1>Roll-et</h1>
        <div className="right" />
      </header>

      <section className="controls">
        <div className="actions">
          <Link className="link-btn" to="/player">Join</Link>
          <Link className="link-btn" to="/house">Host</Link>
        </div>
      </section>

      <footer className="footer-bar">
        <div className="left" />
        <div className="center">© Kraken Consulting, LLC (Dev Team)</div>
        <div className="right" />
      </footer>
    </div>
  )
}

