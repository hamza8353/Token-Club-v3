// CRITICAL: Load polyfills FIRST before any other imports
// This ensures Buffer is available globally before Solana packages load
import './polyfills'

import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { NetworkProvider } from './contexts/NetworkContext'
import { WalletProvider } from './contexts/WalletContext'
import { initAnalytics } from './lib/analytics'

// Initialize Google Analytics
initAnalytics()

// PWA: register service worker (silent; no console output)
if (import.meta.env.PROD) {
  import('virtual:pwa-register').then((module) => {
    if (module && module.registerSW) {
      module.registerSW({ immediate: true })
    }
  }).catch(() => {
    // PWA registration failed, continue without it
  })
}

// Simple boot diagnostics to detect silent failures
const rootEl = document.getElementById('root')
if (rootEl) {
  rootEl.setAttribute('data-boot', 'start')
  rootEl.textContent = 'Loading app...'
  rootEl.style.color = '#fff'
  rootEl.style.fontFamily = 'sans-serif'
  rootEl.style.padding = '12px'
}
console.log('[boot] start', {
  hasRoot: !!rootEl,
  hasGlobal: typeof globalThis !== 'undefined',
  hasBuffer: typeof (globalThis as any).Buffer !== 'undefined',
})

// Catch global errors to avoid silent blank screen
window.addEventListener('error', (e) => {
  console.error('[boot] window error', e?.message, e?.error)
})
window.addEventListener('unhandledrejection', (e) => {
  console.error('[boot] unhandled rejection', e?.reason)
})

try {
  if (!rootEl) {
    throw new Error('Root element not found')
  }
  const root = ReactDOM.createRoot(rootEl)
  root.render(
    <React.StrictMode>
      <NetworkProvider>
        <WalletProvider>
          <App />
        </WalletProvider>
      </NetworkProvider>
    </React.StrictMode>,
  )
  console.log('[boot] render ok')
  rootEl.setAttribute('data-boot', 'rendered')
} catch (err) {
  console.error('[boot] render failed', err)
  if (rootEl) {
    rootEl.innerHTML = `<div style="color:#fff;padding:16px;font-family:monospace">App failed to load. Check console logs.</div>`
    rootEl.style.background = '#000'
  }
}

