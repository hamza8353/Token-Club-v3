// Polyfills must be loaded before any other code
// This ensures Buffer and other Node.js globals are available for Solana packages

import { Buffer } from 'buffer'
import { inspect, format } from 'util'

// Set Buffer on all possible global objects
if (typeof globalThis !== 'undefined') {
  (globalThis as any).Buffer = Buffer
  ;(globalThis as any).global = globalThis
  // Ensure util is available globally for Metaplex SDK
  if (!(globalThis as any).util) {
    ;(globalThis as any).util = { inspect, format }
  }
}

if (typeof window !== 'undefined') {
  ;(window as any).Buffer = Buffer
  ;(window as any).global = window
  ;(window as any).globalThis = window
  // Ensure util is available on window
  if (!(window as any).util) {
    ;(window as any).util = { inspect, format }
  }
}

if (typeof global !== 'undefined') {
  ;(global as any).Buffer = Buffer
  // Ensure util is available on global
  if (!(global as any).util) {
    ;(global as any).util = { inspect, format }
  }
}

// Export Buffer and util for direct imports
export { Buffer }
export { inspect, format }

