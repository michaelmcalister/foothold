// The first-open permissions explainer (lib/permissions.js): only in the
// apps and only once, Android adds the recording notice, every card is
// friendly plain Australian English with no dashes, and asking never throws.
import { describe, it, expect } from 'vitest'
import { PERMISSIONS, permissionsFor, shouldExplainPermissions, markPermissionsExplained, askPermission } from '../src/lib/permissions.js'

const memory = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v) } }

describe('permissions explainer', () => {
  it('shows once, and only in the apps', () => {
    const s = memory()
    expect(shouldExplainPermissions({ native: false, storage: s })).toBe(false)
    expect(shouldExplainPermissions({ native: true, storage: s })).toBe(true)
    markPermissionsExplained(s)
    expect(shouldExplainPermissions({ native: true, storage: s })).toBe(false)
  })

  it('asks for location and the mic everywhere, and the recording notice on Android', () => {
    expect(permissionsFor({ android: false }).map((p) => p.id)).toEqual(['location', 'microphone'])
    expect(permissionsFor({ android: true }).map((p) => p.id)).toEqual(['location', 'microphone', 'notifications'])
  })

  it('explains each one kindly, in short plain words', () => {
    for (const p of PERMISSIONS) {
      for (const text of [p.title, p.blurb, p.tip, p.button]) {
        expect(text).toBeTruthy()
        expect(text).not.toMatch(/[–—]|--/)
        expect(text).not.toMatch(/\b(color|center|favorite)\b/i)
      }
      expect(p.blurb.length).toBeLessThan(200)
    }
  })

  it('asking runs the right prompt and never throws', async () => {
    const asked = []
    await askPermission('microphone', { microphone: () => asked.push('mic') })
    await expect(askPermission('location', { location: () => { throw new Error('denied') } })).resolves.toBeUndefined()
    await expect(askPermission('nothing', {})).resolves.toBeUndefined()
    expect(asked).toEqual(['mic'])
  })
})
