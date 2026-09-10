import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'node:path'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon-32.png', 'favicon-64.png', 'apple-touch-icon.png', 'mascot-kco.png', 'logo-kco.png'],
      manifest: {
        name: 'KCO Learning',
        short_name: 'KCO Learning',
        description: 'Training and quick reference for the KCO Sales and Chat Support team.',
        theme_color: '#14a80d',
        background_color: '#f7f8f8',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        scope: '/',
        categories: ['education', 'business'],
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        // The whole app is client-side with local data, so the shell is the app.
        navigateFallback: '/index.html',
        cleanupOutdatedCaches: true,
        // The animated emoji are large and immutable, so they are cached on
        // first sight rather than precached - the app shell stays small and
        // an emoji seen once keeps working offline.
        runtimeCaching: [
          {
            urlPattern: /\/emoji\/[^/]+\.json$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'noto-emoji-animation',
              expiration: { maxEntries: 120, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
      devOptions: { enabled: false },
    }),
  ],
  resolve: {
    alias: { '@': path.resolve(import.meta.dirname, './src') },
  },
  build: {
    rollupOptions: {
      output: {
        // Split the vendor weight so the learner shell is not held up by
        // editor-only dependencies.
        manualChunks: {
          react: ['react', 'react-dom', 'react-router-dom'],
          motion: ['motion'],
          radix: [
            '@radix-ui/react-dialog',
            '@radix-ui/react-dropdown-menu',
            '@radix-ui/react-popover',
            '@radix-ui/react-select',
            '@radix-ui/react-tabs',
            '@radix-ui/react-tooltip',
          ],
        },
      },
    },
  },
  server: { port: 5173 },
})
