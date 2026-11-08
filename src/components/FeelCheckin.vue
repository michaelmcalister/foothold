<script setup>
// "How did that feel?" after a run: one tap to answer or dismiss, asked once per activity. Something hurt asks where and how bad, and eases the plan.
import { ref, computed } from 'vue'
import { api } from '../lib/api/index.js'
import { toast } from '../lib/store.js'
import { FEELS, HURT_AREAS, HURT_LEVELS, areaWords, tiredSignal, adaptPlan, toISO } from '../lib/coach/index.js'

const props = defineProps({
  activity: { type: Object, required: true },
  plan: { type: Object, default: null },
  recent: { type: Array, default: () => [] }, // your other recent activities, for the tired check
})
const emit = defineEmits(['saved', 'plan'])

const step = ref('feel') // feel | hurt | done
const busy = ref(false)
const area = ref('')
const level = ref('')
const changes = ref([])
const advice = ref('')
const answer = ref(null)

async function send(body) {
  busy.value = true
  try {
    const r = await api.checkin(props.activity.id, body)
    emit('saved', r.activity)
    return r.activity
  } catch (e) {
    toast(e.message)
    return null
  } finally {
    busy.value = false
  }
}

async function savePlan(event) {
  if (!props.plan?.weeks) return
  // A plain copy: structuredClone in adaptPlan can't copy Vue's reactive wrapper
  const r = adaptPlan(JSON.parse(JSON.stringify(props.plan)), event, toISO(Date.now()))
  try {
    await api.savePlan(r.plan)
    emit('plan', r.plan)
    // For an injury the advice above already covers the warnings
    changes.value = event.type === 'injury' ? r.changes : [...r.changes, ...r.warnings]
  } catch { /* the check-in is saved either way */ }
}

async function choose(f) {
  if (busy.value) return
  if (f === 'hurt') { step.value = 'hurt'; return }
  const a = await send({ feel: f })
  if (!a) return
  answer.value = f
  step.value = 'done'
  const list = [a, ...props.recent.filter((x) => x.id !== a.id)]
  if (f >= 4 && tiredSignal(props.plan, list)) await savePlan({ type: 'tired' })
}

async function sendHurt(withDetail) {
  if (busy.value) return
  const body = withDetail && area.value && level.value ? { feel: 'hurt', hurt: { area: area.value, level: level.value } } : { feel: 'hurt' }
  const a = await send(body)
  if (!a) return
  answer.value = 'hurt'
  step.value = 'done'
  const where = body.hurt ? `your ${areaWords(body.hurt.area)}` : 'it'
  if (body.hurt?.level === 'hurt') advice.value = `Pain that changes how you move needs a proper look. Please see a GP or physio about ${where} before running again.`
  else if (body.hurt?.level === 'sore') advice.value = `Stop any run where ${where} hurts more as you go. If it is still sore after a few days, see a physio.`
  else advice.value = `Keep an eye on ${where}. If it gets worse, ease off and see a GP or physio.`
  if (body.hurt) await savePlan({ type: 'injury', area: body.hurt.area, severity: body.hurt.level })
}

async function dismiss() {
  if (await send({ dismissed: true })) step.value = 'gone'
}

const thanks = computed(() => {
  const f = answer.value
  if (f === 'hurt') return 'Thanks for telling us.'
  if (f >= 4) return 'Thanks. Hard days happen. The coach will keep an eye on it.'
  if (f === 3) return 'Thanks. Noted as hard work.'
  return 'Thanks. Noted.'
})
</script>

