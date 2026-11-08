// The voice cast for the thriller missions (Ember Run, The Night Job and The
// Parkes Signal) and the game show.
// Each character has an ElevenLabs voice (spoken by the Foothold server,
// POST /api/tts with { voice: key }) and a fallback for the phone's own
// voice: a pitch and rate so characters still sound a little different.
// `radio` characters talk over a radio or earpiece, so their lines get a
// squelch before and after. Shared by the app and the worker.

import { SERIES } from './series/index.js'

export const CAST = {
  // Ember Run
  'ember-narrator': { name: 'Narrator', voiceId: 'dh3YdvdCYZdqFjtSFNTx', pitch: 0.9, rate: 0.98 }, // William
  jo: { name: 'Captain Jo Harker', voiceId: '8WaMCGQzWsKvf7sGPqjE', pitch: 0.95, rate: 1.0 }, // Julieanne
  ollie: { name: 'Ollie', voiceId: 'HhZz3hiP5lrqMIJOxTVX', pitch: 1.05, rate: 1.08, radio: true }, // Lucas
  gwen: { name: 'Gwen', voiceId: 'L4bD71zGAYHMT7a6MLwc', pitch: 1.1, rate: 0.95 }, // Brenna
  bluey: { name: 'Bluey', voiceId: 'YLbQE9U7P1K6rBNJWNSv', pitch: 0.8, rate: 1.0 }, // Jimbo
  pip: { name: 'Pip', voiceId: 'b8gbDO0ybjX1VA89pBdX', pitch: 1.25, rate: 1.06 }, // Ruby Roo

  // The Night Job
  'heist-narrator': { name: 'Narrator', voiceId: 'oKDz3nEzNfwKIVvUwPs0', pitch: 0.85, rate: 0.98 }, // Peter Michael
  viv: { name: 'Viv', voiceId: 'rQXSFvSjxR8Agb8vn1VY', pitch: 1.0, rate: 1.0, radio: true }, // Eva
  pixel: { name: 'Pixel', voiceId: 'nBoLwpO4PAjQaQwVKPI1', pitch: 1.2, rate: 1.1, radio: true }, // Amelia
  mack: { name: 'Mack', voiceId: 'M4FiuEOcSLrYgftiXoq9', pitch: 0.75, rate: 0.96, radio: true }, // Blake
  crane: { name: 'Lachlan Crane', voiceId: 'gZR4sGJmJaoBOVzKgZ8j', pitch: 0.9, rate: 1.04 }, // Scotty
  reg: { name: 'Reg', voiceId: 'abRFZIdN4pvo8ZPmGxHP', pitch: 0.85, rate: 0.94 }, // Lee

  // The Parkes Signal
  'signal-narrator': { name: 'Narrator', voiceId: 'zMK1eWY5DTw3Jjb8efU8', pitch: 1.0, rate: 0.98 }, // Emily
  anika: { name: 'Dr Anika Rao', voiceId: 'L4bD71zGAYHMT7a6MLwc', pitch: 1.05, rate: 1.02 }, // Brenna
  kip: { name: 'Kip', voiceId: 'fjgAVa6FpNYGo4UpjqML', pitch: 1.15, rate: 1.1, radio: true }, // Ziggy
  hale: { name: 'Major Dan Hale', voiceId: 'M4FiuEOcSLrYgftiXoq9', pitch: 0.72, rate: 0.95, radio: true }, // Blake
  lumen: { name: 'Lumen', voiceId: 'oKDz3nEzNfwKIVvUwPs0', pitch: 0.8, rate: 0.9 }, // Peter Michael

  // Run Your Mouth (the game show)
  tex: { name: 'Tex Tilley', voiceId: 'zcIk2xc7SGwlywr4TzZu', pitch: 1.0, rate: 1.08 }, // Simon
  milly: { name: 'Milly', voiceId: 'BB9S0ZoOunfdUYSciL2X', pitch: 1.2, rate: 1.1 }, // Milly
  announcer: { name: 'Announcer', voiceId: 'IKne3meq5aSn9XLyUdCD', pitch: 0.95, rate: 1.05 }, // Charlie
}

// the newer series bring their own cast (missions/series)
for (const s of SERIES) Object.assign(CAST, s.CAST)

export const isCast = (key) => Object.prototype.hasOwnProperty.call(CAST, key)

/** Performance cues like [whispers] are for the expressive voice only. */
export const stripTags = (text) => String(text || '').replace(/\[[^\]]*\]\s*/g, '').replace(/\s+/g, ' ').trim()
