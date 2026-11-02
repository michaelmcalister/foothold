<script setup>
// Comments under an activity: read, add (280 characters max), delete your own or any on your activity, and report unkind ones.
import { ref, computed, onMounted } from 'vue'
import { api } from '../lib/api/index.js'
import { toast } from '../lib/store.js'
import { ago } from '../lib/format.js'
import { MAX_COMMENT } from '../lib/social/filter.js'

const props = defineProps({ activityId: { type: String, required: true } })
const emit = defineEmits(['count'])

const list = ref([])
const text = ref('')
const error = ref(null)
const busy = ref(false)
const loaded = ref(false)
const left = computed(() => MAX_COMMENT - text.value.length)

async function load() {
  try {
    const r = await api.comments(props.activityId)
    list.value = r.comments
    emit('count', r.count)
  } catch (e) {
    error.value = e.message
  }
  loaded.value = true
}
onMounted(load)

async function send() {
  error.value = null
  busy.value = true
  try {
    const r = await api.addComment(props.activityId, text.value)
    list.value.push(r.comment)
    emit('count', r.count)
    text.value = ''
  } catch (e) {
    error.value = e.message
  } finally {
    busy.value = false
  }
}
async function remove(c) {
  if (!confirm('Delete this comment?')) return
  try {
    const r = await api.deleteComment(props.activityId, c.id)
    list.value = list.value.filter((x) => x.id !== c.id)
    emit('count', r.count)
    toast('Comment deleted.')
  } catch (e) { toast(e.message) }
}
async function report(c) {
  if (!confirm(`Report this comment from ${c.name}? We'll review it, and you won't see it again.`)) return
  try {
    await api.reportComment(props.activityId, c.id)
    list.value = list.value.filter((x) => x.id !== c.id)
    emit('count', list.value.length)
    toast('Thanks for letting us know. We will take a look.')
  } catch (e) { toast(e.message) }
}
</script>

<template>
  <section class="comments" aria-labelledby="comments-h">
    <h2 id="comments-h">Comments</h2>
    <p v-if="loaded && !list.length" class="muted small">No comments yet. Say something kind.</p>
    <ul class="rows plain">
      <li v-for="c in list" :key="c.id" class="comment">
        <span class="hexdot" :style="{ background: c.mine ? 'var(--you)' : c.colour }" aria-hidden="true"></span>
        <div class="body">
          <p class="who"><strong>{{ c.mine ? 'You' : c.name }}</strong> <span class="small muted">{{ ago(c.at) }}</span></p>
          <p class="text">{{ c.text }}</p>
          <div class="acts">
            <button v-if="c.canDelete" class="link" type="button" @click="remove(c)">Delete</button>
            <button v-if="!c.mine" class="link" type="button" @click="report(c)">Report</button>
          </div>
        </div>
      </li>
    </ul>
    <form class="add" @submit.prevent="send">
      <div class="field">
        <label for="comment-text">Add a comment</label>
        <textarea id="comment-text" v-model="text" rows="2" :maxlength="MAX_COMMENT" placeholder="Nice loop. See you out there." aria-describedby="comment-left"></textarea>
        <span id="comment-left" class="hint">{{ left }} characters left. Keep it kind. Links aren't allowed.</span>
      </div>
      <p v-if="error" class="notice bad" role="alert">{{ error }}</p>
      <button class="btn small" type="submit" :disabled="busy || !text.trim()">Post comment</button>
    </form>
  </section>
</template>

<style scoped>
.comments { display: grid; gap: 10px; }
.plain { list-style: none; margin: 0; padding: 0; }
.comment { display: grid; grid-template-columns: auto 1fr; gap: 10px; align-items: start; }
.comment .hexdot { margin-top: 5px; }
.body { min-width: 0; display: grid; gap: 4px; }
.who, .text { margin: 0; }
.text { overflow-wrap: anywhere; white-space: pre-wrap; }
.acts { display: flex; gap: 14px; }
.link { border: 0; background: none; padding: 4px 0; font: inherit; font-size: 0.85rem; font-weight: 650; color: var(--ink-60); cursor: pointer; min-height: 32px; }
.link:hover { color: var(--ink); text-decoration: underline; }
.add { display: grid; gap: 10px; justify-items: start; }
.add .field { width: 100%; }
.field textarea { min-height: 72px; }
</style>
