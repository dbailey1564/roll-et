import React from 'react'
import { Link } from 'react-router-dom'

interface Props {
  canInstall: boolean
  install: () => void
  installed: boolean
}

export function FooterBar({ canInstall, install, installed }: Props){
  return (
    <footer className="footer-bar">
      <div className="left">
        {canInstall && <button className="install-btn" onClick={install}>Install</button>}
        {installed && <span className="installed">Installed</span>}
      </div>
      <div className="center">© Kraken Consulting, LLC (Dev Team)</div>
      <div className="right">
        <Link className="link-btn" to="/stats">Stats</Link>
      </div>
    </footer>
  )
}
