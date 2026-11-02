<script setup>
// Your numbers: ground held, where you are on the ladder, the first week
// journey (new players), your weekly streak and badges, this week's quests
// and recap, your weeks, your personal bests, and every activity.
import { ref, computed, onMounted, watch } from 'vue'
import { api } from '../../lib/api/index.js'
import { store, refresh } from '../../lib/store.js'
import { km, pace, ago, speedKmh, MODE_LABEL } from '../../lib/format.js'
import { LEVELS, weekOf, prevWeek, clock } from '../../lib/engine/index.js'
import QuestList from '../../components/QuestList.vue'
import FirstWeekCard from '../../components/FirstWeekCard.vue'
import StreakCard from '../../components/StreakCard.vue'
import { loadJourney } from '../../lib/journey.js'
import { FOUNDING_BADGE } from '../../lib/engine/firstweek.js'

const activities = ref([])
const quests = ref([])
const bests = ref([])
const journey = ref(null)
const streak = ref(null)
const lastWeek = prevWeek(weekOf()).key
async function load() {
  await refresh()
  const [acts, b, qs, st, j] = await Promise.all([
    api.activities({ limit: 100 }),
    api.bests({ mode: store.mode }).catch(() => ({ bests: [] })),
    api.quests().catch(() => ({ quests: [] })),
    api.streak().catch(() => null),
    loadJourney().catch(() => null),
  ])
  activities.value = acts.activities
  streak.value = st?.streak || null
  journey.value = j
  bests.value = b.bests
  quests.value = qs.quests
}
const bestValue = (b) => (b.kind === 'dist' ? `${km(b.value, 1)} km` : clock(b.value))
const bestDate = (t) => new Date(t).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })
onMounted(load)
watch(() => store.mode, load)

const s = computed(() => store.stats || {})
const inARow = computed(() => streak.value?.current ?? s.value.streakWeeks ?? 0)
const badge = computed(() => (store.user?.foundingAt != null ? { ...FOUNDING_BADGE, at: store.user.foundingAt } : journey.value?.badge || null))
const badgeDate = (t) => new Date(t).toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' })
const weeks = computed(() => (s.value.weekKm12 || s.value.weekKm || []).slice().reverse())
const maxWeek = computed(() => Math.max(5, ...weeks.value))
const ladderPct = computed(() => {
  const h = s.value.hexes || 0
  if (!s.value.next) return 100
  const lo = s.value.level?.min || 0
  return Math.round(((h - lo) / (s.value.next.min - lo)) * 100)
})
</script>

