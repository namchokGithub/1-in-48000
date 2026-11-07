import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import { boContentPlugin } from './bo-server.ts'

export default defineConfig({
  // GitHub Pages serves the Player under /1-in-48000/; the deploy workflow
  // sets VITE_BASE. Local dev, BO, and tests keep the root.
  base: process.env.VITE_BASE ?? '/',
  plugins: [react(), tailwindcss(), boContentPlugin()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  server: {
    host: '127.0.0.1',
    watch: { ignored: ['**/public/content-v2/**'] },
  },
  build: {
    rollupOptions: { input: 'index.html' },
  },
})
