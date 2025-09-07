import React from 'react';
import { Bet, makeCornerFromAnchor, resolveRound } from '../game/engine';
import { describeBet, potential } from '../utils/betHelpers';
import {
  usePlayers,
  useRoundState,
  useStats,
  PER_ROUND_POOL,
  useHouse,
} from '../context/GameContext';
import type { BetMode, Player } from '../types';
import { clampInt } from '../utils';
import { useBetActions } from './useBetActions';
import { issueReceiptsForWinners } from '../receipts';
import { appendLedger } from '../ledger/localLedger';

export const MIN_BET = 1;

export function useBetting() {
  const { players, setPlayers } = usePlayers();
  const { roundState, setRoundState } = useRoundState();
  const { stats, setStats } = useStats();
  const { houseKey, setBetCerts, setReceipts } = useHouse();

  const DEFAULT_BET = 1;
  const [amount, setAmount] = React.useState<number>(() => {
    const saved = localStorage.getItem('bet');
    const n = saved ? Number(saved) : DEFAULT_BET;
    return Number.isFinite(n)
      ? clampInt(n, MIN_BET, PER_ROUND_POOL)
      : DEFAULT_BET;
  });
  React.useEffect(() => {
    localStorage.setItem('bet', String(amount));
  }, [amount]);

  const [mode, setMode] = React.useState<BetMode>({ kind: 'single' });
  const [enteredRoll, setEnteredRoll] = React.useState<number | ''>('');
  const [history, setHistory] = React.useState<
    Array<{ roll: number; deltas: Record<number, number>; time: number }>
  >([]);
  const [winning, setWinning] = React.useState<number | null>(null);

  const [activeId, setActiveId] = React.useState<number | null>(
    players[0]?.seat ?? null,
  );
  React.useEffect(() => {
    if (activeId != null && players.some((p) => p.seat === activeId)) return;
    if (players.length > 0) setActiveId(players[0].seat);
    else setActiveId(null);
  }, [players]);

  const active = players.find((p) => p.seat === activeId) || players[0];
  const maxForActive = active ? Math.max(MIN_BET, active.pool) : MIN_BET;

  React.useEffect(() => {
    setAmount((a) => clampInt(a, MIN_BET, maxForActive));
  }, [active?.pool]);

  const [receiptKinds, setReceiptKinds] = React.useState<
    Record<number, 'REDEEM' | 'REBUY'>
  >({});
  const receiptKind = active ? receiptKinds[active.seat] || 'REBUY' : 'REBUY';
  const setReceiptKind = (k: 'REDEEM' | 'REBUY') => {
    if (active) setReceiptKinds((prev) => ({ ...prev, [active.seat]: k }));
  };

  const canPlace = (p: Player) =>
    roundState === 'open' && amount >= MIN_BET && amount <= p.pool;

  const { addBetFor, undoLast, clearBets } = useBetActions({
    roundState,
    setPlayers,
    mode,
    setMode,
    perRoundPool: PER_ROUND_POOL,
  });

  const covered = React.useMemo(() => {
    const s = new Set<number>();
    for (const p of players) {
      for (const b of p.bets) {
        switch (b.type) {
          case 'single':
          case 'split':
          case 'corner':
            b.selection.forEach((n) => s.add(n));
            break;
          case 'even':
            for (let n = 2; n <= 20; n += 2) s.add(n);
            break;
          case 'odd':
            for (let n = 1; n <= 19; n += 2) s.add(n);
            break;
          case 'high':
            for (let n = 11; n <= 20; n++) s.add(n);
            break;
          case 'low':
            for (let n = 1; n <= 10; n++) s.add(n);
            break;
        }
      }
    }
    return s;
  }, [players]);

  const onCellClick = (n: number) => {
    if (roundState !== 'open') return;
    const p = active;
    if (!p || !canPlace(p)) return;
    switch (mode.kind) {
      case 'single':
        addBetFor(p.seat, { type: 'single', selection: [n], amount });
        break;
      case 'split': {
        const first = (mode as any).first as number | undefined;
        if (first == null) {
          setMode({ kind: 'split', first: n });
        } else {
          if (!isAdjacent(first, n)) {
            setMode({ kind: 'split' });
            return;
          }
          const pair = [first, n].sort((a, b) => a - b);
          addBetFor(p.seat, { type: 'split', selection: pair, amount });
          setMode({ kind: 'split' });
        }
        break;
      }
      case 'corner': {
        const q = makeCornerFromAnchor(n);
        if (q) addBetFor(p.seat, { type: 'corner', selection: q, amount });
        break;
      }
      case 'high':
        addBetFor(p.seat, { type: 'high', selection: [], amount });
        break;
      case 'low':
        addBetFor(p.seat, { type: 'low', selection: [], amount });
        break;
      case 'even':
        addBetFor(p.seat, { type: 'even', selection: [], amount });
        break;
      case 'odd':
        addBetFor(p.seat, { type: 'odd', selection: [], amount });
        break;
    }
  };

  const lockRound = () => {
    setRoundState('locked');
  };

  const settleRound = async () => {
    if (roundState !== 'locked') return;
    const roll = Number(enteredRoll);
    if (!Number.isInteger(roll) || roll < 1 || roll > 20) return;

    const deltas: Record<number, number> = {};
    const deltasUid: Record<string, number> = {};
    const nextPlayers = players.map((p) => {
      const stake = p.bets.reduce((a, b) => a + b.amount, 0);
      const win = resolveRound(roll, p.bets);
      const delta = win - stake;
      deltas[p.seat] = delta;
      deltasUid[p.uid] = delta;
      return { ...p, bank: p.bank + delta };
    });

    setStats((prev) => {
      const hits = [...prev.hits];
      hits[roll] = (hits[roll] || 0) + 1;
      const banks = { ...prev.banks };
      nextPlayers.forEach((p) => {
        banks[p.seat] = p.bank;
      });
      return { rounds: prev.rounds + 1, hits, banks };
    });

    if (houseKey) {
      const winners = players
        .filter((p) => deltas[p.seat] > 0)
        .map((p) => ({
          player: p.seat,
          playerUidThumbprint: p.uid,
          amount: deltas[p.seat],
          kind: receiptKinds[p.seat] || 'REBUY',
        }));
      const roundId = String(stats.rounds + 1);
      const houseId = 'house-1';
      const recs = await issueReceiptsForWinners(
        winners,
        roundId,
        houseId,
        houseKey.privateKey,
      );
      setReceipts(recs);
      for (let i = 0; i < winners.length; i++) {
        const w = winners[i];
        const rec = recs[i] && recs[i].receipt ? recs[i] : undefined;
        await appendLedger('receipt_issued', {
          roundId,
          playerUidThumbprint: w.playerUidThumbprint,
          amount: w.amount,
          receiptId: rec?.receipt.receiptId,
          kind: w.kind,
        });
      }
    }

    setPlayers(nextPlayers);
    await appendLedger('round_settled', {
      roundId: String(stats.rounds + 1),
      roll,
      deltas: deltasUid,
    });
    setHistory((h) => [{ roll, deltas, time: Date.now() }, ...h].slice(0, 30));
    setWinning(roll);
    setRoundState('settled');
  };

  const newRound = () => {
    setPlayers((prev) =>
      prev.map((p) => ({ ...p, pool: PER_ROUND_POOL, bets: [] })),
    );
    setEnteredRoll('');
    setWinning(null);
    setRoundState('open');
    setBetCerts({});
    setReceipts([]);
  };

  return {
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
    activeId,
    setActiveId,
    receiptKind,
    setReceiptKind,
    maxForActive,
    canPlace,
    addBetFor,
    undoLast,
    clearBets,
    onCellClick,
    lockRound,
    settleRound,
    newRound,
    describeBet,
    potential,
  };
}

function isAdjacent(a: number, b: number): boolean {
  const pos = (n: number) => {
    const idx = n - 1;
    return { r: Math.floor(idx / 5), c: idx % 5 };
  };
  const A = pos(a),
    B = pos(b);
  const dr = Math.abs(A.r - B.r),
    dc = Math.abs(A.c - B.c);
  return dr + dc === 1;
}
