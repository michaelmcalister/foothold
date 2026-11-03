<script setup>
// The demo run, up front on the landing page: the real route over the
// Harbour Bridge drawn with the ground it takes, a runner going round it,
// the run's own numbers, and the button into the demo (#/try).
// The route and its hexes load after the page, so the first paint stays light.
import { ref, onMounted } from 'vue'

const route = ref('')
const hexes = ref([])
const stats = ref(null)
const labels = ref([])
const W = 360
const H = 420

const PLACES = [
  { name: 'Harbour Bridge', lat: -33.8521, lng: 151.2104, anchor: 'end', dx: -12 },
  { name: 'Opera House', lat: -33.8566, lng: 151.2157, anchor: 'start', dx: 12 },
  { name: 'Kirribilli', lat: -33.8466, lng: 151.2178, anchor: 'start', dx: 10 },
  { name: 'Circular Quay', lat: -33.8617, lng: 151.2108, anchor: 'end', dx: -10 },
  { name: 'Botanic Garden', lat: -33.8638, lng: 151.2152, anchor: 'end', dx: -10 },
]

onMounted(async () => {
  const [{ demoRun }, { findLoops, cellsForLoops }, { cellToBoundary }] = await Promise.all([
    import('../../lib/recap/demo.js'),
    import('../../lib/engine/index.js'),
    import('h3-js'),
  ])
  const { activity, track } = demoRun()
  const loops = findLoops(track)
  const cells = cellsForLoops(loops)

  // Fit the route into the drawing, north up, metres equal both ways
  const lats = track.map((p) => p.lat), lngs = track.map((p) => p.lng)
  const lat0 = Math.min(...lats), lat1 = Math.max(...lats), lng0 = Math.min(...lngs), lng1 = Math.max(...lngs)
  const kx = Math.cos((((lat0 + lat1) / 2) * Math.PI) / 180)
  const pad = 34
  const s = Math.min((W - pad * 2) / ((lng1 - lng0) * kx), (H - pad * 2) / (lat1 - lat0))
  const ox = (W - (lng1 - lng0) * kx * s) / 2, oy = (H - (lat1 - lat0) * s) / 2
  const xy = (lat, lng) => [ox + (lng - lng0) * kx * s, oy + (lat1 - lat) * s]
  const pt = (lat, lng) => xy(lat, lng).map((n) => n.toFixed(1)).join(',')

  route.value = 'M' + track.filter((_, i) => i % 2 === 0).map((p) => pt(p.lat, p.lng)).join('L')
  hexes.value = cells.map((h) => cellToBoundary(h).map(([lat, lng]) => pt(lat, lng)).join(' '))
  labels.value = PLACES.map((p) => { const [x, y] = xy(p.lat, p.lng); return { ...p, x, y } })
  stats.value = { km: (activity.distanceM / 1000).toFixed(1), loops: loops.length, hexes: cells.length }
})
</script>

<template>
  <section id="demo" class="lp-demo" tabindex="-1" aria-labelledby="demo-title">
    <div class="lp-demo-copy">
      <h2 id="demo-title">Run over the Harbour Bridge from your couch</h2>
      <p>
        Take our demo run: Circular Quay, over the bridge, a loop of Kirribilli, back across,
        round the Botanic Garden and the Opera House. Watch it as a 3D flyover, see every hex it
        takes, then open the full run report.
      </p>
      <dl v-if="stats" class="lp-demo-stats">
        <div><dt>km</dt><dd>{{ stats.km }}</dd></div>
        <div><dt>loops closed</dt><dd>{{ stats.loops }}</dd></div>
        <div><dt>hexes taken</dt><dd>{{ stats.hexes }}</dd></div>
      </dl>
      <div class="hero-actions">
        <a class="button lp-demo-go" href="#/try">Start the demo run</a>
        <a class="link lp-demo-link" href="#/try/report">See the run report</a>
      </div>
      <p class="lp-demo-note">About a minute, no account needed. Sound on for the music.</p>
    </div>

    <a class="lp-demo-map" href="#/try" aria-label="Start the demo run over the Harbour Bridge">
      <svg :viewBox="`0 0 ${W} ${H}`" role="img" aria-label="The demo route over the Sydney Harbour Bridge, with the ground it takes shaded.">
        <polygon v-for="(h, i) in hexes" :key="i" :points="h" class="d-hex" />
        <path v-if="route" :d="route" class="d-route" />
        <circle v-if="route" r="6" class="d-runner">
          <animateMotion dur="16s" repeatCount="indefinite" :path="route" />
        </circle>
        <g v-for="l in labels" :key="l.name" class="d-label">
          <circle :cx="l.x" :cy="l.y" r="2.5" />
          <text :x="l.x + l.dx" :y="l.y + 4" :text-anchor="l.anchor">{{ l.name }}</text>
        </g>
      </svg>
      <span class="lp-demo-play" aria-hidden="true">
        <svg viewBox="0 0 24 24" width="22" height="22"><path d="M8 5.5v13l10.5-6.5z" fill="currentColor" /></svg>
        Play the flyover
      </span>
    </a>
  </section>
