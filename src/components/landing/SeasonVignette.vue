<script setup>
// The year in four Australian seasons, with a marker for today. Seasons
// start on the first of December, March, June and September (Sydney time).
const seasons = [
  { name: 'Summer', span: 'Dec to Feb' },
  { name: 'Autumn', span: 'Mar to May' },
  { name: 'Winter', span: 'Jun to Aug' },
  { name: 'Spring', span: 'Sep to Nov' },
]
const now = new Date()
const m = now.getMonth() // 0 is January
const idx = Math.floor(((m + 1) % 12) / 3) // Dec, Jan, Feb is summer
const startMonth = [11, 2, 5, 8][idx]
const startYear = m === 11 || idx !== 0 ? now.getFullYear() : now.getFullYear() - 1
const start = new Date(startYear, startMonth, 1)
const end = new Date(startYear, startMonth + 3, 1)
const through = (now - start) / (end - start)
const daysLeft = Math.max(1, Math.ceil((end - now) / 86400000))
</script>

<template>
  <div class="lp-season" role="img"
       :aria-label="`The year in four seasons. It is ${seasons[idx].name} now, with ${daysLeft} days left.`">
    <div v-for="(s, i) in seasons" :key="s.name" class="lp-season-block" :class="{ now: i === idx, past: i < idx }">
      <span class="lp-season-fill" v-if="i === idx" :style="{ width: `${(through * 100).toFixed(1)}%` }"></span>
      <strong>{{ s.name }}</strong>
      <span>{{ s.span }}</span>
    </div>
    <p class="lp-season-note">{{ seasons[idx].name }} season: {{ daysLeft }} {{ daysLeft === 1 ? 'day' : 'days' }} left.</p>
  </div>
</template>
