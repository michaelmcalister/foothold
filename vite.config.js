import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// BASE_PATH lets the same build run at a sub-path (GitHub Pages: /foothold/)
// or at the root (Cloudflare or a custom domain).
export default defineConfig({
  plugins: [vue()],
  base: process.env.BASE_PATH || '/',
  // MapLibre's worker is an ES module
  worker: { format: 'es' },
})
