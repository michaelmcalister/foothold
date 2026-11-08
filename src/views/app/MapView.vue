<script setup>
// Home: the territory map with your ground, rivals' ground and wild
// ground, a strip of your numbers, this week's quests (folded away until
// asked for), the Explored view, and the one question worth asking today.
// A "Hot spots" switch shades contested ground, and once a season the
// sheet sums up how the last season went. Strongholds show as crowns; tap
// one for its holder and leaderboards. New players see the first week
// journey in place of the nudge, and the strip shows the weekly streak.
// Hills show as lines with a small crown; tap one for its King of the hill page.
// Suggest a loop asks how far, then builds loops on real streets (LoopFinder).
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import TerritoryMap from '../../components/TerritoryMap.vue'
import QuestList from '../../components/QuestList.vue'
import Crest from '../../components/Crest.vue'
import StrongholdCard from '../../components/StrongholdCard.vue'
import FirstWeekCard from '../../components/FirstWeekCard.vue'
import LoopFinder from '../../components/LoopFinder.vue'
import { LngLatBounds } from 'maplibre-gl'
import { loadJourney, freshSteps } from '../../lib/journey.js'
import { exploredShare } from '../../lib/engine/explore.js'
import { freshlyDone } from '../../lib/questSeen.js'
import { api } from '../../lib/api/index.js'
import { store, locate } from '../../lib/store.js'
import { plural } from '../../lib/format.js'
import { todaysNudge } from '../../lib/nudge.js'
import { hotAreas } from '../../lib/engine/hotspots.js'
import { decodePolyline } from '../../lib/engine/index.js'

const router = useRouter()
const cells = ref([])
const picked = ref(null)
const bbox = ref(null)
const nudge = ref(null)
const suggestion = ref(null)
const suggesting = ref(false)
const tmap = ref(null)
const hot = ref(false)
const seasonInfo = ref(null)
const strongholds = ref([])
const pickedSh = ref(null)
const hills = ref([])
let t = 0

// This week's quests, folded by default; the choice is remembered on this device
const quests = ref([])
const questsOpen = ref(false)
try { questsOpen.value = localStorage.getItem('fh-quests-open') === '1' } catch { /* fine */ }
function toggleQuests() {
  questsOpen.value = !questsOpen.value
  try { localStorage.setItem('fh-quests-open', questsOpen.value ? '1' : '0') } catch { /* fine */ }
}
const questsDone = computed(() => quests.value.filter((q) => q.done).length)
async function loadQuests() {
  try {
    const q = (await api.quests()).quests
    if (freshlyDone(q).length) questsOpen.value = true // a quest just finished: show its moment
    quests.value = q
  } catch { quests.value = [] }
}
watch(() => store.stats, loadQuests)

// The first week journey (new players) and the weekly streak chip
const journey = ref(null)
const streak = ref(null)
async function loadHabits() {
  const [j, s] = await Promise.all([loadJourney().catch(() => null), api.streak().catch(() => null)])
  journey.value = j
  streak.value = s?.streak || null
}
watch(() => store.stats, loadHabits)
// Shown while under way, and once more to celebrate the last step
const showJourney = computed(() => journey.value && (journey.value.active || (journey.value.complete && freshSteps(journey.value).length)))
function seeFirstLoop() {
  picked.value = null
  pickedSh.value = null
  finder.value = { startKm: journey.value.loopKm, auto: true, key: Date.now() }
}

// Explored view: dims every hex your tracks haven't passed through
const exploring = ref(false)
const explored = ref(null)
async function toggleExplored() {
  exploring.value = !exploring.value
  if (exploring.value) explored.value = (await api.explored()).cells
}
const share = computed(() => (explored.value && store.centre ? exploredShare(explored.value, store.centre) : null))
const pctText = computed(() => {
  const p = share.value?.pct || 0
  return p > 0 && p < 1 ? 'under 1%' : `${Math.round(p)}%`
})

