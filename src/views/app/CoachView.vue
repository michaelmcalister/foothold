<script setup>
// The coach: a training plan built from your real runs, not a guess,
// that ramps slowly, bends when you're sick or sore, and points each easy
// run at ground worth taking. Strength days hand over to FormTrack.
import { ref, computed, onMounted } from 'vue'
import { api } from '../../lib/api/index.js'
import { store, toast } from '../../lib/store.js'
import { pace } from '../../lib/format.js'
import { generatePlan, adaptPlan, nextSession, estimateFitness } from '../../lib/coach/index.js'

const plan = ref(null)
const acts = ref([])
const loading = ref(true)
const changes = ref([])
const warnings = ref([])
const formtrackUrl = 'https://formtrack.com.au'

// Setup form
const goal = ref('10k')
const raceDate = ref('')
const days = ref(3)
const longDay = ref('sun')
const strength = ref(true)
const recent5k = ref('')
const draft = ref(null)

// Sheets
const sheet = ref(null) // 'sick' | 'hurt' | 'away' | {edit: session}
const sickDays = ref(3)
const hurtArea = ref('knee')
const hurtLevel = ref('niggle')
const awayFrom = ref('')
const awayTo = ref('')
const editKm = ref(0)
const editDate = ref('')

const today = () => new Date().toISOString().slice(0, 10)

onMounted(async () => {
  const [{ plan: p }, { activities }] = await Promise.all([api.plan(), api.activities({ limit: 200 })])
  plan.value = p
  acts.value = activities.filter((a) => !a.rejected)
  loading.value = false
})

const runs = computed(() => acts.value.filter((a) => a.mode === 'run'))
const history = computed(() => {
  const now = Date.now()
  const recent = runs.value.filter((a) => now - a.startedAt < 28 * 86400000)
  const weekly = recent.reduce((s, a) => s + a.distanceM, 0) / 4000
  const longest = recent.reduce((m, a) => Math.max(m, a.distanceM), 0) / 1000
  return { weeklyKm: Math.round(weekly * 10) / 10, longestKm: Math.round(longest * 10) / 10, count: recent.length }
})
const fitness = computed(() => {
  try {
    return estimateFitness(runs.value, { recent5kS: parseTime(recent5k.value) })
  } catch { return null }
})

function parseTime(s) {
  const m = String(s || '').trim().match(/^(\d{1,2}):(\d{2})$/)
  return m ? Number(m[1]) * 60 + Number(m[2]) : null
}

function build() {
  const r = generatePlan({
    goal: goal.value,
    raceDate: raceDate.value || undefined,
    daysPerWeek: Number(days.value),
    longRunDay: longDay.value,
    currentWeeklyKm: history.value.weeklyKm,
    longestRecentKm: history.value.longestKm,
    recent5kS: parseTime(recent5k.value) || undefined,
    activities: runs.value,
    includeStrength: strength.value,
    today: today(),
  })
  draft.value = r.plan || r
  warnings.value = r.warnings || draft.value.warnings || []
}

async function keep() {
  plan.value = draft.value
  draft.value = null
  await api.savePlan(plan.value)
  toast('Plan saved. Your first session is below.')
}

async function apply(event) {
  const r = adaptPlan(plan.value, event, today())
  plan.value = r.plan
  changes.value = r.changes || []
  warnings.value = r.warnings || []
  sheet.value = null
  await api.savePlan(plan.value)
}

async function endPlan() {
  if (!confirm('End this plan? You can build a new one any time.')) return
  plan.value = null
  await api.savePlan(null)
}

const next = computed(() => {
  if (!plan.value) return null
  const n = nextSession(plan.value, today())
  return n?.session || n || null
})
const thisWeek = computed(() => {
  if (!plan.value) return null
  const t = today()
  return plan.value.weeks.find((w) => w.sessions.some((s) => s.date >= t)) || plan.value.weeks[plan.value.weeks.length - 1]
})
function openEdit(s) {
  editKm.value = s.distanceKm || 0
  editDate.value = s.date
  sheet.value = { edit: s }
}
const TYPE_LABEL = { easy: 'Easy', long: 'Long run', tempo: 'Tempo', intervals: 'Intervals', strides: 'Strides', recovery: 'Recovery', strength: 'Strength', rest: 'Rest' }
const dayName = (d) => new Date(d + 'T00:00:00').toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short' })
</script>

