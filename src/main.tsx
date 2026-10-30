import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { PlayerApp } from './features/player/PlayerApp'
import './shared/styles.css'
import './features/player/player.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <PlayerApp />
  </StrictMode>,
)
