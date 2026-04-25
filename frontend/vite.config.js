import { defineConfig, loadEnv } from 'vite'
import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const rootDir = dirname(fileURLToPath(import.meta.url))

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, rootDir, '')
  const backendTarget = env.VITE_BACKEND_URL || 'http://backend:4000'

  return {
    plugins: [react(), tailwindcss()],
    server: {
      proxy: {
        '/api': backendTarget,
        '/socket.io': {
          target: backendTarget,
          ws: true,
        },
      },
    },
  }
})
