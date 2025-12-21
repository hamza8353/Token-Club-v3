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

// Plugin to inject Buffer global setup in Solana chunks
// CRITICAL: Buffer must be available globally when solana-core code runs
const setupBufferGlobals = () => {
  return {
    name: 'setup-buffer-globals',
    renderChunk(code, chunk, options) {
      // Handle solana-core chunk - Buffer must be available immediately after imports
      if (chunk.name === 'solana-core') {
        // Find all import statements - they end with a newline
        // Match: import ... from '...' followed by newline
        const lines = code.split('\n');
        let lastImportLineIndex = -1;
        for (let i = 0; i < lines.length; i++) {
          if (lines[i].trim().startsWith('import ') && lines[i].includes(' from ')) {
            lastImportLineIndex = i;
          }
        }
        
        // If we found imports, inject Buffer setup right after the last import line
        if (lastImportLineIndex >= 0) {
          // Calculate the insert point after the last import line
          let charIndex = 0;
          for (let i = 0; i <= lastImportLineIndex; i++) {
            charIndex += lines[i].length + 1; // +1 for the newline
          }
          
          // CRITICAL: Don't access Buffer$1 or safeBufferExports here - they're in temporal dead zone!
          // The setup code runs immediately after imports, but imports aren't initialized yet
          // Instead, rely ONLY on global Buffer that should be set by solana-deps chunk (which loads first)
          // solana-deps sets Buffer globally, so we can access it from global scope here
          const setupCode = `\n(function(){try{let B;if(typeof globalThis!=='undefined'&&globalThis.Buffer){B=globalThis.Buffer;}else if(typeof window!=='undefined'&&window.Buffer){B=window.Buffer;}else if(typeof global!=='undefined'&&global.Buffer){B=global.Buffer;}else if(typeof Buffer!=='undefined'){B=Buffer;}if(B){if(typeof globalThis!=='undefined'){globalThis.Buffer=B;globalThis.global=globalThis;}if(typeof window!=='undefined'){window.Buffer=B;window.global=window;window.globalThis=window;}if(typeof global!=='undefined'){global.Buffer=B;}}}catch(e){}})();`;
          
          // Also fix any direct access to safeBufferExports.Buffer to handle undefined case
          // Replace: var _Buffer = safeBufferExports.Buffer;
          // CRITICAL: _Buffer is assigned at module init, but Buffer might not be available yet
          // Solution: Make _Buffer a lazy getter that accesses Buffer when actually used
          // This ensures Buffer is available (from Buffer$1 or global) when methods are called
          let fixedCode = code;
          // Replace with a Proxy that lazily evaluates Buffer when properties are accessed
          // CRITICAL: Cannot access Buffer$1 or safeBufferExports here - they're in TDZ
          // Use ONLY global Buffer sources that are set by the setup code (which runs after imports)
          // The setup code sets Buffer globally, so by the time Proxy getter is called, Buffer should be available
          fixedCode = fixedCode.replace(
            /var\s+_Buffer\s*=\s*safeBufferExports\.Buffer;/g,
            'var _Buffer = (function(){var _cachedBuffer;function _getBuffer(){if(_cachedBuffer)return _cachedBuffer;if(typeof Buffer!==\'undefined\'){_cachedBuffer=Buffer;}else if(typeof globalThis!==\'undefined\'&&globalThis.Buffer){_cachedBuffer=globalThis.Buffer;}else if(typeof window!==\'undefined\'&&window.Buffer){_cachedBuffer=window.Buffer;}else if(typeof global!==\'undefined\'&&global.Buffer){_cachedBuffer=global.Buffer;}if(!_cachedBuffer)throw new Error(\'Buffer is not available. Ensure solana-deps chunk loads first and setup code runs.\');return _cachedBuffer;}return new Proxy({},{get:function(t,p){var B=_getBuffer();return typeof B[p]===\'function\'?B[p].bind(B):B[p];}});})();'
          );
          
          // Also need to replace all uses of _Buffer.method() with getBuffer().method()
          // Actually, better: make _Buffer an object with a getter, or use a function
          // Wait, the issue is that _Buffer is used like _Buffer.allocUnsafe(), so we need it to be the Buffer object
          // Let's try a different approach: use Object.defineProperty to create a lazy getter
          // Actually, simplest: replace with a function that returns Buffer, then wrap all _Buffer usages
          // But that's complex. Let's try making _Buffer a getter property instead
          
          // Better approach: Replace with immediate function that gets Buffer when called
          // But _Buffer needs to be the actual Buffer object, not a function
          // So we need to ensure Buffer is available. Let's try accessing Buffer$1 after module init
          // Actually, let's use a different pattern: create _Buffer as a property with getter
          
          // Simplest fix: Use Buffer$1 directly but wrap in try-catch and fallback
          // The key is that by the time _Buffer is USED (not assigned), Buffer$1 should be available
          // So we can use a function that gets called when _Buffer is accessed
          // But _Buffer is used as an object, not a function, so we need a Proxy or getter
          
          // Actually, the real issue: _Buffer is assigned once, but Buffer might not be ready
          // Solution: Make _Buffer a getter that accesses Buffer$1 when the property is accessed
          // Use Object.defineProperty or Proxy
          
          // Let me try a simpler approach: Just ensure Buffer$1 is used, but wrap it so it doesn't throw
          // We'll use a function that returns Buffer, and make _Buffer call that function
          // But _Buffer.allocUnsafe() won't work if _Buffer is a function
          
          // Best solution: Replace _Buffer with a Proxy that lazily gets Buffer when properties are accessed
          // Use cached Buffer to avoid repeated lookups and ensure Buffer is available
          fixedCode = fixedCode.replace(
            /var\s+_Buffer\s*=\s*\(function getBuffer\(\)\{var B;if\(typeof Buffer\$1!==\'undefined\'\)\{B=Buffer\$1;\}else if\(typeof safeBufferExports!==\'undefined\'&&safeBufferExports&&safeBufferExports\.Buffer\)\{B=safeBufferExports\.Buffer;\}else if\(typeof Buffer!==\'undefined\'\)\{B=Buffer;\}else if\(typeof globalThis!==\'undefined\'&&globalThis\.Buffer\)\{B=globalThis\.Buffer;\}else if\(typeof window!==\'undefined\'&&window\.Buffer\)\{B=window\.Buffer;\}else if\(typeof global!==\'undefined\'&&global\.Buffer\)\{B=global\.Buffer;\}return B;\}\)\(\);/g,
            '(function(){var _cachedBuffer;function _getBuffer(){if(_cachedBuffer)return _cachedBuffer;if(typeof Buffer$1!==\'undefined\'){_cachedBuffer=Buffer$1;}else if(typeof safeBufferExports!==\'undefined\'&&safeBufferExports&&safeBufferExports.Buffer){_cachedBuffer=safeBufferExports.Buffer;}else if(typeof Buffer!==\'undefined\'){_cachedBuffer=Buffer;}else if(typeof globalThis!==\'undefined\'&&globalThis.Buffer){_cachedBuffer=globalThis.Buffer;}else if(typeof window!==\'undefined\'&&window.Buffer){_cachedBuffer=window.Buffer;}else if(typeof global!==\'undefined\'&&global.Buffer){_cachedBuffer=global.Buffer;}if(!_cachedBuffer)throw new Error(\'Buffer is not available. Ensure solana-deps chunk loads first.\');return _cachedBuffer;}return new Proxy({},{get:function(t,p){var B=_getBuffer();return typeof B[p]===\'function\'?B[p].bind(B):B[p];}});})()'
          );
          
          // Also need to replace the IIFE pattern with actual _Buffer assignment
          // The IIFE should return the Proxy, and we assign it to _Buffer
          fixedCode = fixedCode.replace(
            /\(function\(\)\{var _cachedBuffer;function _getBuffer\(\)\{if\(_cachedBuffer\)return _cachedBuffer;if\(typeof Buffer\$1!==\'undefined\'\)\{_cachedBuffer=Buffer\$1;\}else if\(typeof safeBufferExports!==\'undefined\'&&safeBufferExports&&safeBufferExports\.Buffer\)\{_cachedBuffer=safeBufferExports\.Buffer;\}else if\(typeof Buffer!==\'undefined\'\)\{_cachedBuffer=Buffer;\}else if\(typeof globalThis!==\'undefined\'&&globalThis\.Buffer\)\{_cachedBuffer=globalThis\.Buffer;\}else if\(typeof window!==\'undefined\'&&window\.Buffer\)\{_cachedBuffer=window\.Buffer;\}else if\(typeof global!==\'undefined\'&&global\.Buffer\)\{_cachedBuffer=global\.Buffer;\}if\(!_cachedBuffer\)throw new Error\(\'Buffer is not available\. Ensure solana-deps chunk loads first\.\'\);return _cachedBuffer;\}var _Buffer=new Proxy\(\{\},\{get:function\(t,p\)\{var B=_getBuffer\(\);return typeof B\[p\]===\'function\'\?B\[p\]\.bind\(B\):B\[p\];\}\}\);\}\)\(\);/g,
            'var _Buffer = (function(){var _cachedBuffer;function _getBuffer(){if(_cachedBuffer)return _cachedBuffer;if(typeof Buffer$1!==\'undefined\'){_cachedBuffer=Buffer$1;}else if(typeof safeBufferExports!==\'undefined\'&&safeBufferExports&&safeBufferExports.Buffer){_cachedBuffer=safeBufferExports.Buffer;}else if(typeof Buffer!==\'undefined\'){_cachedBuffer=Buffer;}else if(typeof globalThis!==\'undefined\'&&globalThis.Buffer){_cachedBuffer=globalThis.Buffer;}else if(typeof window!==\'undefined\'&&window.Buffer){_cachedBuffer=window.Buffer;}else if(typeof global!==\'undefined\'&&global.Buffer){_cachedBuffer=global.Buffer;}if(!_cachedBuffer)throw new Error(\'Buffer is not available. Ensure solana-deps chunk loads first.\');return _cachedBuffer;}return new Proxy({},{get:function(t,p){var B=_getBuffer();return typeof B[p]===\'function\'?B[p].bind(B):B[p];}});})();'
          );
          
          return fixedCode.slice(0, charIndex) + setupCode + fixedCode.slice(charIndex);
        } else {
          // No imports found, inject at beginning
          const setupCode = `(function(){try{const B=typeof Buffer!=='undefined'?Buffer:void 0;if(B){if(typeof globalThis!=='undefined'){globalThis.Buffer=B;globalThis.global=globalThis;}if(typeof window!=='undefined'){window.Buffer=B;window.global=window;window.globalThis=window;}if(typeof global!=='undefined'){global.Buffer=B;}}}catch(e){}})();`;
          return setupCode + code;
        }
      }
      
      // Handle solana-deps chunk - ensure Buffer is exported and set globally FIRST
      if (chunk.name === 'solana-deps') {
        // Find where exports are and inject Buffer setup BEFORE exports
        // This ensures Buffer is available globally before other chunks try to use it
        const exportIndex = code.lastIndexOf('export ');
        if (exportIndex !== -1) {
          // Find the line before exports
          const beforeExport = code.lastIndexOf('\n', exportIndex);
          const insertPoint = beforeExport !== -1 ? beforeExport + 1 : exportIndex;
          
          // Inject Buffer setup code that accesses Buffer from module scope
          // This runs before exports, ensuring Buffer is global when other chunks import
          const setupCode = `(function(){try{const B=typeof Buffer!=='undefined'?Buffer:void 0;if(B){if(typeof globalThis!=='undefined'){globalThis.Buffer=B;globalThis.global=globalThis;}if(typeof window!=='undefined'){window.Buffer=B;window.global=window;window.globalThis=window;}if(typeof global!=='undefined'){global.Buffer=B;}}}catch(e){}})();\n`;
          return code.slice(0, insertPoint) + setupCode + code.slice(insertPoint);
        } else {
          // No exports found, inject at end
          const setupCode = `\n(function(){try{const B=typeof Buffer!=='undefined'?Buffer:void 0;if(B){if(typeof globalThis!=='undefined'){globalThis.Buffer=B;globalThis.global=globalThis;}if(typeof window!=='undefined'){window.Buffer=B;window.global=window;window.globalThis=window;}if(typeof global!=='undefined'){global.Buffer=B;}}}catch(e){}})();`;
          return code + setupCode;
        }
      }
      
      // Handle solana-spl chunk
      if (chunk.name === 'solana-spl') {
        const importRegex = /import\s+.*?\s+from\s+['"].*?['"];?/g;
        let lastImportEnd = 0;
        let match;
        while ((match = importRegex.exec(code)) !== null) {
          lastImportEnd = Math.max(lastImportEnd, match.index + match[0].length);
        }
        if (lastImportEnd > 0) {
          const newlineAfterImport = code.indexOf('\n', lastImportEnd);
          const insertPoint = newlineAfterImport !== -1 ? newlineAfterImport + 1 : lastImportEnd;
          const setupCode = `\n(function(){try{const B=typeof Buffer!=='undefined'?Buffer:void 0;if(B){if(typeof globalThis!=='undefined'){globalThis.Buffer=B;globalThis.global=globalThis;}if(typeof window!=='undefined'){window.Buffer=B;window.global=window;window.globalThis=window;}if(typeof global!=='undefined'){global.Buffer=B;}}}catch(e){}})();`;
          return code.slice(0, insertPoint) + setupCode + code.slice(insertPoint);
        }
      }
      
      return null; // No changes for other chunks
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
        // This allows circular dependencies to work by using live bindings
        externalLiveBindings: true,
        // Ensure proper chunk ordering - solana-deps must load before solana-core
        // This prevents "Class extends value undefined" errors
        chunkFileNames: (chunkInfo) => {
          // Ensure solana-deps loads first by giving it a name that sorts first
          if (chunkInfo.name === 'solana-deps') {
            return 'assets/js/00-solana-deps-[hash].js';
          }
          return 'assets/js/[name]-[hash].js';
        },
        // Experimental: Set minimum chunk size to encourage more splitting
        experimentalMinChunkSize: 20000, // 20KB minimum to prevent huge chunks
        manualChunks: (id) => {
          // Split node_modules into separate chunks to avoid circular dependencies
          if (id.includes('node_modules')) {
            // CRITICAL: BN and Buffer must load FIRST before any Solana code
            // Create separate chunks to ensure proper initialization order
            // BN.js - separate chunk that loads first
            if (id.includes('bn.js')) {
              return 'solana-deps'; // Load BN first
            }
            // Buffer - separate chunk that loads first (with BN)
            if (id.includes('buffer') && !id.includes('bs58') && !id.includes('base-x')) {
              return 'solana-deps'; // Load Buffer with BN
            }
            // Split Solana packages to break circular dependencies
            // @solana/web3.js depends on BN and Buffer - load after deps
            if (id.includes('@solana/web3.js')) {
              return 'solana-core';
            }
            // @solana/spl-token depends on web3.js - load after
            if (id.includes('@solana/spl-token')) {
              return 'solana-spl';
            }
            // No other @solana/ packages are used, so don't create a separate chunk
            // This prevents circular dependency issues
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

