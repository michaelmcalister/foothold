// The admin play through's live log (lib/autoRun.js): each line said, each
// sound effect and how it played, what the microphone heard and any sound
// problem, newest first, so a test shows straight away what fired. Only kept
// while a play through is running; nothing here leaves the phone.
//
// nowSound keeps the latest scene, music, passing sound and effect (with its
// file name), and the app's own last sound, through any run, so an admin can see what is playing right now
// and pick out a sound to change. Shown to admins only (RecordView).
import { reactive } from 'vue'

export const testLog = reactive({ on: false, items: [] })
export const nowSound = reactive({ scene: null, music: null, passing: null, effect: null, app: null })

// Story effects, and the app's own beeps and chimes (start, kudos, a right answer), apart
const SLOT = { Scene: 'scene', Music: 'music', Passing: 'passing', Effect: 'effect', App: 'app' }

export function logTest(kind, text) {
  const slot = SLOT[kind]
  if (slot) nowSound[slot] = { text: String(text).slice(0, 120), at: Date.now() }
  if (!testLog.on) return
  testLog.items.unshift({ kind, text: String(text).slice(0, 90), at: Date.now() })
  testLog.items.splice(8)
}

/** A new run: nothing is playing yet. */
export function clearNowSound() {
  for (const k of Object.keys(nowSound)) nowSound[k] = null
}
