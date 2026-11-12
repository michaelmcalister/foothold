// Foothold Plus (worker/billing.js, src/lib/plans.js): off by default, then
// later episodes need Plus; Stripe checkout and its signed webhook; grants
// from the admin page; and nothing sold or charged after an account goes.
import { describe, it, expect, beforeEach } from 'vitest'
import { makeEnv, caller } from './fakes.js'
import { needsPlus, canPlay } from '../src/lib/plans.js'
import { verifyStripe, handleStripeWebhook, planOf } from '../worker/billing.js'
import { MISSIONS, CHAINS } from '../src/lib/missions/scripts.js'

const P = 'device-0000-plus-plus-0001'
const ep = (id) => MISSIONS.find((m) => m.id === id)

async function sign(payload, secret, t = Math.floor(Date.now() / 1000)) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const mac = new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`${t}.${payload}`)))
  return `t=${t},v1=${[...mac].map((b) => b.toString(16).padStart(2, '0')).join('')}`
}

describe('what Plus unlocks', () => {
  it('keeps first episodes, Trailkeepers and the game show free', () => {
    expect(needsPlus(ep(CHAINS.tiger[0]))).toBe(false)
    expect(needsPlus(ep(CHAINS.tiger[1]))).toBe(true)
    expect(needsPlus(ep(CHAINS.quiz[2]))).toBe(false)
    expect(canPlay(ep(CHAINS.tiger[3]), { premium: null })).toBe(true) // switched off: all free
    expect(canPlay(ep(CHAINS.tiger[3]), { premium: { on: true }, plan: 'free' })).toBe(false)
    expect(canPlay(ep(CHAINS.tiger[3]), { premium: { on: true }, plan: 'plus' })).toBe(true)
  })
})

describe('billing', () => {
  let env
  const call = caller(() => env)
  beforeEach(() => { env = makeEnv() })

  it('stays out of sight while it is switched off', async () => {
    expect((await call(P, 'GET', '/api/config')).body.premium).toBeUndefined()
    expect((await call(P, 'GET', '/api/me')).body.user.plan).toBeUndefined()
    expect((await call(P, 'GET', '/api/billing/status')).status).toBe(404)
  })

  it('checks Stripe signatures, and turns a paid checkout into Plus', async () => {
    env.PREMIUM_ON = '1'
    env.STRIPE_WEBHOOK_SECRET = 'whsec_test'
    const id = (await call(P, 'GET', '/api/me')).body.user.id
    expect((await call(P, 'GET', '/api/me')).body.user.plan).toBe('free')
    const payload = JSON.stringify({ type: 'checkout.session.completed', data: { object: { client_reference_id: id, customer: 'cus_1', subscription: 'sub_1' } } })
    expect(await verifyStripe(payload, await sign(payload, 'whsec_test'), 'whsec_test')).toBe(true)
    expect(await verifyStripe(payload, await sign(payload, 'wrong'), 'whsec_test')).toBe(false)
    expect(await verifyStripe(payload, await sign(payload, 'whsec_test', 1000), 'whsec_test')).toBe(false) // too old
    const bad = await handleStripeWebhook(new Request('https://x/api/billing/webhook', { method: 'POST', body: payload, headers: { 'stripe-signature': 't=1,v1=00' } }), env)
    expect(bad.status).toBe(400)
    const ok = await handleStripeWebhook(new Request('https://x/api/billing/webhook', { method: 'POST', body: payload, headers: { 'stripe-signature': await sign(payload, 'whsec_test') } }), env)
    expect(ok.status).toBe(200)
    expect(await planOf(env, id)).toBe('plus')
    const gone = JSON.stringify({ type: 'customer.subscription.deleted', data: { object: { id: 'sub_1', customer: 'cus_1', status: 'canceled' } } })
    await handleStripeWebhook(new Request('https://x', { method: 'POST', body: gone, headers: { 'stripe-signature': await sign(gone, 'whsec_test') } }), env)
    expect(await planOf(env, id)).toBe('free')
  })

  it('opens a Stripe checkout for the signed-in player', async () => {
    env.PREMIUM_ON = '1'
    env.STRIPE_SECRET_KEY = 'sk_test'
    env.STRIPE_PRICE_PLUS = 'price_1'
    env.APP_URL = 'https://foothold.com.au'
    const real = globalThis.fetch
    let sent
    globalThis.fetch = async (url, init) => { sent = { url, init }; return new Response(JSON.stringify({ url: 'https://checkout.stripe.com/c/1' })) }
    try {
      const r = await call(P, 'POST', '/api/billing/checkout')
      expect(r.body.url).toBe('https://checkout.stripe.com/c/1')
      expect(sent.url).toBe('https://api.stripe.com/v1/checkout/sessions')
      expect(sent.init.body).toContain('mode=subscription')
      expect(sent.init.body).toContain(encodeURIComponent('line_items[0][price]') + '=price_1')
    } finally { globalThis.fetch = real }
    expect((await call(P, 'GET', '/api/config')).body.premium).toMatchObject({ on: true, web: true })
  })

  it('lets the owner give Plus away', async () => {
    env.PREMIUM_ON = '1'
    const OWNER = 'device-0000-owner-own-0001'
    const owner = (await call(OWNER, 'GET', '/api/me')).body.user.id
    const friend = (await call(P, 'GET', '/api/me')).body.user.id
    env.ADMIN_USERS = owner
    env.ALLOW_DEVICE_IDS = '1'
    expect((await call(OWNER, 'POST', '/api/admin/plus', { userId: friend, on: true })).body.plan).toBe('plus')
    expect((await call(P, 'GET', '/api/me')).body.user.plan).toBe('plus')
    expect((await call(P, 'POST', '/api/admin/plus', { userId: friend, on: true })).status).toBe(404)
    expect((await call(OWNER, 'GET', '/api/admin/overview')).body.plusMembers).toBe(1)
    expect((await call(OWNER, 'POST', '/api/admin/plus', { userId: friend, on: false })).body.plan).toBe('free')
  })
})
