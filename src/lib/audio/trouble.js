// A short on-device list of why sound or the microphone didn't work, newest
// first. Settings shows it under "Hear a sample" so a problem on a phone can
// be read off the screen and sent in a screenshot. Nothing here leaves the phone.
import { reactive } from 'vue'

export const soundTrouble = reactive([])

export function noteTrouble(where, e) {
  const msg = `${where}: ${e?.name && e.name !== 'Error' ? e.name + ' ' : ''}${e?.message || e}`
  console.warn(msg)
  soundTrouble.unshift(`${new Date().toLocaleTimeString('en-AU', { hour: 'numeric', minute: '2-digit', second: '2-digit' })}  ${msg}`)
  soundTrouble.splice(6)
}
