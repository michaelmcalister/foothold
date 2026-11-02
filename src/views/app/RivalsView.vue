<script setup>
// Your rivals: the people you swap ground with most, with a head-to-head card for each.
import Crest from '../../components/Crest.vue'
import { ref, computed, onMounted, watch } from 'vue'
import { api } from '../../lib/api/index.js'
import { store } from '../../lib/store.js'
import { ago, plural } from '../../lib/format.js'

const rivals = ref([])
const you = ref({ hexes: 0 })
const days = ref(30)
const loaded = ref(false)
const openId = ref(null)

async function load() {
  const r = await api.rivals({ mode: store.mode })
  rivals.value = r.rivals
  you.value = r.you || { hexes: 0 }
  days.value = r.days || 30
  loaded.value = true
}
onMounted(load)
watch(() => store.mode, load)

const open = computed(() => rivals.value.find((r) => r.userId === openId.value) || null)
function toggle(r) { openId.value = openId.value === r.userId ? null : r.userId }

function score(b) {
  if (!b) return null
  const meAttacker = b.attacker === store.user.id
  const us = meAttacker ? b.score.attacker : b.score.defender
  const them = meAttacker ? b.score.defender : b.score.attacker
  const d = Math.max(0, Math.ceil((b.endsAt - Date.now()) / 86400000))
  return { us, them, left: d <= 1 ? 'Ends today' : `${d} days left` }
}
function nudge(r) {
  const s = score(r.battle)
  if (s) return s.us > s.them ? `You're ahead in your battle. Can you hold on?` : s.us === s.them ? 'Your battle is level. One loop could decide it.' : `${r.name} is ahead in your battle. A loop through their patch could swing it.`
  if (r.tookFromYou > r.tookFromThem) return `${r.name} has the edge lately. Fancy a run through their patch?`
  if (r.tookFromThem > r.tookFromYou) return `You've had the edge lately. Expect ${r.name} to answer.`
  return 'Evenly matched. Your next loop could tip it.'
}
</script>

<template>
  <div class="screen">
    <header class="screen-head">
      <RouterLink class="back small" :to="{ name: 'battles' }">Back to battles</RouterLink>
      <h1>Your rivals</h1>
      <p class="muted">The people you swap ground with most on the {{ store.mode }} map. Tap one to see how you stack up.</p>
    </header>

    <div v-if="loaded && !rivals.length" class="empty">
      <h2>No rivals yet</h2>
      <p class="muted">Take ground someone else holds, or lose some to them, and they show up here.</p>
      <RouterLink class="btn" to="/app">Find a rival's ground</RouterLink>
    </div>

    <ul v-else class="rows plain">
      <li v-for="r in rivals" :key="r.userId" class="rival">
        <button class="row" type="button" :aria-expanded="openId === r.userId" @click="toggle(r)">
          <Crest :crest="r.crest" :colour="r.colour" :id="r.userId" :size="36" />
          <span class="who">
            <strong>{{ r.name }}</strong>
            <span class="small muted">
              <template v-if="r.battle">Live battle · </template>{{ r.lastActive ? `Out ${ago(r.lastActive)}` : 'Not out lately' }}
            </span>
          </span>
          <span class="swap" :aria-label="`Last ${days} days: you took ${r.tookFromThem}, they took ${r.tookFromYou}`">
            <span class="up">+{{ r.tookFromThem }}</span>
            <span class="down">{{ r.tookFromYou ? `-${r.tookFromYou}` : '0' }}</span>
          </span>
        </button>

        <div v-if="open && open.userId === r.userId" class="card panel">
          <div class="h2h">
            <div class="side">
              <Crest :crest="store.user.crest" colour="#2E55E6" :id="store.user.id" :size="52" />
              <strong>You</strong>
              <span class="small muted">{{ plural(you.hexes, 'hex', 'hexes') }} held</span>
            </div>
            <span class="vs muted">vs</span>
            <div class="side">
              <Crest :crest="r.crest" :colour="r.colour" :id="r.userId" :size="52" />
              <strong>{{ r.name }}</strong>
              <span class="small muted">{{ plural(r.hexes, 'hex', 'hexes') }} held</span>
            </div>
          </div>
          <dl class="nums">
            <div><dt>You took</dt><dd>{{ r.tookFromThem }}</dd></div>
            <div><dt>{{ r.name }} took</dt><dd>{{ r.tookFromYou }}</dd></div>
            <div><dt>Battles won</dt><dd>{{ r.record.won }} of {{ r.record.won + r.record.lost + r.record.draws }}</dd></div>
          </dl>
          <p class="small muted">Hexes taken in the last {{ days }} days. Ground inside privacy zones isn't counted.</p>
          <div v-if="r.battle" class="battle">
            <p><strong>Live battle</strong> <span class="small muted">{{ score(r.battle).left }}</span></p>
            <div class="meter" :aria-label="`You hold ${score(r.battle).us} of the battle hexes, ${r.name} holds ${score(r.battle).them}`">
              <span :style="{ width: `${(score(r.battle).us / Math.max(1, score(r.battle).us + score(r.battle).them)) * 100}%` }"></span>
            </div>
            <p class="small">You {{ score(r.battle).us }}, {{ r.name }} {{ score(r.battle).them }}</p>
          </div>
          <p class="nudge">{{ nudge(r) }}</p>
        </div>
      </li>
    </ul>
  </div>
</template>

<style scoped>
.plain { list-style: none; margin: 0; padding: 0; }
.back { color: var(--ink-60); font-weight: 650; text-decoration: none; }
.rival { display: grid; gap: 10px; }
.row { display: grid; grid-template-columns: auto 1fr auto; gap: 12px; align-items: center; width: 100%; border: 0; background: none; padding: 0; font: inherit; color: inherit; text-align: left; cursor: pointer; min-height: 48px; }
.who { display: grid; gap: 2px; min-width: 0; }
.who strong { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.swap { display: grid; justify-items: end; font-weight: 800; font-variant-numeric: tabular-nums; line-height: 1.2; }
.up { color: var(--you); }
.down { color: var(--ink-60); }
.card { display: grid; gap: 12px; }
.h2h { display: grid; grid-template-columns: 1fr auto 1fr; align-items: center; gap: 8px; }
.side { display: grid; justify-items: center; gap: 4px; text-align: center; min-width: 0; }
.side strong { max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.nums { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin: 0; }
.nums div { display: grid; gap: 2px; }
.nums dt { font-size: 0.8rem; color: var(--ink-60); }
.nums dd { margin: 0; font-weight: 850; font-size: 1.4rem; font-variant-numeric: tabular-nums; }
.battle { display: grid; gap: 6px; }
.battle p { margin: 0; }
.meter { height: 10px; border-radius: 5px; background: var(--soft); overflow: hidden; }
.meter span { display: block; height: 100%; background: var(--you); }
.nudge { margin: 0; font-weight: 650; }
</style>
