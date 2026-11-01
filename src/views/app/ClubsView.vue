<script setup>
// Clubs: run clubs and crews pool their ground on a shared leaderboard.
import { ref, onMounted } from 'vue'
import { api } from '../../lib/api/index.js'
import { store, refresh, toast } from '../../lib/store.js'
import { plural } from '../../lib/format.js'

const clubs = ref([])
const name = ref('')
const error = ref(null)

async function load() { clubs.value = (await api.clubs()).clubs }
onMounted(load)

async function join(c) {
  await api.joinClub(c.id)
  await refresh()
  await load()
  toast(`You're in ${c.name}. Your ground now counts for the club.`)
}
async function leave() {
  await api.leaveClub(store.user.clubId)
  await refresh()
  await load()
}
async function create() {
  error.value = null
  try {
    const { club } = await api.createClub(name.value)
    name.value = ''
    await refresh()
    await load()
    toast(`${club.name} is up. Share it with your crew.`)
  } catch (e) { error.value = e.message }
}
</script>

<template>
  <div class="screen">
    <header class="screen-head">
      <h1>Clubs</h1>
      <p class="muted">Your ground counts for you and for your club. Run clubs can hold their home turf together.</p>
    </header>
    <ul class="rows plain">
      <li v-for="c in clubs" :key="c.id" class="club">
        <div>
          <strong>{{ c.name }}</strong>
          <p class="small muted">{{ plural(c.members, 'member') }} · {{ c.hexes }} hexes</p>
        </div>
        <button v-if="c.mine" class="btn quiet small" type="button" @click="leave">Leave</button>
        <button v-else class="btn small" type="button" @click="join(c)">Join</button>
      </li>
    </ul>
    <section class="panel">
      <h2>Start a club</h2>
      <div class="field">
        <label for="clubname">Club name</label>
        <input id="clubname" v-model="name" maxlength="40" placeholder="For example: Dulwich Hill Dawn Patrol" />
      </div>
      <p v-if="error" class="notice bad">{{ error }}</p>
      <button class="btn" type="button" :disabled="name.trim().length < 3" @click="create">Start club</button>
    </section>
  </div>
</template>

<style scoped>
.plain { list-style: none; margin: 0; padding: 0; }
.club { display: flex; justify-content: space-between; align-items: center; gap: 12px; }
.panel { display: grid; gap: 12px; }
</style>
