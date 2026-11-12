// Tests for flyover reels: the short timeline, the camera maths, privacy
// zones, the video type choice and the overlay words (lib/recap/reelPlan.js).
import { describe, it, expect } from 'vitest'
import { loopTrack } from '../src/lib/tracks.js'
import { distance } from '../src/lib/engine/index.js'
import { offset } from '../src/lib/engine/geo.js'
import { planRecap } from '../src/lib/recap/plan.js'
import { demoRun } from '../src/lib/recap/demo.js'
import {
  reelTimeline, sectionAt, blendCam, planReel, reelFrame, reelGround, pickMimeType, fileTypeFor, MIME_TYPES,
  reelFileName, reelSize, reelText, siteLabel, counterText, projectPoint, overviewCam, OVERVIEW_BAND, REEL_MIN_MS, REEL_MAX_MS,
} from '../src/lib/recap/reelPlan.js'

const centre = { lat: -33.9, lng: 151.15 }
const loop = (perimeterKm = 3.2, seed = 7) => loopTrack({ centre, perimeterKm, seed })
const DASHES = /[–—]|--/

describe('reel timeline', () => {
  it('stays between 15 and 20 seconds for any distance', () => {
    for (const k of [0, 0.3, 2, 5, 11, 21, 42, 160]) {
      const t = reelTimeline(k)
      expect(t.total).toBeGreaterThanOrEqual(REEL_MIN_MS)
      expect(t.total).toBeLessThanOrEqual(REEL_MAX_MS)
      expect(t.sections.map((s) => s.id)).toEqual(['flyin', 'follow', 'orbit', 'overview', 'end'])
    }
    expect(reelTimeline(20).sections[1].ms).toBeGreaterThan(reelTimeline(1).sections[1].ms)
  })

  it('finds the section and how far through it', () => {
    const t = reelTimeline(5)
    expect(sectionAt(t, 0)).toMatchObject({ id: 'flyin', u: 0 })
    expect(sectionAt(t, 1100).id).toBe('flyin')
    expect(sectionAt(t, 2200).id).toBe('follow')
    expect(sectionAt(t, t.total).id).toBe('end')
    expect(sectionAt(t, t.total + 5000)).toMatchObject({ id: 'end', u: 1 })
    expect(sectionAt(t, -50).id).toBe('flyin')
    let at = 0
    for (const s of t.sections) { expect(s.start).toBe(at); at += s.ms }
  })
})

