import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ command }) => ({
  plugins: [react()],

  base: command === 'build' ? '/proyecto-fullstack/' : '/',

  server: {
    proxy: {
      '/catalog-api': {
        target: 'https://proyecto-fullstack-mj38.onrender.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/catalog-api/, '/api'),
        configure: (proxy) => {
          proxy.on('proxyReq', (proxyReq) => {
            proxyReq.removeHeader('origin')
          })
        }
      }
    }
  }
}))