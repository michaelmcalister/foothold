<script setup>
// Choose a story mission before a run. Closed, it shows the chosen mission as
// a poster banner. Open, it's a full screen browser: a big preview of one
// episode at the top (the whole screen takes on that series' colour), then a
// row of poster cards per series. Tap a card to preview it, then Run this
// mission. Episodes unlock in order within a series on this device (any try
// unlocks the next). Shows the coach's pick for today when today's planned
// session suits one. Cover art comes from lib/missions/covers.js. "Stories
// near you" finds where each story is set (lib/missions/places.js) and how far
// that is from you, and "Know a local story?" asks for a new one
// (StoryRequest.vue).
import { ref, computed, onMounted, onBeforeUnmount, watch, nextTick } from 'vue'
import { MISSIONS, SAGAS, missionById, missionMeta, unlockedIds, loadProgress, syncProgress, suggestMission, unlockedBy } from '../lib/missions/index.js'
import { coverSvg, lookFor } from '../lib/missions/covers.js'
import { api } from '../lib/api/index.js'
import { nextSession, toISO } from '../lib/coach/index.js'
import { play } from '../lib/audio/sfx.js'
import { placeOf, storiesNear, distanceLabel, locateMe } from '../lib/missions/places.js'
import StoryRequest from './StoryRequest.vue'
import { playable, plusBadge, canSell, startCheckout } from '../lib/plus.js'
import { toast } from '../lib/store.js'
import { STORY_SEASON } from '../lib/storySeason.js'

const model = defineModel({ type: String, default: null })
const open = ref(false)
const progress = ref(loadProgress())
// The season finale opens for everyone together (lib/storySeason.js)
const seasonInfo = ref(null)
api.storySeason?.().then((x) => { seasonInfo.value = x }).catch(() => {})
const unlocked = computed(() => {
  const ids = unlockedIds(progress.value)
  if (!seasonInfo.value?.finaleOpen) ids.delete(STORY_SEASON.finaleMission)
  return ids
})
const finaleNote = computed(() => {
  const x = seasonInfo.value
  if (!x) return 'Opens for everyone at the end of the season.'
  return `Opens when everyone together reaches ${x.goalKm.toLocaleString('en-AU')} km (${x.km.toLocaleString('en-AU')} so far), or on finale weekend.`
})
const todayType = ref(null)
const chosen = computed(() => (model.value ? missionById(model.value) : null))
const suggestion = computed(() => {
  const s = suggestMission(todayType.value, unlocked.value)
  return s && s.id !== model.value ? s : null
})

const sagaOf = (m) => m.saga || 'trailkeepers'
const lockedBy = (m) => unlockedBy(m.id)?.title || null
const selling = canSell()
async function buyPlus() {
  try { await startCheckout() } catch (e) { toast(e?.message || 'That didn’t open. Try again in a moment.') }
}
const played = (m) => !!progress.value[m.id]?.tries
const allGroups = SAGAS.map((g) => ({ ...g, look: lookFor(g.id), missions: MISSIONS.filter((m) => sagaOf(m) === g.id) }))

// Filters for the series rows: everything, open mysteries, local stories,
// the new ones, short runs (under 25 minutes), or series you haven't started
const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'mystery', label: 'Mysteries' },
  { key: 'new', label: 'New' },
  { key: 'short', label: 'Under 25 min' },
  { key: 'fresh', label: 'Not started' },
]
const filter = ref('all')
const groups = computed(() => allGroups.filter((g) => {
  if (filter.value === 'mystery') return /mystery/i.test(g.look.tag || '')
  if (filter.value === 'new') return !!g.isNew
  if (filter.value === 'short') return g.missions.some((m) => m.minutes <= 25)
  if (filter.value === 'fresh') return !g.missions.some(played)
  return true
}).map((g) => (filter.value === 'short' ? { ...g, missions: g.missions.filter((m) => m.minutes <= 25) } : g)))
const sagaTitle = (m) => SAGAS.find((g) => g.id === sagaOf(m))?.title || ''

