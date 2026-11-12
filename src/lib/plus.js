// Foothold Plus in the app (worker/billing.js, lib/plans.js). While Plus is
// switched off on the server, everything here says yes and shows nothing.
// The iPhone and Android apps never sell: no price, no link (store rules).
import { track } from './analytics.js'
import { serverConfig } from './auth.js'
import { store } from './store.js'
import { api } from './api/index.js'
import { isNativeApp } from './native.js'
import { canPlay, needsPlus } from './plans.js'

export const premium = () => serverConfig?.premium || null
export const hasPlus = () => store.user?.plan === 'plus'
/** Can this player run this mission now? */
export const playable = (mission) => canPlay(mission, { premium: premium(), plan: store.user?.plan || 'free' })
/** Show the Plus badge on this mission? */
export const plusBadge = (mission) => !!premium()?.on && needsPlus(mission) && !hasPlus()
/** May this screen offer to sell Plus? Only on the website, and only when payments are set up. */
export const canSell = () => !!premium()?.web && !isNativeApp()

/** Off to Stripe's checkout page. */
export async function startCheckout() {
  track('plus_checkout')
  const { url } = await api.plusCheckout()
  if (url) location.href = url
}
/** Off to Stripe's page for managing or cancelling Plus. */
export async function manageBilling() {
  const { url } = await api.plusPortal()
  if (url) location.href = url
}