<template>
  <div class="screen">
    <header class="screen-head">
      <h1>Coach</h1>
      <p class="muted">A plan built from how you actually run, that builds slowly and bends when life happens.</p>
    </header>

    <p v-if="loading" class="muted">Loading</p>

    <!-- No plan yet: set one up -->
    <template v-else-if="!plan && !draft">
      <section class="panel stack">
        <h2>What are you working towards?</h2>
        <div class="seg wrap" role="group" aria-label="Goal">
          <button v-for="g in [['5k', '5K'], ['10k', '10K'], ['half', 'Half'], ['marathon', 'Marathon'], ['base', 'Just fitter'], ['return', 'Back from injury']]" :key="g[0]" type="button" :aria-pressed="goal === g[0]" @click="goal = g[0]">{{ g[1] }}</button>
        </div>
        <div v-if="!['base', 'return'].includes(goal)" class="field">
          <label for="race">Race date (optional)</label>
          <input id="race" v-model="raceDate" type="date" :min="today()" />
        </div>
        <div class="two">
          <div class="field">
            <label for="days">Runs a week</label>
            <select id="days" v-model.number="days"><option v-for="d in [2, 3, 4, 5, 6]" :key="d" :value="d">{{ d }}</option></select>
          </div>
          <div class="field">
            <label for="long">Long run day</label>
            <select id="long" v-model="longDay"><option value="sat">Saturday</option><option value="sun">Sunday</option><option value="fri">Friday</option><option value="wed">Wednesday</option></select>
          </div>
        </div>
        <div class="field">
          <label for="r5k">Recent 5K time (optional)</label>
          <input id="r5k" v-model="recent5k" inputmode="numeric" placeholder="mm:ss, for example 27:30" />
          <span class="hint">We trust your recorded runs first. This only helps if you have few.</span>
        </div>
        <label class="check">
          <input v-model="strength" type="checkbox" />
          <span>Add strength sessions in FormTrack. Strong legs and hips are the best injury protection for runners.</span>
        </label>
        <p class="small muted">
          From your last four weeks: {{ history.weeklyKm }} km a week, longest run {{ history.longestKm }} km.
          <template v-if="history.count < 3">That's not much to go on, so the plan starts gently and adjusts as you record.</template>
        </p>
        <button class="btn" type="button" @click="build">Build my plan</button>
      </section>
    </template>

    <!-- Draft preview -->
    <template v-else-if="draft">
      <section class="stack">
        <h2>Your plan, {{ draft.weeks.length }} weeks</h2>
        <div v-for="(w, i) in warnings" :key="i" class="notice">{{ w }}</div>
        <ol class="weeks">
          <li v-for="w in draft.weeks" :key="w.index">
            <span class="wk">Week {{ w.index + 1 }}</span>
            <span class="wbar"><span :style="{ width: `${Math.min(100, (w.targetKm / Math.max(...draft.weeks.map((x) => x.targetKm))) * 100)}%` }" :class="{ deload: w.deload }"></span></span>
            <span class="wkm">{{ Math.round(w.targetKm) }} km</span>
          </li>
        </ol>
        <p class="small muted">Lighter bars are easier weeks to let your body catch up. No week jumps more than 10%.</p>
        <div class="row">
          <button class="btn" type="button" @click="keep">Start this plan</button>
          <button class="btn quiet" type="button" @click="draft = null">Change settings</button>
        </div>
      </section>
    </template>

    <!-- Active plan -->
    <template v-else>
      <div v-for="(c, i) in changes" :key="'c' + i" class="notice good">{{ c }}</div>
      <div v-for="(w, i) in warnings" :key="'w' + i" class="notice">{{ w }}</div>

      <section v-if="next" class="panel stack next">
        <p class="small muted">Next up · {{ dayName(next.date) }}</p>
        <h2>{{ next.title }}</h2>
        <p>{{ next.description }}</p>
        <p v-if="next.paceRange" class="small"><strong>Pace:</strong> {{ pace(next.paceRange[0]) }} to {{ pace(next.paceRange[1]) }} per km</p>
        <div class="row">
          <a v-if="next.formtrack" class="btn" :href="formtrackUrl" target="_blank" rel="noopener">Do it in FormTrack</a>
          <RouterLink v-else-if="next.territory" class="btn" to="/app">Find a loop that takes ground</RouterLink>
          <RouterLink v-else-if="next.type !== 'rest'" class="btn" :to="{ name: 'record' }">Start it</RouterLink>
          <button class="btn quiet" type="button" @click="openEdit(next)">Change it</button>
        </div>
      </section>

      <section v-if="thisWeek" class="stack">
        <h2>This week<template v-if="thisWeek.deload"> (an easier week)</template></h2>
        <ul class="rows plain">
          <li v-for="s in thisWeek.sessions" :key="s.id" class="sess" :class="s.status">
            <span class="day">{{ dayName(s.date) }}</span>
            <span class="what"><strong>{{ TYPE_LABEL[s.type] || s.type }}</strong><template v-if="s.distanceKm"> {{ s.distanceKm }} km</template><template v-else-if="s.durationMin"> {{ s.durationMin }} min</template></span>
            <span class="st">{{ s.status === 'done' ? 'Done' : s.status === 'skipped' ? 'Skipped' : s.status === 'missed' ? 'Missed' : '' }}</span>
          </li>
        </ul>
      </section>

      <section class="stack">
        <h2>Life happens</h2>
        <p class="small muted">Tell the coach and the plan adjusts. It never crams missed kilometres into later weeks.</p>
        <div class="row">
          <button class="btn quiet" type="button" @click="sheet = 'sick'">I'm sick</button>
          <button class="btn quiet" type="button" @click="sheet = 'hurt'">Something hurts</button>
          <button class="btn quiet" type="button" @click="sheet = 'away'">Going away</button>
        </div>
      </section>

      <section v-if="fitness" class="stack">
        <h2>Your paces</h2>
        <p class="small muted">From your recent runs<template v-if="fitness.confidence === 'low'">, with not much to go on yet</template>.</p>
        <ul class="rows plain">
          <li v-for="(r, k) in fitness.paces" :key="k" class="pace"><span>{{ TYPE_LABEL[k] || k }}</span><span>{{ pace(r[0]) }} to {{ pace(r[1]) }} /km</span></li>
        </ul>
      </section>

      <button class="btn secondary" type="button" @click="endPlan">End this plan</button>
    </template>

    <!-- Sheets -->
    <div v-if="sheet" class="scrim" @click.self="sheet = null">
      <div class="sheet panel stack" role="dialog" aria-modal="true">
        <template v-if="sheet === 'sick'">
          <h2>Rest up</h2>
          <p class="small muted">We'll pause your plan, then ease you back in at lower volume. If you've had a fever or chest symptoms, check with a GP before running again.</p>
          <div class="field"><label for="sd">For how many days?</label><select id="sd" v-model.number="sickDays"><option v-for="d in [1, 2, 3, 5, 7, 10, 14]" :key="d" :value="d">{{ d }}</option></select></div>
          <button class="btn" type="button" @click="apply({ type: 'sick', days: sickDays })">Pause my plan</button>
        </template>
        <template v-else-if="sheet === 'hurt'">
          <h2>What's sore?</h2>
          <div class="field"><label for="ha">Where</label>
            <select id="ha" v-model="hurtArea"><option value="foot">Foot or ankle</option><option value="shin">Shin</option><option value="calf">Calf or achilles</option><option value="knee">Knee</option><option value="hip">Hip or glute</option><option value="hamstring">Hamstring</option><option value="back">Back</option><option value="other">Somewhere else</option></select>
          </div>
          <fieldset class="field"><legend>How bad?</legend>
            <div class="seg wrap" role="group">
              <button type="button" :aria-pressed="hurtLevel === 'niggle'" @click="hurtLevel = 'niggle'">A niggle</button>
              <button type="button" :aria-pressed="hurtLevel === 'sore'" @click="hurtLevel = 'sore'">Sore when I run</button>
              <button type="button" :aria-pressed="hurtLevel === 'hurt'" @click="hurtLevel = 'hurt'">It hurts</button>
            </div>
          </fieldset>
          <p class="small muted">This isn't medical advice. Pain that's sharp, swollen or getting worse needs a GP or physio.</p>
          <button class="btn" type="button" @click="apply({ type: 'injury', area: hurtArea, severity: hurtLevel })">Adjust my plan</button>
        </template>
        <template v-else-if="sheet === 'away'">
          <h2>Going away</h2>
          <div class="two">
            <div class="field"><label for="af">From</label><input id="af" v-model="awayFrom" type="date" /></div>
            <div class="field"><label for="at">To</label><input id="at" v-model="awayTo" type="date" :min="awayFrom" /></div>
          </div>
          <button class="btn" type="button" :disabled="!awayFrom || !awayTo" @click="apply({ type: 'holiday', from: awayFrom, to: awayTo })">Plan around it</button>
        </template>
        <template v-else-if="sheet.edit">
          <h2>Change {{ (TYPE_LABEL[sheet.edit.type] || '').toLowerCase() }}</h2>
          <div class="two">
            <div v-if="sheet.edit.distanceKm" class="field"><label for="ek">Distance (km)</label><input id="ek" v-model.number="editKm" type="number" min="1" max="45" step="0.5" /></div>
            <div class="field"><label for="ed">Day</label><input id="ed" v-model="editDate" type="date" /></div>
          </div>
          <button class="btn" type="button" @click="apply({ type: 'edit', sessionId: sheet.edit.id, changes: { ...(sheet.edit.distanceKm ? { distanceKm: editKm } : {}), date: editDate } })">Save change</button>
          <button class="btn quiet" type="button" @click="apply({ type: 'missed', sessionId: sheet.edit.id })">Skip this one</button>
        </template>
        <button class="btn secondary" type="button" @click="sheet = null">Cancel</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.stack { display: grid; gap: 12px; }
