// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import React from 'react';
import { issueHouseCert } from '../certs/houseCert';
import { createJoinChallenge } from '../join';

function subtle() {
  return globalThis.crypto.subtle;
}
async function genKeyPair() {
  return subtle().generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, [
    'sign',
    'verify',
  ]);
}

let mockData = '';
vi.mock('jsqr', () => ({ default: vi.fn(() => ({ data: mockData })) }));

import JoinScanner from '../components/JoinScanner';

describe('JoinScanner fallback', () => {
  it('uses jsQR when BarcodeDetector is unavailable', async () => {
    const root = await genKeyPair();
    const house = await genKeyPair();
    const player = await genKeyPair();

    const houseCert = await issueHouseCert(
      {
        houseId: 'h1',
        kid: 'k1',
        housePubKey: await subtle().exportKey('jwk', house.publicKey),
        notBefore: Date.now() - 1000,
        notAfter: Date.now() + 60_000,
        roles: ['host rounds'],
      },
      root.privateKey,
    );

    const challenge = await createJoinChallenge(houseCert, 'r1');
    mockData = JSON.stringify(challenge);

    Object.defineProperty(navigator, 'mediaDevices', {
      value: {
        getUserMedia: vi.fn().mockResolvedValue({ getTracks: () => [] }),
      },
      configurable: true,
    });

    HTMLVideoElement.prototype.play = vi.fn().mockResolvedValue(undefined);

    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
      cb(0);
      return 0;
    });

    HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue({
      drawImage: vi.fn(),
      getImageData: vi
        .fn()
        .mockReturnValue({
          data: new Uint8ClampedArray(),
          width: 0,
          height: 0,
        }),
    });

    const onResponse = vi.fn();

    const { container } = render(
      <JoinScanner
        playerKeys={player as CryptoKeyPair}
        rootKey={root.publicKey}
        onResponse={onResponse}
      />,
    );

    const video = container.querySelector('video') as HTMLVideoElement;
    Object.defineProperty(video, 'videoWidth', { value: 100 });
    Object.defineProperty(video, 'videoHeight', { value: 100 });

    await waitFor(() => expect(onResponse).toHaveBeenCalled());
    expect(onResponse.mock.calls[0][0].round).toBe('r1');
  });
});
