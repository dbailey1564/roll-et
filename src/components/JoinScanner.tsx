import React from 'react'
import jsQR from 'jsqr'
import { parseJoinChallenge, validateJoinChallenge, createJoinResponse, JoinResponse } from '../join'

interface JoinScannerProps {
  playerId: string
  playerKey: CryptoKey
  playerSecret: CryptoKey
  rootKey: CryptoKey
  onResponse: (resp: JoinResponse) => void
}

export default function JoinScanner({ playerId, playerKey, playerSecret, rootKey, onResponse }: JoinScannerProps) {
  const videoRef = React.useRef<HTMLVideoElement>(null)
  const streamRef = React.useRef<MediaStream | null>(null)
  const detectorRef = React.useRef<any>(null)
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    let cancelled = false
    async function init() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
        if (cancelled) return
        streamRef.current = stream
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          await videoRef.current.play()
          requestAnimationFrame(scan)
        }
      } catch (e) {
        setError('Unable to access camera')
      }
    }
    init()
    return () => {
      cancelled = true
      streamRef.current?.getTracks().forEach(t => t.stop())
    }
  }, [])

  const scan = async () => {
    if (!videoRef.current) {
      requestAnimationFrame(scan)
      return
    }
    if ('BarcodeDetector' in window) {
      try {
        if (!detectorRef.current) {
          detectorRef.current = new (window as any).BarcodeDetector({ formats: ['qr_code'] })
        }
        const codes = await detectorRef.current.detect(videoRef.current)
        if (codes.length > 0) {
          handlePayload(codes[0].rawValue)
          return
        }
      } catch (err) {
        console.error(err)
      }
    } else {
      if (!canvasRef.current) {
        canvasRef.current = document.createElement('canvas')
      }
      const canvas = canvasRef.current
      const video = videoRef.current
      const ctx = canvas.getContext('2d')
      if (ctx && video.videoWidth > 0 && video.videoHeight > 0) {
        canvas.width = video.videoWidth
        canvas.height = video.videoHeight
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
        const code = jsQR(imageData.data, canvas.width, canvas.height)
        if (code) {
          handlePayload(code.data)
          return
        }
      }
    }
    requestAnimationFrame(scan)
  }

  const handlePayload = async (raw: string) => {
    try {
      const challenge = parseJoinChallenge(raw)
      const ok = await validateJoinChallenge(challenge, rootKey)
      if (!ok) {
        setError('Invalid join challenge')
        return
      }
      const resp = await createJoinResponse(playerId, challenge, playerSecret, playerKey)
      onResponse(resp)
      streamRef.current?.getTracks().forEach(t => t.stop())
    } catch (e) {
      setError('Scan failed')
    }
  }

  return (
    <div>
      <video ref={videoRef} style={{ width: '100%' }} />
      {error && <div className="error">{error}</div>}
    </div>
  )
}
