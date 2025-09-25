import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import { apiClient } from './lib/api.ts'

// Expose apiClient globally for browser console testing
declare global {
  interface Window {
    apiClient: typeof apiClient
  }
}

// Make apiClient available in browser console
window.apiClient = apiClient

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)