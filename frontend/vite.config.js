import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const rootDir = new URL('.', import.meta.url).pathname

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, rootDir, 'VITE_')
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
