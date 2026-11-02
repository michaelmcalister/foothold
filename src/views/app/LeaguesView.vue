<script setup>
// Private leagues: the ones you're in, start one for friends or work, or join with an invite code or link.
import { ref, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { api } from '../../lib/api/index.js'
import { toast } from '../../lib/store.js'
import { plural } from '../../lib/format.js'

const route = useRoute()
const router = useRouter()
const leagues = ref([])
const max = ref(5)
const loaded = ref(false)
const name = ref('')
const code = ref('')
const createError = ref(null)
const joinError = ref(null)
const busy = ref(false)

async function load() {
  const r = await api.leagues()
  leagues.value = r.leagues
  max.value = r.max || 5
  loaded.value = true
}
onMounted(load)
watch(() => route.params.code, (c) => { if (c) code.value = String(c).toUpperCase() }, { immediate: true })

async function create() {
  createError.value = null
  busy.value = true
  try {
    const { league } = await api.createLeague(name.value)
    name.value = ''
    toast(`${league.name} is ready. Share the invite so friends can join.`)
    router.push({ name: 'league', params: { id: league.id } })
  } catch (e) { createError.value = e.message } finally { busy.value = false }
}
async function join() {
  joinError.value = null
  busy.value = true
  try {
    const r = await api.joinLeague(code.value)
    toast(r.already ? `You're already in ${r.league.name}.` : `Welcome to ${r.league.name}.`)
    router.replace({ name: 'league', params: { id: r.league.id } })
  } catch (e) { joinError.value = e.message } finally { busy.value = false }
}
</script>

<template>
  <div class="screen">
    <header class="screen-head">
      <RouterLink class="back small" :to="{ name: 'battles' }">Back to battles</RouterLink>
      <h1>Private leagues</h1>
      <p class="muted">A table just for your friends, family or workplace. Ranked by ground gained this week, then ground held.</p>
    </header>

    <section v-if="route.params.code" class="panel invite" aria-labelledby="inv">
      <h2 id="inv">You've been invited</h2>
      <p class="muted">Join with the code <strong class="code">{{ code }}</strong> and your ground counts in that league's table.</p>
      <p v-if="joinError" class="notice bad" role="alert">{{ joinError }}</p>
      <button class="btn" type="button" :disabled="busy" @click="join">Join league</button>
    </section>

    <section aria-labelledby="mine">
      <h2 id="mine">Your leagues</h2>
      <p v-if="loaded && !leagues.length" class="muted">You're not in a league yet. Start one below, or join with a code a friend sent you.</p>
      <ul class="rows plain">
        <li v-for="l in leagues" :key="l.id">
          <RouterLink class="league" :to="{ name: 'league', params: { id: l.id } }">
            <span class="hexdot" aria-hidden="true"></span>
            <span class="who"><strong>{{ l.name }}</strong><span class="small muted">{{ plural(l.members, 'member') }}</span></span>
            <span class="small muted">Open</span>
          </RouterLink>
        </li>
      </ul>
      <p class="small muted">You can be in up to {{ max }} leagues. Each one holds up to 50 people.</p>
    </section>

    <section class="panel" aria-labelledby="start">
      <h2 id="start">Start a league</h2>
      <form class="form" @submit.prevent="create">
        <div class="field">
          <label for="league-name">League name</label>
          <input id="league-name" v-model="name" maxlength="40" placeholder="For example: Office lunch runners" autocomplete="off" />
        </div>
        <p v-if="createError" class="notice bad" role="alert">{{ createError }}</p>
        <button class="btn" type="submit" :disabled="busy || name.trim().length < 3 || leagues.length >= max">Start league</button>
      </form>
    </section>

    <section v-if="!route.params.code" class="panel" aria-labelledby="join">
      <h2 id="join">Join with a code</h2>
      <form class="form" @submit.prevent="join">
        <div class="field">
          <label for="league-code">Invite code</label>
          <input id="league-code" v-model="code" maxlength="80" placeholder="K7P2QX" autocapitalize="characters" autocomplete="off" spellcheck="false" />
          <span class="hint">Six letters and numbers. You can paste the whole invite link too.</span>
        </div>
        <p v-if="joinError" class="notice bad" role="alert">{{ joinError }}</p>
        <button class="btn secondary" type="submit" :disabled="busy || code.trim().length < 6">Join league</button>
      </form>
    </section>
  </div>
</template>

<style scoped>
.plain { list-style: none; margin: 0; padding: 0; }
.back { color: var(--ink-60); font-weight: 650; text-decoration: none; }
.league { display: grid; grid-template-columns: auto 1fr auto; gap: 12px; align-items: center; color: inherit; text-decoration: none; min-height: 44px; }
.league .hexdot { width: 22px; height: 19px; background: var(--you); }
.who { display: grid; gap: 2px; min-width: 0; }
.who strong { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.form { display: grid; gap: 12px; justify-items: start; }
.form .field { width: 100%; }
.invite { display: grid; gap: 10px; justify-items: start; }
.invite h2, .invite p { margin: 0; }
.code { font-variant-numeric: tabular-nums; letter-spacing: 0.08em; }
</style>
