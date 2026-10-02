import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './extra.css'
import App from './App.jsx'

try {
  document.documentElement.dataset.theme = JSON.parse(localStorage.getItem('uuidgen:theme')) || 'auto'
} catch {
  document.documentElement.dataset.theme = 'auto'
}

createRoot(document.getElementById('root')).render(<StrictMode><App /></StrictMode>)
