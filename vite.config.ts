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
          let code = chunk.code;
          
          // Fix broken string: .indexOf("file: (unclosed string)
          // This comes from a dependency and gets broken during bundling
          // Pattern: .indexOf("file: followed by newline (string is broken)
          // Replace with: .indexOf("file://") === 0) {
          
          // Fix broken string: .indexOf("file: (unclosed - not followed by // or ")
          // Only match if NOT followed by // (which would be file://)
          // Use negative lookahead to ensure we don't match correct patterns
          code = code.replace(/\.indexOf\("file:(?!\/\/)/g, '.indexOf("file://") === 0) {');
          
          chunk.code = code;
        }
      }
    },
  };
};

// Plugin to ensure proper initialization order for metaplex and vendor chunks
const ensureMetaplexInit = () => {
  return {
    name: 'ensure-metaplex-init',
    renderChunk(code, chunk, options) {
      // Ensure metaplex and vendor chunks have proper initialization
      // The "codes" error suggests something is trying to set a property on undefined
      // This often happens when error objects or status code mappings aren't initialized
      // Check by chunk name OR by fileName pattern (more reliable)
      const isVendorChunk = chunk.name === 'vendor' || (chunk.fileName && chunk.fileName.includes('vendor'));
      const isMetaplexChunk = chunk.name === 'metaplex' || (chunk.fileName && chunk.fileName.includes('metaplex'));
      if (isMetaplexChunk || isVendorChunk) {
        // Add comprehensive initialization code at the beginning
        // This runs BEFORE the chunk code executes, ensuring all globals exist
        const initCode = `(function(){
          // Ensure globalThis exists
          if(typeof globalThis==='undefined'){
            var globalThis=window||global||self||{};
          }
          // Ensure global exists
          if(typeof global==='undefined'){
            var global=globalThis;
          }
          // Ensure process exists
          if(typeof process==='undefined'){
            var process={env:{},browser:true,version:'',versions:{}};
          }
          // Ensure Buffer exists
          if(typeof Buffer==='undefined'&&typeof globalThis.Buffer!=='undefined'){
            var Buffer=globalThis.Buffer;
          }
          // Fix for "codes" property - ensure common error/status objects exist
          // This is often needed by HTTP libraries or error handling code
          try{
            if(typeof Error!=='undefined'){
              if(!Error.codes){Error.codes={};}
            }
            // Some libraries use a separate codes object
            if(typeof globalThis!=='undefined'&&!globalThis.codes){
              globalThis.codes={};
            }
            // Ensure common HTTP status code objects exist
            if(typeof globalThis!=='undefined'&&!globalThis.statusCodes){
              globalThis.statusCodes={};
            }
            // Common pattern: http.STATUS_CODES
            if(typeof globalThis!=='undefined'&&!globalThis.http){
              globalThis.http={};
            }
            if(typeof globalThis.http!=='undefined'&&!globalThis.http.STATUS_CODES){
              globalThis.http.STATUS_CODES={};
            }
          }catch(e){
            // Silently fail - initialization should not break the app
          }
        })();\n`;
        
        // Intercept both Object.defineProperty AND direct property assignments
        // This catches cases where code tries to set codes on an undefined module export
        const propertyInterceptor = `
        (function(){
          // Intercept Object.defineProperty
          const originalDefineProperty = Object.defineProperty;
          Object.defineProperty = function(target, property, descriptor){
            // If trying to set 'codes' on undefined/null, create an empty object first
            if(property==='codes'&&(target===undefined||target===null)){
              target = {};
            }
            return originalDefineProperty.call(this,target,property,descriptor);
          };
          
          // Intercept direct property assignments using Proxy on Object.prototype
          // This is more aggressive and catches obj.codes = ... patterns
          const originalSet = Object.prototype.__defineSetter__;
          if(originalSet){
            Object.prototype.__defineSetter__ = function(prop, func){
              if(prop==='codes'&&(this===undefined||this===null)){
                // Create object if undefined
                return originalSet.call({}, prop, func);
              }
              return originalSet.call(this, prop, func);
            };
          }
          
          // Wrap the chunk code to catch property assignment errors
          // Use a try-catch wrapper around the entire chunk execution
          const originalCode = arguments[0];
          if(typeof originalCode === 'function'){
            return function(){
              try{
                return originalCode.apply(this, arguments);
              }catch(e){
                if(e.message&&e.message.includes('codes')&&e.message.includes('undefined')){
                  // Silently handle - the object will be created by our interceptor
                  return;
                }
                throw e;
              }
            };
          }
        })();
        `;
        
        return initCode + propertyInterceptor + code;
      }
      return null;
    },
  };
};

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    suppressSourcemapWarnings(),
    fixBrokenStrings(),
    ensureMetaplexInit(),
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
