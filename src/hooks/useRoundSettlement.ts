import React from 'react';
import { resolveRound } from '../game/engine';
import {
  usePlayers,
  useRoundState,
  useStats,
  useHouse,
} from '../context/GameContext';

/**
 * Hook to settle a round given the winning roll.
 * It updates player banks, stats, and round state.
 */
export function useRoundSettlement() {
  const { players, setPlayers } = usePlayers();
  const { roundState, setRoundState } = useRoundState();
  const { stats, setStats } = useStats();
  const { setReceipts, setBetCerts } = useHouse(); // to reset after settlement

  const settleRound = React.useCallback(
    async (roll: number) => {
      if (roundState !== 'locked') return;
      if (!Number.isInteger(roll) || roll < 1 || roll > 20) return;

      const deltas: Record<number, number> = {};
      const nextPlayers = players.map((p) => {
        const stake = p.bets.reduce((a, b) => a + b.amount, 0);
        const win = resolveRound(roll, p.bets);
        const delta = win - stake;
        deltas[p.seat] = delta;
        return { ...p, bank: p.bank + delta };
      });

      setPlayers(nextPlayers);
      setStats((prev) => {
        const hits = [...prev.hits];
        hits[roll] = (hits[roll] || 0) + 1;
        const banks = { ...prev.banks };
        nextPlayers.forEach((p) => {
          banks[p.seat] = p.bank;
        });
        return { rounds: prev.rounds + 1, hits, banks };
      });

      // clear bet certs and receipts for new round context
      setBetCerts({});
      setReceipts([]);
      setRoundState('settled');
      return deltas;
    },
    [
      players,
      roundState,
      setPlayers,
      setRoundState,
      setStats,
      setReceipts,
      setBetCerts,
    ],
  );

  return { settleRound };
}