// Covers are drawn once per mission and reused
const covers = new Map()
const cover = (m) => {
  if (!covers.has(m.id)) covers.set(m.id, coverSvg(m))
  return covers.get(m.id)
}

// The next episode to play in each series you've started
const upNext = computed(() => allGroups.map((g) => {
  if (!g.missions.some(played)) return null
  return g.missions.find((m) => unlocked.value.has(m.id) && !played(m)) || null
}).filter(Boolean))

// What the big preview shows
const previewId = ref(null)
const preview = computed(() => missionById(previewId.value) || chosen.value || missionById(suggestion.value?.id) || upNext.value[0] || MISSIONS[0])
const look = computed(() => lookFor(sagaOf(preview.value)))
const previewNote = computed(() => SAGAS.find((g) => g.id === sagaOf(preview.value))?.note || null)
const isPick = computed(() => suggestion.value?.id === preview.value.id)

const sheet = ref(null)
const closeBtn = ref(null)
let opener = null

// Tapping a poster shows it up top and takes you there in one tap. The smooth
// scroll waits for the new cover to render, and if iPhone Safari cuts it short
// (the hero changes under it), it finishes the trip without the animation.
let jump = 0 // bumped by each touch, so a finishing jump never fights your finger
const touched = () => { jump++ }
async function show(m) {
  const mine = ++jump
  if (previewId.value !== m.id) play('select', { wait: false })
  previewId.value = m.id
  await nextTick()
  const el = sheet.value
  if (!el) return
  const calm = matchMedia('(prefers-reduced-motion: reduce)').matches
  requestAnimationFrame(() => el.scrollTo({ top: 0, behavior: calm ? 'auto' : 'smooth' }))
  setTimeout(() => { if (jump === mine && sheet.value === el && el.scrollTop > 0) el.scrollTop = 0 }, calm ? 0 : 600)
}
function pick(id) {
  if (id) play('lockIn', { wait: false })
  model.value = id
  close()
}
async function openBrowser(e) {
  opener = e?.currentTarget || null
  progress.value = loadProgress()
  syncProgress().then((p) => { progress.value = p })
  previewId.value = null
  open.value = true
  play('reveal', { wait: false })
  await nextTick()
  closeBtn.value?.focus()
}
function close() {
  open.value = false
  opener?.focus?.()
}
function onKey(e) { if (open.value && e.key === 'Escape') close() }
watch(open, (v) => { document.documentElement.classList.toggle('mbrowse-open', v) })

onMounted(async () => {
  window.addEventListener('keydown', onKey)
  try {
    const { plan } = await api.plan()
    const s = plan ? nextSession(plan, toISO(Date.now())) : null
    if (s && s.date === toISO(Date.now())) todayType.value = s.type
  } catch { /* no plan: no suggestion */ }
})
onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKey)
  document.documentElement.classList.remove('mbrowse-open')
})

// Stories near you: asked for with a tap, worked out on this phone only
const here = ref(null)
const locating = ref(false)
const locateFailed = ref(false)
const asking = ref(false)
const nearby = computed(() => storiesNear(here.value))
const previewPlace = computed(() => placeOf(preview.value))
const previewDistance = computed(() => (here.value && previewPlace.value ? distanceLabel(here.value, previewPlace.value) : null))

