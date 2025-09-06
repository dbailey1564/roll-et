// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { GameProvider } from '../context/GameContext';
import { useRoundSettlement } from '../hooks/useRoundSettlement';
import { usePlayers, useRoundState, useStats } from '../context/GameContext';
import type { Player } from '../types';

describe('useRoundSettlement', () => {
  it('settles a round updating banks and stats', async () => {
    const { result } = renderHook(
      () => {
        const { settleRound } = useRoundSettlement();
        const playersCtx = usePlayers();
        const roundCtx = useRoundState();
        const statsCtx = useStats();
        return { settleRound, ...playersCtx, ...roundCtx, ...statsCtx };
      },
      { wrapper: GameProvider },
    );

    const players: Player[] = [
      {
        seat: 1,
        uid: 'p1',
        name: 'P1',
        bets: [{ id: 'b1', type: 'single', selection: [7], amount: 2 }],
        pool: 0,
        bank: 0,
      },
      {
        seat: 2,
        uid: 'p2',
        name: 'P2',
        bets: [{ id: 'b2', type: 'even', selection: [], amount: 1 }],
        pool: 0,
        bank: 0,
      },
    ];

    act(() => {
      result.current.setPlayers(players);
      result.current.setStats({
        rounds: 0,
        hits: Array(21).fill(0),
        banks: {},
      });
      result.current.setRoundState('locked');
    });

    await act(async () => {
      await result.current.settleRound(7);
    });

    expect(result.current.players[0].bank).toBe(34);
    expect(result.current.players[1].bank).toBe(-1);
    expect(result.current.roundState).toBe('settled');
    expect(result.current.stats.rounds).toBe(1);
    expect(result.current.stats.hits[7]).toBe(1);
    expect(result.current.stats.banks[1]).toBe(34);
    expect(result.current.stats.banks[2]).toBe(-1);
  });
});
