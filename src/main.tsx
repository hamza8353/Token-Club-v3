// CRITICAL: Load polyfills FIRST before any other imports
// This ensures Buffer is available globally before Solana packages load
import './polyfills'

// #region agent log
try{fetch('http://127.0.0.1:7243/ingest/9126abf7-b00a-486c-bd22-94d5b34af69a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'main.tsx:before-imports',message:'Before imports',data:{hasGlobalThis:typeof globalThis!=='undefined',hasWindow:typeof window!=='undefined',hasError:typeof Error!=='undefined',hasErrorCodes:typeof Error!=='undefined'&&!!(Error as any).codes},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});}catch(e){}
// #endregion agent log

import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { NetworkProvider } from './contexts/NetworkContext'
import { WalletProvider } from './contexts/WalletContext'
import { initAnalytics } from './lib/analytics'

// #region agent log
try{fetch('http://127.0.0.1:7243/ingest/9126abf7-b00a-486c-bd22-94d5b34af69a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'main.tsx:after-imports',message:'After imports',data:{hasGlobalThis:typeof globalThis!=='undefined',hasErrorCodes:typeof Error!=='undefined'&&!!(Error as any).codes,hasGlobalCodes:typeof globalThis!=='undefined'&&!!(globalThis as any).codes},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});}catch(e){}
// #endregion agent log

// Initialize Google Analytics
initAnalytics()

// PWA: register service worker (silent; no console output)
if (import.meta.env.PROD) {
  import('virtual:pwa-register').then((module) => {
    if (module && module.registerSW) {
      module.registerSW({ immediate: true });
    }
  }).catch(() => {
    // PWA registration failed, continue without it
  });
}

// #region agent log
try{fetch('http://127.0.0.1:7243/ingest/9126abf7-b00a-486c-bd22-94d5b34af69a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'main.tsx:before-render',message:'Before React render',data:{hasGlobalThis:typeof globalThis!=='undefined',hasErrorCodes:typeof Error!=='undefined'&&!!(Error as any).codes,hasGlobalCodes:typeof globalThis!=='undefined'&&!!(globalThis as any).codes},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});}catch(e){}
// #endregion agent log

// Add global error handler to catch the codes error
// #region agent log
window.addEventListener('error',function(e){
  if(e.message&&e.message.includes('codes')){
    fetch('http://127.0.0.1:7243/ingest/9126abf7-b00a-486c-bd22-94d5b34af69a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'main.tsx:global-error',message:'Global error caught',data:{error:String(e.message),filename:e.filename,lineno:e.lineno,colno:e.colno,stack:e.error&&e.error.stack},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
  }
},true);
// #endregion agent log

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <NetworkProvider>
      <WalletProvider>
        <App />
      </WalletProvider>
    </NetworkProvider>
  </React.StrictMode>,
)

