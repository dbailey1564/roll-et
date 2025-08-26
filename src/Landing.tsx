import React from 'react'
import { Link, useNavigate } from 'react-router-dom'
import './styles.css'

export default function Landing() {
  const navigate = useNavigate()

  const handleJoinClick = async () => {
    if (!localStorage.getItem('cameraGranted')) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true })
        stream.getTracks().forEach((track) => track.stop())
        localStorage.setItem('cameraGranted', 'true')
      } catch (e) {
        alert('Camera permission is required to join the game.')
        return
      }
    }
    navigate('/player')
  }

  return (
    <div className="container">
      <header className="header">
        <div className="left" />
        <h1>Roll-et</h1>
        <div className="right" />
      </header>

      <section className="controls">
        <div className="actions">
          <button className="link-btn" onClick={handleJoinClick}>Join</button>
          <Link className="link-btn" to="/house">Host</Link>
        </div>
      </section>

      <footer className="footer-bar">
        <div className="left" />
        <div className="center">© Kraken Consulting, LLC (Dev Team)</div>
        <div className="right" />
      </footer>
    </div>
  )
}

