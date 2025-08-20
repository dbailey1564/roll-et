import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import App from './App'
import Player from './Player'
import House from './House'
import Stats from './Stats'
import './styles.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter basename="/roll-et">
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/player" element={<Player />} />
        <Route path="/house" element={<House />} />
        <Route path="/stats" element={<Stats />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>,
)
