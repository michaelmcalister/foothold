<script setup>
// A shareable square image of an activity's haul, drawn on a canvas so it
// works offline. Uses the phone's share sheet when there is one.
import { ref, onMounted } from 'vue'
import { km, duration } from '../lib/format.js'

const props = defineProps({
  activity: { type: Object, required: true },
  newHexes: { type: Number, default: 0 },
  taken: { type: Array, default: () => [] },
})
const canvas = ref(null)
const url = ref(null)
const busy = ref(false)

function hex(ctx, x, y, r) {
  ctx.beginPath()
  for (let k = 0; k < 6; k++) {
    const a = (Math.PI / 3) * k
    ctx[k ? 'lineTo' : 'moveTo'](x + r * Math.cos(a), y + r * Math.sin(a))
  }
  ctx.closePath()
}

function draw() {
  const c = canvas.value
  const S = 1080
  c.width = S
  c.height = S
  const ctx = c.getContext('2d')
  ctx.fillStyle = '#16302A'
  ctx.fillRect(0, 0, S, S)
  // Field of hexes, the new ones lit up
  const r = 34
  const dy = Math.sqrt(3) * r
  let i = 0
  const lit = Math.min(160, props.newHexes)
  for (let col = 0; col < 24; col++) {
    for (let row = 0; row < 12; row++) {
      const x = 40 + col * r * 1.5
      const y = 470 + row * dy + (col % 2 ? dy / 2 : 0)
      if (y > S + r) continue
      hex(ctx, x, y, r - 3)
      const d = Math.hypot(x - S / 2, y - 760)
      const on = d < 60 + Math.sqrt(lit) * 34
      ctx.fillStyle = on ? (i++ % 7 === 3 && props.taken.length ? '#E8A817' : '#2E55E6') : 'rgba(243,245,239,0.06)'
      ctx.fill()
    }
  }
  ctx.fillStyle = '#F3F5EF'
  ctx.font = '850 96px Archivo, system-ui, sans-serif'
  ctx.fillText(props.newHexes ? `+${props.newHexes} hexes` : 'Ground held', 70, 190)
  ctx.font = '600 44px Archivo, system-ui, sans-serif'
  ctx.fillStyle = 'rgba(243,245,239,0.75)'
  const sub = `${km(props.activity.distanceM)} km ${props.activity.mode} in ${duration(props.activity.movingS)}`
  ctx.fillText(sub, 70, 262)
  if (props.taken.length) ctx.fillText(`Taken from ${props.taken.map((t) => t[0]).join(' and ')}`, 70, 324)
  ctx.font = '850 48px Archivo, system-ui, sans-serif'
  ctx.fillStyle = '#F3F5EF'
  ctx.fillText('Foothold', 70, 420)
  ctx.font = '500 34px Archivo, system-ui, sans-serif'
  ctx.fillStyle = 'rgba(243,245,239,0.6)'
  ctx.fillText('Take ground. Hold it.', 300, 420)
  url.value = c.toDataURL('image/png')
}

onMounted(() => {
  if (document.fonts?.ready) document.fonts.ready.then(draw)
  else draw()
})

async function share() {
  busy.value = true
  try {
    const blob = await new Promise((r) => canvas.value.toBlob(r, 'image/png'))
    const file = new File([blob], 'foothold.png', { type: 'image/png' })
    if (navigator.canShare?.({ files: [file] })) {
      await navigator.share({ files: [file], text: `+${props.newHexes} hexes on Foothold` })
    } else {
      const a = document.createElement('a')
      a.href = url.value
      a.download = 'foothold.png'
      a.click()
    }
  } catch { /* share cancelled */ } finally {
    busy.value = false
  }
}
</script>

<template>
  <div class="share">
    <canvas ref="canvas" hidden></canvas>
    <img v-if="url" :src="url" alt="Share image showing the hexes claimed on this activity" />
    <button class="btn quiet" type="button" :disabled="busy" @click="share">Share this</button>
  </div>
</template>

<style scoped>
.share { display: grid; gap: 10px; justify-items: start; }
img { width: min(100%, 320px); border-radius: 14px; }
</style>
