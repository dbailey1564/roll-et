// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest'
import { render, waitFor } from '@testing-library/react'
import React from 'react'
import BankReceiptScanner from '../components/BankReceiptScanner'
import { issueBankReceipt } from '../certs/bankReceipt'

function subtle() { return globalThis.crypto.subtle }
async function genKeyPair() { return subtle().generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign','verify']) }

let mockData = ''
vi.mock('jsqr', () => ({ default: vi.fn(() => ({ data: mockData })) }))

describe('BankReceiptScanner', () => {
  it('accepts a valid receipt', async () => {
    const house = await genKeyPair()
    const receipt = await issueBankReceipt({
      receiptId: 'r1',
      player: 'p1',
      round: 'rd1',
      value: 100,
      nbf: Date.now() - 1000,
      exp: Date.now() + 60000,
      betCertRef: 'c1',
    }, (house as CryptoKeyPair).privateKey)
    mockData = JSON.stringify(receipt)

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

    const onReceipt = vi.fn()
    const { container } = render(
      <BankReceiptScanner housePublicKey={(house as CryptoKeyPair).publicKey} onReceipt={onReceipt} />
    )
    const video = container.querySelector('video') as HTMLVideoElement
    Object.defineProperty(video, 'videoWidth', { value: 100 })
    Object.defineProperty(video, 'videoHeight', { value: 100 })

    await waitFor(() => expect(onReceipt).toHaveBeenCalled())
  })

  it('rejects an invalid receipt', async () => {
    const goodHouse = await genKeyPair()
    const badHouse = await genKeyPair()
    const receipt = await issueBankReceipt({
      receiptId: 'r1',
      player: 'p1',
      round: 'rd1',
      value: 100,
      nbf: Date.now() - 1000,
      exp: Date.now() + 60000,
      betCertRef: 'c1',
    }, (goodHouse as CryptoKeyPair).privateKey)
    mockData = JSON.stringify(receipt)

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

    const onReceipt = vi.fn()
    const { container } = render(
      <BankReceiptScanner housePublicKey={(badHouse as CryptoKeyPair).publicKey} onReceipt={onReceipt} />
    )
    const video = container.querySelector('video') as HTMLVideoElement
    Object.defineProperty(video, 'videoWidth', { value: 100 })
    Object.defineProperty(video, 'videoHeight', { value: 100 })

    await waitFor(() => {
      const err = container.querySelector('.error')
      expect(err?.textContent).toBe('Invalid Bank Receipt')
    })
    expect(onReceipt).not.toHaveBeenCalled()
  })
})