async function load() {
  if (!bbox.value) return
  const pad = 0.02
  const [w, s, e, n] = bbox.value
  const box = [w - pad, s - pad, e + pad, n + pad]
  const [{ cells: c }, sh, hl] = await Promise.all([
    api.territory({ mode: store.mode, bbox: box }),
    api.strongholds({ mode: store.mode, bbox: box }).catch(() => null),
    api.hills({ mode: store.mode, bbox: box }).catch(() => null),
  ])
  cells.value = c
  if (sh) strongholds.value = sh.strongholds
  if (hl) hills.value = hl.hills
}
const shPicked = computed(() => strongholds.value.find((s) => s.id === pickedSh.value) || null)
const shRoute = computed(() => (shPicked.value ? decodePolyline(shPicked.value.line) : null))
function pickStronghold(id) {
  picked.value = null
  suggestion.value = null
  finder.value = null
  pickedSh.value = id
}
function pickCell(c) {
  if (finder.value) return // keep the loop up while it's open
  pickedSh.value = null
  picked.value = c
}
function onMoved({ bbox: b }) {
  bbox.value = b
  clearTimeout(t)
  t = setTimeout(load, 250)
}
watch(() => store.mode, () => { picked.value = null; suggestion.value = null; finder.value = null; pickedSh.value = null; load() })

onMounted(async () => {
  loadQuests()
  loadHabits()
  nudge.value = await todaysNudge()
  seasonInfo.value = await api.season().catch(() => null)
})

// Hot spots: the most fought over areas on screen, and where they are from you
const areas = computed(() => (hot.value ? hotAreas(cells.value, store.centre) : []))
function toggleHot() {
  hot.value = !hot.value
  picked.value = null
  suggestion.value = null
}
function goTo(a) {
  tmap.value?.map?.easeTo({ center: [a.lng, a.lat], zoom: 15, duration: 600 })
}

// Last season, shown once
const summary = computed(() => (seasonInfo.value?.showSummary ? seasonInfo.value : null))
const ordinal = (n) => n + (n % 100 >= 11 && n % 100 <= 13 ? 'th' : ['th', 'st', 'nd', 'rd'][n % 10] || 'th')
async function closeSummary() {
  const id = seasonInfo.value.season.id
  seasonInfo.value = { ...seasonInfo.value, showSummary: false }
  await api.updateMe({ seasonSeen: id }).catch(() => {})
}

const mineCount = computed(() => store.stats?.hexes ?? 0)
const level = computed(() => store.stats?.level)

async function recentre() {
  await locate()
  load()
}

// Suggest a loop: the finder asks how far and shows street loops on the map
const finder = ref(null)
function suggest() {
  picked.value = null
  pickedSh.value = null
  hot.value = false
  finder.value = { startKm: null, auto: false, key: Date.now() }
}
function showLoop(line) {
  suggestion.value = line ? { ring: line } : null
  const m = tmap.value?.map
  if (!line || !m || line.length < 2) return
  const b = line.reduce((bb, p) => bb.extend(p), new LngLatBounds(line[0], line[0]))
  m.fitBounds(b, { padding: { top: 90, bottom: 340, left: 30, right: 30 }, duration: 600, maxZoom: 16 })
}
function closeFinder() {
  finder.value = null
  suggestion.value = null
}
</script>

