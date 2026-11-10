<script setup>
import { ref, watch, onMounted, onBeforeUnmount } from 'vue'
import { play } from '../lib/audio/sfx.js'
import { isNativeApp } from '../lib/native.js'

// Foothold startup sequence. Each phase starts when the previous one's
// animation ends, so durations can be tuned in CSS without drifting.
//   trace: a run line draws the hex, with a runner dot at its head
//   fill:  the loop closes and the hex fills with your colour, a ring ripples out
//   letter: the F draws in like a second run
//   word:  the wordmark slides out from behind the mark, tagline fades up
//   hold, then leave: the screen fades and emits `done`
// In the iPhone app each phase has its sound (sfx.js, intro*), following the
// sound effects setting and the silent switch. Browsers block sound before a
// first tap, so the website plays the intro silently.

const props = defineProps({ holdMs: { type: Number, default: 650 } })
const emit = defineEmits(['done'])

const R = 52
const C = 60
const pts = Array.from({ length: 6 }, (_, k) => {
  const a = (Math.PI / 3) * k
  return [C + R * Math.cos(a), C + R * Math.sin(a)]
})
// Start the run at the bottom-left vertex and go round clockwise.
const order = [2, 3, 4, 5, 0, 1, 2]
const hexPath = 'M' + order.map(i => pts[i].map(n => n.toFixed(2)).join(' ')).join(' L')
const hexPoints = pts.map(p => p.map(n => n.toFixed(2)).join(',')).join(' ')

const phase = ref('ready')
const SOUNDS = { trace: 'introTrace', fill: 'introFill', letter: 'introLetter', word: 'introWord', static: 'introFill' }
watch(phase, (p) => { if (SOUNDS[p] && isNativeApp()) play(SOUNDS[p], { wait: false }) })
const trace = ref(null)
const dot = ref({ x: pts[2][0], y: pts[2][1] })
let raf = 0
let safety = 0
let holdTimer = 0
let finished = false

function finish() {
  if (finished) return
  finished = true
  emit('done')
}

function runTrace() {
  const el = trace.value
  const len = el.getTotalLength()
  el.style.strokeDasharray = String(len)
  el.style.strokeDashoffset = String(len)
  phase.value = 'trace'
  const duration = 1150
  let start = 0
  const step = (t) => {
    if (!start) start = t
    const k = Math.min(1, (t - start) / duration)
    const e = 1 - Math.pow(1 - k, 2.2)
    const p = el.getPointAtLength(e * len)
    dot.value = { x: p.x, y: p.y }
    el.style.strokeDashoffset = String(len * (1 - e))
    if (k < 1) raf = requestAnimationFrame(step)
    else phase.value = 'fill'
  }
  raf = requestAnimationFrame(step)
}

// Advance on the animation that marks the end of each phase.
function onAnimEnd(e) {
  const name = e.animationName || ''
  if (phase.value === 'fill' && name.includes('fill-in')) phase.value = 'letter'
  else if (phase.value === 'letter' && name.includes('draw-f')) phase.value = 'word'
  else if (phase.value === 'word' && name.includes('tag-in')) {
    phase.value = 'hold'
    holdTimer = setTimeout(() => { phase.value = 'leave' }, props.holdMs)
  } else if (phase.value === 'leave' && name.includes('leave')) finish()
}

onMounted(() => {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  safety = setTimeout(finish, 6500)
  if (reduce) {
    phase.value = 'static'
    holdTimer = setTimeout(finish, 1100)
    return
  }
  setTimeout(runTrace, 250)
})

onBeforeUnmount(() => {
  cancelAnimationFrame(raf)
  clearTimeout(safety)
  clearTimeout(holdTimer)
})
</script>

<template>
  <div class="intro" :class="`is-${phase}`" role="img" aria-label="Foothold. Take ground. Hold it."
       @animationend.self="onAnimEnd">
    <div class="lockup">
      <svg class="mark" viewBox="0 0 120 120" aria-hidden="true" @animationend="onAnimEnd">
        <polygon class="ripple" :points="hexPoints" />
        <polygon class="fill" :points="hexPoints" />
        <path ref="trace" class="trace" :d="hexPath" />
        <path class="letter" d="M47 84V37h31M47 60h24" pathLength="100" />
        <circle v-if="phase === 'trace'" class="dot" :cx="dot.x" :cy="dot.y" r="6" />
      </svg>
      <div class="word-clip">
        <span class="word" @animationend="onAnimEnd">Foothold</span>
      </div>
    </div>
    <p class="tag" @animationend="onAnimEnd">Take ground. Hold it.</p>
  </div>