</template>

<style scoped>
.lp-demo {
  background: var(--ink);
  color: var(--on-ink);
  display: grid;
  gap: clamp(28px, 5vw, 64px);
  align-items: center;
  padding: clamp(48px, 8vw, 96px) max(var(--gutter), calc((100vw - 1280px) / 2 + var(--gutter)));
  scroll-margin-top: 8px;
}
.lp-demo:focus { outline: none; }
@media (min-width: 900px) { .lp-demo { grid-template-columns: 6fr 5fr; } }
.lp-demo-copy { display: grid; gap: 20px; min-width: 0; }
h2 {
  font-size: clamp(2.3rem, 7.4vw, 4.6rem);
  font-weight: 850;
  font-stretch: 125%;
  letter-spacing: -0.035em;
  line-height: 0.98;
  max-width: 13ch;
}
.lp-demo-copy > p { font-size: 1.18rem; color: var(--on-ink-muted); max-width: 46ch; margin: 0; }
.lp-demo-stats { display: flex; flex-wrap: wrap; gap: 8px clamp(22px, 4vw, 36px); margin: 4px 0; }
.lp-demo-stats div { display: flex; flex-direction: column-reverse; gap: 2px; }
.lp-demo-stats dd { margin: 0; font-size: clamp(2.2rem, 7vw, 3.4rem); font-weight: 900; font-stretch: 62%; line-height: 0.95; font-variant-numeric: tabular-nums; }
.lp-demo-stats dt { color: var(--on-ink-muted); font-weight: 650; }
.lp-demo-go { font-size: 1.1rem; padding: 16px 26px; }
.lp-demo-link { color: var(--on-ink); }
.lp-demo-note { margin: 0; font-size: 0.9rem; color: var(--on-ink-muted); }
.lp-demo-map {
  position: relative;
  display: block;
  justify-self: center;
  width: 100%;
  max-width: 460px;
  aspect-ratio: 360 / 420;
  border-radius: 20px;
  background: #1C3B34;
  box-shadow: inset 0 0 0 1px rgba(243, 245, 239, 0.12);
  color: var(--on-ink);
  text-decoration: none;
  overflow: hidden;
}
.lp-demo-map > svg { display: block; width: 100%; height: 100%; }
.lp-demo-map:focus-visible { outline: 3px solid var(--on-ink); outline-offset: 4px; }
.d-hex { fill: rgba(46, 85, 230, 0.45); stroke: #6F8CF2; stroke-width: 0.8; }
.d-route { fill: none; stroke: #F3F5EF; stroke-width: 2.4; stroke-linejoin: round; stroke-linecap: round; opacity: 0.9; }
.d-runner { fill: var(--you); stroke: #fff; stroke-width: 2.5; }
.d-label circle { fill: #E8A817; }
.d-label text { font: 700 12px/1 var(--font); font-stretch: 80%; fill: var(--on-ink); paint-order: stroke; stroke: #1C3B34; stroke-width: 3px; }
.lp-demo-play {
  position: absolute;
  left: 14px;
  top: 14px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 10px 16px 10px 12px;
  border-radius: 999px;
  background: var(--you);
  color: #fff;
  font-weight: 700;
}
.lp-demo-map:hover .lp-demo-play { background: #2347CC; }
@media (prefers-reduced-motion: reduce) { .d-runner { display: none; } }
</style>
