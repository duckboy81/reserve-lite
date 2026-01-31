import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({ command }) => ({
  plugins: [
    react(),
    {
      name: 'csp-injector',
      transformIndexHtml(html) {
        const cspContent = command === 'build'
          ? "default-src 'self'; connect-src https://authsvc2.alpa.org https://gateway.alpa.org; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none';"
          : "default-src 'self' 'unsafe-inline' 'unsafe-eval' ws://localhost:* https://authsvc2.alpa.org https://gateway.alpa.org data:";

        return html.replace(
          '<meta name="csp-placeholder" />',
          `<meta http-equiv="Content-Security-Policy" content="${cspContent}">`
        );
      },
    },
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'masked-icon.svg'],
      manifest: {
        name: 'Reserve Lite',
        short_name: 'ReserveLite',
        description: 'Offline-capable flight reservation tool',
        theme_color: '#ffffff',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}']
      }
    })
  ],
}));

