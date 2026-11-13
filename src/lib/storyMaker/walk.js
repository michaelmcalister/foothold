// A Story Maker story, played out on a run. It behaves like a story mission
// to runAudio.js (update, answer, view, finish), but it moves by place, not
// by time: each chapter sends you to a landmark, you hear the arrival when
// you get within ARRIVE_M, then choose where next. The next chapter is asked
// for straight after you choose (written the first time, kept after that),
// and its opening lines play as soon as it comes. After the last landmark it
// sends you back to where you began, and the finale plays when you get there.
// The start point stays on this phone.
import { ARRIVE_M, kmBetween, nextStops, guideLine, estM } from './core.js'

const ASK_WAIT_S = 30
const GUIDE_EVERY_M = 500
const HOME_M = 60

/**
 * story: { id, title, targetKm, places }, chapter: the first chapter.
 * fetchChapter(ids, nextIds) resolves to a chapter. onLeg(from, stop or the start)
 * lets the screen route you there. All times in seconds of the run.
 */
export function createWalk({ story, chapter, fetchChapter, onLeg = () => {} }) {
  const places = new Map((story.places || []).map((p) => [p.id, p]))
  const st = {
    stage: 'start', // start, to, ask, home, done
    ch: chapter,
    ids: [chapter.stop.id],
    target: chapter.stop,
    start: null,
    here: null,
    clock: 0,
    dist: 0,
    lastGuideAt: 0,
    legFromM: 0,
    ask: null,
    choices: [],
    stops: 0,
    pending: [],
    events: [],
    waiting: false,
  }
  const script = { id: `made-${story.id}`, title: story.title || 'Your story', made: true, storyId: story.id }

  const say = (lines) => { for (const l of lines || []) if (l) st.pending.push(l) }

  function setOff(ch) {
    st.ch = ch
    st.target = ch.stop
    st.stage = 'to'
    st.legFromM = st.dist
    st.lastGuideAt = st.dist
    say(ch.go)
    if (st.here) say([guideLine(st.here, ch.stop)])
    onLeg(st.here, ch.stop)
  }

  function arrive() {
    st.stops++
    st.events.push({ type: 'chapter' })
    say(st.ch.arrive)
    if (st.ch.ask?.options?.length) {
      st.stage = 'ask'
      st.ask = { at: st.clock, ...st.ch.ask }
      say([st.ch.ask.question])
      st.events.push({ type: 'ask' })
    } else {
      st.stage = 'home'
      st.legFromM = st.dist
      say(st.ch.home)
      onLeg(st.here, st.start)
    }
  }

  function choose(key) {
    const opt = st.ask?.options.find((o) => o.key === key) || st.ask?.options[0]
    if (!opt) return
    st.ask = null
    st.choices.push({ id: st.ch.stop.id, key: opt.key, label: opt.label })
    st.events.push({ type: 'answer', kind: 'choice', key: opt.key })
    const stop = places.get(opt.stop) || { id: opt.stop, name: opt.label }
    const ids = [...st.ids, opt.stop]
    st.ids = ids
    // head off now; the chapter's words catch up on the way
    st.stage = 'to'
    st.target = { ...stop }
    st.legFromM = st.dist
    st.lastGuideAt = st.dist
    say([`${stop.name} it is.`])
    if (st.here && stop.lat != null) say([guideLine(st.here, stop)])
    onLeg(st.here, stop)
    const after = stop.lat != null
      ? nextStops({ here: stop, start: st.start || stop, places: [...places.values()], visited: ids, doneM: st.dist + estM(st.here || stop, stop), targetKm: story.targetKm })
      : []
    st.waiting = true
    fetchChapter(ids, after.map((p) => p.id))
      .then((ch) => {
        if (st.stage === 'done' || st.ids !== ids) return
        st.ch = ch
        st.target = ch.stop
        say(ch.go)
      })
      .catch(() => {
        // no chapter: keep going, and the arrival is simple
        st.ch = { stop, go: [], arrive: [`You made it to ${stop.name}.`], home: ['That is as far as this story goes today. Head back to where you began.'], finale: ['Back where it began. Well run.'] }
      })
      .finally(() => { st.waiting = false })
  }

  return {
    script,
    update(live) {
      st.clock = live.elapsedS
      st.dist = live.distanceM
      if (live.here) {
        st.here = live.here
        if (!st.start) st.start = { lat: live.here.lat, lng: live.here.lng }
      }
      if (st.stage === 'start' && st.here) setOff(st.ch)
      else if (st.stage === 'to' && st.here && st.target?.lat != null) {
        const m = kmBetween(st.here, st.target) * 1000
        const near = ARRIVE_M + Math.min(30, live.accuracyM || 0) // a weak fix still counts when you're there
        if (m <= near && !st.waiting && st.ch.stop.id === st.target.id) arrive()
        else if (st.dist - st.lastGuideAt >= GUIDE_EVERY_M) { st.lastGuideAt = st.dist; say([guideLine(st.here, st.target)]) }
      } else if (st.stage === 'ask' && st.clock - st.ask.at >= ASK_WAIT_S) {
        say(['No answer, so the story picks for you.'])
        choose(st.ask.options[0].key)
      } else if (st.stage === 'home' && st.here && st.start && st.dist - st.legFromM > 150 && kmBetween(st.here, st.start) * 1000 <= HOME_M) {
        st.stage = 'done'
        say(st.ch.finale)
        st.events.push({ type: 'finale' })
      }
      const out = { lines: st.pending, events: st.events }
      st.pending = []
      st.events = []
      return out
    },
    answer(key) {
      if (st.stage !== 'ask') return { lines: [], events: [] }
      choose(key)
      const out = { lines: st.pending, events: st.events }
      st.pending = []
      st.events = []
      return out
    },
    pause() {},
    resume() {},
    view() {
      const toGo = st.here && st.stage === 'to' && st.target?.lat != null ? Math.round(kmBetween(st.here, st.target) * 1000)
        : st.here && st.stage === 'home' && st.start ? Math.round(kmBetween(st.here, st.start) * 1000) : null
      return {
        id: script.id,
        title: script.title,
        chapter: st.stage === 'home' ? 'Back to where you began' : st.stage === 'done' ? 'The end' : st.target?.name ? `To ${st.target.name}` : null,
        kind: null,
        toGo,
        made: true,
        done: st.stage === 'done',
        paused: false,
        surgesTotal: 0,
        ask: st.ask ? {
          kind: 'choice',
          question: st.ask.question,
          options: st.ask.options.map((o) => ({ key: o.key, label: o.label })),
          remainingS: Math.max(0, Math.ceil(ASK_WAIT_S - (st.clock - st.ask.at))),
          waitS: ASK_WAIT_S,
        } : null,
      }
    },
    finish() {
      const done = st.stage === 'done'
      return { lines: [], summary: this.summary(done) }
    },
    summary(done = st.stage === 'done') {
      return { id: script.id, storyId: story.id, made: true, yours: !!story.yours, shared: story.status === 'shared', title: script.title, completed: done, stops: st.stops, clockS: Math.round(st.clock), surgesDone: 0, choices: st.choices.slice() }
    },
  }
}
