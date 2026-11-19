// The admin play through's live log (lib/autoRun.js): each line said, each
// sound effect and how it played, what the microphone heard and any sound
// problem, newest first, so a test shows straight away what fired. Only kept
// while a play through is running; nothing here leaves the phone.
import { reactive } from 'vue'

export const testLog = reactive({ on: false, items: [] })

export function logTest(kind, text) {
  if (!testLog.on) return
  testLog.items.unshift({ kind, text: String(text).slice(0, 90), at: Date.now() })
  testLog.items.splice(8)
}
