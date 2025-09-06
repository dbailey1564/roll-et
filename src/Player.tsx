import React from 'react';
import { Link } from 'react-router-dom';
import { usePlayers } from './context/GameContext';
import { fmtUSD, fmtUSDSign } from './utils';
import { describeBet, potential } from './utils/betHelpers';
import { useInstallPrompt } from './pwa/useInstallPrompt';
import BetCertScanner from './components/BetCertScanner';
import BankReceiptScanner from './components/BankReceiptScanner';
import type { BetCert } from './certs/betCert';
import type { BankReceipt } from './certs/bankReceipt';
import JoinScanner from './components/JoinScanner';
import { useJoin } from './hooks/useJoin';
import BetCertDisplay from './components/player/BetCertDisplay';
import BankReceiptDisplay from './components/player/BankReceiptDisplay';

export default function Player() {
  const { players } = usePlayers();
  const { canInstall, install, installed } = useInstallPrompt();
  const [scanningCert, setScanningCert] = React.useState(false);
  const [scanningReceipt, setScanningReceipt] = React.useState(false);
  const [lastCert, setLastCert] = React.useState<BetCert | null>(null);
  const [lastReceipt, setLastReceipt] = React.useState<BankReceipt | null>(
    null,
  );

  const {
    playerId,
    setPlayerId,
    joining,
    setJoining,
    joinQR,
    joinTotp,
    pairQR,
    showPairingCode,
    joinScannerProps,
    housePublicKey,
  } = useJoin();

  return (
    <div className="container">
      <header className="header">
        <div className="left" />
        <h1>Player Summary</h1>
        <div className="right" />
      </header>

      <section className="controls">
        <div className="amount">
          <input
            type="text"
            placeholder="Your name"
            value={playerId}
            onChange={(e) => {
              const raw = e.target.value;
              const sanitized = raw
                .replace(/[^A-Za-z0-9._-]/g, '')
                .slice(0, 16);
              setPlayerId(sanitized);
            }}
          />
          <small>Allowed: A-Z a-z 0-9 . _ - (max 16)</small>
        </div>
        <button onClick={() => setJoining(true)}>Join Table</button>
        <button onClick={() => setScanningCert(true)}>Scan Bet Cert</button>
        <button onClick={() => setScanningReceipt(true)}>
          Scan Bank Receipt
        </button>
      </section>

      {scanningCert && housePublicKey && (
        <section className="bets">
          <BetCertScanner
            housePublicKey={housePublicKey}
            onCert={(cert) => {
              setLastCert(cert);
              setScanningCert(false);
            }}
          />
        </section>
      )}

      {scanningReceipt && housePublicKey && (
        <section className="bets">
          <BankReceiptScanner
            housePublicKey={housePublicKey}
            onReceipt={(r) => {
              setLastReceipt(r);
              setScanningReceipt(false);
            }}
          />
        </section>
      )}

      {joining && joinScannerProps && (
        <section className="bets">
          <JoinScanner {...joinScannerProps} />
        </section>
      )}

      {joinQR && (
        <section className="bets">
          <h3>Your Join Response</h3>
          <img src={joinQR} alt="join response" />
          {joinTotp && (
            <div>
              TOTP (60s): <strong>{joinTotp}</strong>
            </div>
          )}
        </section>
      )}

      <section className="controls">
        <button onClick={showPairingCode}>Show Pairing Code</button>
      </section>

      {pairQR && (
        <section className="bets">
          <h3>Pairing QR</h3>
          <img src={pairQR} alt="pairing" />
        </section>
      )}

      {lastCert && <BetCertDisplay cert={lastCert} />}

      {lastReceipt && <BankReceiptDisplay receipt={lastReceipt} />}

      <section className="bets">
        {players.map((p) => (
          <div key={p.seat} className="player">
            <div className="name">{p.name}</div>
            <div className="line">
              <span>Bank</span>
              <strong className={p.bank >= 0 ? 'pos' : 'neg'}>
                {fmtUSDSign(p.bank)}
              </strong>
            </div>
            <div className="line">
              <span>Pool</span>
              <strong>{p.pool}</strong>
            </div>
            <h4>Bets</h4>
            {p.bets.length ? (
              <ul>
                {p.bets.map((b, i) => (
                  <li key={i}>
                    <span>{describeBet(b)}</span>
                    <span>
                      {' '}
                      — {fmtUSD(b.amount)} → {fmtUSD(potential(b))}
                    </span>
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
          {canInstall && (
            <button className="install-btn" onClick={install}>
              Install
            </button>
          )}
          {installed && <span className="installed">Installed</span>}
        </div>
        <div className="center">© Kraken Consulting, LLC (Dev Team)</div>
        <div className="right">
          <Link className="link-btn" to="/game">
            Game
          </Link>
        </div>
      </footer>
    </div>
  );
}
