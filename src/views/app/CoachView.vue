<script setup>
// The coach: a training plan built from your real runs, not a guess,
// that ramps slowly, bends when you're sick or sore, and points each easy
// run at ground worth taking. Strength days hand over to FormTrack.
// Plans can also be built with AI: Claude turns the runner's own words into
// settings for the same engine (src/lib/aiPlan.js), so the safety rules hold.
import { ref, computed, onMounted } from 'vue'
import { api } from '../../lib/api/index.js'
import { store, toast } from '../../lib/store.js'
import { pace } from '../../lib/format.js'
import { generatePlan, adaptPlan, nextSession, estimateFitness, toISO } from '../../lib/coach/index.js'
import { aiPlansAvailable, hasAiConsent, setAiConsent, planContext, requestAiPlan, attachAi, currentPhase, MODEL_FAMILY } from '../../lib/aiPlan.js'

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
const usualKm = ref('')
const longestKm = ref('')
const draft = ref(null)

// Build it with AI
const aiOn = ref(false)
const setupMode = ref(null) // null: choose, 'ai' or 'manual'
const brief = ref('')
const aiConsent = ref(hasAiConsent())
const aiAsked = ref(hasAiConsent())
const aiBusy = ref(false)
const aiError = ref('')
const aiQuestions = ref([]) // [{ q, a }] the coach wants answered
const aiAnswers = ref([]) // answered so far, sent back each time
const aiChange = ref('')
const MAX_BRIEF = 1500
const BRIEF_HINT = "I'm training for the City2Surf in August. I can run Tuesday, Thursday and Saturday. My left knee gets sore after 10 km. I'd rather do hills than track intervals."

// Sheets
const sheet = ref(null) // 'sick' | 'hurt' | 'away' | {edit: session}
const sickDays = ref(3)
const hurtArea = ref('knee')
const hurtLevel = ref('niggle')
const awayFrom = ref('')
const awayTo = ref('')
const editKm = ref(0)
const editDate = ref('')

const today = () => toISO(Date.now())

onMounted(async () => {
  const [{ plan: p }, { activities }] = await Promise.all([api.plan(), api.activities({ limit: 200 })])
  plan.value = p
  acts.value = activities.filter((a) => !a.rejected)
  loading.value = false
  aiOn.value = await aiPlansAvailable()
  if (!aiOn.value) setupMode.value = 'manual'
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
    // What they tell us, checked against what they record (the engine caps it when history disagrees)
    currentWeeklyKm: Number(usualKm.value) || history.value.weeklyKm,
    longestRecentKm: Number(longestKm.value) || history.value.longestKm,
    recent5kS: parseTime(recent5k.value) || undefined,
    activities: runs.value,
    includeStrength: strength.value,
    today: today(),
  })
  draft.value = r.plan || r
  warnings.value = r.warnings || draft.value.warnings || []
}

const phaseNow = computed(() => (plan.value ? currentPhase(plan.value, today()) : null))
const weekRange = (p) => (p.fromWeek === p.toWeek ? `Week ${p.fromWeek}` : `Weeks ${p.fromWeek} to ${p.toWeek}`)

async function buildWithAi(extra = null) {
  if (aiBusy.value) return
  aiError.value = ''
  if (!aiConsent.value) { aiError.value = 'Tick the box first so the coach can read your words.'; return }
  setAiConsent(true)
  aiAsked.value = true
  const answered = aiQuestions.value.filter((x) => x.a.trim()).map((x) => ({ q: x.q, a: x.a.trim() }))
  const answers = [...aiAnswers.value, ...answered, ...(extra ? [extra] : [])].slice(-3)
  aiBusy.value = true
  try {
    const r = await requestAiPlan({
      brief: brief.value.trim(),
      answers,
      context: planContext({ runs: runs.value, plan: plan.value, formtrackLinked: !!store.user?.formtrack?.linked, today: today() }),
    })
    aiAnswers.value = answers
    if (r.questions?.length) {
      aiQuestions.value = r.questions.map((q) => ({ q, a: '' }))
      draft.value = null
      return
    }
    aiQuestions.value = []
    const s = r.settings
    const p = generatePlan({
      ...s,
      currentWeeklyKm: s.currentWeeklyKm ?? history.value.weeklyKm,
      longestRecentKm: s.longestRecentKm ?? history.value.longestKm,
      activities: runs.value,
      today: today(),
    })
    attachAi(p, r)
    draft.value = p
    warnings.value = p.warnings || []
    aiChange.value = ''
  } catch (e) {
    aiError.value = e.message || 'The coach got in a muddle. Try again, or set it up yourself.'
  } finally {
    aiBusy.value = false
  }
}

