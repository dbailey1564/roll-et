import React from 'react'
import { Link } from 'react-router-dom'
import type { RoundState } from '../types'

interface Props {
  roundState: RoundState
}

export function HeaderBar({ roundState }: Props) {
  return (
    <header className="header">
      <div className="left">
        <span className="seat">Seat: Open</span>
      </div>
      <h1>
        <Link to="/">Roll-et</Link>
      </h1>
      <div className="right">
        <div className="credits">
          Round: <span className={`roundstate ${roundState}`}>{roundState.toUpperCase()}</span>
        </div>
      </div>
    </header>
  )
}