<template>
  <section v-if="step !== 'gone'" class="checkin panel" aria-labelledby="checkin-title">
    <template v-if="step === 'feel'">
      <div class="head">
        <h2 id="checkin-title">How did that feel?</h2>
        <button class="close" type="button" :disabled="busy" aria-label="Not now, don't ask for this run" @click="dismiss">
          <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" /></svg>
        </button>
      </div>
      <div class="opts" role="group" aria-labelledby="checkin-title">
        <button v-for="f in FEELS" :key="f.value" type="button" class="opt" :class="{ hurt: f.value === 'hurt' }" :aria-label="f.label" :disabled="busy" @click="choose(f.value)">
          <svg v-if="f.value !== 'hurt'" viewBox="0 0 24 20" width="24" height="20" aria-hidden="true">
            <rect v-for="k in 4" :key="k" :x="(k - 1) * 6 + 1" :y="16 - k * 4" width="4" :height="k * 4 + 2" rx="1.5" :class="{ on: k <= f.value }" />
          </svg>
          <svg v-else viewBox="0 0 24 20" width="24" height="20" aria-hidden="true"><path d="M12 3v14M5 10h14" stroke="currentColor" stroke-width="3" stroke-linecap="round" /></svg>
          <span>{{ f.label.replace('Comfortable', 'Comfort\u00ADable') }}</span>
        </button>
      </div>
      <p class="hint">One tap. We only ask once per run.</p>
    </template>

    <template v-else-if="step === 'hurt'">
      <h2 id="checkin-title">Sorry to hear that. Where?</h2>
      <div class="chips" role="group" aria-label="Where it hurt">
        <button v-for="x in HURT_AREAS" :key="x.value" type="button" class="pick" :aria-pressed="area === x.value" @click="area = x.value">{{ x.label }}</button>
      </div>
      <fieldset class="field"><legend>How bad?</legend>
        <div class="seg" role="group">
          <button v-for="x in HURT_LEVELS" :key="x.value" type="button" :aria-pressed="level === x.value" @click="level = x.value">{{ x.label }}</button>
        </div>
      </fieldset>
      <p class="hint">This isn't medical advice. Pain that's sharp, swollen or getting worse needs a GP or physio.</p>
      <div class="acts">
        <button class="btn" type="button" :disabled="busy || !area || !level" @click="sendHurt(true)">{{ plan ? 'Save and adjust my plan' : 'Save' }}</button>
        <button class="btn quiet" type="button" :disabled="busy" @click="sendHurt(false)">Skip the details</button>
      </div>
    </template>

    <template v-else>
      <h2 id="checkin-title">{{ thanks }}</h2>
      <p v-if="advice" class="notice" :class="{ bad: level === 'hurt' }">{{ advice }}</p>
      <ul v-if="changes.length" class="changes">
        <li v-for="(c, i) in changes" :key="i">{{ c }}</li>
      </ul>
      <RouterLink v-if="changes.length" class="small link" to="/app/coach">See your plan</RouterLink>
    </template>
  </section>
</template>

<style scoped>
.checkin { display: grid; gap: 12px; }
.checkin h2 { font-size: 1.1rem; margin: 0; }
.head { display: flex; justify-content: space-between; align-items: center; gap: 8px; }
.close { border: 0; background: var(--soft); color: var(--ink); width: 36px; height: 36px; border-radius: 50%; display: grid; place-items: center; cursor: pointer; flex: none; }
.opts { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 5px; }
.opt {
  font: inherit; font-size: 0.74rem; font-weight: 700; font-stretch: 90%; line-height: 1.15; color: var(--ink);
  background: var(--soft); border: 0; border-radius: 12px; padding: 10px 1px; min-height: 76px; cursor: pointer;
  display: grid; justify-items: center; align-content: center; gap: 6px; text-align: center; hyphens: manual; min-width: 0;
}
.opt:hover { background: var(--soft-hover); }
.opt:focus-visible, .pick:focus-visible, .close:focus-visible { outline: 3px solid var(--you); outline-offset: 2px; }
.opt rect { fill: var(--ink-15); }
.opt rect.on { fill: var(--you); }
.opt.hurt svg { color: var(--warn); }
.hint { margin: 0; }
.chips { display: flex; flex-wrap: wrap; gap: 6px; }
.pick { font: inherit; font-size: 0.9rem; font-weight: 650; border: 0; background: var(--soft); color: var(--ink); border-radius: 999px; padding: 8px 12px; min-height: 40px; cursor: pointer; }
.pick[aria-pressed='true'] { background: var(--ink); color: var(--on-ink); }
fieldset { border: 0; padding: 0; margin: 0; }
legend { font-weight: 650; margin-bottom: 6px; }
.seg { display: flex; width: 100%; }
.seg button { flex: 1; padding: 7px 6px; }
.acts { display: flex; flex-wrap: wrap; gap: 10px; }
.changes { margin: 0; padding-left: 18px; display: grid; gap: 6px; }
.link { color: var(--you-ink); font-weight: 650; }
</style>