.seg.wrap { flex-wrap: wrap; border-radius: 16px; }
.two { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.check { display: flex; gap: 12px; align-items: flex-start; font-weight: 600; }
.check input { width: 22px; height: 22px; margin-top: 2px; accent-color: var(--you); flex: none; }
.row { display: flex; gap: 10px; flex-wrap: wrap; }
.weeks { list-style: none; padding: 0; margin: 0; display: grid; gap: 6px; }
.weeks li { display: grid; grid-template-columns: 64px 1fr 56px; align-items: center; gap: 10px; font-size: 0.9rem; }
.wbar { height: 12px; background: var(--soft); border-radius: 6px; overflow: hidden; }
.wbar span { display: block; height: 100%; background: var(--you); }
.wbar span.deload { background: #AFC0F7; }
.wkm { text-align: right; font-variant-numeric: tabular-nums; font-weight: 700; }
.plain { list-style: none; margin: 0; padding: 0; }
.sess { display: grid; grid-template-columns: 96px 1fr auto; gap: 10px; align-items: center; }
.sess.done .what { color: var(--good); }
.sess.skipped .what, .sess.missed .what { color: var(--ink-60); text-decoration: line-through; }
.day { font-size: 0.85rem; color: var(--ink-60); }
.st { font-size: 0.8rem; font-weight: 700; color: var(--ink-60); }
.pace { display: flex; justify-content: space-between; }
.next { box-shadow: inset 0 0 0 2px var(--you); }
fieldset { border: 0; padding: 0; margin: 0; }
legend { font-weight: 650; margin-bottom: 6px; }
.scrim { position: fixed; inset: 0; z-index: 60; background: rgba(22, 48, 42, 0.45); display: grid; align-items: end; justify-items: center; padding: 12px; }
.sheet { width: min(520px, 100%); max-height: 88dvh; overflow: auto; margin-bottom: env(safe-area-inset-bottom); }
</style>
