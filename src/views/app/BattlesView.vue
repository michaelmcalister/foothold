<script setup>
// Battles, leaderboards and the local feed. Battles start when you take
// someone's ground and run for a week; whoever holds more of it wins.
import { ref, onMounted, watch } from 'vue'
import { api } from '../../lib/api/index.js'
import { store, toast } from '../../lib/store.js'
import { km, ago, plural } from '../../lib/format.js'

const tab = ref('battles')
const battles = ref({ live: [], past: [] })
const board = ref([])
const scope = ref('local')
const clubs = ref([])
const feed = ref([])

async function load() {
  if (tab.value === 'battles') battles.value = await api.battles()
  if (tab.value === 'leaders') {
    if (scope.value === 'clubs') clubs.value = (await api.clubBoard()).rows
    else board.value = (await api.leaderboard({ mode: store.mode, scope: scope.value, lat: store.centre.lat, lng: store.centre.lng })).rows
  }
  if (tab.value === 'feed') feed.value = (await api.feed()).items
}
onMounted(load)
watch([tab, scope, () => store.mode], load)

function daysLeft(b) {
  const d = Math.ceil((b.endsAt - Date.now()) / 86400000)
  return d <= 1 ? 'Ends today' : `${d} days left`
}
function side(b) {
  const mineAttacker = b.attacker === store.user.id
  return {
    rival: mineAttacker ? b.defenderName : b.attackerName,
    rivalColour: mineAttacker ? b.defenderColour : b.attackerColour,
    us: mineAttacker ? b.score.attacker : b.score.defender,
    them: mineAttacker ? b.score.defender : b.score.attacker,
  }
}
async function kudos(item) {
  const r = await api.kudos(item.activity.id)
  item.activity.kudos = r.kudos
  item.activity.kudosGiven = r.given
  if (r.given) toast(`Kudos sent to ${item.userName}.`)
}
</script>