describe('reel camera', () => {
  it('blends headings the short way and heights on a log scale', () => {
    const a = { lat: 0, lng: 0, heading: 350, tilt: 0, range: 100 }
    const b = { lat: 1, lng: 1, heading: 10, tilt: 60, range: 10000 }
    const m = blendCam(a, b, 0.5)
    expect(m.heading).toBeCloseTo(0, 6)
    expect(m.range).toBeCloseTo(1000, 6)
    expect(m.tilt).toBe(30)
    expect(blendCam(a, b, 0).heading).toBeCloseTo(350, 6)
    expect(blendCam(a, b, 0).range).toBeCloseTo(100, 6)
    expect(blendCam(a, b, 1).range).toBeCloseTo(10000, 6)
  })

  it('moves at a steady speed along the route through the follow', () => {
    const reel = planReel(planRecap(loop(), { aspect: 9 / 16 }))
    const s = reel.timeline.sections[1]
    const f = (x) => reelFrame(reel, s.start + x * s.ms).f
    const mid1 = f(0.4) - f(0.3)
    const mid2 = f(0.7) - f(0.6)
    expect(mid1).toBeCloseTo(mid2, 6)
    expect(f(0)).toBeCloseTo(0, 6)
    expect(f(1)).toBeCloseTo(1, 6)
    for (let x = 0.05; x <= 1; x += 0.05) expect(f(x)).toBeGreaterThanOrEqual(f(x - 0.05))
  })

  it('never jumps between frames and draws the right things in each section', () => {
    const plan = planRecap(loop(6, 3), { aspect: 9 / 16 })
    const reel = planReel(plan)
    let prev = reelFrame(reel, 0)
    expect(prev).toMatchObject({ id: 'flyin', f: 0, hexes: 0, end: 0 })
    let maxMove = 0
    let maxTurn = 0
    for (let t = 33; t <= reel.timeline.total; t += 33) {
      const fr = reelFrame(reel, t)
      for (const k of ['lat', 'lng', 'tilt', 'range', 'heading']) expect(Number.isFinite(fr.cam[k])).toBe(true)
      if (prev.id !== 'flyin') maxMove = Math.max(maxMove, distance(prev.cam, fr.cam))
      maxTurn = Math.max(maxTurn, Math.abs(((fr.cam.heading - prev.cam.heading + 540) % 360) - 180))
      if (fr.id === 'follow') { expect(fr.hexes).toBe(0); expect(fr.counter).toBe(1) }
      if (fr.id === 'end') expect(fr.f).toBe(1)
      prev = fr
    }
    expect(maxMove).toBeLessThan(250) // metres between frames at 30 fps, no cuts
    expect(maxTurn).toBeLessThan(8) // degrees between frames
    const last = reelFrame(reel, reel.timeline.total)
    expect(last).toMatchObject({ id: 'end', end: 1, hexes: 1 })
    expect(last.metres).toBeCloseTo(plan.total, 3)
    // The counter ends on the activity's own distance when given
    const scaled = planReel(plan, { distanceM: 6100 })
    expect(reelFrame(scaled, scaled.timeline.total).metres).toBeCloseTo(6100, 6)
    expect(last.cam.tilt).toBe(0)
  })

  it('projects the camera target to the middle and keeps the route on screen in the overview', () => {
    const plan = planRecap(loop(), { aspect: 9 / 16 })
    const reel = planReel(plan)
    const cam = reel.cams.overview
    const c = projectPoint(cam, cam, 1080, 1920)
    expect(c.x).toBeCloseTo(540, 3)
    expect(c.y).toBeCloseTo(960, 3)
    // North is up when facing north, and east is right
    const north = projectPoint({ ...cam, heading: 0 }, offset(cam, 0, 100), 1080, 1920)
    const east = projectPoint({ ...cam, heading: 0 }, offset(cam, 100, 0), 1080, 1920)
    expect(north.y).toBeLessThan(960)
    expect(east.x).toBeGreaterThan(540)
    // The route sits between the words at the top and the end card
    for (const p of plan.path) {
      const q = projectPoint(cam, p, 1080, 1920)
      expect(q.x).toBeGreaterThan(1080 * (0.5 - OVERVIEW_BAND.width / 2) - 20)
      expect(q.x).toBeLessThan(1080 * (0.5 + OVERVIEW_BAND.width / 2) + 20)
      expect(q.y).toBeGreaterThan(1920 * OVERVIEW_BAND.top - 20)
      expect(q.y).toBeLessThan(1920 * OVERVIEW_BAND.bottom + 20)
    }
    // Whatever way it faces
    for (const h of [0, 75, 200]) {
      const o = overviewCam(plan, h)
      const ys = plan.path.map((p) => projectPoint(o, p, 1080, 1920).y)
      expect(Math.min(...ys)).toBeGreaterThan(1920 * OVERVIEW_BAND.top - 20)
      expect(Math.max(...ys)).toBeLessThan(1920 * OVERVIEW_BAND.bottom + 20)
    }
    // Behind a tilted camera is off the picture
    const tilted = { ...cam, heading: 0, tilt: 70, range: 500 }
    expect(projectPoint(tilted, offset(cam, 0, -3000), 1080, 1920)).toBeNull()
  })
})

describe('reel ground and privacy zones', () => {
  it('trims the ends of the route inside a zone and leaves its hexes out', () => {
    const track = loop(4, 5)
    const open = reelGround(track)
    // with no zone, the first and last 200 m still go (your front door never shows)
    expect(open.track.length).toBeLessThan(track.length)
    expect(open.track.length).toBeGreaterThan(track.length * 0.8)
    expect(open.hexRings.length).toBeGreaterThan(0)
    const zone = { lat: track[0].lat, lng: track[0].lng, radiusM: 300 }
    const g = reelGround(track, { zones: [zone] })
    expect(g.track.length).toBeLessThan(track.length)
    expect(distance(g.track[0], zone)).toBeGreaterThan(300)
    expect(distance(g.track[g.track.length - 1], zone)).toBeGreaterThan(300)
    // Every drawn point of the trail is the trimmed one
    for (const p of g.plan.trailTo(0.0001).slice(0, 1)) expect(distance(p, zone)).toBeGreaterThan(290)
    expect(g.hexRings.length).toBeLessThanOrEqual(open.hexRings.length)
  })

  it('uses the recap count: claimed plus taken, a given count, or the hexes found for the demo', () => {
    const track = loop()
    expect(reelGround(track, { activity: { claimed: 4, taken: 2 } }).hexCount).toBe(6)
    expect(reelGround(track, { hexCount: 9, activity: { claimed: 4 } }).hexCount).toBe(9)
    const found = reelGround(track).hexRings.length
    expect(reelGround(track, { activity: { demo: true, claimed: 1 } }).hexCount).toBe(found)
  })

  it('returns null for a track too short to fly over', () => {
    expect(reelGround([])).toBeNull()
    expect(reelGround([centre, { lat: centre.lat + 0.0001, lng: centre.lng }])).toBeNull()
  })

  it('plans the demo run', () => {
    const d = demoRun(Date.UTC(2026, 10, 7))
    const g = reelGround(d.track, { activity: d.activity })
    expect(g.hexCount).toBeGreaterThan(0)
    const reel = planReel(g.plan)
    expect(reel.timeline.total).toBeLessThanOrEqual(REEL_MAX_MS)
  })
})

