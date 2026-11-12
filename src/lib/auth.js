// Auth0 sign-in, used only when the app talks to the Foothold server.
// Loads the Auth0 settings from /api/config (same pattern as FormTrack, and
// the same Auth0 tenant, so one account signs in to both apps), finishes the
// redirect back from Auth0, and hands access tokens to the API client.
// In the iPhone app, Auth0 opens in a secure sheet and comes back through the
// app's own link (Google won't sign people in inside an app's web view).
// Signed in, the app plays on the shared server; signed out, it opens the
// practice map in the browser. Builds with no server skip all of this.

import { reactive } from 'vue'
import { setTokenGetter } from './api/remote.js'
import { useServer } from './api/index.js'
import { isNativeApp, APP_ID, onAppLink, openSheet, closeSheet } from './native.js'

export const auth = reactive({ ready: false, enabled: false, loggedIn: false, user: null, error: '' })
let client = null

const RAW = import.meta.env.VITE_API_URL || ''
const API = RAW === 'self' ? '' : RAW.replace(/\/$/, '')
const home = () => location.origin + import.meta.env.BASE_URL
// Where Auth0 sends the app back to (also listed in the Auth0 dashboard)
const nativeCallback = (domain) => `${APP_ID}://${domain}/capacitor/${APP_ID}/callback`
let callbackUrl = null

// What /api/config said (error reports read it once the app is up)
export let serverConfig = {}

export async function initAuth() {
  if (!RAW) { auth.ready = true; return } // practice map: no sign-in
  try {
    // offline: the last config this phone saw, so a signed-in player stays signed in
    const kept = () => { try { return JSON.parse(localStorage.getItem('fh-config') || '{}') } catch { return {} } }
    const conf = await fetch(API + '/api/config', { signal: AbortSignal.timeout?.(10000) })
      .then((r) => (r.ok ? r.json() : null))
      .then((c) => { if (c) { try { localStorage.setItem('fh-config', JSON.stringify(c)) } catch { /* full */ } } return c || kept() })
      .catch(kept)
    serverConfig = conf
    const cfg = conf.auth0
    // No sign-in set up: use the server only when it takes device ids (local development)
    if (!cfg) { useServer(!!conf.devices); return }
    auth.enabled = true
    const { Auth0Client } = await import('@auth0/auth0-spa-js')
    const native = isNativeApp()
    if (native) callbackUrl = nativeCallback(cfg.domain)
    client = new Auth0Client({
      domain: cfg.domain,
      clientId: cfg.clientId,
      cacheLocation: 'localstorage', // Safari blocks Auth0's cookies; this keeps people signed in
      useRefreshTokens: true,
      authorizationParams: { redirect_uri: native ? callbackUrl : home(), audience: cfg.audience, scope: 'openid profile email offline_access' },
    })
    if (native) onAppLink(finishInApp)
    // what createAuth0Client does, except a failure offline doesn't stop the
    // app: the cached sign-in still counts, and tokens refresh when back online
    await client.checkSession().catch(() => {})
    const q = new URLSearchParams(location.search)
    if (q.has('error') && q.has('state')) {
      // Auth0 sent the visitor back with a refusal instead of a sign-in
      console.warn('Sign-in refused', q.get('error'), q.get('error_description'))
      auth.error = signInTrouble(q.get('error_description') || q.get('error'))
      history.replaceState(null, '', home() + '#/app')
    } else if (q.has('code') && q.has('state')) {
      try {
        const { appState } = await client.handleRedirectCallback()
        history.replaceState(null, '', home() + (appState?.returnTo || '#/app'))
      } catch (e) {
        auth.error = signInTrouble(e.error_description || e.message)
        history.replaceState(null, '', home() + '#/app')
      }
    }
    auth.loggedIn = await client.isAuthenticated()
    if (auth.loggedIn) auth.user = await client.getUser()
    // signed in but the token can't be had (offline): fail the call, never fall back to this phone's practice id
    setTokenGetter(async () => (auth.loggedIn ? client.getTokenSilently().catch(() => { throw new Error("Can't reach Foothold right now. Check your connection.") }) : null))
    useServer(auth.loggedIn)
  } finally {
    auth.ready = true
  }
}

// The app was opened by its Auth0 link: finish signing in (or out), then
// reload so the whole app starts again on the right footing
async function finishInApp(url) {
  if (!callbackUrl || !url.startsWith(callbackUrl)) return
  await closeSheet()
  const q = new URLSearchParams(url.split('?')[1] || '')
  let returnTo = '#/app'
  if (q.has('code') && q.has('state')) {
    try {
      const { appState } = await client.handleRedirectCallback(url)
      returnTo = appState?.returnTo || returnTo
    } catch (e) {
      auth.error = signInTrouble(e.error_description || e.message)
      return
    }
  } else if (q.has('error')) {
    auth.error = signInTrouble(q.get('error_description') || q.get('error'))
    return
  }
  history.replaceState(null, '', home() + returnTo)
  location.reload()
}

// What to tell someone whose sign-in didn't work, in plain words
function signInTrouble(detail = '') {
  if (/not authorized to access resource server/i.test(detail)) return "Sign-in isn't switched on yet, so you're on the practice map. Your runs save on this phone for now."
  return `Sign-in didn't finish (${String(detail).slice(0, 120)}). You're on the practice map for now.`
}

export function login({ signup = false, returnTo } = {}) {
  return client?.loginWithRedirect({
    appState: { returnTo: returnTo || (location.hash || '#/app').replace(/[?&]signin=1/, '') },
    authorizationParams: signup ? { screen_hint: 'signup' } : {},
    ...(callbackUrl ? { openUrl: (url) => openSheet(url) } : {}),
  })
}

export function logout() {
  if (callbackUrl) return client?.logout({ logoutParams: { returnTo: callbackUrl }, openUrl: (url) => openSheet(url) })
  return client?.logout({ logoutParams: { returnTo: home() } })
}
