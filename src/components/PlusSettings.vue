<script setup>
// Settings > Foothold Plus: shown only once Plus is switched on (worker/billing.js).
// On the website: join or manage through Stripe. In the store apps: what you
// have, and no selling (store rules).
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { api } from '../lib/api/index.js'
import { store, toast } from '../lib/store.js'
import { premium, canSell, startCheckout, manageBilling } from '../lib/plus.js'

const route = useRoute()
const on = !!premium()?.on
const status = ref(null)
const busy = ref(false)

onMounted(async () => {
  if (!on) return
  status.value = await api.plusStatus().catch(() => null)
  if (status.value?.plan) store.user = { ...store.user, plan: status.value.plan }
  if (route.query.plus === 'thanks') toast('Welcome to Foothold Plus. Every episode is yours.')
})

async function go(fn) {
  busy.value = true
  try { await fn() } catch (e) { toast(e?.message || 'That didn’t open. Try again in a moment.') } finally { busy.value = false }
}
const when = (t) => new Date(t).toLocaleDateString('en-AU', { day: 'numeric', month: 'long' })
</script>

<template>
  <section v-if="on" class="panel stack" aria-labelledby="s-plus">
    <h2 id="s-plus">Foothold Plus</h2>
    <template v-if="status?.plan === 'plus'">
      <p>You have Plus. Every episode of every series is yours.</p>
      <p v-if="status.source === 'grant'" class="small muted">A gift from the Foothold team.</p>
      <p v-else-if="status.renews" class="small muted">Renews {{ when(status.renews) }}.</p>
      <button v-if="status.source === 'stripe' && canSell()" class="btn quiet" type="button" :disabled="busy" @click="go(manageBilling)">Manage or cancel</button>
    </template>
    <template v-else>
      <p>Episode 1 of every series is free. Plus unlocks every episode after that<template v-if="canSell() && premium().price">, for {{ premium().price }}</template>.</p>
      <button v-if="canSell()" class="btn" type="button" :disabled="busy" @click="go(startCheckout)">Get Foothold Plus</button>
    </template>
  </section>
</template>
