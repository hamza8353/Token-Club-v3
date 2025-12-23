// Util polyfill module - ensures util.inspect and util.format are always available
// This is imported whenever code tries to require('util') or import from 'util'

export const inspect = function(obj: any, options?: any): string {
  try {
    return JSON.stringify(obj, null, 2);
  } catch(e) {
    return String(obj);
  }
};

export const format = function(...args: any[]): string {
  try {
    const allArgs = Array.prototype.slice.call(arguments);
    const first = allArgs.shift();
    if (typeof first !== 'string') {
      return allArgs.join(' ');
    }
    let i = 0;
    return String(first).replace(/%[sdj%]/g, function(x: string) {
      if (x === '%%') return '%';
      if (i >= allArgs.length) return x;
      const arg = allArgs[i++];
      switch(x) {
        case '%s': return String(arg);
        case '%d': return String(Number(arg));
        case '%j': 
          try { return JSON.stringify(arg); } 
          catch(e) { return '[Circular]'; }
        default: return String(x);
      }
    }) + allArgs.slice(i).join(' ');
  } catch(e) {
    return '';
  }
};

// Default export for require('util') compatibility
export default {
  inspect,
  format
};

// Also ensure it's available globally
if (typeof globalThis !== 'undefined') {
  (globalThis as any).util = { inspect, format };
}
if (typeof window !== 'undefined') {
  (window as any).util = { inspect, format };
}
if (typeof global !== 'undefined') {
  (global as any).util = { inspect, format };
}

