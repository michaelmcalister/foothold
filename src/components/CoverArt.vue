<script setup>
// A mission's cover (lib/missions/covers.js) as a cached image. Drawn only
// when it comes near the screen (or at once with `eager`); until then the
// series colours stand in, so a long list opens straight away.
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { coverUrl, lookFor } from '../lib/missions/covers.js'

const props = defineProps({ mission: { type: Object, default: null }, eager: { type: Boolean, default: false } })
const el = ref(null)
const seen = ref(props.eager)
const look = computed(() => lookFor(props.mission?.saga || 'trailkeepers'))
const src = computed(() => (seen.value && props.mission ? coverUrl(props.mission) : null))

onMounted(() => {
  if (seen.value) return
  const w = watcher()
  if (!w) { seen.value = true; return }
  waiting.set(el.value, () => { seen.value = true })
  w.observe(el.value)
})
onBeforeUnmount(() => {
  if (el.value) forget(el.value)
})
</script>

<script>
// One watcher for every cover on the page (module scope, shared by all)
let io = null
const waiting = new Map()
function watcher() {
  if (io || typeof IntersectionObserver === 'undefined') return io
  io = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (!e.isIntersecting) continue
      waiting.get(e.target)?.()
      forget(e.target)
    }
  }, { rootMargin: '300px' })
  return io
}
function forget(target) {
  waiting.delete(target)
  io?.unobserve(target)
}
</script>

<template>
  <span ref="el" class="cover-art" :style="{ background: `linear-gradient(160deg, ${look.accent} -40%, ${look.deep} 70%)` }">
    <img v-if="src" :src="src" alt="" decoding="async" draggable="false" />
  </span>
</template>

<style scoped>
.cover-art { display: block; width: 100%; height: 100%; overflow: hidden; }
.cover-art img { display: block; width: 100%; height: 100%; object-fit: cover; }
</style>
