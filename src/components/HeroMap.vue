<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'

// A stylised street-directory page. A run traces a loop along the streets,
// then every hex inside the loop flips to your colour, including ground a
// rival held. This is the one orchestrated motion on the page.

const W = 600
const H = 520
const R = 13 // hex radius
const HEX_H = Math.sqrt(3) * R

// Streets: vertical x positions and horizontal y positions.
const vStreets = [70, 200, 330, 450, 545]
const hStreets = [90, 210, 320, 430]

// The run: starts and finishes at the corner of Albert St and Short St.
const loop = [
  [200, 430], [200, 90], [450, 90], [450, 320], [330, 320], [330, 430], [200, 430],
]
const loopPath = 'M' + loop.map(p => p.join(' ')).join(' L')

function inside([x, y], poly) {
  let hit = false
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i]
    const [xj, yj] = poly[j]
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) hit = !hit
  }
  return hit
}

function hexPoints(cx, cy) {
  const pts = []
  for (let k = 0; k < 6; k++) {
    const a = (Math.PI / 3) * k
    pts.push(`${(cx + (R - 1) * Math.cos(a)).toFixed(1)},${(cy + (R - 1) * Math.sin(a)).toFixed(1)}`)
  }
  return pts.join(' ')
}

// Build the hex grid once.
const hexes = []
for (let col = 0; col * R * 1.5 < W + R; col++) {
  for (let row = 0; row * HEX_H < H + HEX_H; row++) {
    const cx = col * R * 1.5
    const cy = row * HEX_H + (col % 2 ? HEX_H / 2 : 0)
    const rival = cx > 385 && cx < 560 && cy > 150 && cy < 410
    const claim = inside([cx, cy], loop)
    if (!rival && !claim) continue
    hexes.push({
      id: `${col}-${row}`,
      points: hexPoints(cx, cy),
      rival,
      claim,
      // Order the flip by distance from the start corner, so it ripples out.
      delay: Math.hypot(cx - 200, cy - 430) * 2.2,
    })
  }
}

const claimed = hexes.filter(h => h.claim).length
const stolen = hexes.filter(h => h.claim && h.rival).length

const phase = ref('idle') // idle -> running -> claimed
const pathEl = ref(null)
const runner = ref({ x: loop[0][0], y: loop[0][1] })
let raf = 0
let timer = 0

const reduceMotion = typeof window !== 'undefined' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches

function play() {
  cancelAnimationFrame(raf)
  clearTimeout(timer)
  if (reduceMotion || !pathEl.value) {
    phase.value = 'claimed'
    return
  }
  phase.value = 'idle'
  const len = pathEl.value.getTotalLength()
  const duration = 2600
  let start = 0
  timer = setTimeout(() => {
    phase.value = 'running'
    const step = (t) => {
      if (!start) start = t
      const k = Math.min(1, (t - start) / duration)
      const eased = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2
      const pt = pathEl.value.getPointAtLength(eased * len)
      runner.value = { x: pt.x, y: pt.y }
      pathEl.value.style.strokeDashoffset = String(len * (1 - eased))
      if (k < 1) raf = requestAnimationFrame(step)
      else phase.value = 'claimed'
    }
    pathEl.value.style.strokeDasharray = String(len)
    pathEl.value.style.strokeDashoffset = String(len)
    raf = requestAnimationFrame(step)
  }, 500)
}

onMounted(play)
onBeforeUnmount(() => { cancelAnimationFrame(raf); clearTimeout(timer) })

const showCard = computed(() => phase.value === 'claimed')
</script>