<template>
  <div class="screen">
    <header class="screen-head">
      <h1>Battles</h1>
      <div class="seg" role="group" aria-label="Section">
        <button type="button" :aria-pressed="tab === 'battles'" @click="tab = 'battles'">Battles</button>
        <button type="button" :aria-pressed="tab === 'leaders'" @click="tab = 'leaders'">Leaders</button>
        <button type="button" :aria-pressed="tab === 'feed'" @click="tab = 'feed'">Feed</button>
      </div>
      <nav class="social" aria-label="People">
        <RouterLink class="btn quiet small" :to="{ name: 'rivals' }">Your rivals</RouterLink>
        <RouterLink class="btn quiet small" :to="{ name: 'leagues' }">Private leagues</RouterLink>
      </nav>
    </header>

    <template v-if="tab === 'battles'">
      <div v-if="!battles.live.length && !battles.past.length" class="empty">
        <h2>No battles yet</h2>
        <p class="muted">Take ground someone else holds and a one-week battle starts. Whoever holds more of it at the end wins.</p>
        <RouterLink class="btn" to="/app">Find a rival's ground</RouterLink>
      </div>
      <section v-if="battles.live.length" aria-labelledby="live">
        <h2 id="live">Live</h2>
        <ul class="rows plain">
          <li v-for="b in battles.live" :key="b.id" class="battle">
            <div class="vs">
              <span class="hexdot" style="background: var(--you)" aria-hidden="true"></span>
              <strong>You {{ side(b).us }}</strong>
              <span class="muted">vs</span>
              <strong>{{ side(b).them }} {{ side(b).rival }}</strong>
              <span class="hexdot" :style="{ background: side(b).rivalColour }" aria-hidden="true"></span>
            </div>
            <div class="meter" :aria-label="`You hold ${side(b).us} of ${b.hexes.length} hexes`">
              <span :style="{ width: `${(side(b).us / Math.max(1, side(b).us + side(b).them)) * 100}%` }"></span>
            </div>
            <p class="small muted">
              {{ daysLeft(b) }}.
              {{ side(b).us > side(b).them ? `You're ahead. Will you hold on until the end?` : side(b).us === side(b).them ? `It's level. One loop decides it.` : `${side(b).rival} is ahead. Can you take it back?` }}
            </p>
          </li>
        </ul>
      </section>
      <section v-if="battles.past.length" aria-labelledby="past">
        <h2 id="past">Finished</h2>
        <ul class="rows plain">
          <li v-for="b in battles.past" :key="b.id" class="past">
            <span>{{ side(b).rival }}</span>
            <span :class="b.winner === store.user.id ? 'won' : 'lost'">{{ b.winner === store.user.id ? 'Won' : b.winner ? 'Lost' : 'Draw' }} {{ side(b).us }} to {{ side(b).them }}</span>
          </li>
        </ul>
      </section>
    </template>

    <template v-else-if="tab === 'leaders'">
      <div class="seg" role="group" aria-label="Leaderboard">
        <button type="button" :aria-pressed="scope === 'local'" @click="scope = 'local'">Near you</button>
        <button type="button" :aria-pressed="scope === 'club'" @click="scope = 'club'">Your club</button>
        <button type="button" :aria-pressed="scope === 'clubs'" @click="scope = 'clubs'">Clubs</button>
      </div>
      <template v-if="scope === 'clubs'">
        <ol class="rows plain board">
          <li v-for="(c, i) in clubs" :key="c.id" :class="{ me: c.mine }">
            <span class="rank">{{ i + 1 }}</span>
            <span class="who">{{ c.name }} <span class="small muted">{{ plural(c.members, 'member') }}</span></span>
            <span class="n">{{ c.hexes }}</span>
          </li>
        </ol>
        <RouterLink class="btn secondary" :to="{ name: 'clubs' }">Join or start a club</RouterLink>
      </template>
      <template v-else>
        <p v-if="scope === 'club' && !store.user.clubId" class="muted">
          You're not in a club yet. <RouterLink :to="{ name: 'clubs' }">Join one</RouterLink> and your ground counts for the team.
        </p>
        <ol class="rows plain board">
          <li v-for="(r, i) in board" :key="r.userId" :class="{ me: r.me }">
            <span class="rank">{{ i + 1 }}</span>
            <span class="who"><span class="hexdot" :style="{ background: r.me ? 'var(--you)' : r.colour }" aria-hidden="true"></span>{{ r.me ? 'You' : r.name }}</span>
            <span class="n">{{ r.hexes }} <span class="small muted">hexes</span></span>
          </li>
        </ol>
        <p class="small muted">Hexes held on the {{ store.mode }} map right now. Faded ground doesn't count.</p>
      </template>
    </template>

    <template v-else>
      <ul class="rows plain">
        <li v-for="item in feed" :key="item.activity.id" class="feed">
          <span class="hexdot" :style="{ background: item.mine ? 'var(--you)' : item.userColour }" aria-hidden="true"></span>
          <div>
            <span><strong>{{ item.mine ? 'You' : item.userName }}</strong>&nbsp;<span class="muted">{{ item.activity.mode === 'ride' ? 'rode' : item.activity.mode === 'walk' ? 'walked' : 'ran' }} {{ km(item.activity.distanceM) }} km<template v-if="item.activity.title">, {{ item.activity.title }}</template></span></span>
            <p class="small muted">
              {{ ago(item.activity.startedAt) }}
              <template v-if="item.activity.claimed || item.activity.taken"> · {{ plural((item.activity.claimed || 0) + (item.activity.taken || 0), 'hex', 'hexes') }} claimed</template>
            </p>
          </div>
          <RouterLink class="kudos talk" :to="{ name: 'activity', params: { id: item.activity.id } }" :aria-label="`${plural(item.activity.comments || 0, 'comment')}. Open to read or add one`">
            <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M4 5h16v11H9l-5 4z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" /></svg>
            {{ item.activity.comments || 0 }}
          </RouterLink>
          <button v-if="!item.mine" class="kudos" type="button" :aria-pressed="!!item.activity.kudosGiven" @click="kudos(item)">
            <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M7 11v9H4v-9zm0 0 4-7c1.5 0 2.5 1 2.2 2.6L12.6 10H19a2 2 0 0 1 2 2.3l-1.2 6A2 2 0 0 1 17.8 20H7" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" /></svg>
            {{ item.activity.kudos || 0 }}
          </button>
        </li>
      </ul>
    </template>
  </div>
</template>

<style scoped>
.plain { list-style: none; margin: 0; padding: 0; }
.battle { display: grid; gap: 10px; }
.vs { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; font-size: 1.05rem; }
.meter { height: 12px; border-radius: 6px; background: var(--soft); overflow: hidden; }
.meter span { display: block; height: 100%; background: var(--you); border-radius: 6px; }
.past { display: flex; justify-content: space-between; }
.won { color: var(--good); font-weight: 700; }
.lost { color: var(--ink-60); font-weight: 600; }
.board li { display: grid; grid-template-columns: 32px 1fr auto; align-items: center; gap: 10px; }
.board li.me { background: rgba(46, 85, 230, 0.08); border-radius: 10px; padding-left: 8px; padding-right: 8px; }
.rank { font-weight: 800; color: var(--ink-60); font-variant-numeric: tabular-nums; }
.who { display: inline-flex; align-items: center; gap: 8px; font-weight: 650; flex-wrap: wrap; }
.n { font-weight: 800; font-variant-numeric: tabular-nums; }
.feed { display: grid; grid-template-columns: auto 1fr auto auto; gap: 8px 10px; align-items: center; }
.feed > div { min-width: 0; }
.feed > :nth-child(3):last-child { grid-column: 3 / 5; justify-self: end; }
.social { display: flex; gap: 8px; flex-wrap: wrap; }
.talk { text-decoration: none; }
.kudos {
  display: inline-flex; align-items: center; gap: 6px; border: 0; background: var(--soft); color: var(--ink);
  border-radius: 999px; padding: 8px 12px; font: inherit; font-weight: 700; cursor: pointer; min-height: 40px;
}
.kudos[aria-pressed='true'] { background: var(--you); color: #fff; }
</style>
