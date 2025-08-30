import React from 'react'
import type { BetCert } from '../../certs/betCert'

interface Props { cert: BetCert }

export default function BetCertDisplay({ cert }: Props){
  return (
    <section className="bets">
      <h3>Last Bet Cert</h3>
      <pre>{JSON.stringify(cert, null, 2)}</pre>
    </section>
  )
}

