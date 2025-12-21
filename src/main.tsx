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
  import('virtual:pwa-register').then(({ registerSW }) => {
    registerSW({ immediate: true });
  });
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <NetworkProvider>
      <WalletProvider>
        <App />
      </WalletProvider>
    </NetworkProvider>
  </React.StrictMode>,
)

