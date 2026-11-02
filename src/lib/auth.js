// Auth0 sign-in, used only when the app talks to the Foothold server.
// Loads the Auth0 settings from /api/config (same pattern as FormTrack, and
// the same Auth0 tenant, so one account signs in to both apps), finishes the
// redirect back from Auth0, and hands access tokens to the API client.
// Signed in, the app plays on the shared server; signed out, it opens the
// practice map in the browser. Builds with no server skip all of this.

import { reactive } from 'vue'
import { setTokenGetter } from './api/remote.js'
import { useServer } from './api/index.js'

export const auth = reactive({ ready: false, enabled: false, loggedIn: false, user: null, error: '' })
let client = null

const RAW = import.meta.env.VITE_API_URL || ''
const API = RAW === 'self' ? '' : RAW.replace(/\/$/, '')
const home = () => location.origin + import.meta.env.BASE_URL

export async function initAuth() {
  if (!RAW) { auth.ready = true; return } // practice map: no sign-in
  try {
    const conf = await fetch(API + '/api/config').then((r) => (r.ok ? r.json() : {})).catch(() => ({}))
    const cfg = conf.auth0
    // No sign-in set up: use the server only when it takes device ids (local development)
    if (!cfg) { useServer(!!conf.devices); return }
    auth.enabled = true
    const { createAuth0Client } = await import('@auth0/auth0-spa-js')
    client = await createAuth0Client({
      domain: cfg.domain,
      clientId: cfg.clientId,
      cacheLocation: 'localstorage', // Safari blocks Auth0's cookies; this keeps people signed in
      useRefreshTokens: true,
      authorizationParams: { redirect_uri: home(), audience: cfg.audience, scope: 'openid profile email offline_access' },
    })
    const q = new URLSearchParams(location.search)
    if (q.has('code') && q.has('state')) {
      try {
        const { appState } = await client.handleRedirectCallback()
        history.replaceState(null, '', home() + (appState?.returnTo || '#/app'))
      } catch (e) {
        auth.error = e.error_description || e.message
        history.replaceState(null, '', home() + '#/app')
      }
    }
    auth.loggedIn = await client.isAuthenticated()
    if (auth.loggedIn) auth.user = await client.getUser()
    setTokenGetter(async () => (auth.loggedIn ? client.getTokenSilently().catch(() => null) : null))
    useServer(auth.loggedIn)
  } finally {
    auth.ready = true
  }
}

export function login({ signup = false, returnTo } = {}) {
  return client?.loginWithRedirect({
    appState: { returnTo: returnTo || (location.hash || '#/app').replace(/[?&]signin=1/, '') },
    authorizationParams: signup ? { screen_hint: 'signup' } : {},
  })
}

export function logout() {
  return client?.logout({ logoutParams: { returnTo: home() } })
}
