<script setup>
// "Hills on this run" on the result screen (King of the hill): each climb
// done, its time and place on the board, and a cheer when you're King of
// the hill. Hills are worked out just after saving, so a fresh run asks
// again a few times before showing nothing.
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { api } from '../lib/api/index.js'
import { hillTime, inSentence } from '../lib/engine/hills.js'

const props = defineProps({
  activity: { type: Object, required: true },
})

const hills = ref([])
let timer = 0
let tries = 0
const ordinal = (n) => n + (n % 100 >= 11 && n % 100 <= 13 ? 'th' : ['th', 'st', 'nd', 'rd'][n % 10] || 'th')

async function load() {
  const r = await api.activity(props.activity.id).catch(() => null)
  hills.value = r?.hills || []
  // Just saved on the server: the climbs may still be on their way
  const fresh = Date.now() - (props.activity.createdAt || props.activity.startedAt || 0) < 15 * 60000
  if (!hills.value.length && fresh && tries++ < 3) timer = setTimeout(load, 4000)
}
onMounted(load)
onBeforeUnmount(() => clearTimeout(timer))
</script>

<template>
  <section v-if="hills.length" class="runhills" aria-labelledby="runhills-h">
    <h2 id="runhills-h" class="h3">Hills on this {{ activity.mode === 'ride' ? 'ride' : activity.mode === 'walk' ? 'walk' : 'run' }}</h2>
    <ul>
      <li v-for="h in hills" :key="h.id">
        <RouterLink class="row" :to="{ name: 'hill', params: { id: h.id } }">
          <span class="badge" :class="{ mine: h.holds }" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="14" height="14"><path d="M4 17h16l-1.3-8.5-3.9 3.4L12 6l-2.8 5.9-3.9-3.4z" fill="currentColor" /></svg>
          </span>
          <span class="txt">
            <strong>{{ h.name }}</strong>
            <span class="small muted">{{ hillTime(h.seconds) }} · {{ ordinal(h.rank) }} on the board</span>
          </span>
        </RouterLink>
        <p v-if="h.holds" class="small cheer">You're King of the hill on {{ inSentence(h.name) }}.</p>
        <p v-else-if="h.rank <= 3" class="small muted">So close. A few seconds more and it's yours.</p>
      </li>
    </ul>
  </section>
</template>

<style scoped>
.runhills { display: grid; gap: 6px; }
.h3 { font-size: 1.05rem; margin: 0; }
ul { list-style: none; margin: 0; padding: 0; display: grid; gap: 10px; }
.row { display: grid; grid-template-columns: auto 1fr; gap: 10px; align-items: center; text-decoration: none; color: inherit; min-height: 44px; }
.txt { display: grid; gap: 2px; min-width: 0; }
.txt strong { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.badge { width: 28px; height: 28px; border-radius: 50%; border: 2px solid var(--ink); display: grid; place-items: center; box-sizing: border-box; color: var(--ink); background: #fff; }
.badge.mine { background: var(--you); border-color: var(--you); color: #fff; }
.cheer { margin: 2px 0 0 38px; font-weight: 700; color: var(--you); }
.muted.small { margin: 2px 0 0; }
li > p.muted { margin-left: 38px; }
</style>
