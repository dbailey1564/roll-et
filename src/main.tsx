import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import App from './App'
import Stats from './Stats'
import './styles.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter basename="/roll-et">
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/stats" element={<Stats />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>,
)