describe('reel video type', () => {
  it('prefers mp4, then vp9, then vp8', () => {
    expect(pickMimeType(() => true)).toBe(MIME_TYPES[0])
    expect(pickMimeType((t) => t === 'video/mp4')).toBe('video/mp4')
    expect(pickMimeType((t) => t.startsWith('video/webm'))).toBe('video/webm;codecs=vp9,opus')
    expect(pickMimeType((t) => t.includes('vp8'))).toBe('video/webm;codecs=vp8,opus')
    expect(pickMimeType((t) => t === 'video/webm')).toBe('video/webm')
    expect(pickMimeType(() => false)).toBe('')
    expect(pickMimeType(undefined)).toBe('')
    expect(pickMimeType((t) => { if (t.includes('mp4')) throw new Error('nope'); return true })).toBe('video/webm;codecs=vp9,opus')
  })

  it('names the file after the type', () => {
    expect(fileTypeFor('video/mp4;codecs=avc1')).toEqual({ type: 'video/mp4', ext: 'mp4' })
    expect(fileTypeFor('video/webm;codecs=vp9,opus')).toEqual({ type: 'video/webm', ext: 'webm' })
    expect(fileTypeFor('')).toEqual({ type: 'video/webm', ext: 'webm' })
    expect(reelFileName({ startedAt: new Date(2026, 10, 7, 6).getTime() }, 'mp4')).toBe('foothold-2026-11-07.mp4')
    expect(reelFileName({ demo: true }, 'webm')).toBe('foothold-demo.webm')
  })

  it('drops to 720p on low end phones', () => {
    expect(reelSize({})).toEqual({ width: 1080, height: 1920 })
    expect(reelSize({ deviceMemory: 2 })).toEqual({ width: 720, height: 1280 })
    expect(reelSize({ cores: 2 })).toEqual({ width: 720, height: 1280 })
    for (const s of [reelSize({}), reelSize({ deviceMemory: 1 })]) expect(s.width / s.height).toBeCloseTo(9 / 16, 6)
  })
})

describe('reel words', () => {
  const activity = { mode: 'run', startedAt: Date.UTC(2026, 10, 7, 20), distanceM: 5230, movingS: 1650, paceSPerKm: 315.5 }

  it('formats the end card', () => {
    const t = reelText({ activity, hexCount: 12, origin: 'https://foothold.run' })
    expect(t.brand).toBe('FOOTHOLD')
    expect(t.hexLine).toBe('12 hexes taken')
    expect(t.stats).toEqual([{ value: '5.23', label: 'km' }, { value: '27:30', label: 'time' }, { value: '5:16', label: 'per km' }])
    expect(t.url).toBe('foothold.run')
    expect(t.when).toBeTruthy()
    expect(reelText({ activity, hexCount: 1 }).hexLine).toBe('1 hex taken')
    expect(reelText({ activity, hexCount: 0 }).hexLine).toBe('Ground held')
    expect(reelText({ activity: { ...activity, mode: 'ride', paceSPerKm: 120 } }).stats[2]).toEqual({ value: '30.0', label: 'km/h' })
    expect(reelText({ activity: { demo: true, distanceM: 11000 } }).when).toBe('Demo run over the Harbour Bridge')
  })

  it('only shows the name when asked', () => {
    expect(reelText({ activity, name: 'Sam Lee' }).name).toBe('')
    expect(reelText({ activity, name: 'Sam Lee', showName: true }).name).toBe('Sam Lee')
    expect(reelText({ activity, name: '   ', showName: true }).name).toBe('')
  })

  it('uses the app address, plain words and no dashes', () => {
    expect(siteLabel('https://www.foothold.run')).toBe('foothold.run')
    expect(siteLabel('http://localhost:4985')).toBe('localhost:4985')
    expect(siteLabel('nonsense')).toBe('foothold.run')
    expect(counterText(4200)).toBe('4.20')
    expect(counterText(-3)).toBe('0.00')
    const t = reelText({ activity, hexCount: 3, origin: 'https://foothold.run' })
    for (const s of [t.brand, t.when, t.hexLine, t.url, ...t.stats.flatMap((x) => [x.value, x.label])]) expect(s).not.toMatch(DASHES)
  })
})
