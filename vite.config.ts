import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  base: '/roll-et/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/icon-192.png','icons/icon-512.png','icons/maskable-192.png','icons/maskable-512.png','favicon.svg'],
      manifest: {
        name: 'Roll‑et',
        short_name: 'Roll‑et',
        description: 'Single d20 roulette-inspired game with installable PWA.',
        start_url: '/roll-et/',
        scope: '/roll-et/',
        display: 'standalone',
        background_color: '#0b1220',
        theme_color: '#0ea5e9',
        categories: ['games'],
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/maskable-192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
          { src: 'icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
        ]
      },
    })
  ]
});
