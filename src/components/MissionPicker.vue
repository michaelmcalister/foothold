<script setup>
// Choose a story mission before a run: None, or an episode from one of the
// series (the Trailkeepers, Ember Run, The Night Job), with its length,
// effort and a one line blurb. Episodes unlock in order within a series on
// this device (any try unlocks the next). Shows the coach's pick for today
// when today's planned session suits one.
import { ref, computed, onMounted } from 'vue'
import { MISSIONS, SAGAS, missionById, missionMeta, unlockedIds, loadProgress, suggestMission, unlockedBy } from '../lib/missions/index.js'
import { api } from '../lib/api/index.js'
import { nextSession, toISO } from '../lib/coach/index.js'

const model = defineModel({ type: String, default: null })
const open = ref(false)
const progress = ref(loadProgress())
const unlocked = computed(() => unlockedIds(progress.value))
const todayType = ref(null)
const chosen = computed(() => (model.value ? missionById(model.value) : null))
const suggestion = computed(() => {
  const s = suggestMission(todayType.value, unlocked.value)
  return s && s.id !== model.value ? s : null
})

const lockedBy = (m) => unlockedBy(m.id)?.title || null
const groups = SAGAS.map((g) => ({ ...g, missions: MISSIONS.filter((m) => (m.saga || 'trailkeepers') === g.id) }))

function pick(id) {
  model.value = id
  open.value = false
}

onMounted(async () => {
  try {
    const { plan } = await api.plan()
    const s = plan ? nextSession(plan, toISO(Date.now())) : null
    if (s && s.date === toISO(Date.now())) todayType.value = s.type
  } catch { /* no plan: no suggestion */ }
})
</script>

<template>
  <div class="mpick">
    <div v-if="suggestion && !open" class="suggest">
      <span>{{ suggestion.text }}</span>
      <button type="button" class="btn small" @click="pick(suggestion.id)">Choose</button>
    </div>
    <button type="button" class="current" :aria-expanded="open" aria-controls="mission-list" @click="open = !open">
      <span class="lbl">Mission</span>
      <span class="val">{{ chosen ? chosen.title : 'None' }}</span>
      <span class="chg">{{ open ? 'Close' : 'Change' }}</span>
    </button>
    <p v-if="chosen && !open" class="small muted blurb">{{ missionMeta(chosen) }}. {{ chosen.blurb }}</p>
    <ul v-if="open" id="mission-list" class="list" role="list">
      <li>
        <button type="button" class="opt" :aria-pressed="!model" @click="pick(null)">
          <strong>None</strong>
          <span class="small muted">Just the run, with the usual voice coach.</span>
        </button>
      </li>
      <li v-for="g in groups" :key="g.id" class="group">
        <h3 class="gtitle" :class="g.id">{{ g.title }}</h3>
        <p class="small muted gblurb">{{ g.blurb }}<template v-if="g.score"> Full cast, scene sounds and music, and choices that change the story. Answer out loud or tap.</template></p>
        <p v-if="g.note" class="small note">{{ g.note }}</p>
        <ul class="list" role="list">
          <li v-for="m in g.missions" :key="m.id">
            <button type="button" class="opt" :aria-pressed="model === m.id" :disabled="!unlocked.has(m.id)" @click="pick(m.id)">
              <strong>{{ m.title }}</strong>
              <span class="meta small">{{ missionMeta(m) }}</span>
              <span v-if="unlocked.has(m.id)" class="small muted">{{ m.blurb }}</span>
              <span v-else class="small muted">Play {{ lockedBy(m) }} to unlock.</span>
            </button>
          </li>
        </ul>
      </li>
    </ul>
  </div>
</template>

<style scoped>
.mpick { display: grid; gap: 8px; }
.suggest { display: flex; align-items: center; gap: 10px; background: var(--tint); border-radius: 12px; padding: 8px 8px 8px 14px; font-weight: 650; font-size: 0.92rem; }
.suggest span { flex: 1; min-width: 0; }
.suggest .btn { flex: none; }
.current {
  display: flex; align-items: center; gap: 10px; width: 100%; min-height: 48px; padding: 8px 14px;
  font: inherit; border: 0; border-radius: 12px; background: var(--soft); color: var(--ink); cursor: pointer; text-align: left;
}
.current .lbl { color: var(--ink-60); font-size: 0.9rem; }
.current .val { flex: 1; min-width: 0; font-weight: 750; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.current .chg { color: var(--you-ink); font-weight: 650; font-size: 0.9rem; }
.blurb { margin: 0; }
.list { list-style: none; margin: 0; padding: 0; display: grid; gap: 8px; }
.opt {
  display: grid; gap: 2px; width: 100%; text-align: left; font: inherit; color: var(--ink); cursor: pointer;
  background: var(--card); border: 0; border-radius: 12px; padding: 10px 14px; box-shadow: inset 0 0 0 1.5px var(--line); min-height: 48px;
}
.opt[aria-pressed='true'] { box-shadow: inset 0 0 0 2.5px var(--you); }
.opt:disabled { opacity: 0.6; cursor: default; background: var(--soft); }
.opt .meta { font-weight: 650; color: var(--ink-60); }
.group { display: grid; gap: 6px; margin-top: 8px; }
.gtitle { margin: 0; font-size: 1rem; font-weight: 800; }
.gtitle.ember { color: #B4441C; }
.gtitle.heist { color: #34407A; }
.gblurb { margin: 0; }
.note { margin: 0; padding: 6px 10px; border-radius: 10px; background: #FFF1E6; color: #6B3517; }
/* Night mode: the same group colours, lifted to read on the dark cards */
html.night .gtitle.ember { color: #F08A5D; }
html.night .gtitle.heist { color: #A8B3F2; }
html.night .note { background: var(--notice-bg); color: var(--notice-ink); }
</style>
