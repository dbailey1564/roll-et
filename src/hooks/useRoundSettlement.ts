import React from 'react'
import { resolveRound } from '../game/engine'
import { usePlayers, useRoundState, useStats, PER_ROUND_POOL, useHouse } from '../context/GameContext'
import { issueReceiptsForWinners } from '../receipts'
import { appendLedger } from '../ledger/localLedger'

export function useRoundSettlement() {
  const { players, setPlayers } = usePlayers()
  const { roundState, setRoundState } = useRoundState()
  const { stats, setStats } = useStats()
  const { houseKey, betCerts, setBetCerts, setReceipts } = useHouse()

  const [enteredRoll, setEnteredRoll] = React.useState<number | ''>('')
  const [history, setHistory] = React.useState<Array<{ roll: number, deltas: Record<number, number>, time: number }>>([])
  const [winning, setWinning] = React.useState<number | null>(null)

  const lockRound = () => { setRoundState('locked') }

  const settleRound = async () => {
    if (roundState !== 'locked') return
    const roll = Number(enteredRoll)
    if (!Number.isInteger(roll) || roll < 1 || roll > 20) return

    const deltas: Record<number, number> = {}
    const nextPlayers = players.map(p => {
      const stake = p.bets.reduce((a, b) => a + b.amount, 0)
      const win = resolveRound(roll, p.bets)
      const delta = win - stake
      deltas[p.id] = delta
      return { ...p, bank: p.bank + delta }
    })

    setStats(prev => {
      const hits = [...prev.hits]
      hits[roll] = (hits[roll] || 0) + 1
      const banks = { ...prev.banks }
      nextPlayers.forEach(p => { banks[p.id] = p.bank })
      return { rounds: prev.rounds + 1, hits, banks }
    })

    if (houseKey) {
      const winners = players
        .filter(p => deltas[p.id] > 0)
        .map(p => ({ player: p.id, value: deltas[p.id], betCertRef: betCerts[p.id] || '' }))
      const roundId = String(stats.rounds + 1)
      const recs = await issueReceiptsForWinners(winners, roundId, houseKey.privateKey)
      setReceipts(recs)
      for (let i = 0; i < winners.length; i++) {
        const w = winners[i]
        const rec = (recs[i] && recs[i].receipt) ? recs[i] : undefined
        await appendLedger('receipt_issued', roundId, {
          player: String(w.player),
          value: w.value,
          betCertRef: w.betCertRef,
          receiptId: rec?.receipt.receiptId,
          spendCode: rec?.spendCode,
        })
      }
    }

    setPlayers(nextPlayers)
    await appendLedger('round_settled', String(stats.rounds + 1), { roll, deltas })
    setHistory(h => [{ roll, deltas, time: Date.now() }, ...h].slice(0, 30))
    setWinning(roll)
    setRoundState('settled')
  }

  const newRound = () => {
    setPlayers(prev => prev.map(p => ({ ...p, pool: PER_ROUND_POOL, bets: [] })))
    setEnteredRoll('')
    setWinning(null)
    setRoundState('open')
    setBetCerts({})
    setReceipts([])
  }

  return {
    enteredRoll,
    setEnteredRoll,
    history,
    winning,
    lockRound,
    settleRound,
    newRound,
  }
}

