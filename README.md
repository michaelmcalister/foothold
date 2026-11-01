# Foothold

Take ground. Hold it. Foothold turns runs, walks and rides into a territory game:
close a loop and the hexes inside become yours until someone runs them back.

## Develop

```bash
npm install
npm run dev
```

## Deploy

- **GitHub Pages:** every push to `main` builds the site and publishes `dist` to the
  `gh-pages` branch (see `.github/workflows/deploy.yml`). Live at
  https://michaelmcalister.github.io/foothold/
- **Cloudflare (optional):** the Worker in `worker/` (configured in `wrangler.toml`)
  serves the app and the API with a D1 database. Setup steps are in `docs/SERVER.md`.

## Stack

Vue 3 and Vite. The full app (recording, H3 hex territory engine, Cloudflare Worker API
with D1) follows the roadmap.
