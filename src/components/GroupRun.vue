<script setup>
// "Run with friends" on the Record screen: make a group run for the story
// you've picked, or join one with a code. The lobby shows who is in; the
// person who made it starts it, and every phone counts down together. A tap
// on Ready (or Start together) lets the sound start on its own at zero, as
// phones only play sound after a tap. State lives in lib/groupRun.js.
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue'
import { crew, createGroup, joinGroup, startGroup, leave, lobbyLine, countdown, serverNow } from '../lib/groupRun.js'
import { metaById } from '../lib/missions/catalogue.js'
import { unlock } from '../lib/audio/voice.js'
import { toast } from '../lib/store.js'

const props = defineProps({ missionId: { type: String, default: null }, joinCode: { type: String, default: '' } })
const emit = defineEmits(['update:missionId', 'go'])

const open = ref(!!props.joinCode)
const code = ref(props.joinCode || '')
const armed = ref(false)
const left = ref(null)
let tick = null

const g = computed(() => crew.group)
const story = computed(() => (g.value ? metaById(g.value.missionId) : props.missionId ? metaById(props.missionId) : null))
const link = computed(() => (g.value ? (location.hostname.endsWith('github.io') ? g.value.code : `${location.origin}/g/${g.value.code}`) : ''))

watch(() => g.value?.missionId, (id) => { if (id && id !== props.missionId) emit('update:missionId', id) })

onMounted(() => {
  if (props.joinCode) join()
  tick = setInterval(() => {
    left.value = countdown(g.value, Date.now(), serverNow() - Date.now())
    if (left.value === 0 && armed.value) { armed.value = false; emit('go') }
  }, 250)
})
onBeforeUnmount(() => clearInterval(tick))

async function make() {
  if (!props.missionId) return toast('Pick a story first, then make the group.')
  await createGroup(props.missionId)
}
async function join() { if (code.value.trim()) await joinGroup(code.value.trim()) }
async function share() {
  const text = `Run ${story.value?.title || 'a story'} with me on Foothold. Code ${g.value.code}`
  try {
    if (navigator.share) await navigator.share({ title: 'Group run on Foothold', text, url: link.value.startsWith('http') ? link.value : undefined })
    else { await navigator.clipboard.writeText(`${text} ${link.value.startsWith('http') ? link.value : ''}`.trim()); toast('Invite copied.') }
  } catch { /* closed the share sheet */ }
}
function ready() { unlock(); armed.value = true }
async function startTogether() { ready(); await startGroup() }
</script>

<template>
  <section class="grp" aria-labelledby="grp-title">
    <button v-if="!g && !open" type="button" class="btn quiet small" @click="open = true">Run this with friends</button>
    <template v-else-if="!g">
      <h2 id="grp-title" class="h">Run with friends</h2>
      <p class="small muted">Two to six of you, each from wherever you are. You all hear the same story at the same time, and the crew votes at every choice.</p>
      <div class="row">
        <button class="btn small" type="button" :disabled="crew.busy || !missionId" @click="make">Make a group{{ story ? ` for ${story.title}` : '' }}</button>
      </div>
      <form class="row" @submit.prevent="join">
        <label class="sr" for="grp-code">Group code</label>
        <input id="grp-code" v-model="code" class="code" maxlength="40" autocomplete="off" autocapitalize="characters" placeholder="Got a code?" />
        <button class="btn quiet small" type="submit" :disabled="crew.busy || !code.trim()">Join</button>
      </form>
      <p v-if="crew.error" class="notice bad small">{{ crew.error }}</p>
    </template>
    <template v-else>
      <h2 id="grp-title" class="h">Group run: {{ story?.title || 'a story' }}</h2>
      <p class="small">Code <strong class="mono">{{ g.code }}</strong></p>
      <ul class="crew">
        <li v-for="(m, i) in g.members" :key="i"><span class="dot" :style="{ background: m.colour }" aria-hidden="true" />{{ m.you ? 'You' : m.name }}<span v-if="m.host" class="muted"> (started it)</span></li>
      </ul>
      <p class="small muted" aria-live="polite">{{ lobbyLine(g) }}</p>
      <p v-if="left != null" class="count" aria-live="assertive">{{ left > 0 ? `Starting in ${left}` : 'Go!' }}</p>
      <div class="row">
        <button v-if="!g.startAt" class="btn quiet small" type="button" @click="share">Invite</button>
        <button v-if="g.host && !g.startAt" class="btn small" type="button" :disabled="crew.busy || g.members.length < 2" @click="startTogether">Start together</button>
        <button v-else-if="left != null && left > 0 && !armed" class="btn small" type="button" @click="ready">I'm ready</button>
        <button v-else-if="left === 0" class="btn small" type="button" @click="emit('go')">Start now</button>
        <span v-else-if="armed" class="small muted">Ready. Your run starts on zero.</span>
        <button class="btn quiet small" type="button" @click="leave()">Leave</button>
      </div>
      <p v-if="!g.startAt && !g.host" class="small muted">Waiting for whoever made the group to start it.</p>
      <p v-if="crew.error" class="notice bad small">{{ crew.error }}</p>
    </template>
  </section>
</template>

<style scoped>
.grp { margin: 10px 0; display: grid; gap: 8px; }
.h { font-size: 1rem; margin: 0; }
.row { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; }
.code { flex: 1; min-width: 0; padding: 8px 10px; border-radius: 10px; border: 1px solid var(--line, #ccd); background: var(--card, #fff); color: inherit; font: inherit; text-transform: uppercase; }
.crew { list-style: none; margin: 0; padding: 0; display: flex; flex-wrap: wrap; gap: 6px 14px; }
.dot { display: inline-block; width: 10px; height: 10px; border-radius: 50%; margin-right: 6px; vertical-align: middle; }
.count { font-size: 1.6rem; font-weight: 800; margin: 0; }
.mono { letter-spacing: 0.12em; }
.sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); }
</style>
