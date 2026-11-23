// The iPhone app's player when it never reports back (src/lib/audio/nativeSound.js):
// it must not be trusted, so the sound plays the web way instead of not at all.
import { describe, it, expect, vi } from 'vitest'

vi.mock('../src/lib/native.js', () => ({ isIOSApp: () => true }))
const stops = []
vi.mock('@capacitor/core', () => ({ registerPlugin: () => ({ play: () => new Promise(() => {}), stopAll: async () => { stops.push(1) } }) }))

describe('a silent phone player', () => {
  it('is let go after a few seconds, then not used at all', async () => {
    vi.useFakeTimers()
    const { playNative, nativeSoundOn } = await import('../src/lib/audio/nativeSound.js')
    const first = playNative(new Uint8Array([1, 2, 3]), { timeoutMs: 60000 })
    await vi.advanceTimersByTimeAsync(8000)
    expect(await first).toBe(false) // the caller plays it the web way
    expect(stops.length).toBe(1)
    const second = playNative(new Uint8Array([1]))
    await vi.advanceTimersByTimeAsync(8000)
    expect(await second).toBe(false)
    expect(nativeSoundOn()).toBe(false) // the web way from now on
    vi.useRealTimers()
  })
})
