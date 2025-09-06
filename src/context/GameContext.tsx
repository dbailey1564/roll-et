import React from 'react';
import type { Player, RoundState } from '../types';
import { MAX_SEATS } from '../config';
import type { BankReceipt } from '../certs/bankReceipt';

export const PER_ROUND_POOL = 8;

export type Stats = {
  rounds: number;
  hits: number[];
  banks: Record<number, number>;
};

export type ReceiptRecord = {
  player: string;
  receipt: BankReceipt;
  qr: string;
  spendCode?: string;
};

type GameContextValue = {
  players: Player[];
  setPlayers: React.Dispatch<React.SetStateAction<Player[]>>;
  addPlayer: (name: string) => void;
  roundState: RoundState;
  setRoundState: React.Dispatch<React.SetStateAction<RoundState>>;
  stats: Stats;
  setStats: React.Dispatch<React.SetStateAction<Stats>>;
  houseKey: CryptoKeyPair | null;
  betCerts: Record<number, string>;
  setBetCerts: React.Dispatch<React.SetStateAction<Record<number, string>>>;
  receipts: ReceiptRecord[];
  setReceipts: React.Dispatch<React.SetStateAction<ReceiptRecord[]>>;
};

const GameContext = React.createContext<GameContextValue | undefined>(
  undefined,
);

export const GameProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [players, setPlayers] = React.useState<Player[]>([]);
  const [houseKey, setHouseKey] = React.useState<CryptoKeyPair | null>(null);
  const [betCerts, setBetCerts] = React.useState<Record<number, string>>({});
  const [receipts, setReceipts] = React.useState<ReceiptRecord[]>(() => {
    try {
      const raw = localStorage.getItem('roll_et_receipts');
      return raw ? (JSON.parse(raw) as ReceiptRecord[]) : [];
    } catch {
      return [];
    }
  });

  const addPlayer = React.useCallback((name: string) => {
    setPlayers((prev) => {
      if (prev.length >= MAX_SEATS) return prev;
      const seat = Array.from({ length: MAX_SEATS }, (_, i) => i + 1).find(
        (i) => !prev.some((p) => p.seat === i),
      );
      if (!seat) return prev;
      const newPlayer: Player = {
        seat,
        uid: String(seat),
        name,
        bets: [],
        pool: PER_ROUND_POOL,
        bank: 0,
      };
      return [...prev, newPlayer].sort((a, b) => a.seat - b.seat);
    });
  }, []);
  const [roundState, setRoundState] = React.useState<RoundState>('locked');
  const [stats, setStats] = React.useState<Stats>(() => {
    try {
      const raw = localStorage.getItem('roll_et_stats');
      if (!raw) return { rounds: 0, hits: Array(21).fill(0), banks: {} };
      const parsed = JSON.parse(raw);
      const hits =
        Array.isArray(parsed.hits) && parsed.hits.length >= 21
          ? parsed.hits
          : Array(21).fill(0);
      const banks =
        typeof parsed.banks === 'object' && parsed.banks ? parsed.banks : {};
      const rounds = Number(parsed.rounds) || 0;
      return { rounds, hits, banks };
    } catch {
      return { rounds: 0, hits: Array(21).fill(0), banks: {} };
    }
  });

  React.useEffect(() => {
    try {
      localStorage.setItem('roll_et_stats', JSON.stringify(stats));
    } catch {}
  }, [stats]);

  React.useEffect(() => {
    try {
      localStorage.setItem('roll_et_receipts', JSON.stringify(receipts));
    } catch {}
  }, [receipts]);

  React.useEffect(() => {
    const subtle = globalThis.crypto.subtle;
    async function setup() {
      const pair = await subtle.generateKey(
        { name: 'ECDSA', namedCurve: 'P-256' },
        true,
        ['sign', 'verify'],
      );
      setHouseKey(pair as CryptoKeyPair);
    }
    setup();
  }, []);

  return (
    <GameContext.Provider
      value={{
        players,
        setPlayers,
        addPlayer,
        roundState,
        setRoundState,
        stats,
        setStats,
        houseKey,
        betCerts,
        setBetCerts,
        receipts,
        setReceipts,
      }}
    >
      {children}
    </GameContext.Provider>
  );
};

export function useGameContext() {
  const ctx = React.useContext(GameContext);
  if (!ctx)
    throw new Error('useGameContext must be used within a GameProvider');
  return ctx;
}

export function usePlayers() {
  const { players, setPlayers, addPlayer } = useGameContext();
  return { players, setPlayers, addPlayer };
}

export function useRoundState() {
  const { roundState, setRoundState } = useGameContext();
  return { roundState, setRoundState };
}

export function useStats() {
  const { stats, setStats } = useGameContext();
  return { stats, setStats };
}

export function useHouse() {
  const { houseKey, betCerts, setBetCerts, receipts, setReceipts } =
    useGameContext();
  return { houseKey, betCerts, setBetCerts, receipts, setReceipts };
}
