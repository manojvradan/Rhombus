import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    ],
  server: {
    proxy: {
    '/api':{
      target: 'http://127.0.0:8000',
      changeOrigin: true,
      secure: false,
    }
  },
    // Optional: This makes the frontend run on port 5173
    port: 5173,
  }
})