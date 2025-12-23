import dynamic from 'next/dynamic'

// Disable SSR for the main app since it uses browser-only APIs
const App = dynamic(() => import('../App'), {
  ssr: false,
})

export default function Home() {
  return <App />
}

