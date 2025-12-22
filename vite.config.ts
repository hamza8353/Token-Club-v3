import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'
import { nodePolyfills } from 'vite-plugin-node-polyfills'
import { VitePWA } from 'vite-plugin-pwa'

// Plugin to suppress sourcemap warnings
const suppressSourcemapWarnings = () => {
  return {
    name: 'suppress-sourcemap-warnings',
    enforce: 'pre' as const,
    buildStart() {
      const originalWarn = console.warn;
      console.warn = (...args: any[]) => {
        const message = args.join(' ');
        if (
          message.includes('Sourcemap for') && 
          message.includes('points to missing source files')
        ) {
          return;
        }
        originalWarn.apply(console, args);
      };
    },
  };
};

// Plugin to fix broken strings in vendor chunk
const fixBrokenStrings = () => {
  return {
    name: 'fix-broken-strings',
    generateBundle(options, bundle) {
      for (const fileName in bundle) {
        const chunk = bundle[fileName];
        if (chunk.type === 'chunk' && fileName.includes('vendor')) {
          // Fix broken string: request.url.indexOf("file: (unclosed)
          // This comes from a dependency (likely axios/fetch polyfill)
          if (chunk.code.includes('.indexOf("file:') && !chunk.code.includes('.indexOf("file://"')) {
            chunk.code = chunk.code.replace(/\.indexOf\("file:/g, '.indexOf("file://") === 0) {');
          }
        }
      }
    },
  };
};

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    suppressSourcemapWarnings(),
    fixBrokenStrings(),
    react({
      fastRefresh: true,
    }),
    nodePolyfills({
      include: ['assert', 'buffer', 'process', 'crypto'],
      globals: {
        Buffer: true,
        global: true,
        process: true,
      },
      protocolImports: true,
    }),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: [
        'favicon.svg',
        'favicon.ico',
        'favicon-96x96.png',
        'apple-touch-icon.png',
        'og-image.png',
        'logo.svg',
        'site.webmanifest',
      ],
      manifest: {
        name: 'TokenClub - Solana Token Platform',
        short_name: 'TokenClub',
        description: 'Create, swap, and manage Solana tokens instantly',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        background_color: '#0A0C0E',
        theme_color: '#0A0C0E',
        orientation: 'portrait-primary',
        categories: ['finance', 'business', 'utilities'],
        icons: [
          {
            src: '/web-app-manifest-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any maskable',
          },
          {
            src: '/web-app-manifest-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable',
          },
          {
            src: '/apple-touch-icon.png',
            sizes: '180x180',
            type: 'image/png',
            purpose: 'any',
          },
        ],
      },
      workbox: {
        cleanupOutdatedCaches: true,
        skipWaiting: true,
        clientsClaim: true,
      },
    }),
  ],
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
  define: {
    global: 'globalThis',
    'process.env': {},
  },
  build: {
    target: 'esnext',
    minify: 'esbuild',
    sourcemap: false,
    rollupOptions: {
      output: {
        format: 'es',
        manualChunks: (id) => {
          if (id.includes('node_modules')) {
            // Solana packages
            if (
              id.includes('@solana/') ||
              id.includes('bn.js') ||
              id.includes('bs58') ||
              id.includes('buffer')
            ) {
              return 'solana';
            }
            // React
            if (id.includes('react') || id.includes('react-dom')) {
              return 'react';
            }
            // Other large packages
            if (id.includes('@metaplex-foundation/')) {
              return 'metaplex';
            }
            if (id.includes('@meteora-ag/')) {
              return 'meteora';
            }
            if (id.includes('@reown/')) {
              return 'reown';
            }
            if (id.includes('framer-motion')) {
              return 'framer-motion';
            }
            // Everything else goes to vendor
            return 'vendor';
          }
        },
      },
    },
    chunkSizeWarningLimit: 1000,
  },
  optimizeDeps: {
    include: ['buffer', 'process'],
  },
})