<template>
  <figure class="map" :class="`is-${phase}`">
    <svg :viewBox="`0 0 ${W} ${H}`" role="img"
         aria-label="A street map. A run traces a loop around four blocks and the ground inside it turns blue, including blocks a rival held.">
      <defs>
        <clipPath id="map-clip"><rect :width="W" :height="H" rx="6" /></clipPath>
      </defs>
      <g clip-path="url(#map-clip)">
        <rect :width="W" :height="H" class="paper" />
        <!-- park and river -->
        <rect x="70" y="210" width="130" height="110" class="park" />
        <path d="M-10 488 C 120 462, 210 512, 330 480 S 520 470, 610 494 L610 530 L-10 530 Z" class="river" />

        <!-- territory -->
        <polygon v-for="h in hexes" :key="h.id" :points="h.points"
                 class="hex"
                 :class="{ rival: h.rival, claim: h.claim }"
                 :style="{ transitionDelay: `${h.delay}ms` }" />

        <!-- streets -->
        <g class="streets">
          <line v-for="x in vStreets" :key="'v' + x" :x1="x" y1="0" :x2="x" :y2="H" />
          <line v-for="y in hStreets" :key="'h' + y" x1="0" :y1="y" :x2="W" :y2="y" />
          <line x1="450" y1="320" x2="600" y2="190" />
        </g>
        <g class="labels">
          <text x="206" y="150" transform="rotate(90 206 150)">Albert St</text>
          <text x="96" y="84">Victoria Rd</text>
          <text x="352" y="314">Short St</text>
          <text x="476" y="424">Wattle Lane</text>
          <text x="96" y="270" class="park-label">Jubilee Park</text>
        </g>

        <!-- the run -->
        <path ref="pathEl" :d="loopPath" class="run" />
        <circle v-if="phase === 'running'" :cx="runner.x" :cy="runner.y" r="7" class="runner" />
        <circle :cx="loop[0][0]" :cy="loop[0][1]" r="5" class="start" />
      </g>
    </svg>

    <figcaption class="card" :class="{ show: showCard }" aria-live="polite">
      <template v-if="showCard">
        <strong>Loop closed. {{ claimed }} hexes are yours.</strong>
        <span>{{ stolen }} of them were taken from a rival, who gets a nudge to take them back.</span>
        <button type="button" @click="play">Run it again</button>
      </template>
    </figcaption>
  </figure>
</template>

<style scoped>
.map {
  position: relative;
  margin: 0;
}
svg {
  display: block;
  width: 100%;
  height: auto;
  border-radius: 6px;
  box-shadow: 0 1px 0 var(--ink-15), 0 18px 40px -24px var(--ink-40);
}
.paper { fill: var(--map-paper); }
.park { fill: var(--park); }
.river { fill: var(--water); }

.hex {
  fill: transparent;
  stroke: transparent;
  transition: fill 260ms ease, stroke 260ms ease;
}
.hex.rival {
  fill: var(--rival-fill);
  stroke: var(--rival);
  stroke-width: 1;
}
.is-claimed .hex.claim {
  fill: var(--you-fill);
  stroke: var(--you);
  stroke-width: 1;
}

.streets line {
  stroke: var(--street);
  stroke-width: 9;
  stroke-linecap: square;
}
.streets {
  filter: drop-shadow(0 0 0.6px var(--street-edge)) drop-shadow(0 0 0.6px var(--street-edge));
}
.labels text {
  font: 600 10.5px/1 var(--font);
  font-stretch: 75%;
  fill: var(--ink-60);
  letter-spacing: 0.02em;
}
.labels .park-label { fill: var(--park-ink); }

.run {
  fill: none;
  stroke: var(--you);
  stroke-width: 4;
  stroke-linejoin: round;
  stroke-linecap: round;
}
.is-idle .run { opacity: 0; }
.runner {
  fill: #fff;
  stroke: var(--you);
  stroke-width: 3;
}
.start { fill: var(--you); }

.card {
  position: absolute;
  left: 16px;
  bottom: 16px;
  max-width: min(330px, calc(100% - 32px));
  padding: 14px 16px;
  background: var(--ink);
  color: var(--on-ink);
  border-radius: 10px;
  display: grid;
  gap: 6px;
  font-size: 0.875rem;
  line-height: 1.4;
  opacity: 0;
  transform: translateY(6px);
  transition: opacity 300ms ease 600ms, transform 300ms ease 600ms;
  pointer-events: none;
}
.card.show {
  opacity: 1;
  transform: none;
  pointer-events: auto;
}
.card strong { font-weight: 700; font-size: 0.95rem; }
.card span { color: var(--on-ink-muted); }
.card button {
  justify-self: start;
  margin-top: 4px;
  font: inherit;
  font-weight: 600;
  color: var(--on-ink);
  background: none;
  border: 1px solid var(--on-ink-muted);
  border-radius: 999px;
  padding: 5px 12px;
  cursor: pointer;
}
.card button:hover { border-color: var(--on-ink); }

@media (max-width: 640px) {
  .card {
    position: static;
    max-width: none;
    margin-top: 10px;
    min-height: 118px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .hex, .card { transition: none; }
}
</style>
