// Night mode: the Auto, Day or Night setting, kept on this device, and the
// look it gives right now (Auto follows the phone's light or dark setting).
// The look is set on <html> (class "night", data-theme) so the app's colour
// tokens switch, and it picks the street map style and map colours to match.
// The landing page keeps its own look: the night colours only apply inside
// the app (html.in-app), which main.js marks as the route changes.
import { reactive } from 'vue'

export const THEME_KEY = 'fh-theme'
export const CHOICES = ['auto', 'day', 'night']
export const DAY_MAP_STYLE = 'https://tiles.openfreemap.org/styles/positron'
export const NIGHT_MAP_STYLE = 'https://tiles.openfreemap.org/styles/dark'
// The browser bar colour for each look (day is the brand ink, as it always was)
export const THEME_COLOUR = { day: '#16302A', night: '#0F1916' }

export const normalise = (v) => (CHOICES.includes(v) ? v : 'auto')

/** The saved choice, or 'auto' when nothing is saved or storage is blocked. */
export function readChoice(storage) {
  try { return normalise(storage?.getItem(THEME_KEY)) } catch { return 'auto' }
}

/** Save the choice on this device. Auto is the default, so it clears the key. */
export function saveChoice(choice, storage) {
  try {
    if (normalise(choice) === 'auto') storage?.removeItem(THEME_KEY)
    else storage?.setItem(THEME_KEY, choice)
  } catch { /* private mode or blocked: it still applies until the app closes */ }
}

/** 'day' or 'night' for a choice, given whether the phone is set to dark. */
export function resolveLook(choice, prefersDark) {
  const c = normalise(choice)
  if (c === 'day' || c === 'night') return c
  return prefersDark ? 'night' : 'day'
}

/** The OpenFreeMap street style for a look. */
export const mapStyleUrl = (look) => (look === 'night' ? NIGHT_MAP_STYLE : DAY_MAP_STYLE)

/** Colours the territory map draws with on top of the street style. */
export function mapColours(look) {
  if (look === 'night') {
    return {
      you: '#5B7BFF', // cobalt, lifted so it reads on the near black map
      ink: '#E4EBE2', // track, zones, suggested loops
      casing: '#0C0C0C', // the edge under the track and hills
      fog: '#000000',
      fogOpacity: 0.55,
      paper: '#121C19', // shown when the street style can't load
      mineOpacity: 0.34,
      rivalOpacity: 0.16,
    }
  }
  return {
    you: '#2E55E6',
    ink: '#16302A',
    casing: '#FFFFFF',
    fog: '#16302A',
    fogOpacity: 0.42,
    paper: '#ECEFE4',
    mineOpacity: 0.28,
    rivalOpacity: 0.1,
  }
}

/** Put a look on the page: the class and data attribute on <html>, and the browser bar colour. */
export function applyLook(look, doc) {
  if (!doc?.documentElement) return
  const root = doc.documentElement
  root.classList.toggle('night', look === 'night')
  root.dataset.theme = look
  doc.querySelector?.('meta[name="theme-color"]')?.setAttribute('content', THEME_COLOUR[look] || THEME_COLOUR.day)
}

/** Mark whether an app screen is showing, so the night colours stay out of the landing page. */
export function markInApp(on, doc = globalThis.document) {
  doc?.documentElement?.classList.toggle('in-app', !!on)
}

// ---- the live setting (browser only) ----

function localStore() {
  try { return globalThis.localStorage || null } catch { return null }
}
function darkQuery() {
  try { return globalThis.matchMedia?.('(prefers-color-scheme: dark)') || null } catch { return null }
}

export const theme = reactive({ choice: 'auto', look: 'day' })
let query = null

function refresh() {
  theme.look = resolveLook(theme.choice, !!query?.matches)
  applyLook(theme.look, globalThis.document)
}

/** Read the saved setting, apply it, and follow the phone's setting while on Auto. */
export function startTheme() {
  theme.choice = readChoice(localStore())
  if (!query) {
    query = darkQuery()
    query?.addEventListener?.('change', refresh)
  }
  refresh()
}

/** Change the setting from Settings. */
export function setTheme(choice) {
  theme.choice = normalise(choice)
  saveChoice(theme.choice, localStore())
  refresh()
}

/** The look right now, for maps that pick their style once when they start. */
export const currentLook = () => theme.look
