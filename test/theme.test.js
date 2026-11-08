// Night mode: the Auto, Day or Night setting, how it resolves against the
// phone's dark setting, saving it, and the map style and colours it picks.
import { describe, it, expect } from 'vitest'
import { THEME_KEY, normalise, readChoice, saveChoice, resolveLook, mapStyleUrl, mapColours, applyLook, markInApp, DAY_MAP_STYLE, NIGHT_MAP_STYLE, THEME_COLOUR } from '../src/lib/theme.js'

function memoryStorage(initial = {}) {
  const data = { ...initial }
  return {
    data,
    getItem: (k) => (k in data ? data[k] : null),
    setItem: (k, v) => { data[k] = String(v) },
    removeItem: (k) => { delete data[k] },
  }
}
const blocked = {
  getItem() { throw new Error('blocked') },
  setItem() { throw new Error('blocked') },
  removeItem() { throw new Error('blocked') },
}

function fakeDoc() {
  const classes = new Set()
  const meta = { content: '#16302A', setAttribute(k, v) { this[k] = v } }
  return {
    meta,
    classes,
    documentElement: {
      dataset: {},
      classList: { toggle: (c, on) => (on ? classes.add(c) : classes.delete(c)) },
    },
    querySelector: (sel) => (sel === 'meta[name="theme-color"]' ? meta : null),
  }
}

describe('resolveLook', () => {
  it('Auto follows the phone', () => {
    expect(resolveLook('auto', true)).toBe('night')
    expect(resolveLook('auto', false)).toBe('day')
  })
  it('Day and Night ignore the phone', () => {
    expect(resolveLook('day', true)).toBe('day')
    expect(resolveLook('night', false)).toBe('night')
  })
  it('anything else is treated as Auto', () => {
    expect(normalise('purple')).toBe('auto')
    expect(resolveLook(null, true)).toBe('night')
    expect(resolveLook(undefined, false)).toBe('day')
  })
})

describe('reading and saving the setting', () => {
  it('defaults to Auto when nothing is saved', () => {
    expect(readChoice(memoryStorage())).toBe('auto')
    expect(readChoice(null)).toBe('auto')
  })
  it('round trips Day and Night', () => {
    const s = memoryStorage()
    saveChoice('night', s)
    expect(s.data[THEME_KEY]).toBe('night')
    expect(readChoice(s)).toBe('night')
    saveChoice('day', s)
    expect(readChoice(s)).toBe('day')
  })
  it('Auto clears the saved key', () => {
    const s = memoryStorage({ [THEME_KEY]: 'night' })
    saveChoice('auto', s)
    expect(THEME_KEY in s.data).toBe(false)
  })
  it('ignores a junk saved value', () => {
    expect(readChoice(memoryStorage({ [THEME_KEY]: 'dusk' }))).toBe('auto')
  })
  it('never throws when storage is blocked', () => {
    expect(readChoice(blocked)).toBe('auto')
    expect(() => saveChoice('night', blocked)).not.toThrow()
  })
})

describe('map style and colours', () => {
  it('uses OpenFreeMap positron by day and dark at night', () => {
    expect(mapStyleUrl('day')).toBe(DAY_MAP_STYLE)
    expect(mapStyleUrl('night')).toBe(NIGHT_MAP_STYLE)
    expect(NIGHT_MAP_STYLE).toBe('https://tiles.openfreemap.org/styles/dark')
    expect(DAY_MAP_STYLE).toBe('https://tiles.openfreemap.org/styles/positron')
  })
  it('keeps the day map colours as they were', () => {
    const c = mapColours('day')
    expect(c.you).toBe('#2E55E6')
    expect(c.casing).toBe('#FFFFFF')
    expect(c.ink).toBe('#16302A')
  })
  it('flips the track and its casing at night so they read on the dark map', () => {
    const c = mapColours('night')
    expect(c.casing).not.toBe('#FFFFFF')
    expect(c.ink).not.toBe('#16302A')
    expect(c.mineOpacity).toBeGreaterThanOrEqual(mapColours('day').mineOpacity)
  })
})

describe('applyLook', () => {
  it('sets the class, data attribute and browser bar colour', () => {
    const doc = fakeDoc()
    applyLook('night', doc)
    expect(doc.classes.has('night')).toBe(true)
    expect(doc.documentElement.dataset.theme).toBe('night')
    expect(doc.meta.content).toBe(THEME_COLOUR.night)
    applyLook('day', doc)
    expect(doc.classes.has('night')).toBe(false)
    expect(doc.documentElement.dataset.theme).toBe('day')
    expect(doc.meta.content).toBe(THEME_COLOUR.day)
  })
  it('marks app screens so the landing page keeps its look', () => {
    const doc = fakeDoc()
    markInApp(true, doc)
    expect(doc.classes.has('in-app')).toBe(true)
    markInApp(false, doc)
    expect(doc.classes.has('in-app')).toBe(false)
  })
  it('does nothing without a document', () => {
    expect(() => applyLook('night', null)).not.toThrow()
    expect(() => markInApp(true, null)).not.toThrow()
  })
})