</template>

<style scoped>
.intro {
  --ink: #16302A;
  --paper: #F3F5EF;
  --you: #2E55E6;
  --fill-ms: 420ms;
  --f-ms: 380ms;
  --word-ms: 620ms;
  --leave-ms: 450ms;

  position: fixed;
  inset: 0;
  z-index: 100;
  background: var(--ink);
  color: var(--paper);
  display: grid;
  place-content: center;
  justify-items: center;
  gap: 18px;
  font-family: 'Archivo', system-ui, sans-serif;
}

.lockup {
  display: flex;
  align-items: center;
  gap: clamp(10px, 2.4vw, 18px);
}
.mark {
  width: clamp(76px, 18vw, 120px);
  height: auto;
  overflow: visible;
  flex: none;
  position: relative;
  z-index: 1;
}

.trace {
  fill: none;
  stroke: var(--you);
  stroke-width: 6;
  stroke-linejoin: round;
  stroke-linecap: round;
}
.is-ready .trace { opacity: 0; }
.dot { fill: var(--paper); stroke: var(--you); stroke-width: 3; }

.fill, .ripple {
  fill: var(--you);
  stroke: var(--you);
  stroke-width: 6;
  stroke-linejoin: round;
  transform-origin: 60px 60px;
  opacity: 0;
}
.ripple { fill: none; }

.letter {
  fill: none;
  stroke: var(--paper);
  stroke-width: 11;
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-dasharray: 100;
  stroke-dashoffset: 100;
}

.word-clip {
  overflow: hidden;
  padding: 0.08em 0 0.12em 0;
  max-width: 0;
  margin-left: calc(-1 * clamp(10px, 2.4vw, 18px)); /* cancel the gap until it opens */
}
.is-word .word-clip, .is-hold .word-clip, .is-leave .word-clip {
  animation: open var(--word-ms) cubic-bezier(.2,.8,.2,1) forwards;
}
.is-static .word-clip { max-width: 22rem; margin-left: 0; padding-right: 0.1em; }
@keyframes open {
  to { max-width: 22rem; margin-left: 0; padding-right: 0.1em; }
}
.word {
  display: block;
  font-weight: 850;
  font-stretch: 112%;
  font-size: clamp(2.4rem, 9vw, 4.2rem);
  letter-spacing: -0.03em;
  line-height: 1;
  transform: translateX(-110%);
}
.tag {
  margin: 0;
  font-size: clamp(1rem, 3.4vw, 1.2rem);
  font-weight: 500;
  color: rgba(243, 245, 239, 0.72);
  opacity: 0;
}

/* Phase: fill (loop closes) */
.is-fill .fill, .is-letter .fill, .is-word .fill, .is-hold .fill, .is-leave .fill {
  animation: fill-in var(--fill-ms) cubic-bezier(.2,.9,.3,1.25) forwards;
}
.is-fill .ripple { animation: ripple 700ms ease-out forwards; }

/* Phase: letter */
.is-letter .letter, .is-word .letter, .is-hold .letter, .is-leave .letter {
  animation: draw-f var(--f-ms) ease-out forwards;
}

/* Phase: word */
.is-word .word, .is-hold .word, .is-leave .word {
  animation: word-in var(--word-ms) cubic-bezier(.2,.8,.2,1.06) forwards;
}
.is-word .tag, .is-hold .tag, .is-leave .tag {
  animation: tag-in 380ms ease-out calc(var(--word-ms) - 120ms) forwards;
}

/* Phase: leave */
.is-leave { animation: leave var(--leave-ms) ease-in forwards; }

/* Reduced motion: final frame only */
.is-static .fill { opacity: 1; }
.is-static .trace { opacity: 1; }
.is-static .letter { stroke-dashoffset: 0; }
.is-static .word { transform: none; }
.is-static .tag { opacity: 1; }

@keyframes fill-in {
  from { opacity: 0; transform: scale(0.82); }
  to { opacity: 1; transform: scale(1); }
}
@keyframes ripple {
  from { opacity: 0.7; transform: scale(1); }
  to { opacity: 0; transform: scale(1.7); }
}
@keyframes draw-f {
  to { stroke-dashoffset: 0; }
}
@keyframes word-in {
  0% { transform: translateX(-110%) skewX(-12deg); }
  70% { transform: translateX(2%) skewX(3deg); }
  100% { transform: none; }
}
@keyframes tag-in {
  from { opacity: 0; transform: translateY(6px); }
  to { opacity: 1; transform: none; }
}
@keyframes leave {
  to { opacity: 0; }
}
</style>
