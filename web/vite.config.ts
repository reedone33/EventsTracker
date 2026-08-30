// Vite is the build tool. It runs a fast development server while you work,
// and bundles everything into plain files for the browser when you publish.
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    // Teaches Vite how to understand React's JSX syntax (the HTML-like code in .tsx files).
    react(),

    // Turns the site into an installable app: it can be added to a phone's home
    // screen, opens without browser chrome, and keeps working with no signal.
    VitePWA({
      // Update in the background and switch over on the next open, rather than
      // interrupting to ask. There is no server-side data to go stale, so a
      // silent update is safe here.
      registerType: 'autoUpdate',

      // Files copied straight through to the built site.
      includeAssets: ['apple-touch-icon.png'],

      manifest: {
        name: 'Events Tracker',
        short_name: 'Events',
        description: 'Track events and see how often they happen.',
        // Opens like an app: no address bar, no browser tabs.
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#000000',
        theme_color: '#1c1c1e',
        // Relative so the app works from a project subfolder on GitHub Pages.
        start_url: './',
        scope: './',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          {
            src: 'icon-maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            // Android crops icons to its own shape; this one has padding to survive it.
            purpose: 'maskable',
          },
        ],
      },

      workbox: {
        // Store the whole app for offline use. It is small, and there is no
        // server to fetch anything from — all the data lives in the browser.
        globPatterns: ['**/*.{js,css,html,png,svg,woff2}'],
        // Map tiles come from OpenStreetMap, so they need the network. Keep the
        // most recent ones so a previously viewed map still draws when offline.
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/[a-c]\.tile\.openstreetmap\.org\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'osm-tiles',
              expiration: { maxEntries: 300, maxAgeSeconds: 60 * 60 * 24 * 30 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
  ],

  // Where the app will live once published.
  //
  // "./" makes every link relative, so the app works from any folder — which is
  // what GitHub Pages needs when the site sits at /<repo-name>/ rather than at
  // the root of a domain.
  base: './',

  server: {
    port: 5173,
    open: true, // Open the browser automatically when you run `npm run dev`.
  },
})
