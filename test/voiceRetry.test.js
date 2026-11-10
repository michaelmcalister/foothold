// The server voice check: one failed answer (no signal, a slow start) must not
// leave the phone's voice on for the whole session. It is tried again later.
import { describe, it, expect, vi, afterEach } from 'vitest'

describe('server voices', () => {
  afterEach(() => { vi.useRealTimers(); delete globalThis.fetch })

  it('tries the server again 30 seconds after a failed check, and keeps a good answer', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-11-10T09:00:00Z'))
    let calls = 0
    let up = false
    globalThis.fetch = async () => {
      calls++
      if (!up) throw new Error('offline')
      return new Response(JSON.stringify({ tts: { voices: [{ key: 'charlie' }] } }), { headers: { 'content-type': 'application/json' } })
    }
    vi.resetModules()
    const { serverVoices } = await import('../src/lib/audio/voice.js')
    expect(await serverVoices()).toBe(null)
    up = true
    expect(await serverVoices()).toBe(null) // still within 30 seconds: no new request
    expect(calls).toBe(1)
    vi.setSystemTime(new Date('2026-11-10T09:00:31Z'))
    expect((await serverVoices()).voices[0].key).toBe('charlie')
    vi.setSystemTime(new Date('2026-11-10T10:00:00Z'))
    await serverVoices()
    expect(calls).toBe(2) // a good answer is kept
  })
})
