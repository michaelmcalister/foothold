<script setup>
// The mission strip on the Record screen during a run: the mission and its
// current chapter, and a timer (or metres to go) while a surge, recover or
// steady stretch is on.
import { computed } from 'vue'
import { duration } from '../lib/format.js'

const props = defineProps({ view: { type: Object, required: true } })
const LABEL = { surge: 'Surge', recover: 'Easy', steady: 'Steady' }
const right = computed(() => {
  const v = props.view
  if (v.paused) return 'Paused'
  if (v.done) return 'Complete'
  if (!v.kind) return v.score != null ? `${v.score.toLocaleString('en-AU')} pts` : v.surgesTotal ? `${v.surgesDone} of ${v.surgesTotal} surges` : ''
  const left = v.remainingM != null ? `${v.remainingM} m` : duration(v.remainingS)
  return `${LABEL[v.kind]} ${left}`
})
</script>

<template>
  <div class="mstrip" :class="view.kind" role="status" aria-live="off">
    <div class="row">
      <span class="what"><strong>{{ view.title }}</strong><template v-if="view.chapter"> · {{ view.chapter }}</template></span>
      <span class="right">{{ right }}</span>
    </div>
    <div v-if="view.kind && !view.paused" class="bar" aria-hidden="true"><span :style="{ width: Math.round((view.progress || 0) * 100) + '%' }"></span></div>
  </div>
</template>

<style scoped>
.mstrip { display: grid; gap: 6px; background: var(--soft); border-radius: 12px; padding: 8px 12px; font-size: 0.9rem; }
.row { display: flex; align-items: baseline; gap: 10px; }
.what { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.right { flex: none; font-weight: 750; font-variant-numeric: tabular-nums; }
.bar { height: 5px; border-radius: 3px; background: rgba(22, 48, 42, 0.12); overflow: hidden; }
.bar span { display: block; height: 100%; background: var(--ink-60); border-radius: 3px; transition: width 0.9s linear; }
.mstrip.surge { background: var(--you); color: #fff; }
.mstrip.surge .bar { background: rgba(255, 255, 255, 0.3); }
.mstrip.surge .bar span { background: #fff; }
.mstrip.recover .bar span, .mstrip.steady .bar span { background: var(--good); }
</style>