<template>
  <div class="mapview">
    <TerritoryMap
      ref="tmap"
      class="map"
      :heat="hot"
      :centre="store.centre"
      :cells="cells"
      :zones="store.user?.zones || []"
      :me="store.located ? store.centre : null"
      :suggestion="suggestion?.ring || null"
      :explored="exploring ? explored || [] : null"
      :strongholds="strongholds"
      :stronghold-route="shRoute"
      :hills="hills"
      @moved="onMoved"
      @hill="(id) => router.push({ name: 'hill', params: { id } })"
      @cell="pickCell"
      @stronghold="pickStronghold"
    />

    <div class="topstack">
      <div class="strip" aria-live="polite">
        <div class="stat">
          <span class="n">{{ mineCount }}</span>
          <span class="l">{{ mineCount === 1 ? 'hex held' : 'hexes held' }}</span>
        </div>
        <div class="stat">
          <span class="n">{{ level ? level.name : 'None yet' }}</span>
          <span class="l">{{ store.stats?.next ? `${store.stats.toNext} to ${store.stats.next.name}` : level ? 'Top of the ladder' : 'Close a loop to start' }}</span>
        </div>
        <div v-if="streak?.current" class="stat streakchip">
          <span class="n">{{ streak.current }}<span v-if="streak.banked" class="tok" :aria-label="`${streak.banked} rest ${streak.banked === 1 ? 'week' : 'weeks'} banked`"><i v-for="k in streak.banked" :key="k"></i></span></span>
          <span class="l">{{ streak.current === 1 ? 'week in a row' : 'weeks in a row' }}</span>
        </div>
        <div v-if="store.stats?.fadingSoon" class="stat warn">
          <span class="n">{{ store.stats.fadingSoon }}</span>
          <span class="l">fading soon</span>
        </div>
      </div>

      <div v-if="quests.length" class="quests" :class="{ open: questsOpen }">
        <button class="qhead" type="button" :aria-expanded="questsOpen" aria-controls="map-quests" @click="toggleQuests">
          <span><strong>This week’s quests</strong> <span class="muted">{{ questsDone }} of {{ quests.length }} done</span></span>
          <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M6 9l6 6 6-6" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" /></svg>
        </button>
        <div v-show="questsOpen" id="map-quests" class="qbody">
          <QuestList :quests="quests" compact />
          <RouterLink class="small more" :to="{ name: 'week' }">Your week so far</RouterLink>
        </div>
      </div>

      <div v-if="exploring && share" class="explored" aria-live="polite">
        <strong>{{ pctText }} explored</strong>
        <span class="small muted">{{ share.explored.toLocaleString('en-AU') }} of {{ share.total.toLocaleString('en-AU') }} hexes within 5 km. Every new street lifts the fog.</span>
      </div>
    </div>

    <button class="fogbtn" type="button" :aria-pressed="exploring" @click="toggleExplored">Explored</button>
    <button class="hot-toggle" type="button" :aria-pressed="hot" @click="toggleHot">
      <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M12 3c1 4 5 5.5 5 10a5 5 0 0 1-10 0c0-2.4 1.2-3.8 2.4-5 .2 1.8 1 2.8 2.1 3.2C11 8.6 11 5.8 12 3z" fill="currentColor" /></svg>
      Hot spots
    </button>

    <button class="locate" type="button" aria-label="Centre on me" @click="recentre">
      <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><circle cx="12" cy="12" r="4" fill="currentColor" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3" stroke="currentColor" stroke-width="2" stroke-linecap="round" /></svg>
    </button>

    <div class="sheet" :class="{ tall: shPicked }">
      <template v-if="shPicked">
        <div class="shtop">
          <RouterLink class="small" :to="{ name: 'strongholds', params: { id: shPicked.id } }">All strongholds</RouterLink>
          <button class="close" type="button" aria-label="Close" @click="pickedSh = null">×</button>
        </div>
        <StrongholdCard :id="shPicked.id" :mode="store.mode" />
      </template>
      <template v-else-if="picked">
        <div class="pick">
          <Crest :crest="picked.mine ? store.user.crest : picked.crest || null" :colour="picked.colour" :id="picked.mine ? store.user.id : picked.owner" :size="24" />
          <div>
            <strong>{{ picked.mine ? 'Your ground' : `${picked.name}'s ground` }}</strong>
            <p class="small muted">
              Strength {{ picked.strength }} of 100.
              <template v-if="picked.mine">Goes wild in {{ plural(picked.days, 'day') }} if nobody runs it.</template>
              <template v-else>A {{ store.mode }} worth more than {{ picked.strength }} takes it.</template>
              <template v-if="picked.heat"> It changed hands {{ picked.heat === 1 ? 'once' : `${picked.heat} times` }} in the last month.</template>
            </p>
          </div>
          <button class="close" type="button" aria-label="Close" @click="picked = null">×</button>
        </div>
        <div class="two-btn">
          <RouterLink class="btn" :to="{ name: 'record' }">{{ picked.mine ? 'Run it again' : 'Go take it' }}</RouterLink>
          <RouterLink v-if="picked.h3" class="btn secondary" :to="{ name: 'plan', query: { copy: picked.h3 } }">{{ picked.mine ? 'Route round it' : 'Copy their line' }}</RouterLink>
        </div>
      </template>
      <template v-else-if="hot">
        <div class="hot-head">
          <strong>Hot spots nearby</strong>
          <button class="close" type="button" aria-label="Close hot spots" @click="hot = false">×</button>
        </div>
        <ul v-if="areas.length" class="hot-list">
          <li v-for="a in areas" :key="a.h3">
            <button type="button" class="hot-area" @click="goTo(a)">
              <span class="heat" :style="{ opacity: Math.min(1, 0.45 + a.heat * 0.08) }" aria-hidden="true"></span>
              <span>
                <strong>{{ a.where }}</strong>
                <span class="small muted">{{ a.heat === 1 ? 'Changed hands once' : `Changed hands ${a.heat} times` }} this month</span>
              </span>
            </button>
          </li>
        </ul>
        <p v-else class="small muted">No ground on screen has changed hands in the last 30 days. Quiet streets are yours for the taking.</p>
      </template>
      <template v-else-if="summary">
        <div class="pick season-sum">
          <Crest :crest="store.user.crest" colour="#2E55E6" :id="store.user.id" :size="40" />
          <div>
            <strong>Your {{ summary.previous.season.name }} season</strong>
            <p class="small">
              You gained {{ plural(summary.previous.gained, 'hex', 'hexes') }}<template v-if="summary.previous.players < 2"></template><template v-else-if="summary.previous.rank <= 3"> and finished {{ ordinal(summary.previous.rank) }} of {{ summary.previous.players }}</template><template v-else>, one of {{ summary.previous.players }} players who took ground</template>.
              <template v-if="summary.previous.badge"> That earns the {{ summary.previous.badge.name }} badge.</template>
            </p>
            <p class="small muted">The {{ summary.season.name }} season starts now. Everyone's ground is softer for a while, so it's a great time to take new streets.</p>
          </div>
        </div>
        <button class="btn block" type="button" @click="closeSummary">Let's go</button>
      </template>
      <template v-else-if="finder">
        <LoopFinder :key="finder.key" :centre="store.centre" :mode="store.mode" :start-km="finder.startKm" :auto="finder.auto" @show="showLoop" @close="closeFinder" />
      </template>
      <template v-else-if="showJourney">
        <FirstWeekCard :journey="journey" compact :finding="suggesting" @see-loop="seeFirstLoop" />
        <div v-if="journey.current && journey.current.n > 1" class="actions">
          <RouterLink class="btn" :to="{ name: 'record' }">Start a {{ store.mode }}</RouterLink>
          <button class="btn quiet" type="button" :disabled="suggesting" @click="suggest">{{ suggesting ? 'Finding a loop' : 'Suggest a loop' }}</button>
        </div>
      </template>
      <template v-else>
        <div v-if="nudge" class="nudge">
          <strong>{{ nudge.title }}</strong>
          <p class="small muted">{{ nudge.body }}</p>
        </div>
        <div class="actions">
          <RouterLink class="btn" :to="{ name: 'record' }">Start a {{ store.mode }}</RouterLink>
          <button class="btn quiet" type="button" :disabled="suggesting" @click="suggest">{{ suggesting ? 'Finding a loop' : 'Suggest a loop' }}</button>
        </div>
        <RouterLink class="planlink small" :to="{ name: 'plan' }">Plan a route and see what it takes</RouterLink>
      </template>
    </div>
  </div>
