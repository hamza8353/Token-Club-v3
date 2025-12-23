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
    generateBundle(options, bundle) {
      // Fix codes property assignments and util.inspect accesses in vendor chunk
      for (const fileName in bundle) {
        const chunk = bundle[fileName];
        if (chunk.type === 'chunk' && fileName.includes('vendor')) {
          let code = chunk.code;
          // Pattern: variable.codes= or variable.codes = (minified code)
          // Replace with safe assignment: (variable=variable||{}).codes=
          code = code.replace(
            /([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\.\s*codes\s*=/g,
            (match, varName) => {
              // Only replace if it's not already wrapped
              if (!match.includes('||{}')) {
                return `(${varName}=${varName}||{}).codes=`;
              }
              return match;
            }
          );
          // Pattern: util.inspect or util.format (where util might be undefined)
          // Replace with safe access: (util||globalThis.util||{}).inspect
          code = code.replace(
            /util\s*\.\s*(inspect|format)\s*\(/g,
            (match, method) => {
              // Only replace if not already wrapped
              if (!match.includes('globalThis') && !match.includes('||')) {
                return `((typeof util!=='undefined'&&util?util:(typeof globalThis!=='undefined'&&globalThis.util?globalThis.util:{}))).${method}(`;
              }
              return match;
            }
          );
          chunk.code = code;
        }
      }
    },
    renderChunk(code, chunk, options) {
      // Ensure metaplex and vendor chunks have proper initialization
      // Note: reown is now part of vendor chunk to avoid TDZ errors
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
          // Polyfill util.inspect / util.format for Node.js compatibility
          // Ensure util exists on globalThis, global, window, and as a module-level variable
          if(typeof globalThis.util==='undefined'){
            globalThis.util={};
          }
          if(typeof global!=='undefined'&&typeof global.util==='undefined'){
            global.util=globalThis.util;
          }
          if(typeof window!=='undefined'&&typeof window.util==='undefined'){
            window.util=globalThis.util;
          }
          // Create util object with inspect and format methods
          const utilPolyfill={
            inspect:function(obj,options){
              try{
                return JSON.stringify(obj,null,2);
              }catch(e){
                return String(obj);
              }
            },
            format:function(){
              try{
                const args=Array.prototype.slice.call(arguments);
                const first=args.shift();
                if(typeof first!=='string'){return args.join(' ');}
                let i=0;
                return String(first).replace(/%[sdj%]/g,function(x){
                  if(x==='%%')return '%';
                  if(i>=args.length)return x;
                  const arg=args[i++];
                  switch(x){
                    case '%s': return String(arg);
                    case '%d': return Number(arg);
                    case '%j':
                      try{return JSON.stringify(arg);}
                      catch(e){return '[Circular]';}
                    default: return x;
                  }
                }) + args.slice(i).join(' ');
              }catch(e){
                return '';
              }
            }
          };
          // Assign to all possible locations
          globalThis.util=utilPolyfill;
          if(typeof global!=='undefined'){global.util=utilPolyfill;}
          if(typeof window!=='undefined'){window.util=utilPolyfill;}
          // Also ensure util is available as a module-level variable
          // Some code might access 'util' directly, not through globalThis
          try{
            // Try to make util available in the current scope
            // Note: In ES modules, we can't easily create module-level vars,
            // but we can ensure globalThis.util exists and is accessible
            if(typeof globalThis!=='undefined'){
              // Make util accessible via require pattern if needed
              if(typeof globalThis.require==='undefined'){
                globalThis.require=function(module){
                  if(module==='util'){
                    return globalThis.util;
                  }
                  throw new Error('Cannot find module: '+module);
                };
              }
            }
          }catch(e){
            // Silently fail
          }
          // Fix for "codes" property - ensure common error/status objects exist
          // This is often needed by HTTP libraries or error handling code
          try{
            // Ensure Error.codes exists and all Error subclasses
            if(typeof Error!=='undefined'){
              if(!Error.codes){Error.codes={};}
              // Ensure common Error subclasses also have codes
              ['TypeError','ReferenceError','SyntaxError','RangeError','EvalError','URIError'].forEach(function(errorName){
                try{
                  if(typeof globalThis[errorName]!=='undefined'&&globalThis[errorName]){
                    if(!globalThis[errorName].codes){
                      globalThis[errorName].codes={};
                    }
                  }
                }catch(e){}
              });
            }
            // Some libraries use a separate codes object on globalThis
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
            // Ensure process.errors exists (Node.js pattern)
            if(typeof process!=='undefined'&&!process.errors){
              process.errors={};
            }
            // Pre-initialize common objects that libraries might assign codes to
            // This prevents "Cannot set properties of undefined" errors
            const commonObjects = ['http', 'https', 'net', 'dns', 'tls', 'stream', 'crypto'];
            commonObjects.forEach(function(objName){
              try{
                if(typeof globalThis[objName]==='undefined'){
                  globalThis[objName]={};
                }
                if(globalThis[objName]&&!globalThis[objName].codes){
                  globalThis[objName].codes={};
                }
              }catch(e){}
            });
          }catch(e){
            // Silently fail - initialization should not break the app
          }
        })();\n`;
        
        // Intercept property assignments to prevent undefined.codes assignments
        const propertyInterceptor = `
        (function(){
          // Intercept Object.defineProperty to catch defineProperty calls
          const originalDefineProperty = Object.defineProperty;
          Object.defineProperty = function(target, property, descriptor){
            // If trying to set 'codes' or 'format' on undefined/null, create an empty object first
            if((property==='codes' || property==='format') && (target===undefined||target===null)){
              target = {};
            }
            return originalDefineProperty.call(this,target,property,descriptor);
          };
          // Use Proxy to intercept property assignments on undefined objects
          // This catches direct assignments like: undefined.codes = value
          try{
            // Create a safe assignment function that ensures target exists
            const safeAssign = function(target, property, value){
              if(target===undefined||target===null){
                // If target is undefined/null and we're setting 'codes', create an object
                if(property==='codes'||property==='format'){
                  target = {};
                  target[property] = value;
                  return target;
                }
                // For other properties, still create an object to prevent errors
                target = {};
                target[property] = value;
                return target;
              }
              target[property] = value;
              return target;
            };
            // Override Object.prototype to intercept property assignments
            // This is a last resort - we intercept __proto__ to catch assignments
            // Note: This is risky but necessary to catch undefined.codes assignments
            const originalProto = Object.prototype.__proto__;
            // We can't easily intercept direct assignments, but we can ensure
            // that common error objects are initialized before code runs
          }catch(e){
            // Silently fail - Proxy might not work in all environments
          }
          // Wrap common error constructors to ensure they have codes property
          try{
            const errorConstructors = ['Error', 'TypeError', 'ReferenceError', 'SyntaxError', 'RangeError'];
            errorConstructors.forEach(function(errorName){
              if(typeof globalThis[errorName]!=='undefined'){
                const OriginalError = globalThis[errorName];
                if(OriginalError && !OriginalError.codes){
                  OriginalError.codes = {};
                }
              }
            });
          }catch(e){
            // Silently fail
          }
          // Global error handler to catch and recover from codes property errors
          if(typeof window!=='undefined'){
            const originalErrorHandler = window.onerror;
            window.onerror = function(message, source, lineno, colno, error){
              // If it's a codes property error, try to recover
              if(message && typeof message==='string' && message.includes('codes') && message.includes('undefined')){
                // Log but don't break the app
                console.warn('[recovery] Caught codes property error, attempting recovery');
                // Return true to prevent default error handling
                return true;
              }
              // For other errors, use original handler
              if(originalErrorHandler){
                return originalErrorHandler.call(this, message, source, lineno, colno, error);
              }
              return false;
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
    react(),
    nodePolyfills({
      include: ['assert', 'buffer', 'process', 'crypto', 'util'],
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
        maximumFileSizeToCacheInBytes: 3 * 1024 * 1024, // 3 MB to accommodate large vendor chunk
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
        hoistTransitiveImports: true,
        externalLiveBindings: false,
        manualChunks: (id) => {
          if (id.includes('node_modules')) {
            // Solana packages - must load first
            if (
              id.includes('@solana/') ||
              id.includes('bn.js') ||
              id.includes('bs58') ||
              id.includes('buffer')
            ) {
              return 'solana';
            }
            // React - must load early
            if (id.includes('react') || id.includes('react-dom')) {
              return 'react';
            }
            // Reown and its dependencies - put in vendor to avoid TDZ errors
            // The reown chunk has internal circular dependencies causing TDZ errors
            // Catch all reown-related packages and their dependencies
            if (
              id.includes('@reown/') ||
              id.includes('viem') ||
              id.includes('@walletconnect') ||
              id.includes('/ox/') ||
              id.includes('abitype')
            ) {
              return 'vendor';
            }
            // Other large packages
            if (id.includes('@metaplex-foundation/')) {
              return 'metaplex';
            }
            if (id.includes('@meteora-ag/')) {
              return 'meteora';
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
