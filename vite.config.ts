import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'
import { nodePolyfills } from 'vite-plugin-node-polyfills'
import { VitePWA } from 'vite-plugin-pwa'

// Plugin to suppress sourcemap warnings for packages with missing source files
const suppressSourcemapWarnings = () => {
  return {
    name: 'suppress-sourcemap-warnings',
    enforce: 'pre' as const,
    configureServer(server) {
      // Suppress sourcemap warnings in dev server
      server.middlewares.use((req, res, next) => {
        const originalWarn = console.warn;
        console.warn = (...args: any[]) => {
          const message = args.join(' ');
          // Suppress sourcemap warnings for Metaplex and other packages
          if (
            message.includes('Sourcemap for') && 
            message.includes('points to missing source files')
          ) {
            return;
          }
          originalWarn.apply(console, args);
        };
        next();
      });
    },
    buildStart() {
      // Override console.warn to filter out sourcemap warnings during build
      const originalWarn = console.warn;
      console.warn = (...args: any[]) => {
        const message = args.join(' ');
        // Suppress sourcemap warnings for Metaplex and other packages
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

// Plugin to inject Buffer global setup in Solana chunk without redeclaring Buffer
const setupBufferGlobals = () => {
  return {
    name: 'setup-buffer-globals',
    generateBundle(options, bundle) {
      // Find Solana chunk and inject Buffer setup code AFTER imports
      for (const fileName in bundle) {
        const chunk = bundle[fileName];
        if (chunk.type === 'chunk' && chunk.name === 'solana') {
          // Find where imports end and inject setup code there
          // This ensures Buffer is available when we try to access it
          const importEnd = chunk.code.lastIndexOf('import ');
          if (importEnd !== -1) {
            // Find the end of the last import statement
            const lastImportEnd = chunk.code.indexOf('\n', importEnd);
            if (lastImportEnd !== -1) {
              // Inject setup code right after imports
              const setupCode = `\n(function(){try{const B=typeof Buffer!=='undefined'?Buffer:void 0;if(B){if(typeof globalThis!=='undefined'){globalThis.Buffer=B;globalThis.global=globalThis;}if(typeof window!=='undefined'){window.Buffer=B;window.global=window;window.globalThis=window;}if(typeof global!=='undefined'){global.Buffer=B;}}}catch(e){}})();`;
              chunk.code = chunk.code.slice(0, lastImportEnd + 1) + setupCode + chunk.code.slice(lastImportEnd + 1);
            } else {
              // Fallback: inject at beginning
              const setupCode = `(function(){try{const B=typeof Buffer!=='undefined'?Buffer:void 0;if(B){if(typeof globalThis!=='undefined'){globalThis.Buffer=B;globalThis.global=globalThis;}if(typeof window!=='undefined'){window.Buffer=B;window.global=window;window.globalThis=window;}if(typeof global!=='undefined'){global.Buffer=B;}}}catch(e){}})();`;
              chunk.code = setupCode + chunk.code;
            }
          } else {
            // No imports found, inject at beginning
            const setupCode = `(function(){try{const B=typeof Buffer!=='undefined'?Buffer:void 0;if(B){if(typeof globalThis!=='undefined'){globalThis.Buffer=B;globalThis.global=globalThis;}if(typeof window!=='undefined'){window.Buffer=B;window.global=window;window.globalThis=window;}if(typeof global!=='undefined'){global.Buffer=B;}}}catch(e){}})();`;
            chunk.code = setupCode + chunk.code;
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
    setupBufferGlobals(),
    react({
      // Enable Fast Refresh
      fastRefresh: true,
    }),
    nodePolyfills({
      // Enable polyfills for Node.js modules
      include: ['assert', 'buffer', 'process', 'crypto'],
      globals: {
        Buffer: true,
        global: true,
        process: true,
      },
      // Ensure Buffer is available before other modules load
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
        clientsClaim: true,
        skipWaiting: true,
        navigateFallback: '/index.html',
        globPatterns: ['**/*.{js,css,html,ico,png,svg,webp,woff2}'],
        // Increase file size limit to handle large vendor bundles
        maximumFileSizeToCacheInBytes: 10 * 1024 * 1024, // 10 MB
        // Exclude large files from precaching (they'll be cached on demand)
        globIgnores: [
          '**/favicon.svg',
          '**/*.map',
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
  define: {
    'global': 'globalThis',
    'process.env': {},
    'process.browser': true,
  },
  build: {
    target: 'esnext',
    // Disable minification entirely to prevent bs58/buffer errors
    // Server-side compression (gzip/brotli) will still reduce file sizes
    minify: false,
    cssMinify: true,
    // Ensure proper module format
    modulePreload: {
      polyfill: true,
      resolveDependencies: (filename, deps) => {
        // Filter out any data URIs or invalid modulepreload entries
        return deps.filter(dep => !dep.startsWith('data:'));
      },
    },
    // Enable source maps for debugging (disable in production for smaller bundles)
    sourcemap: false,
    // Optimize chunk splitting
    rollupOptions: {
      output: {
        // Ensure proper format for ES modules
        format: 'es',
        // Hoist transitive imports to prevent circular dependency issues
        hoistTransitiveImports: true,
        // Use external live bindings to handle circular dependencies properly
        externalLiveBindings: false,
        // Experimental: Set minimum chunk size to encourage more splitting
        experimentalMinChunkSize: 20000, // 20KB minimum to prevent huge chunks
        manualChunks: (id) => {
          // Split node_modules into separate chunks to avoid circular dependencies
          if (id.includes('node_modules')) {
            // polyfills.ts must be in the entry chunk to ensure Buffer loads first
            // Solana packages - bundle Buffer and BN WITH Solana to ensure they're always available
            // This prevents initialization order issues
            if (id.includes('@solana/')) {
              return 'solana';
            }
            // BN.js - bundle with Solana packages to prevent "Cannot access BN before initialization"
            // Solana packages depend on BN, so they must be together
            if (id.includes('bn.js')) {
              return 'solana'; // Bundle BN with Solana
            }
            // Buffer - bundle with Solana packages so they're always together
            // This ensures Buffer is available when Solana chunk executes
            if (id.includes('buffer') && !id.includes('bs58') && !id.includes('base-x')) {
              return 'solana'; // Bundle Buffer with Solana
            }
            // Crypto-related packages - keep separate to avoid minification issues
            if (id.includes('crypto') || id.includes('@noble/')) {
              return 'crypto';
            }
            // Metaplex packages
            if (id.includes('@metaplex-foundation/')) {
              return 'metaplex';
            }
            // Meteora packages
            if (id.includes('@meteora-ag/')) {
              return 'meteora';
            }
            // Reown/AppKit packages - split further to reduce chunk size
            if (id.includes('@reown/appkit')) {
              return 'reown-core';
            }
            if (id.includes('@reown/appkit-adapter')) {
              return 'reown-adapter';
            }
            if (id.includes('@reown/') || id.includes('@walletconnect/')) {
              return 'reown';
            }
            // React packages
            if (id.includes('react') || id.includes('react-dom')) {
              return 'react';
            }
            // Icons
            if (id.includes('lucide-react')) {
              return 'icons';
            }
            // Framer Motion - separate chunk
            if (id.includes('framer-motion')) {
              return 'framer-motion';
            }
            // Viem and related packages - separate chunk (used by Reown)
            if (id.includes('viem') || id.includes('@wagmi/')) {
              return 'viem';
            }
            // Don't split bs58 - let it bundle with packages that use it
            // This avoids dependency resolution issues (base-x, etc.)
            if (id.includes('bs58') || id.includes('base-x')) {
              // Return undefined to let it bundle with its parent
              return undefined;
            }
            // Split other vendor packages into smaller chunks
            // Large utility libraries
            if (id.includes('lodash') || id.includes('ramda')) {
              return 'utils';
            }
            // Other vendor packages
            return 'vendor';
          }
          // Split modules into separate chunks
          if (id.includes('/modules/')) {
            return 'modules';
          }
        },
        // Optimize chunk file names
        chunkFileNames: 'assets/js/[name]-[hash].js',
        entryFileNames: 'assets/js/[name]-[hash].js',
        assetFileNames: 'assets/[ext]/[name]-[hash].[ext]',
      },
      onwarn(warning, warn) {
        // Suppress sourcemap warnings for Metaplex package
        if (warning.code === 'SOURCEMAP_ERROR' && warning.id?.includes('@metaplex-foundation/mpl-token-metadata')) {
          return;
        }
        // Suppress circular dependency warnings for crypto-related packages
        if (warning.code === 'CIRCULAR_DEPENDENCY' && warning.message?.includes('crypto')) {
          return;
        }
        // Suppress circular dependency warnings for encoding packages
        if (warning.code === 'CIRCULAR_DEPENDENCY' && (warning.message?.includes('bs58') || warning.message?.includes('buffer'))) {
          return;
        }
        // Suppress circular dependency warnings for Solana packages (they have internal circular deps)
        if (warning.code === 'CIRCULAR_DEPENDENCY' && warning.message?.includes('@solana/')) {
          return;
        }
        // Suppress circular dependency warnings for BN
        if (warning.code === 'CIRCULAR_DEPENDENCY' && warning.message?.includes('bn.js')) {
          return;
        }
        warn(warning);
      },
      // Use exports mode to prevent circular dependency issues
      preserveEntrySignatures: 'exports-only',
    },
    chunkSizeWarningLimit: 500, // Lower limit to encourage better chunking
    // Enable compression
    reportCompressedSize: true,
  },
  optimizeDeps: {
    include: ['react', 'react-dom', 'lucide-react'],
    exclude: [
      'vite-plugin-node-polyfills',
      'vite-plugin-node-polyfills/shims',
    ],
    // Pre-bundle dependencies for faster dev server
    esbuildOptions: {
      target: 'esnext',
      // Transform CommonJS modules
      format: 'esm',
    },
  },
  server: {
    port: 3000,
    open: true,
    // Enable HMR for faster development
    hmr: {
      overlay: true,
    },
  },
  // Suppress sourcemap warnings for packages with missing source files
  logLevel: 'warn',
  // Enable CSS code splitting
  css: {
    devSourcemap: false,
  },
})

