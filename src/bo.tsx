import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BoApp } from './features/bo/BoApp'
import './shared/styles.css'
import './features/bo/styles.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BoApp />
  </StrictMode>,
)
