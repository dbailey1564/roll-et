import React from 'react'
import { useNavigate } from 'react-router-dom'
import { HouseCert, validateHouseCert } from './certs/houseCert'
import { syncWithAuthority } from './ledger/sync'
import {
  houseCertRootPublicKeyJwk,
  isAuthorizedHouseCert,
} from './certs/authorizedHouseCertLedger'
import './styles.css'
import { useHouse } from './context/GameContext'

export default function Landing() {
  const navigate = useNavigate()
  const { houseKey } = useHouse()

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

  const handleHostClick = async () => {
    const stored = localStorage.getItem('houseCert')
    if (!stored) {
      navigate('/purchase-house-cert')
      return
    }

    try {
      const cert: HouseCert = JSON.parse(stored)
      const rootKey = await globalThis.crypto.subtle.importKey(
        'jwk',
        houseCertRootPublicKeyJwk,
        { name: 'ECDSA', namedCurve: 'P-256' },
        true,
        ['verify']
      )
      const valid = await validateHouseCert(cert, rootKey)
      const authorized = isAuthorizedHouseCert(cert)
      if (valid && authorized) {
        const result = await syncWithAuthority(cert, houseKey?.privateKey || null)
        if (!result.ok) {
          alert('Online sync required to host: ' + result.error)
          return
        }
        navigate('/house')
      } else {
        navigate('/purchase-house-cert')
      }
    } catch (e) {
      navigate('/purchase-house-cert')
    }
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
          <button className="link-btn host-btn" onClick={handleHostClick}>Host</button>
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

