import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import { boContentPlugin } from './bo-server.ts'

export default defineConfig({
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
