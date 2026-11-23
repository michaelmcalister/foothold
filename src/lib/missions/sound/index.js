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

export const SHEETS = [bondi, druitt, sydney, penrith, tiger, mahogany, catalpa, minmin, opal, tunnels, canberra, panther, hawkesbury, nugget, gathering, yourpatch]

/**
 * Put a series' sheet onto its episodes and its LIBRARY (in place): each
 * listed beat gets its sounds, and the prompts join the recorded library.
 */
export function applySheet(series, sheet) {
  if (!sheet) return series
  const lib = series.LIBRARY || {}
  lib.ambience ||= {}
  lib.sfx ||= {}
  for (const [id, s] of Object.entries(sheet.scenes || {})) lib.ambience[id] = s.prompt
  for (const [id, s] of Object.entries(sheet.passing || {})) lib.sfx[id] = { prompt: s.prompt, seconds: s.seconds || 5 }
  for (const [id, s] of Object.entries(sheet.cues || {})) lib.sfx[id] = { prompt: s.prompt, seconds: s.seconds || 3, sting: s.sting, ...(s.level != null ? { level: s.level } : {}), ...(s.wait != null ? { wait: s.wait } : {}) }
  for (const ep of series.EPISODES) {
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
  return series
}
