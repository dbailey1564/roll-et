import React from 'react'
import type { BankReceipt } from '../../certs/bankReceipt'

interface Props { receipt: BankReceipt }

export default function BankReceiptDisplay({ receipt }: Props){
  return (
    <section className="bets">
      <h3>Last Bank Receipt</h3>
      <pre>{JSON.stringify(receipt, null, 2)}</pre>
    </section>
  )
}

