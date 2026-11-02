<script setup>
// Your weekly streak on You: weeks in a row, your longest, rest weeks banked
// (as small hex tokens) and a strip of the last 16 weeks. Kind words only.
import { computed } from 'vue'
import { streakLine } from '../lib/engine/streaks.js'

const props = defineProps({ streak: { type: Object, required: true } })
const line = computed(() => streakLine(props.streak))
const weeks = (n) => `${n} ${n === 1 ? 'week' : 'weeks'}`
const LABEL = { out: 'out', rested: 'rest week', missed: 'quiet week', now: 'this week', before: 'before you started' }
const day = (key) => new Date(key + 'T00:00:00Z').toLocaleDateString('en-AU', { day: 'numeric', month: 'short', timeZone: 'UTC' })
const stripLabel = computed(() => props.streak.weeks.map((w) => `Week of ${day(w.key)}: ${w.state === 'now' && w.out ? 'this week, out' : LABEL[w.state]}`).join('. '))
</script>

<template>
  <section class="streak" aria-labelledby="streak-h">
    <h2 id="streak-h">Weekly streak</h2>
    <div class="nums">
      <div class="stat"><span class="big-num">{{ streak.current }}</span><span class="label">{{ streak.current === 1 ? 'week' : 'weeks' }} in a row</span></div>
      <div class="stat"><span class="big-num">{{ streak.longest }}</span><span class="label">longest</span></div>
      <div class="stat">
        <span class="tokens" role="img" :aria-label="`${streak.banked} of ${streak.maxBanked} rest weeks banked`">
          <i v-for="k in streak.maxBanked" :key="k" :class="{ on: k <= streak.banked }"></i>
        </span>
        <span class="label">rest weeks banked</span>
      </div>
    </div>
    <p class="line">{{ line }}</p>
    <ol class="strip" role="img" :aria-label="stripLabel">
      <li v-for="w in streak.weeks" :key="w.key" :class="[w.state, { out: w.out }]"></li>
    </ol>
    <ul class="skey small muted" aria-hidden="true">
      <li><i class="out"></i>Out</li>
      <li><i class="rested"></i>Rest week</li>
      <li><i class="missed"></i>Quiet week</li>
      <li><i class="now"></i>This week</li>
    </ul>
    <p class="small muted">Get out once a week, any distance. Each week banks a rest week (up to {{ streak.maxBanked }}), so a quiet week now and then keeps your streak going.<template v-if="streak.nextMilestone && streak.current">{{ ' ' + weeks(streak.nextMilestone) }} is the next milestone.</template></p>
  </section>
</template>

<style scoped>
.streak { display: grid; gap: 12px; }
.streak h2, .streak p { margin: 0; }
.nums { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
.tokens { display: flex; gap: 4px; height: 2.2rem; align-items: center; }
.tokens i, .skey i, .strip li { clip-path: polygon(25% 0, 75% 0, 100% 50%, 75% 100%, 25% 100%, 0 50%); }
.tokens i { width: 22px; height: 19px; background: var(--soft); }
.tokens i.on { background: var(--you); }
.line { font-weight: 650; }
.strip { list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: repeat(16, 1fr); gap: 3px; }
.strip li { aspect-ratio: 1.15; background: rgba(22, 48, 42, 0.06); }
.strip li.out { background: var(--you); }
.strip li.rested { background: #AFC0F7; }
.strip li.missed { background: var(--soft); }
.strip li.now { background: rgba(46, 85, 230, 0.22); }
.strip li.now.out { background: var(--you); }
.skey { list-style: none; margin: 0; padding: 0; display: flex; flex-wrap: wrap; gap: 6px 14px; }
.skey li { display: inline-flex; align-items: center; gap: 6px; }
.skey i { width: 14px; height: 12px; display: inline-block; }
.skey i.out { background: var(--you); }
.skey i.rested { background: #AFC0F7; }
.skey i.missed { background: var(--soft); }
.skey i.now { background: rgba(46, 85, 230, 0.22); }
</style>
