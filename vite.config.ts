import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  base: '/roll-et/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
         cleanupOutdatedCaches: true,
         clientsClaim: true,
         skipWaiting: true,
         navigateFallback: '/roll-et/offline.html',
         runtimeCaching: [
           {
             urlPattern: ({ url }) => url.pathname.startsWith('/api'),
             method: 'GET',
             handler: 'NetworkFirst',
             options: {
               cacheName: 'api-cache',
               networkTimeoutSeconds: 10,
               expiration: {
                 maxEntries: 50,
                 maxAgeSeconds: 60 * 60,
               },
               cacheableResponse: {
                 statuses: [0, 200],
               },
             },
           },
         ],
      },
      includeAssets: ['icons/icon-192.png','icons/icon-512.png','icons/maskable-192.png','icons/maskable-512.png','favicon.svg','offline.html'],
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