<template>
  <div class="screen">
    <header class="screen-head head">
      <div>
        <h1>{{ store.user.name || 'You' }}</h1>
        <p class="muted">{{ s.level ? s.level.name : 'No ground yet' }} on the {{ store.mode }} map</p>
      </div>
      <RouterLink class="btn quiet small" :to="{ name: 'settings' }">Settings</RouterLink>
    </header>
    <nav class="links" aria-label="Friends">
      <RouterLink class="btn quiet small" :to="{ name: 'leagues' }">Private leagues</RouterLink>
      <RouterLink class="btn quiet small" :to="{ name: 'rivals' }">Your rivals</RouterLink>
    </nav>

    <div class="stat-row">
      <div class="stat"><span class="big-num">{{ s.hexes || 0 }}</span><span class="label">hexes held</span></div>
      <div class="stat"><span class="big-num">{{ s.km2 || 0 }}</span><span class="label">km² of ground</span></div>
      <div class="stat"><span class="big-num">{{ inARow }}</span><span class="label">{{ inARow === 1 ? 'week' : 'weeks' }} in a row</span></div>
    </div>

    <FirstWeekCard v-if="journey?.active" :journey="journey" />

    <StreakCard v-if="streak" :streak="streak" />

    <section v-if="badge" aria-labelledby="badges" class="badges">
      <h2 id="badges">Badges</h2>
      <div class="badge">
        <svg viewBox="0 0 24 24" width="40" height="40" aria-hidden="true">
          <polygon points="12,1.5 21.5,7 21.5,17 12,22.5 2.5,17 2.5,7" fill="#16302A" />
          <path d="M9 17V7.5M9 8h6.5l-1.6 2.2 1.6 2.2H9" fill="none" stroke="#F3F5EF" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
        <div>
          <strong>{{ badge.name }}</strong>
          <p class="small muted">{{ badge.detail }} Earned {{ badgeDate(badge.at) }}.</p>
        </div>
      </div>
    </section>

    <section aria-labelledby="ladder">
      <h2 id="ladder">The ladder</h2>
      <ol class="ladder">
        <li v-for="l in LEVELS" :key="l.id" :class="{ got: (s.hexes || 0) >= l.min, now: s.level?.id === l.id }">
          <span class="hexdot" aria-hidden="true"></span>
          <span class="name">{{ l.name }}</span>
          <span class="small muted">{{ l.min }}+ hexes</span>
        </li>
      </ol>
      <div v-if="s.next" class="meter" :aria-label="`${s.toNext} hexes to ${s.next.name}`"><span :style="{ width: `${ladderPct}%` }"></span></div>
      <p v-if="s.next" class="small muted">{{ s.toNext }} more hexes to reach {{ s.next.name }}.</p>
    </section>

    <section v-if="quests.length" aria-labelledby="quests" class="questsec">
      <h2 id="quests">This week’s quests</h2>
      <p class="small muted">Three for this week, sized to how you’ve been going. Miss one and nothing is lost: new ones arrive on Monday.</p>
      <QuestList :quests="quests" />
      <div class="weeklinks">
        <RouterLink class="btn quiet small" :to="{ name: 'week' }">Your week so far</RouterLink>
        <RouterLink class="btn quiet small" :to="{ name: 'week', query: { w: lastWeek } }">Last week</RouterLink>
      </div>
    </section>

    <section aria-labelledby="weeks">
      <h2 id="weeks">Your weeks</h2>
      <div class="bars" role="img" :aria-label="`Kilometres per week for the last ${weeks.length} weeks. This week ${weeks[weeks.length - 1] || 0} km.`">
        <div v-for="(w, i) in weeks" :key="i" class="bar" :class="{ now: i === weeks.length - 1 }">
          <span :style="{ height: `${(w / maxWeek) * 100}%` }"></span>
        </div>
      </div>
      <p class="small muted">Last 12 weeks, this week on the right. {{ s.totalKm || 0 }} km in total on the {{ store.mode }} map.</p>
    </section>

    <section aria-labelledby="bests">
      <h2 id="bests">Personal bests</h2>
      <p v-if="!bests.length" class="small muted">Your fastest 1K, 5K and more show up here after your first {{ store.mode }}.</p>
      <ul v-else class="rows plain">
        <li v-for="b in bests" :key="b.key">
          <RouterLink class="act" :to="{ name: 'activity', params: { id: b.activityId } }">
            <div>
              <strong>{{ b.label }}</strong>
              <p class="small muted">{{ bestDate(b.at) }}</p>
            </div>
            <span class="best">{{ bestValue(b) }}</span>
          </RouterLink>
        </li>
      </ul>
    </section>

    <RouterLink class="shlink" :to="{ name: 'strongholds' }">
      <span class="crownbadge" aria-hidden="true"><svg viewBox="0 0 24 24" width="16" height="16"><path d="M3 18h18l-1.5-10-4.5 4-3-7-3 7-4.5-4z" fill="currentColor" /></svg></span>
      <span><strong>Strongholds</strong><span class="small muted">Landmark loops and who holds their crowns</span></span>
    </RouterLink>

    <section aria-labelledby="acts">
      <h2 id="acts">Activities</h2>
      <div v-if="!activities.length" class="empty">
        <p class="muted">No activities yet. Your first loop puts you on the map.</p>
        <RouterLink class="btn" :to="{ name: 'record' }">Record one</RouterLink>
      </div>
      <ul v-else class="rows plain">
        <li v-for="a in activities" :key="a.id">
          <RouterLink class="act" :to="{ name: 'activity', params: { id: a.id } }">
            <div>
              <strong>{{ km(a.distanceM) }} km {{ MODE_LABEL[a.mode].toLowerCase() }}</strong>
              <p class="small muted">{{ ago(a.startedAt) }} · {{ a.mode === 'ride' ? `${speedKmh(a.paceSPerKm)} km/h` : `${pace(a.paceSPerKm)} /km` }}</p>
            </div>
            <span v-if="a.rejected" class="chip">Not counted</span>
            <span v-else-if="a.claimed || a.taken" class="chip claimed">+{{ (a.claimed || 0) + (a.taken || 0) }}</span>
          </RouterLink>
        </li>
      </ul>
    </section>
  </div>
</template>

<style scoped>
.head { grid-template-columns: 1fr auto; align-items: start; }
.links { display: flex; gap: 8px; flex-wrap: wrap; }
.ladder { list-style: none; padding: 0; margin: 12px 0; display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; }
.ladder li { display: grid; gap: 4px; justify-items: start; }
.ladder .hexdot { width: 24px; height: 21px; background: var(--soft); }
.ladder li.got .hexdot { background: var(--you); }
.ladder li.now .name { color: var(--you); }
.ladder .name { font-weight: 750; }
.meter { height: 10px; border-radius: 5px; background: var(--soft); overflow: hidden; }
.meter span { display: block; height: 100%; background: var(--you); }
.bars { display: grid; grid-template-columns: repeat(12, 1fr); gap: 6px; height: 110px; align-items: end; margin-top: 12px; }
.bar { height: 100%; display: flex; align-items: flex-end; }
.bar span { display: block; width: 100%; background: #AFC0F7; border-radius: 4px 4px 0 0; min-height: 3px; }
.bar.now span { background: var(--you); }
.plain { list-style: none; margin: 0; padding: 0; }
.badges { display: grid; gap: 10px; }
.badges h2, .badge p { margin: 0; }
.badge { display: grid; grid-template-columns: auto 1fr; gap: 12px; align-items: center; background: #fff; border-radius: var(--radius); padding: 12px 14px; box-shadow: inset 0 0 0 1px var(--line); }
.questsec { display: grid; gap: 12px; }
.questsec h2, .questsec p { margin: 0; }
.weeklinks { display: flex; gap: 10px; flex-wrap: wrap; }
.act { display: flex; justify-content: space-between; align-items: center; gap: 12px; text-decoration: none; color: inherit; }
.best { font-weight: 800; font-stretch: 108%; font-size: 1.15rem; font-variant-numeric: tabular-nums; }
.shlink { display: grid; grid-template-columns: auto 1fr; gap: 12px; align-items: center; text-decoration: none; color: inherit; background: #fff; border-radius: var(--radius); padding: 14px; box-shadow: inset 0 0 0 1px var(--line); }
.shlink > span:last-child { display: grid; gap: 2px; }
.shlink .crownbadge { width: 32px; height: 32px; border-radius: 50%; background: var(--ink); color: #fff; display: grid; place-items: center; }
.chip.claimed { background: rgba(46, 85, 230, 0.12); color: var(--you); }
</style>
