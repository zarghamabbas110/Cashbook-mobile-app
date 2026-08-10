import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'
import './styles.css'

const root = document.getElementById('root')
if (!root) throw new Error('Missing #root')

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// Caches the app shell so it opens instantly and works with no signal.
// Entries still need a connection to reach other phones — that arrives with
// the cloud sync step.
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    const url = `${import.meta.env.BASE_URL}sw.js`
    navigator.serviceWorker.register(url).catch(() => {
      // No service worker is not fatal; the app just needs the network to open.
    })
  })
}
