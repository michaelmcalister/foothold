<script setup>
// The owner's admin page (/app/admin, linked from Settings for admins only;
// worker/admin.js). Tabs: how the app is going, story ideas to approve (the
// scheduled story builder writes approved ones, docs/STORIES.md), the
// feedback inbox, reported comments to keep or remove, and AI spend.
// Anyone else sees "Not found".
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { api } from '../../lib/api/index.js'
import { toast } from '../../lib/store.js'
import { MISSIONS } from '../../lib/missions/scripts.js'
import { storiesNear } from '../../lib/missions/places.js'

const router = useRouter()
const tab = ref('ideas')
const stats = ref(null)
const ideas = ref([])
const filter = ref('waiting')
const notes = ref({})
const feedback = ref([])
const reports = ref([])
const ai = ref([])
const problem = ref('')
const busy = ref('')

const catalogue = computed(() => {
  const sagas = new Set(MISSIONS.map((m) => m.saga))
  return { stories: MISSIONS.length, series: sagas.size, places: storiesNear(null).length }
})

const when = (t) => new Date(t).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })
const money = (n) => `$${Number(n || 0).toFixed(2)}`

async function guard(fn) {
  problem.value = ''
  try {
    await fn()
  } catch (e) {
    problem.value = e?.status === 404 ? 'This page is only for the Foothold team.' : e?.message || 'That didn’t load. Try again in a moment.'
  }
}

const loadStats = () => guard(async () => { stats.value = await api.admin('overview') })
const loadIdeas = () => guard(async () => { ideas.value = (await api.admin('ideas', `?status=${filter.value}`)).ideas })
const loadFeedback = () => guard(async () => { feedback.value = (await api.admin('feedback')).feedback })
const loadReports = () => guard(async () => { reports.value = (await api.admin('reports')).reports })
const loadAi = () => guard(async () => { ai.value = (await api.admin('ai')).ai })

const LOADERS = { ideas: loadIdeas, feedback: loadFeedback, reports: loadReports, ai: loadAi }
function show(t) {
  tab.value = t
  LOADERS[t]?.()
}
function showIdeas(f) {
  filter.value = f
  loadIdeas()
}

async function review(idea, action) {
  busy.value = idea.id
  await guard(async () => {
    await api.adminAct('ideas', idea.id, { action, note: notes.value[idea.id] || undefined })
    ideas.value = ideas.value.filter((i) => i.id !== idea.id)
    toast(action === 'approve' ? 'Approved. The story builder will write it on its next run.' : action === 'decline' ? 'Declined.' : 'Back in the waiting list.')
    loadStats()
  })
  busy.value = ''
}

async function settle(report, action) {
  busy.value = report.id
  await guard(async () => {
    await api.adminAct('reports', report.id, { action })
    reports.value = reports.value.filter((r) => r.commentId !== report.commentId)
    toast(action === 'remove' ? 'Comment removed.' : 'Comment kept.')
    loadStats()
  })
  busy.value = ''
}

onMounted(() => {
  loadStats()
  loadIdeas()
})
</script>