</template>

<style scoped>
.mapview { position: relative; height: calc(100dvh - var(--top-h) - var(--bar-h) - env(safe-area-inset-bottom)); }
.map { position: absolute; inset: 0; }
.topstack {
  position: absolute; top: 10px; left: 10px; right: 10px; z-index: 2;
  display: grid; gap: 8px; justify-items: start; pointer-events: none;
}
.topstack > * { pointer-events: auto; }
.strip { display: flex; gap: 8px; flex-wrap: wrap; }
.strip .stat {
  background: var(--card-glass); border-radius: 12px; padding: 8px 12px;
  box-shadow: 0 2px 10px -4px rgba(22, 48, 42, 0.35); display: grid; gap: 0;
}
.strip .n { font-weight: 850; font-stretch: 112%; font-size: 1.15rem; line-height: 1.1; }
.strip .l { font-size: 0.75rem; color: var(--ink-60); }
.strip .warn .n { color: var(--warn); }
.streakchip .n { display: inline-flex; align-items: center; gap: 6px; }
.tok { display: inline-flex; gap: 2px; }
.tok i { width: 9px; height: 8px; background: var(--you); clip-path: polygon(25% 0, 75% 0, 100% 50%, 75% 100%, 25% 100%, 0 50%); }
.locate {
  position: absolute; right: 12px; bottom: 150px; z-index: 2;
  width: 44px; height: 44px; border-radius: 50%; border: 0; background: var(--card); color: var(--you-ink);
  display: grid; place-items: center; box-shadow: 0 2px 10px -4px rgba(22, 48, 42, 0.45); cursor: pointer;
}
.sheet {
  position: absolute; left: 10px; right: 10px; bottom: 10px; z-index: 2;
  background: var(--card); border-radius: 16px; padding: 14px; display: grid; gap: 12px;
  box-shadow: 0 10px 30px -14px rgba(22, 48, 42, 0.55);
  max-width: 520px; margin: 0 auto;
}
.sheet.tall { max-height: 62%; overflow-y: auto; overscroll-behavior: contain; }
.shtop { display: flex; justify-content: space-between; align-items: center; }
.shtop a { color: var(--you-ink); font-weight: 650; }
.nudge { display: grid; gap: 2px; }
.planlink { justify-self: center; color: var(--ink); font-weight: 650; text-decoration: underline; text-underline-offset: 3px; padding: 10px; margin: -8px 0 -6px; }
.actions { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.pick { display: grid; grid-template-columns: auto 1fr auto; gap: 12px; align-items: start; }
.pick .hexdot { width: 20px; height: 18px; margin-top: 3px; }
.quests, .explored {
  background: var(--card-glass); border-radius: 12px; max-width: 360px; width: 100%;
  box-shadow: 0 2px 10px -4px rgba(22, 48, 42, 0.35);
}
.quests:not(.open) { width: auto; }
.qhead {
  display: flex; align-items: center; justify-content: space-between; gap: 10px; width: 100%;
  border: 0; background: none; padding: 9px 12px; font: inherit; font-size: 0.9rem; color: var(--ink); cursor: pointer; text-align: left;
}
.qhead svg { flex: none; transition: transform 0.2s ease; }
.open .qhead svg { transform: rotate(180deg); }
.qbody { padding: 2px 12px 12px; display: grid; gap: 10px; }
.more { color: var(--you-ink); font-weight: 650; justify-self: start; }
.explored { padding: 9px 12px; display: grid; gap: 2px; }
.fogbtn {
  position: absolute; right: 12px; bottom: 204px; z-index: 2;
  height: 40px; padding: 0 14px; border-radius: 20px; border: 0; background: var(--card); color: var(--ink);
  font: inherit; font-weight: 700; font-size: 0.85rem; cursor: pointer;
  box-shadow: 0 2px 10px -4px rgba(22, 48, 42, 0.45);
}
.fogbtn[aria-pressed='true'] { background: var(--ink); color: var(--on-ink, #F3F5EF); }
.pick > .crest { margin-top: 1px; }
.hot-toggle {
  position: absolute; left: 12px; bottom: 150px; z-index: 2;
  display: inline-flex; align-items: center; gap: 6px; min-height: 44px; padding: 0 14px;
  border: 0; border-radius: 999px; background: var(--card); color: var(--ink); font: inherit; font-weight: 700; font-size: 0.9rem;
  box-shadow: 0 2px 10px -4px rgba(22, 48, 42, 0.45); cursor: pointer;
}
.hot-toggle svg { color: #E5604D; }
.hot-toggle[aria-pressed='true'] { background: var(--ink); color: var(--on-ink); }
.hot-toggle[aria-pressed='true'] svg { color: #F2B33D; }
.hot-head { display: flex; justify-content: space-between; align-items: center; gap: 12px; }
.hot-list { list-style: none; margin: 0; padding: 0; display: grid; gap: 4px; }
.hot-area {
  width: 100%; display: grid; grid-template-columns: auto 1fr; gap: 12px; align-items: center; text-align: left;
  border: 0; background: none; font: inherit; color: inherit; padding: 6px 0; cursor: pointer; min-height: 44px;
}
.hot-area > span:last-child { display: grid; }
.heat { width: 18px; height: 16px; background: #E5604D; clip-path: polygon(25% 0, 75% 0, 100% 50%, 75% 100%, 25% 100%, 0 50%); }
.season-sum p + p { margin-top: 4px; }
.close { border: 0; background: var(--soft); width: 32px; height: 32px; border-radius: 50%; font-size: 1.2rem; cursor: pointer; color: var(--ink); }
.two-btn { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.two-btn .btn { justify-content: center; text-align: center; }
</style>
