<script setup>
// Notifications: battles, fading ground, coach reminders. Each one is a
// question you can act on, never a telling-off.
import { ref, onMounted } from 'vue'
import { api } from '../../lib/api/index.js'
import { refresh } from '../../lib/store.js'
import { ago } from '../../lib/format.js'

const items = ref([])
onMounted(async () => {
  items.value = (await api.notifications()).items
  await api.readNotifications(items.value.filter((n) => !n.read).map((n) => n.id))
  refresh()
})
const target = (n) => (n.kind === 'battle' ? '/app/battles' : n.kind === 'coach' ? '/app/coach' : n.kind === 'comment' ? '/app/you' : '/app')
</script>

<template>
  <div class="screen">
    <header class="screen-head"><h1>Notifications</h1></header>
    <div v-if="!items.length" class="empty">
      <p class="muted">Nothing yet. When someone takes your ground, or your ground starts to fade, you'll hear about it here.</p>
    </div>
    <ul v-else class="rows plain">
      <li v-for="n in items" :key="n.id">
        <RouterLink :to="target(n)" class="note" :class="{ unread: !n.read }">
          <span>{{ n.text }}</span>
          <span class="small muted">{{ ago(n.at) }}</span>
        </RouterLink>
      </li>
    </ul>
  </div>
</template>

<style scoped>
.plain { list-style: none; margin: 0; padding: 0; }
.note { display: grid; gap: 4px; text-decoration: none; color: inherit; }
.note.unread span:first-child { font-weight: 700; }
</style>