<template>
  <div class="screen admin">
    <header class="screen-head">
      <button class="back" type="button" @click="router.back()">Back</button>
      <h1>Admin</h1>
    </header>

    <p v-if="problem" class="notice bad" role="alert">{{ problem }}</p>

    <section v-if="stats" class="panel" aria-label="How Foothold is going">
      <dl class="tiles">
        <div><dt>Players</dt><dd>{{ stats.users }}</dd><span>{{ stats.newUsers7 }} new this week</span></div>
        <div><dt>Out this week</dt><dd>{{ stats.runners7 }}</dd><span>{{ stats.activities7 }} outings, {{ stats.km7 }} km</span></div>
        <div><dt>Last 30 days</dt><dd>{{ stats.activities30 }}</dd><span>{{ stats.km30 }} km</span></div>
        <div><dt>AI spend</dt><dd>{{ money(stats.aiCost7) }}</dd><span>{{ money(stats.aiCost30) }} in 30 days</span></div>
        <div><dt>Stories</dt><dd>{{ catalogue.stories }}</dd><span>{{ catalogue.series }} series, {{ catalogue.places }} real places</span></div>
        <div><dt>To do</dt><dd>{{ stats.ideasWaiting + stats.reportsOpen }}</dd><span>{{ stats.ideasWaiting }} ideas, {{ stats.reportsOpen }} reports</span></div>
      </dl>
    </section>

    <div class="seg tabs" role="group" aria-label="Admin sections">
      <button type="button" :aria-pressed="tab === 'ideas'" @click="show('ideas')">Story ideas<template v-if="stats?.ideasWaiting"> ({{ stats.ideasWaiting }})</template></button>
      <button type="button" :aria-pressed="tab === 'reports'" @click="show('reports')">Reports<template v-if="stats?.reportsOpen"> ({{ stats.reportsOpen }})</template></button>
      <button type="button" :aria-pressed="tab === 'feedback'" @click="show('feedback')">Feedback</button>
      <button type="button" :aria-pressed="tab === 'ai'" @click="show('ai')">AI</button>
    </div>

    <section v-if="tab === 'ideas'" class="panel stack" aria-labelledby="a-ideas">
      <h2 id="a-ideas">Story ideas</h2>
      <p class="small muted">Approve an idea and the story builder researches the place and writes a five episode series on its next run. Add a note to steer it.</p>
      <div class="seg" role="group" aria-label="Which ideas">
        <button v-for="f in ['waiting', 'approved', 'built', 'declined']" :key="f" type="button" :aria-pressed="filter === f" @click="showIdeas(f)">{{ f[0].toUpperCase() + f.slice(1) }}</button>
      </div>
      <p v-if="!ideas.length" class="small">Nothing here. When runners send a local story from the mission browser, it lands here.</p>
      <article v-for="idea in ideas" :key="idea.id" class="item">
        <h3>{{ idea.place }}</h3>
        <p v-if="idea.story">{{ idea.story }}</p>
        <p class="small muted">Sent {{ when(idea.at) }}<template v-if="idea.near"> · near {{ idea.near.lat }}, {{ idea.near.lng }}</template><template v-if="idea.mission"> · built as {{ idea.mission }}</template></p>
        <p v-if="idea.note && filter !== 'waiting'" class="small">Note: {{ idea.note }}</p>
        <template v-if="filter === 'waiting'">
          <label class="field">
            <span class="small">Note for the writer (optional)</span>
            <input v-model="notes[idea.id]" type="text" maxlength="500" placeholder="e.g. Make it a ghost story, keep it light">
          </label>
          <div class="row">
            <button class="btn" type="button" :disabled="busy === idea.id" @click="review(idea, 'approve')">Approve and build</button>
            <button class="btn quiet" type="button" :disabled="busy === idea.id" @click="review(idea, 'decline')">Decline</button>
          </div>
        </template>
        <div v-else-if="filter !== 'built'" class="row">
          <button class="btn quiet" type="button" :disabled="busy === idea.id" @click="review(idea, 'reopen')">Move back to waiting</button>
        </div>
      </article>
    </section>

    <section v-if="tab === 'reports'" class="panel stack" aria-labelledby="a-reports">
      <h2 id="a-reports">Reported comments</h2>
      <p v-if="!reports.length" class="small">No open reports. Nice.</p>
      <article v-for="r in reports" :key="r.id" class="item">
        <p class="quote">{{ r.text }}</p>
        <p class="small muted">Reported {{ when(r.at) }}<template v-if="r.reason"> · {{ r.reason }}</template></p>
        <div class="row">
          <button class="btn" type="button" :disabled="busy === r.id" @click="settle(r, 'remove')">Remove comment</button>
          <button class="btn quiet" type="button" :disabled="busy === r.id" @click="settle(r, 'keep')">Keep it</button>
        </div>
      </article>
    </section>

    <section v-if="tab === 'feedback'" class="panel stack" aria-labelledby="a-fb">
      <h2 id="a-fb">Feedback</h2>
      <p v-if="!feedback.length" class="small">No feedback yet.</p>
      <article v-for="f in feedback" :key="f.id" class="item">
        <p class="small muted">{{ f.kind === 'bug' ? 'Something’s wrong' : f.kind === 'idea' ? 'An idea' : f.kind }} · {{ when(f.at) }}</p>
        <p>{{ f.text }}</p>
      </article>
    </section>

    <section v-if="tab === 'ai'" class="panel stack" aria-labelledby="a-ai">
      <h2 id="a-ai">AI spend, last 30 days</h2>
      <p v-if="!ai.length" class="small">No AI use in the last 30 days.</p>
      <table v-else class="spend">
        <thead><tr><th scope="col">Feature</th><th scope="col">Calls</th><th scope="col">Cost</th></tr></thead>
        <tbody><tr v-for="a in ai" :key="a.feature"><td>{{ a.feature }}</td><td>{{ a.calls }}</td><td>{{ money(a.cost) }}</td></tr></tbody>
      </table>
    </section>
  </div>
</template>

<style scoped>
.tiles { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; margin: 0; }
.tiles div { padding: 10px 12px; border-radius: 12px; background: var(--ink-15); display: grid; gap: 2px; }
.tiles dt { font-size: 0.8rem; font-weight: 700; color: var(--ink-60); }
.tiles dd { margin: 0; font-size: 1.6rem; font-weight: 850; }
.tiles span { font-size: 0.8rem; color: var(--ink-60); }
.tabs { flex-wrap: wrap; }
.item { display: grid; gap: 6px; padding: 12px 0; border-top: 1px solid var(--ink-15); }
.item h3 { margin: 0; font-size: 1.05rem; }
.item p { margin: 0; overflow-wrap: anywhere; }
.quote { padding-left: 10px; border-left: 3px solid var(--ink-40); }
.field { display: grid; gap: 4px; }
.field input { font: inherit; padding: 10px; border-radius: 10px; border: 1.5px solid var(--ink-40); background: transparent; color: inherit; }
.spend { width: 100%; border-collapse: collapse; }
.spend th, .spend td { text-align: left; padding: 6px 4px; border-bottom: 1px solid var(--ink-15); }
</style>
