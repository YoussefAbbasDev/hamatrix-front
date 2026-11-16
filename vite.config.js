import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

const clientRoot = path.dirname(fileURLToPath(import.meta.url));

/**
 * Reads client/.env and client/.env.local directly instead of using Vite's
 * loadEnv: loadEnv promotes NODE_ENV into VITE_USER_NODE_ENV, which would build
 * the client with the React development bundle.
 */
function readClientEnv() {
  const merged = {};
  for (const name of ['.env', '.env.local']) {
    const file = path.join(clientRoot, name);
    if (fs.existsSync(file)) Object.assign(merged, dotenv.parse(fs.readFileSync(file)));
  }
  return merged;
}

export default defineConfig(() => {
  const fileEnv = readClientEnv();

  // Where the dev server proxies /api, /uploads and /socket.io. This is the
  // only place the client needs to know the API address; VITE_API_URL is
  // reserved for deployments where the API lives on a different origin.
  const apiTarget =
    process.env.VITE_API_PROXY_TARGET ||
    fileEnv.VITE_API_PROXY_TARGET ||
    'http://127.0.0.1:4000';

  const devPort = Number(
    process.env.VITE_DEV_PORT || fileEnv.VITE_DEV_PORT || 5173,
  );

  const proxy = { target: apiTarget, changeOrigin: true };

  return {
    plugins: [
      react(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['logo.png', 'icon-192.png', 'icon-512.png'],
        manifest: {
          name: 'HAMATRIX — إدارة كافيه الألعاب',
          short_name: 'HAMATRIX',
          description: 'نظام إدارة كافيه ألعاب: أجهزة، جلسات، مشتريات، مخزون، وسجلات.',
          lang: 'ar',
          dir: 'rtl',
          theme_color: '#0B0A14',
          background_color: '#0B0A14',
          display: 'standalone',
          orientation: 'portrait-primary',
          start_url: '/',
          scope: '/',
          icons: [
            { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
            { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
            {
              src: '/icon-maskable-512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable',
            },
          ],
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
          // Classic script with the `push` / `notificationclick` handlers.
          importScripts: ['push-handler.js'],
          navigateFallback: '/index.html',
          navigateFallbackDenylist: [/^\/api/, /^\/uploads/, /^\/socket\.io/],
          runtimeCaching: [
            {
              urlPattern: /^\/api\//,
              handler: 'NetworkOnly',
            },
            {
              urlPattern: /^\/uploads\//,
              handler: 'NetworkOnly',
            },
          ],
        },
        devOptions: { enabled: false },
      }),
    ],
    server: {
      port: devPort,
      host: true,
      proxy: {
        '/api': proxy,
        '/uploads': proxy,
        '/socket.io': { ...proxy, ws: true },
      },
    },
    build: {
      outDir: 'dist',
      sourcemap: false,
      target: 'es2020',
    },
    test: {
      environment: 'jsdom',
      globals: true,
      setupFiles: ['./src/test/setup.js'],
      include: ['src/**/*.test.{js,jsx}'],
      css: false,
    },
  };
});