// Capture the story: who has planted a flag where the previewed story is set
const flags = ref(null)
let flagsFor = null
watch(() => (open.value && previewPlace.value ? preview.value.id : null), async (id) => {
  flagsFor = id
  flags.value = null
  if (!id) return
  const f = await api.storyFlags(id).catch(() => null)
  if (flagsFor === id) flags.value = f
}, { immediate: true })
const flagLine = computed(() => {
  const f = flags.value
  if (!f) return null
  if (f.mine) return f.count === 1 ? 'Your flag is planted here. You were first.' : `Your flag is planted here, with ${f.count - 1} other ${f.count === 2 ? 'runner' : 'runners'}.`
  if (!f.count) return 'Nobody has solved this one on the spot yet. Finish it there to plant the first flag.'
  return `${f.count} ${f.count === 1 ? 'runner has' : 'runners have'} solved this on the spot. ${f.first ? `${f.first.name} was first.` : ''} Finish it there to plant yours.`
})
async function findNearby() {
  locating.value = true
  locateFailed.value = false
  here.value = await locateMe()
  locating.value = false
  locateFailed.value = !here.value
  if (here.value) play('found', { wait: false })
}

const teaser = [missionById('ember-wind'), missionById('heist-gala'), missionById('quiz-1')].filter(Boolean)
</script>

