import React from 'react'
import { useNavigate } from 'react-router-dom'
import type { HouseCert } from './certs/houseCert'
import { houseCertRootPublicKeyJwk, isAuthorizedHouseCert } from './certs/authorizedHouseCertLedger'
import { validateHouseCert } from './certs/houseCert'

export default function PurchaseHouseCert() {
  const [text, setText] = React.useState('')
  const [error, setError] = React.useState<string | null>(null)
  const [ok, setOk] = React.useState(false)
  const navigate = useNavigate()

  const validate = async (cert: HouseCert): Promise<boolean> => {
    try {
      const rootKey = await globalThis.crypto.subtle.importKey(
        'jwk',
        houseCertRootPublicKeyJwk,
        { name: 'ECDSA', namedCurve: 'P-256' },
        true,
        ['verify']
      )
      const valid = await validateHouseCert(cert, rootKey)
      const authorized = isAuthorizedHouseCert(cert)
      return valid && authorized
    } catch {
      return false
    }
  }

  const onImport = async () => {
    setError(null)
    try {
      const cert = JSON.parse(text) as HouseCert
      const good = await validate(cert)
      if (!good) {
        setError('Certificate failed validation or is not authorized.')
        setOk(false)
        return
      }
      localStorage.setItem('houseCert', JSON.stringify(cert))
      setOk(true)
    } catch (e: any) {
      setError('Invalid JSON')
      setOk(false)
    }
  }

  return (
    <div className="container">
      <header className="header">
        <div className="left" />
        <h1>House Certificate</h1>
        <div className="right" />
      </header>

      <section className="bets">
        <p>Paste your House Certificate JSON below to install it on this device.</p>
        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder='{ "payload": { ... }, "signature": "..." }'
          rows={12}
          style={{ width: '100%' }}
        />
        <div style={{ marginTop: 8 }}>
          <button onClick={onImport}>Import Certificate</button>
          <button onClick={() => navigate('/')}>Back</button>
        </div>
        {error && <div className="error">{error}</div>}
        {ok && <div className="success">Certificate installed.</div>}
      </section>
    </div>
  )
}
