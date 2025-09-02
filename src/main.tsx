// NOTE FOR CODEX: See AGENTS.md before making changes.
// AGENTS.md is the authoritative manifest of agents, responsibilities, and workflow.
import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import App from './App'
import Player from './Player'
import House from './House'
import Stats from './Stats'
import Landing from './Landing'
import PurchaseHouseCert from './PurchaseHouseCert'
import { GameProvider } from './context/GameContext'
import './styles.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <GameProvider>
      <BrowserRouter basename="/roll-et">
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/game" element={<App />} />
          <Route path="/player" element={<Player />} />
          <Route path="/house" element={<House />} />
          <Route path="/purchase-house-cert" element={<PurchaseHouseCert />} />
          <Route path="/stats" element={<Stats />} />
        </Routes>
      </BrowserRouter>
    </GameProvider>
  </React.StrictMode>,
)
