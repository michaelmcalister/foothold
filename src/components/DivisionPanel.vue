<script setup>
// The Division tab on Battles: this week's division table, your tier, days left and the line above which players move up.
import { ref, computed, onMounted } from 'vue'
import Crest from './Crest.vue'
import TierBadge from './TierBadge.vue'
import { api } from '../lib/api/index.js'
import { store } from '../lib/store.js'

const YOU = '#2E55E6'
const data = ref(null)
const failed = ref(false)

onMounted(async () => {
  try { data.value = await api.division() } catch { failed.value = true }
})

const top = computed(() => data.value?.scoring?.promoteTop || 5)
// The promotion line goes under the last row ranked in the top 5
const lineAfter = computed(() => {
  const t = data.value?.table || []
  let at = -1
  t.forEach((r, i) => { if (r.rank <= top.value) at = i })
  return at
})
const nextName = computed(() => data.value?.division?.tier?.next?.name || null)
</script>

<template>
  <div v-if="failed" class="empty">
    <p class="muted">Your division didn't load. Try again in a moment.</p>
  </div>
  <div v-else-if="data" class="division">
    <div class="panel head">
      <TierBadge :tier="data.tier.index" :size="44" />
      <div>
        <strong>{{ data.tier.name }} division</strong>
        <p class="small muted">
          <template v-if="data.tier.next">Top {{ top }} move up to {{ data.tier.next.name }}.</template>
          <template v-else>The top tier. Every week here counts.</template>
        </p>
      </div>
      <span class="left">
        <span class="big">{{ data.daysLeft }}</span>
        <span class="small muted">{{ data.daysLeft === 1 ? 'day left' : 'days left' }}</span>
      </span>
    </div>

    <p v-if="data.promotion" class="notice good">You moved up to {{ data.promotion.tier.name }} last week. Nice work.</p>

    <div v-if="!data.active" class="empty">
      <h2>Get out once to join</h2>
      <p class="muted">Every Monday, anyone who got out in the last {{ data.scoring.activeDays }} days joins a division of about {{ data.scoring.size }} players. Head out this week and you join one straight away.</p>
      <RouterLink class="btn" :to="{ name: 'record' }">Record one</RouterLink>
    </div>

    <ol v-else class="rows plain board" :aria-label="`${data.tier.name} division table`">
      <template v-for="(r, i) in data.table" :key="r.userId">
        <li :class="{ me: r.me }" data-row>
          <span class="rank">{{ r.rank }}</span>
          <span class="who">
            <Crest :crest="r.me ? store.user.crest : r.crest" :colour="r.me ? YOU : r.colour" :id="r.userId" />
            <span class="name">{{ r.me ? 'You' : r.name }}</span>
            <svg v-if="r.promotes" class="up" viewBox="0 0 24 24" width="16" height="16" aria-label="Moving up"><path d="M6 15l6-6 6 6" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" /></svg>
          </span>
          <span class="n">{{ r.score }}</span>
        </li>
        <li v-if="i === lineAfter && i < data.table.length - 1" class="line" aria-hidden="true">
          <span>{{ nextName ? `Top ${top} move up to ${nextName}` : `Top ${top}` }}</span>
        </li>
      </template>
    </ol>

    <details class="how">
      <summary>How divisions work</summary>
      <ul class="small">
        <li>Each Monday you join a division of about {{ data.scoring.size }} players at your tier.</li>
        <li>You score {{ data.scoring.perHex }} point for each hex you claim or take, plus {{ data.scoring.perOuting }} for each outing, up to {{ data.scoring.maxOutings }} a week. Every map counts.</li>
        <li>On Sunday night the top {{ top }} move up a tier.</li>
        <li>Nobody ever moves down. Miss a week and you stay where you are.</li>
      </ul>
    </details>
  </div>
  <div v-else class="empty"><p class="muted">Loading your division</p></div>
</template>

<style scoped>
.division { display: grid; gap: 14px; }
.plain { list-style: none; margin: 0; padding: 0; }
.head { display: grid; grid-template-columns: auto 1fr auto; gap: 12px; align-items: center; }
.head p { margin: 2px 0 0; }
.left { display: grid; justify-items: center; text-align: center; }
.big { font-weight: 850; font-stretch: 112%; font-size: 1.9rem; line-height: 1; font-variant-numeric: tabular-nums; color: var(--you-ink); }
.board li[data-row] { display: grid; grid-template-columns: 32px 1fr auto; align-items: center; gap: 10px; padding: 10px 0; }
.board li.me { background: var(--you-wash); border-radius: 10px; padding-left: 8px; padding-right: 8px; }
.rank { font-weight: 800; color: var(--ink-60); font-variant-numeric: tabular-nums; }
.who { display: inline-flex; align-items: center; gap: 8px; font-weight: 650; min-width: 0; }
.name { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.up { color: var(--good); flex: none; }
.n { font-weight: 800; font-variant-numeric: tabular-nums; }
.board li.line { padding: 6px 0; border-bottom: 0; display: flex; align-items: center; gap: 10px; color: var(--good); font-size: 0.8rem; font-weight: 750; }
.board li.line::before, .board li.line::after { content: ''; flex: 1; border-top: 2px dashed currentColor; opacity: 0.6; }
.how summary { font-weight: 700; cursor: pointer; }
.how ul { margin: 8px 0 0; padding-left: 20px; display: grid; gap: 4px; color: var(--ink-60); }
</style>
