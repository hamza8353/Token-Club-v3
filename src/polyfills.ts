// Polyfills must be loaded before any other code
// This ensures Buffer and other Node.js globals are available for Solana packages

import { Buffer } from 'buffer'

// Set Buffer on all possible global objects
if (typeof globalThis !== 'undefined') {
  (globalThis as any).Buffer = Buffer
  ;(globalThis as any).global = globalThis
}

if (typeof window !== 'undefined') {
  (window as any).Buffer = Buffer
  ;(window as any).global = window
  ;(window as any).globalThis = window
}

if (typeof global !== 'undefined') {
  (global as any).Buffer = Buffer
}

// Export Buffer for direct imports
export { Buffer }

