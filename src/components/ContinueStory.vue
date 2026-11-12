<script setup>
// "Continue your story" on the map: the next episode of the series you were
// last in, one tap from starting it. Hidden until you've started a series.
// Progress comes from this phone and your account (missions/progress.js).
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { continueList } from '../lib/missions/progress.js'
import { coverSvg, lookFor } from '../lib/missions/covers.js'
import { missionMeta } from '../lib/missions/index.js'
import { play } from '../lib/audio/sfx.js'
import { playable } from '../lib/plus.js'

const props = defineProps({ progress: { type: Object, default: null } })
const router = useRouter()
const list = computed(() => continueList(props.progress || undefined))
const next = computed(() => list.value[0] || null)
const look = computed(() => (next.value ? lookFor(next.value.saga) : null))
const art = computed(() => (next.value ? coverSvg(next.value.mission) : ''))

function run() {
  play('lockIn', { wait: false })
  router.push({ name: 'record', query: { mission: next.value.mission.id } })
}
</script>

<template>
  <section v-if="next" class="cstory" :style="{ '--accent': look.accent, '--deep': look.deep }" aria-labelledby="cs-title">
    <span class="art" aria-hidden="true" v-html="art" />
    <span class="shade" aria-hidden="true" />
    <div class="text">
      <p class="kicker">Continue your story</p>
      <h2 id="cs-title" class="title">{{ next.title }}, episode {{ next.mission.episode }}</h2>
      <p class="ep">{{ next.mission.title }} · {{ missionMeta(next.mission) }}</p>
    </div>
    <p v-if="!playable(next.mission)" class="locked">Part of Foothold Plus</p>
    <button v-else type="button" class="go" @click="run">
      <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path d="M7 4.5v15l12.5-7.5z" fill="currentColor" /></svg>
      Run it
    </button>
    <p v-if="list.length > 1" class="more">and {{ list.length - 1 }} more series waiting</p>
  </section>
</template>

<style scoped>
.cstory { position: relative; overflow: hidden; border-radius: 16px; background: var(--deep); color: #fff; min-height: 128px; display: grid; grid-template-columns: 1fr auto; align-items: end; gap: 10px; padding: 14px; }
.art { position: absolute; inset: 0; opacity: 0.85; }
.art :deep(svg) { width: 100%; height: 100%; display: block; object-fit: cover; }
.shade { position: absolute; inset: 0; background: linear-gradient(90deg, var(--deep) 30%, transparent 85%); }
.text, .go, .locked { position: relative; margin: 0; font-size: 0.82rem; font-weight: 750; }
.more { position: relative; }
.kicker { margin: 0; font-size: 0.78rem; font-weight: 750; color: var(--accent); }
.title { margin: 2px 0 0; font-size: 1.12rem; font-weight: 850; line-height: 1.2; }
.ep { margin: 2px 0 0; font-size: 0.85rem; opacity: 0.85; }
.go { display: inline-flex; align-items: center; gap: 6px; min-height: 44px; padding: 0 16px; border: 0; border-radius: 999px; background: var(--accent); color: var(--deep); font: inherit; font-weight: 850; }
.go:focus-visible { outline: 3px solid #fff; outline-offset: 2px; }
.more { grid-column: 1 / -1; margin: 0; font-size: 0.78rem; opacity: 0.75; }
</style>
