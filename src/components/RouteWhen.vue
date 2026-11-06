<script setup>
// A day and time for a planned route: a row of day chips (the next two weeks)
// and a time. v-model is epoch ms, or null for no time. Starts as one button
// so it stays out of the way until someone wants it.
import { computed, ref, watch } from 'vue'
import { whenLabel } from '../lib/routeShare.js'

const model = defineModel({ type: Number, default: null })
const props = defineProps({
  label: { type: String, default: 'Add a day and time' },
  idPrefix: { type: String, default: 'rw' },
})

const DAY = 86400000
const startOfDay = (t) => { const d = new Date(t); d.setHours(0, 0, 0, 0); return d.getTime() }
const pad = (n) => String(n).padStart(2, '0')
const hhmm = (t) => { const d = new Date(t); return `${pad(d.getHours())}:${pad(d.getMinutes())}` }
// Adds whole days by the calendar, so a daylight saving change doesn't shift a chip
const addDays = (t, n) => { const d = new Date(t); d.setDate(d.getDate() + n); return d.getTime() }

const time = ref(model.value == null ? '07:00' : hhmm(model.value))
watch(model, (v) => { if (v != null) time.value = hhmm(v) })

const today = startOfDay(Date.now())
const days = computed(() => {
  const list = Array.from({ length: 14 }, (_, i) => addDays(today, i))
  const picked = model.value == null ? null : startOfDay(model.value)
  if (picked != null && !list.includes(picked)) (picked < today ? list.unshift(picked) : list.push(picked))
  return list
})
const dayName = (t) => {
  if (t === today) return 'Today'
  if (t === addDays(today, 1)) return 'Tomorrow'
  return new Date(t).toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric' })
}
const selectedDay = computed(() => (model.value == null ? null : startOfDay(model.value)))

function at(day, hm) {
  const [h, m] = String(hm || '07:00').split(':').map(Number)
  const d = new Date(day)
  d.setHours(Number.isFinite(h) ? h : 7, Number.isFinite(m) ? m : 0, 0, 0)
  return d.getTime()
}
function start() {
  model.value = at(addDays(today, 1), time.value)
}
const pickDay = (day) => { model.value = at(day, time.value) }
function onTime(e) {
  time.value = e.target.value
  if (time.value && selectedDay.value != null) model.value = at(selectedDay.value, time.value)
}
const clear = () => { model.value = null }
const past = computed(() => model.value != null && model.value < Date.now())
</script>

<template>
  <div class="rwhen">
    <button v-if="model == null" type="button" class="btn quiet block" @click="start">{{ props.label }}</button>
    <template v-else>
      <div class="head">
        <strong>{{ whenLabel(model) }}</strong>
        <button type="button" class="linkish" @click="clear">Remove the time</button>
      </div>
      <p v-if="past" class="small muted">That time has passed. Pick a new day if you still want to go.</p>
      <div class="days" role="group" aria-label="Day">
        <button v-for="d in days" :key="d" type="button" class="day" :aria-pressed="selectedDay === d" @click="pickDay(d)">{{ dayName(d) }}</button>
      </div>
      <div class="field">
        <label :for="`${props.idPrefix}-time`">Time</label>
        <input :id="`${props.idPrefix}-time`" type="time" :value="time" step="300" @change="onTime" />
      </div>
    </template>
  </div>
</template>

<style scoped>
.rwhen { display: grid; gap: 10px; min-width: 0; }
.head { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.head strong { flex: 1; min-width: 0; }
.linkish { background: none; border: 0; padding: 6px 0; font: inherit; font-weight: 650; font-size: 0.9rem; color: var(--you); cursor: pointer; min-height: 40px; }
.days { display: flex; gap: 8px; overflow-x: auto; padding: 2px 2px 6px; scroll-snap-type: x proximity; overscroll-behavior-x: contain; }
.day {
  flex: none; scroll-snap-align: start; font: inherit; font-weight: 650; font-size: 0.9rem; white-space: nowrap;
  border: 0; border-radius: 999px; padding: 8px 14px; min-height: 40px; background: var(--soft); color: var(--ink); cursor: pointer;
}
.day[aria-pressed='true'] { background: var(--you); color: #fff; }
.field input[type='time'] { max-width: 180px; }
</style>
