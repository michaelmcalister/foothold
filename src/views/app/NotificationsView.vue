<script setup>
// Notifications: battles, fading ground, coach reminders. Each one is a
// question you can act on, never a telling-off. Routes your crew sent you
// sit on top, ready to plan.
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { api } from '../../lib/api/index.js'
import { refresh, toast } from '../../lib/store.js'
import { copySharedRoute } from '../../lib/sharedRoutes.js'
import SharedRoutes from '../../components/SharedRoutes.vue'
import { ago } from '../../lib/format.js'
import { weekOf, prevWeek } from '../../lib/engine/weeks.js'

const router = useRouter()
const items = ref([])
// Plan it: keep a copy in your routes, then open it in the planner
async function planShared(r) {
  try {
    const mine = await copySharedRoute(r)
    router.push({ name: 'plan', query: { id: mine.id } })
  } catch (e) {
    toast(e.message)
  }
}
onMounted(async () => {
  items.value = (await api.notifications()).items
  await api.readNotifications(items.value.filter((n) => !n.read).map((n) => n.id))
  refresh()
})
// A "your week is ready" notice opens the week it was about: the one before it arrived
const target = (n) => (n.kind === 'week' ? `/app/week?w=${prevWeek(weekOf(n.at)).key}` : n.kind === 'battle' ? '/app/battles' : n.kind === 'division' ? '/app/battles?tab=division' : n.kind === 'coach' ? '/app/coach' : n.kind === 'route' ? '/app/notifications' : n.kind === 'comment' || n.kind === 'streak' ? '/app/you' : '/app')
</script>

<template>
  <div class="screen">
    <header class="screen-head"><h1>Notifications</h1></header>
    <SharedRoutes class="panel" @open="planShared" />
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
