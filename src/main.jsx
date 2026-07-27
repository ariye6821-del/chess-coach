import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { PrivacyPolicy } from './components/PrivacyPolicy.jsx'

const page = window.location.pathname === '/privacy' ? <PrivacyPolicy /> : <App />

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {page}
  </StrictMode>,
)
