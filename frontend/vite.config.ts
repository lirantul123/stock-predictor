import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // GitHub Pages serves a project site from a subpath (/stock-predictor/), so
  // the Pages workflow builds with VITE_BASE=/stock-predictor/. Every other
  // deploy (Docker/VPS nginx) serves at the root and needs no override.
  base: process.env.VITE_BASE || '/',
  server: {
    host: '0.0.0.0',
    port: 5173,
    // Allow tunnel hostnames (ngrok / cloudflare quick tunnels) so the dev
    // server can be opened from a phone on a different network. IP addresses
    // and localhost are always allowed by Vite.
    allowedHosts: ['.ngrok-free.app', '.ngrok.app', '.ngrok-free.dev', '.trycloudflare.com'],
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
      '/ws': {
        target: 'ws://localhost:8000',
        ws: true,
      },
    },
  },
  resolve: {
    alias: {
      '@': '/src',
    },
  },
})