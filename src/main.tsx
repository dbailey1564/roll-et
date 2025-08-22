import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import App from './App'
import Player from './Player'
import House from './House'
import Stats from './Stats'
import Landing from './Landing'
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
          <Route path="/stats" element={<Stats />} />
        </Routes>
      </BrowserRouter>
    </GameProvider>
  </React.StrictMode>,
)
