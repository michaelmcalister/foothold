// Spotify: sign in with PKCE (no secret in the app), then drive the Spotify app
// on this phone through Spotify Connect: start a playlist when the run starts,
// lower or pause it while the voice coach talks, pause at the finish.
// Needs Spotify Premium. Tokens stay on this device.

const KEY = 'fh-spotify'
const API = 'https://api.spotify.com/v1'
const SCOPES = 'user-modify-playback-state user-read-playback-state playlist-read-private playlist-read-collaborative'

let clientIdPromise = null
export function clientId() {
  if (!clientIdPromise) {
    clientIdPromise = (async () => {
      try {
        const r = await fetch(import.meta.env.BASE_URL + 'api/config', { signal: AbortSignal.timeout(4000) })
        if (r.ok && (r.headers.get('content-type') || '').includes('json')) {
          const id = (await r.json())?.spotify?.clientId
          if (id) return id
        }
      } catch { /* no server */ }
      return import.meta.env.VITE_SPOTIFY_CLIENT_ID || null
    })()
  }
  return clientIdPromise
}

const redirectUri = () => location.origin + import.meta.env.BASE_URL + 'spotify/callback/'

function read() { try { return JSON.parse(localStorage.getItem(KEY) || 'null') } catch { return null } }
function write(v) { try { v ? localStorage.setItem(KEY, JSON.stringify(v)) : localStorage.removeItem(KEY) } catch { /* private mode */ } }

export const isLinked = () => !!read()?.refresh

const b64url = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')

export async function connect() {
  const id = await clientId()
  if (!id) throw new Error("Spotify isn't set up for Foothold yet.")
  const verifier = b64url(crypto.getRandomValues(new Uint8Array(48)))
  const challenge = b64url(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier)))
  const state = b64url(crypto.getRandomValues(new Uint8Array(12)))
  sessionStorage.setItem('fh-spotify-pkce', JSON.stringify({ verifier, state }))
  const q = new URLSearchParams({ client_id: id, response_type: 'code', redirect_uri: redirectUri(), code_challenge_method: 'S256', code_challenge: challenge, scope: SCOPES, state })
  location.assign('https://accounts.spotify.com/authorize?' + q)
}

// Called on the Settings screen after Spotify sends the person back
export async function finishConnect() {
  const back = JSON.parse(sessionStorage.getItem('fh-spotify-return') || 'null')
  if (!back) return null
  sessionStorage.removeItem('fh-spotify-return')
  const pkce = JSON.parse(sessionStorage.getItem('fh-spotify-pkce') || 'null')
  sessionStorage.removeItem('fh-spotify-pkce')
  if (back.error) throw new Error(back.error === 'access_denied' ? 'Spotify connection was cancelled.' : 'Spotify said no. Try again.')
  if (!pkce || pkce.state !== back.state) throw new Error('That Spotify sign-in expired. Try again.')
  const id = await clientId()
  const r = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_id: id, grant_type: 'authorization_code', code: back.code, redirect_uri: redirectUri(), code_verifier: pkce.verifier }),
  })
  const t = await r.json()
  if (!r.ok) throw new Error('Spotify sign-in failed. Try again.')
  write({ access: t.access_token, refresh: t.refresh_token, expires: Date.now() + t.expires_in * 1000 - 60000 })
  return true
}

export function disconnect() { write(null) }

async function token() {
  const s = read()
  if (!s?.refresh) throw new Error('Connect Spotify in Settings first.')
  if (s.access && Date.now() < s.expires) return s.access
  const r = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_id: await clientId(), grant_type: 'refresh_token', refresh_token: s.refresh }),
  })
  const t = await r.json()
  if (!r.ok) { write(null); throw new Error('Spotify signed you out. Connect it again in Settings.') }
  write({ access: t.access_token, refresh: t.refresh_token || s.refresh, expires: Date.now() + t.expires_in * 1000 - 60000 })
  return t.access_token
}

