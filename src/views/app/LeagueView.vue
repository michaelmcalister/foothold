<script setup>
// One private league: the table (ground gained this week, then held), the members, the invite to share, and leaving.
import { webOrigin, isNativeApp } from '../../lib/native.js'
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { api, isLocal } from '../../lib/api/index.js'
import { store, toast } from '../../lib/store.js'
import { plural } from '../../lib/format.js'
import { inviteLink } from '../../lib/social/leagues.js'

const route = useRoute()
const router = useRouter()
const data = ref(null)
const tab = ref('table')

async function load() {
  try {
    data.value = await api.league(route.params.id, { mode: store.mode })
  } catch (e) {
    toast(e.message)
    router.replace({ name: 'leagues' })
  }
}
onMounted(load)
watch(() => store.mode, load)

const link = computed(() => data.value && inviteLink(webOrigin() + (isNativeApp() ? '/' : location.pathname), data.value.league.code))
const onlyMe = computed(() => data.value && data.value.members.length < 2)

async function share() {
  const l = data.value.league
  const text = `Join my Foothold league, ${l.name}. Code ${l.code}.`
  try {
    if (navigator.share) {
      await navigator.share({ title: l.name, text, url: link.value })
      return
    }
  } catch (e) {
    if (e?.name === 'AbortError') return
  }
  try {
    await navigator.clipboard.writeText(`${text} ${link.value}`)
    toast('Invite link copied. Paste it to your friends.')
  } catch {
    prompt('Copy this invite link', link.value)
  }
}
async function invitePractice() {
  await api.invitePractice(data.value.league.id)
  await load()
  toast('The practice rivals have joined your league.')
}
async function leave() {
  if (!confirm(`Leave ${data.value.league.name}? You can join again with the code.`)) return
  await api.leaveLeague(data.value.league.id)
  toast(`You've left ${data.value.league.name}.`)
  router.replace({ name: 'leagues' })
}
</script>

<template>
  <div v-if="data" class="screen">
    <header class="screen-head">
      <RouterLink class="back small" :to="{ name: 'leagues' }">All leagues</RouterLink>
      <h1>{{ data.league.name }}</h1>
      <p class="muted">{{ plural(data.league.members, 'member') }} · {{ store.mode }} map</p>
    </header>

    <section class="panel invite" aria-labelledby="inv">
      <h2 id="inv">Invite people</h2>
      <p class="small muted">Anyone with the code or link can join, up to 50 people.</p>
      <div class="codebox">
        <span class="label small muted">Code</span>
        <strong class="code">{{ data.league.code }}</strong>
      </div>
      <div class="btns">
        <button class="btn small" type="button" @click="share">Share invite</button>
        <button v-if="isLocal" class="btn quiet small" type="button" @click="invitePractice">Invite the practice rivals</button>
      </div>
    </section>

    <div class="seg" role="group" aria-label="Show">
      <button type="button" :aria-pressed="tab === 'table'" @click="tab = 'table'">Table</button>
      <button type="button" :aria-pressed="tab === 'members'" @click="tab = 'members'">Members</button>
    </div>

    <template v-if="tab === 'table'">
      <p v-if="onlyMe" class="muted">It's just you so far. Share the invite and the table fills up as friends join.</p>
      <table class="table">
        <thead>
          <tr><th scope="col"><span class="sr">Rank</span></th><th scope="col">Who</th><th scope="col" class="num">This week</th><th scope="col" class="num">Held</th></tr>
        </thead>
        <tbody>
          <tr v-for="r in data.table" :key="r.userId" :class="{ me: r.me }">
            <td class="rank">{{ r.rank }}</td>
            <td><span class="who"><span class="hexdot" :style="{ background: r.me ? 'var(--you)' : r.colour }" aria-hidden="true"></span><span class="nm">{{ r.me ? 'You' : r.name }}</span></span></td>
            <td class="num strong">+{{ r.gained7d }}</td>
            <td class="num">{{ r.hexes }}</td>
          </tr>
        </tbody>
      </table>
      <p class="small muted">This week counts hexes gained in the last {{ data.days }} days and still held. Ground inside privacy zones is never counted or shown.</p>
    </template>

    <ul v-else class="rows plain">
      <li v-for="m in data.members" :key="m.userId" class="member">
        <span class="hexdot" :style="{ background: m.me ? 'var(--you)' : m.colour }" aria-hidden="true"></span>
        <span class="nm">{{ m.me ? 'You' : m.name }}</span>
        <span v-if="m.owner" class="chip">Started it</span>
      </li>
    </ul>

    <button class="btn quiet" type="button" @click="leave">Leave league</button>
  </div>
</template>

<style scoped>
.plain { list-style: none; margin: 0; padding: 0; }
.back { color: var(--ink-60); font-weight: 650; text-decoration: none; }
.invite { display: grid; gap: 10px; }
.invite h2, .invite p { margin: 0; }
.codebox { display: flex; align-items: baseline; gap: 10px; }
.code { font-size: 1.8rem; font-weight: 850; font-stretch: 112%; letter-spacing: 0.1em; font-variant-numeric: tabular-nums; }
.btns { display: flex; gap: 8px; flex-wrap: wrap; }
.seg { justify-self: start; }
.table { width: 100%; border-collapse: collapse; font-variant-numeric: tabular-nums; table-layout: fixed; }
.table th { text-align: left; font-size: 0.8rem; color: var(--ink-60); font-weight: 600; padding: 6px 4px; }
.table th:first-child { width: 30px; }
.table th.num { width: 78px; }
.table td { padding: 10px 4px; border-top: 1px solid var(--line); }
.table tr.me td { background: var(--you-wash); }
.num { text-align: right; }
.strong { font-weight: 800; color: var(--you-ink); }
.rank { font-weight: 800; color: var(--ink-60); }
.who { display: flex; align-items: center; gap: 8px; font-weight: 650; min-width: 0; }
.nm { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; min-width: 0; }
.member { display: flex; align-items: center; gap: 10px; }
.member .nm { flex: 1; font-weight: 650; }
.sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); }
</style>
