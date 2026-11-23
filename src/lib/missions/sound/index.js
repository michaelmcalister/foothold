// The sound sheets: for each series, the places it moves through (scene
// loops), the sounds that pass around you and the recorded cues its beats
// call for, plus which beat of which episode gets which sound. Each sound's
// id is its file name in the library (ambience/<id>.mp3 or sfx/<id>.mp3),
// and the play through log shows those ids, so a sound is easy to find and
// change: edit its prompt here, delete the old recording from R2, and the
// next run makes a new one.
//
// Pure data. series/index.js applies the sheets to the episodes and the
// series' LIBRARY; audio/kits/designed.js builds the stand-in sounds.
//
// A sheet:
//   series    the series id
//   scenes    { id: { prompt, synth: [bed presets], spots, around } }
//   passing   { id: { prompt, seconds, synth (spatial stand-in), path } }
//   cues      { id: { prompt, seconds, sting (synth stand-in), level, wait } }
//   episodes  { episodeId: { beatIndex: { scene, fx, spatial } } }
import { SHEET as bondi } from './bondi.js'
import { SHEET as druitt } from './druitt.js'
import { SHEET as sydney } from './sydney.js'
import { SHEET as penrith } from './penrith.js'
import { SHEET as tiger } from './tiger.js'
import { SHEET as mahogany } from './mahogany.js'
import { SHEET as catalpa } from './catalpa.js'
import { SHEET as minmin } from './minmin.js'
import { SHEET as opal } from './opal.js'
import { SHEET as tunnels } from './tunnels.js'
import { SHEET as canberra } from './canberra.js'
import { SHEET as panther } from './panther.js'
import { SHEET as hawkesbury } from './hawkesbury.js'
import { SHEET as nugget } from './nugget.js'
import { SHEET as gathering } from './gathering.js'
import { SHEET as yourpatch } from './yourpatch.js'
import { SHEET as ember } from './ember.js'
import { SHEET as heist } from './heist.js'
import { SHEET as signal } from './signal.js'
import { SHEET as deepcover } from './deepcover.js'
import { SHEET as timerunners } from './timerunners.js'
import { SHEET as velocity } from './velocity.js'
import { SHEET as trailkeepers } from './trailkeepers.js'

export const SHEETS = [bondi, druitt, sydney, penrith, tiger, mahogany, catalpa, minmin, opal, tunnels, canberra, panther, hawkesbury, nugget, gathering, yourpatch, ember, heist, signal, deepcover, timerunners, velocity, trailkeepers]

/**
 * Put a series' sheet onto its episodes and its LIBRARY (in place): each
 * listed beat gets its sounds, and the prompts join the recorded library.
 */
export function applySheet(series, sheet) {
  if (!sheet) return series
  const lib = series.LIBRARY || {}
  lib.ambience ||= {}
  lib.sfx ||= {}
  const add = libraryOf(sheet)
  Object.assign(lib.ambience, add.ambience)
  Object.assign(lib.sfx, add.sfx)
  marksOnto(series.EPISODES, sheet)
  return series
}

/** Give each listed beat of these episodes its sounds (in place; safe to repeat). */
export function marksOnto(episodes, sheet) {
  for (const ep of episodes) {
    const marks = sheet.episodes?.[ep.id]
    if (!marks) continue
    for (const [i, sound] of Object.entries(marks)) {
      const b = ep.beats[Number(i)]
      if (!b) throw new Error(`${ep.id}: no beat ${i} for its sounds`)
      for (const [k, v] of Object.entries(sound)) {
        if (v === null) delete b[k]
        else b[k] = v
      }
    }
  }
  return episodes
}

/** A sheet's recordings, as library entries: { ambience, sfx }. Pure. */
export function libraryOf(sheet) {
  const ambience = {}
  const sfx = {}
  for (const [id, s] of Object.entries(sheet.scenes || {})) ambience[id] = s.prompt
  for (const [id, s] of Object.entries(sheet.passing || {})) sfx[id] = { prompt: s.prompt, seconds: s.seconds || 5 }
  for (const [id, s] of Object.entries(sheet.cues || {})) sfx[id] = { prompt: s.prompt, seconds: s.seconds || 3, sting: s.sting, ...(s.level != null ? { level: s.level } : {}), ...(s.wait != null ? { wait: s.wait } : {}) }
  return { ambience, sfx }
}
