// TCX import (Garmin, Polar, Apple Health exports): trackpoints with time, position, altitude, heart rate and cadence.
// A small tag reader rather than DOMParser, so it runs the same in the browser, the Worker and tests.
import { finish, modeFromSport } from './common.js'

const NS = '(?:[\\w.-]+:)?' // optional namespace prefix, like ns3: or tcx:

function tag(body, name) {
  const m = body.match(new RegExp(`<${NS}${name}\\b[^>]*>\\s*([^<]*?)\\s*</${NS}${name}>`))
  return m ? m[1] : null
}
const num = (s) => (s == null || s === '' ? NaN : Number(s))

export function isTcx(text) {
  return /<(?:[\w.-]+:)?TrainingCenterDatabase\b/.test(text)
}

export function parseTcx(text) {
  if (!isTcx(text)) throw new Error("That file isn't a TCX file we can read.")
  const sport = text.match(new RegExp(`<${NS}Activity\\b[^>]*\\bSport="([^"]*)"`))?.[1] || ''
  const notes = tag(text, 'Notes') || ''
  const mode = /^other$/i.test(sport) || !sport ? modeFromSport(notes) : modeFromSport(sport)
  const raw = []
  let timed = 0
  const re = new RegExp(`<${NS}Trackpoint\\b[^>]*>([\\s\\S]*?)</${NS}Trackpoint>`, 'g')
  for (const m of text.matchAll(re)) {
    const b = m[1]
    const t = Date.parse(tag(b, 'Time') || '')
    if (Number.isFinite(t)) timed++
    const hrBlock = b.match(new RegExp(`<${NS}HeartRateBpm\\b[^>]*>([\\s\\S]*?)</${NS}HeartRateBpm>`))?.[1]
    const runCad = num(tag(b, 'RunCadence'))
    raw.push({
      t,
      lat: num(tag(b, 'LatitudeDegrees')),
      lng: num(tag(b, 'LongitudeDegrees')),
      alt: num(tag(b, 'AltitudeMeters')),
      hr: hrBlock ? num(tag(hrBlock, 'Value')) : NaN,
      cadRaw: Number.isFinite(runCad) ? runCad : num(tag(b, 'Cadence')),
    })
  }
  if (!raw.length) throw new Error('No GPS points found in that file.')
  if (!timed) throw new Error('That file has no timestamps, so we can’t check pace. Export the activity with times included.')
  return finish(raw, mode, 'tcx')
}
