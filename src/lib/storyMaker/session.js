// The Story Maker on the Record screen: what's around you, the stories made
// near you, the story ready to run, and the leg you're on (routed along real
// paths when the server can, a straight line when it can't). Positions sent
// to the server are rounded to about a kilometre; picking the stops and the
// way to each one happens here, on the phone.
import { reactive } from 'vue'
import { api } from '../api/index.js'
import { routeVia } from '../paths.js'
import { placeSteps } from '../directions.js'
import { createWalk } from './walk.js'
import { nextStops, estM } from './core.js'
import { track } from '../analytics.js'

export const maker = reactive({
  places: null, // { suburb, area, places, key }
  near: [], // stories made near you
  busy: '', // what's happening, for the button
  error: '',
  ready: null, // { story, chapter }: the story the next run plays
  leg: null, // { ring, steps, name }: the way to the next stop
})

/** Look around: the landmarks and the stories made near here. */
export async function lookAround(here) {
  maker.error = ''
  maker.busy = 'Looking around'
  try {
    const [places, near] = await Promise.all([api.storyPlaces(here.lat, here.lng), api.storiesNear(here.lat, here.lng).catch(() => ({ stories: [] }))])
    maker.places = places
    maker.near = near.stories || []
  } catch (e) { maker.error = e.message } finally { maker.busy = '' }
}

/** The first stop and the choice after it, for a new story. Pure. */
export function openingStops(here, places, targetKm) {
  const [first] = nextStops({ here, start: here, places, targetKm, want: 1 })
  if (!first) return null
  const next = nextStops({ here: first, start: here, places, visited: [first.id], doneM: estM(here, first), targetKm })
  return { first, next }
}

/** Write the opening chapter of a new story around you. */
export async function makeStory(here, { mood, targetKm }) {
  maker.error = ''
  const places = maker.places?.places || []
  const open = openingStops(here, places, targetKm)
  if (!open) { maker.error = 'There aren’t enough landmarks close by for a story that long. Try a longer run, or look around somewhere else.'; return }
  maker.busy = 'Writing your story'
  try {
    const out = await api.storyMake({ lat: here.lat, lng: here.lng, mood, targetKm, first: open.first.id, next: open.next.map((p) => p.id) })
    maker.ready = { story: out.story, chapter: out.chapter }
    track('story_made', { mood, km: targetKm })
  } catch (e) { maker.error = e.message } finally { maker.busy = '' }
}

/** Get a story someone made (or you made) ready to run again. */
export async function pickStory(id) {
  maker.error = ''
  maker.busy = 'Getting the story'
  try {
    const { story } = await api.story(id)
    const { chapter } = await api.storyChapter(id, [story.first.id], [])
    maker.ready = { story, chapter }
  } catch (e) { maker.error = e.message } finally { maker.busy = '' }
}

export function dropStory() {
  maker.ready = null
  maker.leg = null
}

/** The walk for the run that's starting, routing each leg as it comes. */
export function walkFor(mode) {
  const r = maker.ready
  if (!r) return null
  const walk = createWalk({
    story: r.story,
    chapter: r.chapter,
    fetchChapter: (ids, next) => api.storyChapter(r.story.id, ids, next).then((x) => x.chapter),
    onLeg: (from, to) => routeLeg(from, to, mode),
  })
  walk.shared = r.story.status === 'shared'
  return walk
}

let legSeq = 0
async function routeLeg(from, to, mode) {
  if (!from || !to || to.lat == null) return
  const seq = ++legSeq
  const name = to.name ? `the way to ${to.name}` : 'the way back'
  const straight = [[from.lng, from.lat], [to.lng, to.lat]]
  maker.leg = { ring: straight, steps: null, name }
  const r = await routeVia(straight, mode === 'ride' ? 'ride' : 'run')
  if (seq !== legSeq || !r) return
  const steps = r.steps?.length ? placeSteps(r.line, r.steps, { loop: false }) : null
  maker.leg = { ring: r.line, steps: steps?.length ? steps : null, name }
}

/** After the run: count the play, and keep the summary's story details. */
export function storyEnded(summary) {
  maker.leg = null
  legSeq++
  if (!summary?.made) return
  api.storyPlayed(summary.storyId, !!summary.completed).catch(() => {})
  maker.ready = null
}
