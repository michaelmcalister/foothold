<script setup>
// Compete: everything competitive in one place. At the top, a grid to your
// rivals, private leagues, clubs and strongholds (each its own screen). Then
// battles, this week's division, leaderboards and the local feed. Battles start when you take
// someone's ground and run for a week; whoever holds more of it wins.
// Leaderboards come in two kinds: this season's ground gained, and all time.
// The Division tab is this week's division table (components/DivisionPanel.vue).
import { ref, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import Crest from '../../components/Crest.vue'
import DivisionPanel from '../../components/DivisionPanel.vue'
import { api } from '../../lib/api/index.js'
import { store, toast } from '../../lib/store.js'
import { km, ago, plural } from '../../lib/format.js'
import { play } from '../../lib/audio/sfx.js'

const YOU = '#2E55E6'
const TABS = ['battles', 'division', 'leaders', 'feed']
const tab = ref(TABS.includes(useRoute().query.tab) ? useRoute().query.tab : 'battles')
const battles = ref({ live: [], past: [] })
const board = ref([])
const kind = ref('season') // 'season' or 'all'
const scope = ref('local')
const clubs = ref([])
const feed = ref([])
const season = ref(null)

async function load() {
  if (tab.value === 'battles') battles.value = await api.battles()
  if (tab.value === 'leaders') {
    if (kind.value === 'season' && scope.value === 'clubs') scope.value = 'local'
    if (scope.value === 'clubs') clubs.value = (await api.clubBoard()).rows
    else {
      const r = await api.leaderboard({ mode: store.mode, scope: scope.value, board: kind.value === 'season' ? 'season' : undefined, lat: store.centre.lat, lng: store.centre.lng })
      board.value = r.rows
      if (r.season) season.value = r.season
    }
  }
  if (tab.value === 'feed') feed.value = (await api.feed()).items
}
onMounted(async () => {
  load()
  season.value = (await api.season().catch(() => null))?.season || season.value
})
watch([tab, scope, kind, () => store.mode], load)

const daysWord = (d) => (d <= 1 ? 'Last day' : `${d} days left`)

function daysLeft(b) {
  const d = Math.ceil((b.endsAt - Date.now()) / 86400000)
  return d <= 1 ? 'Ends today' : `${d} days left`
}
function side(b) {
  const mineAttacker = b.attacker === store.user.id
  return {
    rival: mineAttacker ? b.defenderName : b.attackerName,
    rivalColour: mineAttacker ? b.defenderColour : b.attackerColour,
    rivalCrest: mineAttacker ? b.defenderCrest : b.attackerCrest,
    rivalId: mineAttacker ? b.defender : b.attacker,
    us: mineAttacker ? b.score.attacker : b.score.defender,
    them: mineAttacker ? b.score.defender : b.score.attacker,
  }
}
async function kudos(item) {
  if (!item.activity.kudosGiven) play('kudos', { wait: false })
  const r = await api.kudos(item.activity.id)
  item.activity.kudos = r.kudos
  item.activity.kudosGiven = r.given
  if (r.given) toast(`Kudos sent to ${item.userName}.`)
}
</script>

<template>
  <div class="screen">
    <header class="screen-head">
      <h1>Compete</h1>
      <p v-if="season" class="small muted season-line">{{ season.label }}. {{ daysWord(season.daysLeft) }}.</p>
      <div class="seg" role="group" aria-label="Section">
        <button type="button" :aria-pressed="tab === 'battles'" @click="tab = 'battles'">Battles</button>
        <button type="button" :aria-pressed="tab === 'division'" @click="tab = 'division'">Division</button>
        <button type="button" :aria-pressed="tab === 'leaders'" @click="tab = 'leaders'">Leaders</button>
        <button type="button" :aria-pressed="tab === 'feed'" @click="tab = 'feed'">Feed</button>
      </div>
      <nav class="hub" aria-label="More ways to compete">
        <RouterLink class="hubtile" :to="{ name: 'rivals' }"><strong>Rivals</strong><span>Who you’re up against</span></RouterLink>
        <RouterLink class="hubtile" :to="{ name: 'leagues' }"><strong>Leagues</strong><span>Private, with friends</span></RouterLink>
        <RouterLink class="hubtile" :to="{ name: 'clubs' }"><strong>Clubs</strong><span>Your crew’s ground</span></RouterLink>
        <RouterLink class="hubtile" :to="{ name: 'strongholds' }"><strong>Strongholds</strong><span>Kings and queens of routes</span></RouterLink>
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
              <Crest :crest="store.user.crest" :colour="YOU" :id="store.user.id" />
              <strong>You {{ side(b).us }}</strong>
              <span class="muted">vs</span>
              <strong>{{ side(b).them }} {{ side(b).rival }}</strong>
              <Crest :crest="side(b).rivalCrest" :colour="side(b).rivalColour" :id="side(b).rivalId" />
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
            <span class="who"><Crest :crest="side(b).rivalCrest" :colour="side(b).rivalColour" :id="side(b).rivalId" :size="18" />{{ side(b).rival }}</span>
            <span :class="b.winner === store.user.id ? 'won' : 'lost'">{{ b.winner === store.user.id ? 'Won' : b.winner ? 'Lost' : 'Draw' }} {{ side(b).us }} to {{ side(b).them }}</span>
          </li>
        </ul>
      </section>
    </template>

    <DivisionPanel v-else-if="tab === 'division'" />

    <template v-else-if="tab === 'leaders'">
      <div class="board-picks">
        <div class="seg" role="group" aria-label="Which leaderboard">
          <button type="button" :aria-pressed="kind === 'season'" @click="kind = 'season'">Season</button>
          <button type="button" :aria-pressed="kind === 'all'" @click="kind = 'all'">All time</button>
        </div>
        <div class="seg" role="group" aria-label="Who to compare with">
          <button type="button" :aria-pressed="scope === 'local'" @click="scope = 'local'">Near you</button>
          <button type="button" :aria-pressed="scope === 'club'" @click="scope = 'club'">Your club</button>
          <button v-if="kind === 'all'" type="button" :aria-pressed="scope === 'clubs'" @click="scope = 'clubs'">Clubs</button>
        </div>
      </div>
      <div v-if="kind === 'season' && season" class="panel season-card">
        <div>
          <strong>{{ season.name }}</strong>
          <p class="small muted">{{ season.span }}. Ground gained since the season began counts, so a late start can still top the board.</p>
        </div>
        <span class="left"><span class="big">{{ season.daysLeft }}</span><span class="small muted">{{ season.daysLeft === 1 ? 'day left' : 'days left' }}</span></span>
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
            <span class="who"><Crest :crest="r.me ? store.user.crest : r.crest" :colour="r.me ? YOU : r.colour" :id="r.userId" />{{ r.me ? 'You' : r.name }}</span>
            <span v-if="kind === 'season'" class="n">{{ r.gained }} <span class="small muted">gained</span></span>
            <span v-else class="n">{{ r.hexes }} <span class="small muted">hexes</span></span>
          </li>
        </ol>
        <p v-if="kind === 'season'" class="small muted">Hexes claimed or taken on the {{ store.mode }} map this season. Every new season softens held ground, so early runs go further.</p>
        <p v-else class="small muted">Hexes held on the {{ store.mode }} map right now. Faded ground doesn't count.</p>
      </template>
    </template>

    <template v-else>
      <ul class="rows plain">
        <li v-for="item in feed" :key="item.activity.id" class="feed">
          <Crest :crest="item.mine ? store.user.crest : item.userCrest" :colour="item.mine ? YOU : item.userColour" :id="item.activity.userId" :size="26" />
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
.hub { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; margin-top: 10px; }
.hubtile { display: grid; gap: 2px; padding: 10px 12px; border-radius: 12px; background: var(--soft); color: inherit; text-decoration: none; min-height: 44px; }
.hubtile strong { font-size: 0.98rem; }
.hubtile span { font-size: 0.8rem; color: var(--ink-60); }
.hubtile:focus-visible { outline: 3px solid var(--you, #2E55E6); outline-offset: 2px; }
.plain { list-style: none; margin: 0; padding: 0; }
.battle { display: grid; gap: 10px; }
.vs { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; font-size: 1.05rem; }
.meter { height: 12px; border-radius: 6px; background: var(--soft); overflow: hidden; }
.meter span { display: block; height: 100%; background: var(--you); border-radius: 6px; }
.past { display: flex; justify-content: space-between; gap: 10px; }
.season-line { margin-top: -2px; }
.board-picks { display: flex; flex-wrap: wrap; gap: 8px; }
.season-card { display: grid; grid-template-columns: 1fr auto; gap: 12px; align-items: center; }
.season-card .left { display: grid; justify-items: center; text-align: center; }
.season-card .big { font-weight: 850; font-stretch: 112%; font-size: 1.9rem; line-height: 1; font-variant-numeric: tabular-nums; color: var(--you-ink); }
.won { color: var(--good); font-weight: 700; }
.lost { color: var(--ink-60); font-weight: 600; }
.board li { display: grid; grid-template-columns: 32px 1fr auto; align-items: center; gap: 10px; }
.board li.me { background: var(--you-wash); border-radius: 10px; padding-left: 8px; padding-right: 8px; }
.rank { font-weight: 800; color: var(--ink-60); font-variant-numeric: tabular-nums; }
.who { display: inline-flex; align-items: center; gap: 8px; font-weight: 650; flex-wrap: wrap; }
.n { font-weight: 800; font-variant-numeric: tabular-nums; }
.feed { display: grid; grid-template-columns: auto 1fr auto auto; gap: 8px 10px; align-items: center; }
.feed > div { min-width: 0; }
.feed > :nth-child(3):last-child { grid-column: 3 / 5; justify-self: end; }
.talk { text-decoration: none; }
.kudos {
  display: inline-flex; align-items: center; gap: 6px; border: 0; background: var(--soft); color: var(--ink);
  border-radius: 999px; padding: 8px 12px; font: inherit; font-weight: 700; cursor: pointer; min-height: 40px;
}
.kudos[aria-pressed='true'] { background: var(--you); color: #fff; }
</style>