<template>
  <div class="mpick">
    <div v-if="suggestion" class="suggest">
      <span>{{ suggestion.text }}</span>
      <button type="button" class="btn small" @click="pick(suggestion.id)">Choose</button>
    </div>

    <!-- Closed: the chosen mission as a poster banner -->
    <button v-if="chosen" type="button" class="mb-banner" :style="{ '--accent': lookFor(sagaOf(chosen)).accent, '--deep': lookFor(sagaOf(chosen)).deep }" aria-haspopup="dialog" @click="openBrowser">
      <span class="mb-art" v-html="cover(chosen)" />
      <span class="mb-shade" />
      <span class="btext">
        <span class="mb-series">{{ sagaTitle(chosen) }}<template v-if="chosen.episode">, episode {{ chosen.episode }}</template></span>
        <span class="btitle">{{ chosen.title }}</span>
        <span class="bmeta">{{ missionMeta(chosen) }}</span>
      </span>
      <span class="mb-chg">Change</span>
    </button>
    <button v-else type="button" class="mb-banner mb-empty" aria-haspopup="dialog" @click="openBrowser">
      <span class="mb-strip" aria-hidden="true">
        <span v-for="m in teaser" :key="m.id" class="mb-tile" v-html="cover(m)" />
      </span>
      <span class="mb-shade" />
      <span class="btext">
        <span class="btitle">Add a story to this run</span>
        <span class="bmeta">Thrillers, a game show and adventures, told while you run.</span>
      </span>
      <span class="mb-chg">Browse</span>
    </button>

    <!-- Open: the full screen browser -->
    <Teleport to="body">
      <Transition name="mb">
        <div v-if="open" ref="sheet" class="browse" @touchstart.passive="touched" @wheel.passive="touched" role="dialog" aria-modal="true" aria-labelledby="mb-title" :style="{ '--accent': look.accent, '--deep': look.deep }">
          <header class="mb-top">
            <h2 id="mb-title" class="htitle">Missions</h2>
            <button ref="closeBtn" type="button" class="mb-x" aria-label="Close missions" @click="close">
              <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" /></svg>
            </button>
          </header>

          <section class="mb-hero" aria-live="polite">
            <div class="hstage">
              <Transition name="xf">
                <div :key="preview.id" class="hart" v-html="cover(preview)" />
              </Transition>
              <div class="hfade" />
            </div>
            <div class="hinfo">
              <p class="hseries">
                <span>{{ sagaTitle(preview) }}</span>
                <span v-if="isPick" class="mb-pill">Coach's pick today</span>
                <span v-else-if="played(preview)" class="mb-pill mb-quiet">Played</span>
              </p>
              <h3 class="htitle2">{{ preview.title }}</h3>
              <p class="hmeta">{{ missionMeta(preview) }}</p>
              <p v-if="previewPlace" class="hplace">
                <svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true"><path d="M12 2a7 7 0 00-7 7c0 5 7 13 7 13s7-8 7-13a7 7 0 00-7-7zm0 9.5A2.5 2.5 0 1112 6a2.5 2.5 0 010 5.5z" fill="currentColor" /></svg>
                <span>Set at {{ previewPlace.name }}<template v-if="previewDistance">, {{ previewDistance }}</template></span>
              </p>
              <p v-if="flagLine" class="hflag">
                <svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true"><path d="M5 21V4h11l-1.5 3.5L16 11H7v10z" fill="currentColor" /></svg>
                <span>{{ flagLine }}</span>
              </p>
              <p class="hblurb">{{ preview.blurb }}</p>
              <p v-if="previewNote" class="hnote">{{ previewNote }}</p>
              <div class="hact">
                <template v-if="unlocked.has(preview.id) && !playable(preview)">
                  <button v-if="selling" type="button" class="mb-play" @click="buyPlus">Get Foothold Plus to play</button>
                  <p v-else class="mb-locked">Part of Foothold Plus. Episode 1 of every series is free.</p>
                </template>
                <button v-else-if="unlocked.has(preview.id)" type="button" class="mb-play" @click="pick(preview.id)">
                  <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M7 4.5v15l12.5-7.5z" fill="currentColor" /></svg>
                  {{ model === preview.id ? 'Keep this mission' : 'Run this mission' }}
                </button>
                <p v-else class="mb-locked">
                  <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path d="M7 10V8a5 5 0 0110 0v2h1v10H6V10zm2 0h6V8a3 3 0 00-6 0z" fill="currentColor" /></svg>
                  <template v-if="preview.id === STORY_SEASON.finaleMission">{{ finaleNote }}</template>
                  <template v-else>Play {{ lockedBy(preview) }} to unlock</template>
                </p>
              </div>
            </div>
          </section>

          <button type="button" class="norun" :aria-pressed="!model" @click="pick(null)">
            {{ model ? 'No story this time, just the usual coach' : 'Just the run, with the usual coach (chosen)' }}
          </button>

          <section v-if="upNext.length" class="mb-row">
            <h3 class="rtitle">Continue your stories</h3>
            <ul class="mb-cards" role="list">
              <li v-for="m in upNext" :key="m.id">
                <button type="button" class="mb-card" :class="{ 'is-on': preview.id === m.id, 'is-picked': model === m.id }" :style="{ '--ring': lookFor(sagaOf(m)).accent }" :aria-label="`${sagaTitle(m)}: ${m.title}. ${missionMeta(m)}`" @click="show(m)">
                  <span class="cart" v-html="cover(m)" />
                  <span class="cfade" />
                  <span class="ctext"><span class="cep">{{ sagaTitle(m) }}</span><span class="ctitle">{{ m.title }}</span></span>
                </button>
              </li>
            </ul>
          </section>

          <section class="mb-row mb-near" aria-labelledby="near-title">
            <h3 id="near-title" class="rtitle"><span>Stories near you</span></h3>
            <p class="rblurb">Real places and real history, from your suburb to the other side of the world.</p>
            <div v-if="!here" class="near-ask">
              <button type="button" class="near-btn" :disabled="locating" @click="findNearby">
                <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M12 2a7 7 0 00-7 7c0 5 7 13 7 13s7-8 7-13a7 7 0 00-7-7zm0 9.5A2.5 2.5 0 1112 6a2.5 2.5 0 010 5.5z" fill="currentColor" /></svg>
                {{ locating ? 'Finding you…' : 'Find stories near me' }}
              </button>
              <p v-if="locateFailed" class="near-note" role="status">We couldn’t find you. Check Location is on for Foothold, then try again.</p>
              <p v-else class="near-note">Your location stays on your phone. It’s only used to work out the distances.</p>
            </div>
            <ul v-else class="mb-cards" role="list">
              <li v-for="n in nearby" :key="n.mission.id">
                <button type="button" class="mb-card" :class="{ 'is-on': preview.id === n.mission.id, 'is-lock': !unlocked.has(n.mission.id) }" :style="{ '--ring': lookFor(sagaOf(n.mission)).accent }" :aria-label="`${sagaTitle(n.mission)}: ${n.mission.title}. Set at ${n.place.name}, ${n.label}`" @click="show(n.mission)">
                  <span class="cart" v-html="cover(n.mission)" />
                  <span class="cfade" />
                  <span class="ctext">
                    <span class="cep">{{ n.label }}</span>
                    <span class="ctitle">{{ n.place.name }}</span>
                  </span>
                </button>
              </li>
            </ul>
            <button type="button" class="near-req" @click="asking = true">Know a local story? Tell us where</button>
          </section>


          <div class="mb-filters" role="group" aria-label="Show series">
            <button v-for="f in FILTERS" :key="f.key" type="button" class="mb-chip" :aria-pressed="filter === f.key" @click="filter = f.key">{{ f.label }}</button>
          </div>
          <p v-if="!groups.length" class="mb-empty-row">Nothing here yet. Try another filter.</p>

          <section v-for="g in groups" :key="g.id" class="mb-row" :style="{ '--ring': g.look.accent }">
            <h3 class="rtitle"><span>{{ g.title }}</span> <span v-if="g.isNew" class="mb-new">New</span> <span class="rtag">{{ g.look.tag }}</span></h3>
            <p class="rblurb">{{ g.blurb }}</p>
            <ul class="mb-cards" role="list">
              <li v-for="m in g.missions" :key="m.id">
                <button
                  type="button" class="mb-card"
                  :class="{ 'is-on': preview.id === m.id, 'is-picked': model === m.id, 'is-lock': !unlocked.has(m.id) }"
                  :aria-label="`${m.title}. ${missionMeta(m)}${unlocked.has(m.id) ? '' : '. Locked'}${played(m) ? '. Played' : ''}`"
                  @click="show(m)"
                >
                  <span class="cart" v-html="cover(m)" />
                  <span class="cfade" />
                  <span v-if="!unlocked.has(m.id)" class="clock" aria-hidden="true">
                    <svg viewBox="0 0 24 24" width="18" height="18"><path d="M7 10V8a5 5 0 0110 0v2h1v10H6V10zm2 0h6V8a3 3 0 00-6 0z" fill="currentColor" /></svg>
                  </span>
                  <span v-else-if="plusBadge(m)" class="cplus" aria-hidden="true">Plus</span>
                  <span v-else-if="played(m)" class="cdone" aria-hidden="true">
                    <svg viewBox="0 0 24 24" width="14" height="14"><path d="M5 12.5l4.5 4.5L19 7.5" stroke="currentColor" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round" /></svg>
                  </span>
                  <span class="ctext">
                    <span class="cep">{{ m.episode ? `Episode ${m.episode}` : `${m.minutes} min` }}</span>
                    <span class="ctitle">{{ m.title }}</span>
                  </span>
                </button>
              </li>
            </ul>
          </section>
          <p class="mb-foot">Full cast, scene sounds and music. Answer out loud or tap.</p>
          <StoryRequest v-if="asking" :here="here" @close="asking = false" />
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<style scoped>
.mb-filters { display: flex; gap: 8px; overflow-x: auto; padding: 4px 16px 2px; scrollbar-width: none; }
.mb-chip { flex: none; min-height: 36px; padding: 0 14px; border-radius: 999px; border: 1.5px solid rgba(255, 255, 255, 0.35); background: transparent; color: inherit; font: inherit; font-weight: 700; font-size: 0.88rem; }
.mb-chip[aria-pressed='true'] { background: var(--accent); border-color: var(--accent); color: var(--deep); }
.mb-chip:focus-visible { outline: 3px solid #fff; outline-offset: 2px; }
.cplus { position: absolute; top: 8px; right: 8px; padding: 2px 8px; border-radius: 999px; background: var(--ring, #fff); color: #10131C; font-size: 0.72rem; font-weight: 850; }
.hflag { display: flex; gap: 6px; align-items: flex-start; margin: 4px 0 0; font-size: 0.85rem; font-weight: 650; color: var(--accent); }
.hflag svg { flex: none; margin-top: 2px; }
.mb-empty-row { padding: 8px 16px; opacity: 0.8; }
.mpick { display: grid; gap: 8px; }
.suggest { display: flex; align-items: center; gap: 10px; background: var(--tint); border-radius: 12px; padding: 8px 8px 8px 14px; font-weight: 650; font-size: 0.92rem; }
.suggest span { flex: 1; min-width: 0; }
.suggest .btn { flex: none; }

/* ---- the closed banner ---- */
.mb-banner {
  position: relative; display: block; width: 100%; height: 132px; padding: 0; border: 0; border-radius: 16px; overflow: hidden;
  font: inherit; text-align: left; color: #fff; cursor: pointer; background: var(--deep, #10131C); isolation: isolate;
}
.mb-banner .mb-art, .mb-banner .mb-strip { position: absolute; inset: 0; z-index: -2; }
.mb-banner .mb-art :deep(svg), .mb-tile :deep(svg) { width: 100%; height: 100%; display: block; }
.mb-banner .mb-strip { display: grid; grid-template-columns: repeat(3, 1fr); }
.mb-banner .mb-tile { display: block; overflow: hidden; }
.mb-banner .mb-shade { position: absolute; inset: 0; z-index: -1; background: linear-gradient(90deg, rgba(0, 0, 0, 0.82) 0%, rgba(0, 0, 0, 0.55) 55%, rgba(0, 0, 0, 0.1) 100%); }
.mb-banner.mb-empty .mb-shade { background: linear-gradient(0deg, rgba(4, 6, 12, 0.9) 10%, rgba(4, 6, 12, 0.35) 100%); }
.btext { position: absolute; left: 16px; right: 92px; bottom: 14px; display: grid; gap: 2px; }
.mb-series { font-size: 0.8rem; font-weight: 700; color: var(--accent, #fff); }
.btitle { font-weight: 900; font-stretch: 62%; font-size: 1.85rem; line-height: 0.95; letter-spacing: 0.005em; text-wrap: balance; }
.mb-empty .btitle { font-size: 1.6rem; }
.bmeta { font-size: 0.82rem; opacity: 0.85; }
.mb-chg {
  position: absolute; right: 12px; bottom: 14px; padding: 7px 12px; border-radius: 999px;
  background: rgba(255, 255, 255, 0.16); backdrop-filter: blur(6px); -webkit-backdrop-filter: blur(6px);
  font-weight: 750; font-size: 0.85rem;
}
.mb-banner:focus-visible { outline: 3px solid var(--you); outline-offset: 2px; }

/* ---- the browser ---- */
.browse {
  position: fixed; inset: 0; z-index: 80; overflow-y: auto; overscroll-behavior: contain; -webkit-overflow-scrolling: touch;
  background: var(--deep); color: #F4F6FA; transition: background-color 0.6s ease;
  padding-bottom: calc(env(safe-area-inset-bottom) + 28px);
}
.mb-top {
  position: sticky; top: 0; z-index: 3; display: flex; align-items: center; justify-content: space-between;
  padding: calc(env(safe-area-inset-top) + 10px) 16px 10px;
  background: linear-gradient(180deg, rgba(0, 0, 0, 0.55), rgba(0, 0, 0, 0));
}
.htitle { margin: 0; font-size: 1.15rem; font-weight: 850; letter-spacing: 0.01em; }
.mb-x {
  display: grid; place-items: center; width: 44px; height: 44px; border: 0; border-radius: 50%;
  background: rgba(0, 0, 0, 0.45); color: #fff; cursor: pointer;
}
.mb-x:focus-visible, .mb-play:focus-visible, .norun:focus-visible { outline: 3px solid var(--accent); outline-offset: 2px; }

.mb-hero { position: relative; margin-top: calc(-1 * (env(safe-area-inset-top) + 64px)); }
.hstage { position: relative; height: min(calc(112vw / var(--zoom, 1)), 540px); overflow: hidden; }
.hart { position: absolute; inset: 0; }
.hart :deep(svg) { width: 100%; height: 100%; display: block; animation: drift 18s ease-in-out infinite alternate; transform-origin: 50% 40%; }
@keyframes drift { from { transform: scale(1.02); } to { transform: scale(1.12) translateY(-1.5%); } }
.hfade { position: absolute; inset: 0; background: linear-gradient(180deg, rgba(0, 0, 0, 0) 55%, var(--deep) 98%); }
.hinfo { position: relative; margin-top: -92px; padding: 0 16px 6px; display: grid; gap: 6px; }
.hseries { margin: 0; display: flex; flex-wrap: wrap; align-items: center; gap: 8px; font-weight: 750; font-size: 0.9rem; color: var(--accent); }
.mb-pill { padding: 3px 9px; border-radius: 999px; background: var(--accent); color: #0B0D12; font-size: 0.75rem; font-weight: 800; }
.mb-pill.mb-quiet { background: rgba(255, 255, 255, 0.16); color: #fff; }
.htitle2 {
  margin: 0; font-weight: 900; font-stretch: 62%; font-size: clamp(2.6rem, calc(14vw / var(--zoom, 1)), 3.6rem);
  line-height: 0.9; text-wrap: balance; text-shadow: 0 2px 18px rgba(0, 0, 0, 0.45);
}
.hmeta { margin: 0; font-size: 0.88rem; font-weight: 650; opacity: 0.85; }
.hblurb { margin: 0; font-size: 0.98rem; line-height: 1.45; max-width: 38ch; color: rgba(244, 246, 250, 0.9); }
.hnote { margin: 2px 0 0; font-size: 0.82rem; line-height: 1.4; padding: 8px 10px; border-radius: 10px; background: rgba(255, 255, 255, 0.1); }
.hact { margin-top: 8px; }
.mb-play {
  display: inline-flex; align-items: center; justify-content: center; gap: 8px; width: 100%; min-height: 52px; border: 0; border-radius: 12px;
  background: #fff; color: #0B0D12; font: inherit; font-weight: 850; font-size: 1.05rem; cursor: pointer;
}
.mb-play:active { transform: scale(0.98); }
.mb-locked { display: flex; align-items: center; justify-content: center; gap: 8px; margin: 0; min-height: 52px; border-radius: 12px; background: rgba(255, 255, 255, 0.1); font-weight: 700; }
.norun {
  display: block; margin: 10px 16px 0; padding: 10px 0; border: 0; background: none; color: rgba(244, 246, 250, 0.75);
  font: inherit; font-size: 0.9rem; font-weight: 650; text-decoration: underline; text-underline-offset: 3px; cursor: pointer;
}
.norun[aria-pressed='true'] { color: var(--accent); }

.mb-row { margin-top: 22px; }
.rtitle { margin: 0 16px; font-size: 1.12rem; font-weight: 850; display: flex; align-items: baseline; gap: 8px; }
.mb-new { padding: 2px 8px; border-radius: 999px; background: var(--ring); color: #0B0D12; font-size: 0.72rem; font-weight: 850; align-self: center; }
.rtag { font-size: 0.78rem; font-weight: 700; color: var(--ring, var(--accent)); }
.rblurb { margin: 3px 16px 0; font-size: 0.84rem; line-height: 1.4; color: rgba(244, 246, 250, 0.7); max-width: 46ch; }
.mb-cards {
  list-style: none; margin: 10px 0 0; padding: 4px 16px 8px; display: flex; gap: 10px; overflow-x: auto;
  scroll-snap-type: x mandatory; scroll-padding: 0 16px; scrollbar-width: none;
}
.mb-cards::-webkit-scrollbar { display: none; }
.mb-cards li { flex: none; scroll-snap-align: start; }
.mb-card {
  position: relative; display: block; width: calc(34vw / var(--zoom, 1)); max-width: 150px; min-width: 112px; aspect-ratio: 2 / 3;
  padding: 0; border: 0; border-radius: 10px; overflow: hidden; cursor: pointer; background: #000; color: #fff; font: inherit; text-align: left;
  transition: transform 0.18s ease, box-shadow 0.18s ease;
}
.mb-card .cart { position: absolute; inset: 0; }
.mb-card .cart :deep(svg) { width: 100%; height: 100%; display: block; }
.cfade { position: absolute; inset: 0; background: linear-gradient(180deg, rgba(0, 0, 0, 0) 45%, rgba(0, 0, 0, 0.85) 100%); }
.ctext { position: absolute; left: 8px; right: 8px; bottom: 8px; display: grid; gap: 1px; }
.cep { font-size: 0.68rem; font-weight: 750; color: var(--ring, #fff); }
.ctitle { font-weight: 900; font-stretch: 62%; font-size: 1.12rem; line-height: 0.98; text-wrap: balance; }
.mb-card.is-on { box-shadow: 0 0 0 3px #fff; transform: translateY(-2px); }
.mb-card.is-picked:not(.is-on) { box-shadow: 0 0 0 3px var(--ring); }
.mb-card.is-lock .cart { filter: grayscale(0.85) brightness(0.55); }
.mb-card:focus-visible { outline: 3px solid var(--ring, #fff); outline-offset: 3px; }
.clock, .cdone {
  position: absolute; top: 7px; right: 7px; display: grid; place-items: center; width: 28px; height: 28px; border-radius: 50%;
  background: rgba(0, 0, 0, 0.6); color: #fff;
}
.cdone { background: var(--ring); color: #0B0D12; width: 22px; height: 22px; }
.hplace { margin: 0; display: flex; align-items: center; gap: 6px; font-size: 0.86rem; font-weight: 700; color: var(--accent); }
.hplace svg { flex: none; }
.near-ask { margin: 10px 16px 0; display: grid; gap: 6px; }
.near-btn {
  display: inline-flex; align-items: center; justify-content: center; gap: 8px; min-height: 48px; border: 0; border-radius: 12px;
  background: rgba(255, 255, 255, 0.14); color: #fff; font: inherit; font-weight: 800; font-size: 1rem; cursor: pointer;
}
.near-btn:disabled { opacity: 0.7; }
.near-note { margin: 0; font-size: 0.8rem; color: rgba(244, 246, 250, 0.7); }
.near-req {
  display: block; margin: 8px 16px 0; padding: 8px 0; border: 0; background: none; color: var(--accent);
  font: inherit; font-size: 0.92rem; font-weight: 750; text-decoration: underline; text-underline-offset: 3px; cursor: pointer;
}
.near-btn:focus-visible, .near-req:focus-visible { outline: 3px solid var(--accent); outline-offset: 2px; }
.mb-foot { margin: 26px 16px 0; font-size: 0.82rem; color: rgba(244, 246, 250, 0.6); }

/* Opening and changing the preview */
.mb-enter-active, .mb-leave-active { transition: opacity 0.25s ease, transform 0.3s cubic-bezier(0.2, 0.8, 0.2, 1); }
.mb-enter-from, .mb-leave-to { opacity: 0; transform: translateY(24px); }
.xf-enter-active, .xf-leave-active { transition: opacity 0.5s ease; }
.xf-leave-active { position: absolute; inset: 0; }
.xf-enter-from, .xf-leave-to { opacity: 0; }

@media (prefers-reduced-motion: reduce) {
  .hart :deep(svg) { animation: none; }
  .mb-enter-active, .mb-leave-active, .xf-enter-active, .xf-leave-active, .mb-card, .browse, .hfade { transition: none; }
}
</style>

<style>
/* No page scroll behind the open mission browser */
html.mbrowse-open, html.mbrowse-open body { overflow: hidden; }
</style>
