import type { AppProps } from 'next/app'
import '../polyfills'
import '../index.css'
import { NetworkProvider } from '../contexts/NetworkContext'
import { WalletProvider } from '../contexts/WalletContext'
import { initAnalytics } from '../lib/analytics'
import { useEffect } from 'react'

export default function App({ Component, pageProps }: AppProps) {
  useEffect(() => {
    // Initialize Google Analytics
    initAnalytics()
    
    // Global error handlers
    const handleError = (e: ErrorEvent) => {
      if (e.message?.includes('inspect') || e.message?.includes('format')) {
        // Ensure util exists
        if (typeof globalThis !== 'undefined' && (!(globalThis as any).util || !(globalThis as any).util.inspect)) {
          (globalThis as any).util = {
            inspect: (o: any) => {
              try { return JSON.stringify(o, null, 2); } catch(e) { return String(o); }
            },
            format: function() {
              try {
                const args = Array.prototype.slice.call(arguments);
                const first = args.shift();
                if (typeof first !== 'string') { return args.join(' '); }
                let i = 0;
                return String(first).replace(/%[sdj%]/g, function(x: string) {
                  if (x === '%%') return '%';
                  if (i >= args.length) return x;
                  const arg = args[i++];
                  switch(x) {
                    case '%s': return String(arg);
                    case '%d': return String(Number(arg));
                    case '%j': try { return JSON.stringify(arg); } catch(e) { return '[Circular]'; }
                    default: return String(x);
                  }
                }) + args.slice(i).join(' ');
              } catch(e) { return ''; }
            }
          };
        }
        e.preventDefault?.();
        return false;
      }
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', (e) => {
      if (e.reason?.message?.includes('inspect') || e.reason?.message?.includes('format')) {
        handleError(e as any);
        e.preventDefault?.();
      }
    });

    return () => {
      window.removeEventListener('error', handleError);
    };
  }, []);

  return (
    <NetworkProvider>
      <WalletProvider>
        <Component {...pageProps} />
      </WalletProvider>
    </NetworkProvider>
  )
}

