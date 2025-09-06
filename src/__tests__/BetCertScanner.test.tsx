// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest'
import { render, waitFor } from '@testing-library/react'
import React from 'react'
import BetCertScanner from '../components/BetCertScanner'
import { generateBetCert } from '../certs/betCert'

function subtle() { return globalThis.crypto.subtle }
async function genKeyPair() { return subtle().generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign','verify']) }

let mockData = ''
vi.mock('jsqr', () => ({ default: vi.fn(() => ({ data: mockData })) }))

describe('BetCertScanner', () => {
  it('accepts a valid cert', async () => {
    const house = await genKeyPair()
    const cert = await generateBetCert(
      {
        houseId: 'h1',
        roundId: 'r1',
        seat: 1,
        playerUidThumbprint: 'p1',
        certId: 'c1',
        betHash: 'h1',
        issuedAt: Date.now() - 1000,
        exp: Date.now() + 60000,
      },
      (house as CryptoKeyPair).privateKey,
    )
    mockData = JSON.stringify(cert)

    Object.defineProperty(navigator, 'mediaDevices', {
      value: { getUserMedia: vi.fn().mockResolvedValue({ getTracks: () => [] }) },
      configurable: true,
    })
    HTMLVideoElement.prototype.play = vi.fn().mockResolvedValue(undefined)
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => { cb(0); return 0 })
    HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue({
      drawImage: vi.fn(),
      getImageData: vi.fn().mockReturnValue({ data: new Uint8ClampedArray(), width: 0, height: 0 }),
    })

    const onCert = vi.fn()
    const { container } = render(
      <BetCertScanner housePublicKey={(house as CryptoKeyPair).publicKey} onCert={onCert} />
    )
    const video = container.querySelector('video') as HTMLVideoElement
    Object.defineProperty(video, 'videoWidth', { value: 100 })
    Object.defineProperty(video, 'videoHeight', { value: 100 })

    await waitFor(() => expect(onCert).toHaveBeenCalled())
  })

  it('rejects an invalid cert', async () => {
    const goodHouse = await genKeyPair()
    const badHouse = await genKeyPair()
    const cert = await generateBetCert(
      {
        houseId: 'h1',
        roundId: 'r1',
        seat: 1,
        playerUidThumbprint: 'p1',
        certId: 'c1',
        betHash: 'h1',
        issuedAt: Date.now() - 1000,
        exp: Date.now() + 60000,
      },
      (goodHouse as CryptoKeyPair).privateKey,
    )
    mockData = JSON.stringify(cert)

    Object.defineProperty(navigator, 'mediaDevices', {
      value: { getUserMedia: vi.fn().mockResolvedValue({ getTracks: () => [] }) },
      configurable: true,
    })
    HTMLVideoElement.prototype.play = vi.fn().mockResolvedValue(undefined)
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => { cb(0); return 0 })
    HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue({
      drawImage: vi.fn(),
      getImageData: vi.fn().mockReturnValue({ data: new Uint8ClampedArray(), width: 0, height: 0 }),
    })

    const onCert = vi.fn()
    const { container } = render(
      <BetCertScanner housePublicKey={(badHouse as CryptoKeyPair).publicKey} onCert={onCert} />
    )
    const video = container.querySelector('video') as HTMLVideoElement
    Object.defineProperty(video, 'videoWidth', { value: 100 })
    Object.defineProperty(video, 'videoHeight', { value: 100 })

    await waitFor(() => {
      const err = container.querySelector('.error')
      expect(err?.textContent).toBe('Invalid Bet Cert')
    })
    expect(onCert).not.toHaveBeenCalled()
  })
})