async function call(method, path, body) {
  const r = await fetch(API + path, {
    method,
    headers: { Authorization: `Bearer ${await token()}`, ...(body ? { 'Content-Type': 'application/json' } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  })
  if (r.status === 204 || r.status === 202) return null
  const data = await r.json().catch(() => null)
  if (!r.ok) {
    const reason = data?.error?.reason
    if (reason === 'PREMIUM_REQUIRED') throw new Error('Playing music from Foothold needs Spotify Premium.')
    if (reason === 'NO_ACTIVE_DEVICE' || r.status === 404) throw new Error('Open Spotify on this phone and play anything for a second, then try again.')
    throw new Error(data?.error?.message || `Spotify error ${r.status}`)
  }
  return data
}

export async function playlists() {
  const out = []
  let url = '/me/playlists?limit=50'
  for (let page = 0; page < 4 && url; page++) {
    const d = await call('GET', url)
    out.push(...(d?.items || []).filter(Boolean).map((p) => ({ uri: p.uri, name: p.name })))
    url = d?.next ? d.next.replace(API, '') : null
  }
  return out
}

// The device to play on. On a phone it's this phone's Spotify app, even when
// a laptop or TV was the last one playing (otherwise the music starts over
// there and Spotify on the phone says it's in use on another device). On a
// computer, whatever is active. Exported for tests.
export function pickDevice(list, { mobile = typeof navigator !== 'undefined' && /iPhone|iPad|Android/i.test(navigator.userAgent) } = {}) {
  const usable = (list || []).filter((x) => x && x.id && !x.is_restricted)
  const phones = usable.filter((x) => x.type === 'Smartphone')
  if (mobile && phones.length) return phones.find((x) => x.is_active) || phones[0]
  return usable.find((x) => x.is_active) || phones[0] || usable[0] || (list || [])[0] || null
}
async function device() {
  const d = await call('GET', '/me/player/devices')
  return pickDevice(d?.devices || [])
}

let session = { deviceId: null, volume: null, canVolume: false }

const RESTRICTED = 'Spotify wouldn\u2019t start from here. Open Spotify, tap the speaker icon and pick this phone, press play, then come back. Foothold will still pause it while the coach talks.'
const isRestriction = (e) => /restriction/i.test(e?.message || '')
const playingOn = async (id) => {
  const st = await call('GET', '/me/player').catch(() => null)
  return !!(st?.is_playing && (!id || st.device?.id === id))
}

// Start (or resume) music for a run. Spotify answers "Restriction violated"
// when asked to resume something that's already playing, or when the phone
// app hasn't handed control over yet, so: skip what's already playing, then
// try a plain play, then a hand over to this phone, and check what's
// actually playing before calling it a failure.
export async function startMusic({ context = '', shuffle = true } = {}) {
  const dev = await device()
  if (!dev) throw new Error('Open Spotify on this phone and play anything for a second, then try again.')
  session = { deviceId: dev.id, volume: dev.volume_percent ?? null, canVolume: !!dev.supports_volume && dev.volume_percent != null }
  const done = { device: dev.name, canVolume: session.canVolume }
  if (dev.is_restricted) throw new Error(RESTRICTED)
  if (!context && (await playingOn(dev.id))) return done // already going here: leave it be
  if (!dev.is_active) {
    // bring playback to this phone first, so nothing else keeps it
    await call('PUT', '/me/player', { device_ids: [dev.id], play: !context }).catch(() => {})
    if (!context) {
      await new Promise((r) => setTimeout(r, 700))
      if (await playingOn(dev.id)) return done
    }
  }
  const q = `?device_id=${encodeURIComponent(dev.id)}`
  try {
    if (context) {
      await call('PUT', `/me/player/shuffle?state=${shuffle ? 'true' : 'false'}&device_id=${encodeURIComponent(dev.id)}`).catch(() => {})
      await call('PUT', '/me/player/play' + q, { context_uri: context })
    } else {
      await call('PUT', '/me/player/play' + q)
    }
  } catch (e) {
    if (!isRestriction(e)) throw e
    // hand playback to this phone and play
    await call('PUT', '/me/player', { device_ids: [dev.id], play: true }).catch(() => {})
    await new Promise((r) => setTimeout(r, 700))
    if (!(await playingOn(dev.id))) throw new Error(RESTRICTED)
  }
  return done
}

export async function pauseMusic() { await call('PUT', '/me/player/pause').catch(() => {}) }
export async function resumeMusic() { await call('PUT', '/me/player/play' + (session.deviceId ? `?device_id=${encodeURIComponent(session.deviceId)}` : '')).catch(() => {}) }

async function setVolume(v) {
  await call('PUT', `/me/player/volume?volume_percent=${Math.round(v)}${session.deviceId ? `&device_id=${encodeURIComponent(session.deviceId)}` : ''}`)
}

/**
 * Run fn (the voice line) with the music lowered or paused, then put it back.
 * how: 'duck' | 'pause' | 'none'. Phones that won't take volume changes
 * from other apps (iPhone) get a short pause instead of a dip.
 */
export async function aroundSpeech(fn, { how = 'duck', duckTo = 25 } = {}) {
  if (!isLinked() || how === 'none') return fn()
  let undo = null
  try {
    if (how === 'duck' && session.canVolume && session.volume != null) {
      await setVolume(Math.min(duckTo, session.volume))
      undo = () => setVolume(session.volume)
    } else {
      const st = await call('GET', '/me/player').catch(() => null)
      if (st?.is_playing) { await pauseMusic(); undo = resumeMusic }
    }
  } catch { /* music control is best effort; the voice still talks */ }
  try { await fn() } finally { if (undo) await undo().catch(() => {}) }
}
