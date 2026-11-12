import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// precache.json: every script, style and font the build makes, for the
// service worker to keep so the app opens offline (public/sw.js)
const precacheList = () => ({
  name: 'precache-list',
  generateBundle(_, bundle) {
    const files = Object.keys(bundle).filter((f) => /\.(js|css|woff2)$/.test(f)).sort()
    this.emitFile({ type: 'asset', fileName: 'precache.json', source: JSON.stringify(files) })
  },
})

// BASE_PATH lets the same build run at a sub-path (GitHub Pages: /foothold/)
// or at the root (Cloudflare or a custom domain).
export default defineConfig({
  plugins: [vue(), precacheList()],
  base: process.env.BASE_PATH || '/',
  // MapLibre's worker is an ES module
  worker: { format: 'es' },
})
