import React from 'react';
import { BetBoard } from './components/BetBoard';
import { BetControls } from './components/BetControls';
import { HistorySection } from './components/HistorySection';
import { FooterBar } from './components/FooterBar';
import { HeaderBar } from './components/HeaderBar';
import { numberGrid, getOdds } from './game/engine';
import { useInstallPrompt } from './pwa/useInstallPrompt';
import { fmtUSD, fmtUSDSign } from './utils';
import { useBetting, MIN_BET } from './hooks/useBetting';

export default function App() {
  const { canInstall, install, installed, isiOS } = useInstallPrompt();
  const {
    players,
    roundState,
    amount,
    setAmount,
    mode,
    setMode,
    enteredRoll,
    setEnteredRoll,
    history,
    winning,
    covered,
    active,
    setActiveId,
    receiptKind,
    setReceiptKind,
    maxForActive,
    undoLast,
    clearBets,
    onCellClick,
    lockRound,
    settleRound,
    newRound,
    describeBet,
    potential,
  } = useBetting();

  if (players.length === 0) {
    return (
      <div className="container">
        <HeaderBar roundState={roundState} />
        <section className="bets">
          <div className="muted">No players joined.</div>
        </section>
        <FooterBar
          canInstall={canInstall}
          install={install}
          installed={installed}
        />
      </div>
    );
  }

  return (
    <div className="container">
      <HeaderBar roundState={roundState} />

      {isiOS && !installed && (
        <div className="ios-hint">
          On iPhone/iPad: Share → Add to Home Screen to install.
        </div>
      )}

      <section className="controls">
        <div className="betmodes">
          {players.map((p) => (
            <button
              key={p.seat}
              className={active?.seat === p.seat ? 'active' : ''}
              onClick={() => setActiveId(p.seat)}
            >
              Seat {p.seat}: {p.name}
            </button>
          ))}
        </div>
      </section>

      <BetControls
        amount={amount}
        setAmount={setAmount}
        minBet={MIN_BET}
        maxForActive={maxForActive}
        active={active}
        mode={mode}
        setMode={setMode}
        roundState={roundState}
        undoLast={undoLast}
        clearBets={clearBets}
        lockRound={lockRound}
        enteredRoll={enteredRoll}
        setEnteredRoll={setEnteredRoll}
        settleRound={settleRound}
        newRound={newRound}
        receiptKind={receiptKind}
        setReceiptKind={setReceiptKind}
      />

      <BetBoard
        grid={numberGrid}
        mode={mode.kind}
        onCellClick={onCellClick}
        splitFirst={mode.kind === 'split' && mode.first}
        covered={covered}
        winning={winning}
      />

      <section className="bets">
        <h3>Bets (potential payout)</h3>
        {active.bets.length === 0 ? (
          <div className="muted">No bets placed.</div>
        ) : (
          <ul>
            {active.bets.map((b) => (
              <li key={b.id}>
                <span>{describeBet(b)}</span>
                <span> × {b.amount} → </span>
                <span className="muted">{getOdds(b.type)}:1</span>
                <span>
                  {' '}
                  =&nbsp;<strong>{fmtUSD(potential(b))}</strong>
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <HistorySection
        history={history}
        players={players}
        fmtUSDSign={fmtUSDSign}
      />

      <FooterBar
        canInstall={canInstall}
        install={install}
        installed={installed}
      />
    </div>
  );
}