function changeWithAi() {
  const a = aiChange.value.trim()
  if (!a) return
  buildWithAi({ q: 'What would you like to change?', a: a.slice(0, 300) })
}

// Take the AI's settings into the manual form to adjust by hand
function tweakByHand() {
  const s = draft.value?.settings || {}
  if (s.goal) goal.value = s.goal
  raceDate.value = s.raceDate || ''
  if (s.daysPerWeek) days.value = s.daysPerWeek
  if (['sat', 'sun', 'fri', 'wed'].includes(s.longRunDay)) longDay.value = s.longRunDay
  strength.value = !!s.includeStrength
  draft.value = null
  setupMode.value = 'manual'
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

async function startReturn() {
  const p = generatePlan({ ...plan.value.offer.options, activities: runs.value, today: today() })
  plan.value = p
  changes.value = ['Your run/walk return plan is ready. Ease back in and stop if it hurts.']
  warnings.value = p.warnings || []
  await api.savePlan(plan.value)
}

async function endPlan() {
  if (!confirm('End this plan? You can build a new one any time.')) return
  plan.value = null
  setupMode.value = aiOn.value ? null : 'manual'
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

    <!-- No plan yet: pick how to set it up -->
    <template v-else-if="!plan && !draft && !setupMode">
      <section class="stack">
        <h2>How would you like to start?</h2>
        <button class="choice panel" type="button" @click="setupMode = 'ai'">
          <strong>Build it with AI</strong>
          <span class="small muted">Tell the coach in your own words. It picks the settings and explains the plan.</span>
        </button>
        <button class="choice panel" type="button" @click="setupMode = 'manual'">
          <strong>Set it up myself</strong>
          <span class="small muted">Pick the goal, days and distances.</span>
        </button>
      </section>
    </template>

    <!-- Build it with AI -->
    <template v-else-if="!plan && !draft && setupMode === 'ai'">
      <section class="panel stack">
        <h2>Tell the coach about your running</h2>
        <div class="field">
          <label for="brief">What are you training for, and what should the coach know?</label>
          <textarea id="brief" v-model="brief" rows="6" :maxlength="MAX_BRIEF" :placeholder="BRIEF_HINT" :disabled="aiBusy"></textarea>
          <span class="hint">{{ brief.length }} of {{ MAX_BRIEF }}. Days you can run, a race and date, anything that gets sore, what you enjoy.</span>
        </div>
        <div v-if="aiQuestions.length" class="stack questions">
          <p class="small"><strong>A few quick questions from the coach</strong></p>
          <div v-for="(x, i) in aiQuestions" :key="i" class="field">
            <label :for="'aq' + i">{{ x.q }}</label>
            <input :id="'aq' + i" v-model="x.a" maxlength="300" :disabled="aiBusy" />
          </div>
        </div>
        <label v-if="!aiAsked" class="check">
          <input v-model="aiConsent" type="checkbox" />
          <span class="small">Your words and a summary of your recent runs (distances and paces, never your name or where you run) go to Anthropic's Claude to build the plan. They aren't used for anything else.</span>
        </label>
        <div v-if="aiError" class="notice" role="alert">{{ aiError }}</div>
        <button class="btn" type="button" :disabled="aiBusy || brief.trim().length < 3 || !aiConsent" @click="buildWithAi()">
          {{ aiBusy ? 'Your coach is thinking' : aiQuestions.length ? 'Send my answers' : 'Build my plan' }}
        </button>
        <p class="small muted">Built with AI ({{ MODEL_FAMILY }}). It isn't medical advice. The plan itself always follows the same safe rules: slow build, easier weeks and a taper.</p>
        <button class="btn quiet" type="button" :disabled="aiBusy" @click="setupMode = 'manual'">Set it up myself instead</button>
      </section>
    </template>

    <!-- No plan yet: set one up by hand -->
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
        <div class="row">
          <div class="field">
            <label for="uk">Usual week (km)</label>
            <input id="uk" v-model="usualKm" type="number" inputmode="decimal" min="0" max="200" step="1" :placeholder="history.weeklyKm ? String(history.weeklyKm) : 'for example 15'" />
          </div>
          <div class="field">
            <label for="lk">Longest run lately (km)</label>
            <input id="lk" v-model="longestKm" type="number" inputmode="decimal" min="0" max="60" step="1" :placeholder="history.longestKm ? String(history.longestKm) : 'for example 6'" />
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
        <button v-if="aiOn" class="btn quiet" type="button" @click="setupMode = 'ai'">Build it with AI instead</button>
      </section>
    </template>

    <!-- Draft preview -->
    <template v-else-if="draft">
      <section class="stack">
        <template v-if="draft.ai">
          <p class="ai-tag">Built with AI ({{ draft.ai.family }})</p>
          <h2>{{ draft.ai.headline }}</h2>
          <p v-if="draft.ai.overview">{{ draft.ai.overview }}</p>
          <div v-if="draft.ai.safety" class="notice">{{ draft.ai.safety }}</div>
        </template>
        <h2 :class="{ sub: draft.ai }">Your plan, {{ draft.weeks.length }} weeks</h2>
        <div v-for="(w, i) in warnings" :key="i" class="notice">{{ w }}</div>
        <ol class="weeks">
          <li v-for="w in draft.weeks" :key="w.index">
            <span class="wk">Week {{ w.index + 1 }}</span>
            <span class="wbar"><span :style="{ width: `${Math.min(100, (w.targetKm / Math.max(...draft.weeks.map((x) => x.targetKm))) * 100)}%` }" :class="{ deload: w.deload }"></span></span>
            <span class="wkm">{{ Math.round(w.targetKm) }} km</span>
          </li>
        </ol>
        <p class="small muted">Lighter bars are easier weeks to let your body catch up. No week jumps more than 10%.</p>
        <ul v-if="draft.ai?.phases.length" class="phases plain">
          <li v-for="(p, i) in draft.ai.phases" :key="i"><span class="small muted">{{ weekRange(p) }}</span><span>{{ p.focus }}</span></li>
        </ul>
        <ul v-if="draft.ai?.tips.length" class="tips">
          <li v-for="(t, i) in draft.ai.tips" :key="i">{{ t }}</li>
        </ul>
        <p v-if="draft.ai" class="small muted">This plan was built with AI and isn't medical advice. If anything hurts, see a GP or physio.</p>
        <div class="row">
          <button class="btn" type="button" @click="keep">Start this plan</button>
          <button v-if="!draft.ai" class="btn quiet" type="button" @click="draft = null">Change settings</button>
        </div>
        <div v-if="draft.ai" class="stack">
          <div class="field">
            <label for="chg">Want something different? Tell the coach.</label>
            <input id="chg" v-model="aiChange" maxlength="300" placeholder="For example: make Sunday the long run" :disabled="aiBusy" />
          </div>
          <div v-if="aiError" class="notice" role="alert">{{ aiError }}</div>
          <div class="row">
            <button class="btn quiet" type="button" :disabled="aiBusy || !aiChange.trim()" @click="changeWithAi">{{ aiBusy ? 'Your coach is thinking' : 'Rebuild it' }}</button>
            <button class="btn quiet" type="button" :disabled="aiBusy" @click="tweakByHand">Adjust it myself</button>
          </div>
        </div>
      </section>
    </template>

    <!-- Active plan -->
    <template v-else>
      <div v-for="(c, i) in changes" :key="'c' + i" class="notice good">{{ c }}</div>
      <div v-for="(w, i) in warnings" :key="'w' + i" class="notice">{{ w }}</div>

      <section v-if="plan.paused" class="panel stack next">
        <h2>Your plan is paused</h2>
        <p>{{ plan.offer?.message || 'Rest up. Start again when it feels right.' }}</p>
        <div class="row">
          <button v-if="plan.offer" class="btn" type="button" @click="startReturn">I've got the all clear</button>
          <button class="btn quiet" type="button" @click="endPlan">End this plan</button>
        </div>
      </section>

      <section v-else-if="next" class="panel stack next">
        <p class="small muted">Next up · {{ dayName(next.date) }}</p>
        <h2>{{ next.title }}</h2>
        <p>{{ next.description }}</p>
        <p v-if="next.paceRange" class="small"><strong>Pace:</strong> {{ pace(next.paceRange[0]) }} to {{ pace(next.paceRange[1]) }} per km</p>
        <div class="row">
          <a v-if="next.formtrack" class="btn" :href="formtrackUrl" target="_blank" rel="noopener">Do it in FormTrack</a>
          <RouterLink v-else-if="next.territory" class="btn" :to="{ name: 'plan', query: { suggest: 1, km: next.distanceKm } }">Plan a loop that takes ground</RouterLink>
          <RouterLink v-else-if="next.type !== 'rest'" class="btn" :to="{ name: 'record' }">Start it</RouterLink>
          <button class="btn quiet" type="button" @click="openEdit(next)">Change it</button>
        </div>
      </section>

      <details v-if="plan.ai" class="panel why">
        <summary><strong>Why this plan</strong><span class="ai-tag">Built with AI ({{ plan.ai.family || 'Claude' }})</span></summary>
        <div class="stack">
          <h3>{{ plan.ai.headline }}</h3>
          <p v-if="plan.ai.overview">{{ plan.ai.overview }}</p>
          <p v-if="phaseNow"><strong>Right now:</strong> {{ phaseNow.focus }}</p>
          <ul v-if="plan.ai.tips?.length" class="tips">
            <li v-for="(t, i) in plan.ai.tips" :key="i">{{ t }}</li>
          </ul>
          <div v-if="plan.ai.safety" class="notice">{{ plan.ai.safety }}</div>
          <p class="small muted">Built with AI, not by a person. It isn't medical advice. If anything hurts, see a GP or physio.</p>
        </div>
      </details>

      <section v-if="thisWeek" class="stack">
        <h2>This week<template v-if="thisWeek.deload"> (an easier week)</template></h2>
        <ul class="rows plain">
          <li v-for="s in thisWeek.sessions" :key="s.id" class="sess" :class="s.status">
            <span class="day">{{ dayName(s.date) }}</span>
            <span class="what"><strong>{{ TYPE_LABEL[s.type] || s.type }}</strong><template v-if="s.distanceKm"> {{ s.distanceKm }} km</template><template v-else-if="s.durationMin"> {{ s.durationMin }} min</template></span>
            <span class="st">{{ s.status === 'done' ? 'Done' : s.status === 'skipped' ? 'Skipped' : s.status === 'missed' ? 'Missed' : s.status === 'cancelled' ? 'Paused' : '' }}</span>
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
.row > .field { flex: 1 1 140px; }
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
.choice { display: grid; gap: 4px; text-align: left; width: 100%; border: 0; cursor: pointer; font: inherit; color: inherit; }
.choice strong { font-size: 1.1rem; }
.choice:focus-visible { outline: 3px solid var(--you); outline-offset: 2px; }
.ai-tag { display: inline-block; width: fit-content; font-size: 0.75rem; font-weight: 750; letter-spacing: 0.02em; color: var(--you); background: var(--soft); border-radius: 999px; padding: 3px 10px; margin: 0; }
h2.sub { font-size: 1.05rem; }
.phases { display: grid; gap: 8px; }
.phases li { display: grid; gap: 2px; }
.tips { margin: 0; padding-left: 20px; display: grid; gap: 6px; }
.why summary { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; justify-content: space-between; cursor: pointer; list-style: none; }
.why summary::-webkit-details-marker { display: none; }
.why summary::after { content: 'Show'; font-size: 0.85rem; font-weight: 700; color: var(--you); }
.why[open] summary::after { content: 'Hide'; }
.why[open] summary { margin-bottom: 12px; }
.why h3 { margin: 0; font-size: 1.1rem; }
.why p { margin: 0; }
.scrim { position: fixed; inset: 0; z-index: 60; background: rgba(22, 48, 42, 0.45); display: grid; align-items: end; justify-items: center; padding: 12px; }
.sheet { width: min(520px, 100%); max-height: 88dvh; overflow: auto; margin-bottom: env(safe-area-inset-bottom); }
</style>
