// Foothold Plus billing (src/lib/plans.js decides what Plus unlocks). Off
// until PREMIUM_ON = "1": until then /api/config says nothing, everyone
// plays everything, and these routes say Plus isn't available yet.
//
// The website sells through Stripe Checkout (STRIPE_SECRET_KEY secret,
// STRIPE_PRICE_PLUS the price id, STRIPE_WEBHOOK_SECRET for the webhook).
// Stripe tells us about payments, renewals and cancellations through
// /api/billing/webhook, which checks Stripe's signature. The store apps never
// sell (store rules); people who subscribed on the web get Plus there too.
// The owner can also give Plus away from the admin page (source 'grant').

const STRIPE = 'https://api.stripe.com/v1'
const DAY = 86400000

export const premiumOn = (env) => env.PREMIUM_ON === '1'

/** What /api/config says about Plus, or null while it's off. */
export function premiumConfig(env) {
  if (!premiumOn(env)) return null
  return { on: true, price: String(env.PLUS_PRICE_LABEL || ''), web: !!(env.STRIPE_SECRET_KEY && env.STRIPE_PRICE_PLUS) }
}

/** 'plus' or 'free' for a player (a lapsed or cancelled plan is free). */
export async function planOf(env, userId, now = Date.now()) {
  const s = await env.DB.prepare('SELECT status, period_end FROM subscriptions WHERE user_id = ?').bind(userId).first().catch(() => null)
  if (!s) return 'free'
  const live = ['active', 'trialing', 'past_due', 'granted'].includes(s.status)
  const inDate = !s.period_end || s.period_end + 3 * DAY > now // a few days' grace for a late renewal
  return live && inDate ? 'plus' : 'free'
}

const form = (o, prefix = '') => Object.entries(o).flatMap(([k, v]) => {
  const key = prefix ? `${prefix}[${k}]` : k
  return v && typeof v === 'object' ? form(v, key) : [`${encodeURIComponent(key)}=${encodeURIComponent(v)}`]
}).join('&')

async function stripe(env, path, params, fetcher) {
  const r = await fetcher(`${STRIPE}${path}`, {
    method: 'POST',
    headers: { authorization: `Bearer ${env.STRIPE_SECRET_KEY}`, 'content-type': 'application/x-www-form-urlencoded' },
    body: form(params),
  })
  const data = await r.json().catch(() => ({}))
  if (!r.ok) throw Object.assign(new Error('Stripe said no'), { status: 502, detail: data?.error?.type })
  return data
}

/** Check a Stripe webhook signature (t=..., v1=...). */
export async function verifyStripe(payload, header, secret, now = Date.now(), toleranceS = 300) {
  const parts = Object.fromEntries(String(header || '').split(',').map((p) => p.split('=')).filter((p) => p.length === 2))
  const t = Number(parts.t)
  if (!t || !parts.v1 || Math.abs(now / 1000 - t) > toleranceS) return false
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const mac = new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`${t}.${payload}`)))
  const hex = [...mac].map((b) => b.toString(16).padStart(2, '0')).join('')
  if (hex.length !== parts.v1.length) return false
  let diff = 0
  for (let i = 0; i < hex.length; i++) diff |= hex.charCodeAt(i) ^ parts.v1.charCodeAt(i)
  return diff === 0
}

async function save(env, row, now) {
  await env.DB.prepare(
    `INSERT INTO subscriptions (user_id, plan, status, source, customer, sub_id, period_end, updated_at) VALUES (?, 'plus', ?, ?, ?, ?, ?, ?)
     ON CONFLICT (user_id) DO UPDATE SET status = excluded.status, source = excluded.source,
       customer = COALESCE(excluded.customer, subscriptions.customer), sub_id = COALESCE(excluded.sub_id, subscriptions.sub_id),
       period_end = excluded.period_end, updated_at = excluded.updated_at`,
  ).bind(row.userId, row.status, row.source, row.customer ?? null, row.subId ?? null, row.periodEnd ?? null, now).run()
}

/** POST /api/billing/webhook (no sign-in: Stripe's signature instead). */
export async function handleStripeWebhook(req, env, now = Date.now()) {
  const json = (b, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { 'content-type': 'application/json' } })
  if (!premiumOn(env) || !env.STRIPE_WEBHOOK_SECRET) return json({ error: 'Not set up.' }, 404)
  const payload = await req.text()
  if (!(await verifyStripe(payload, req.headers.get('stripe-signature'), env.STRIPE_WEBHOOK_SECRET, now))) return json({ error: 'Bad signature.' }, 400)
  const event = JSON.parse(payload)
  const o = event?.data?.object || {}
  if (event.type === 'checkout.session.completed' && o.client_reference_id) {
    await save(env, { userId: o.client_reference_id, status: 'active', source: 'stripe', customer: o.customer, subId: o.subscription, periodEnd: now + 32 * DAY }, now)
  } else if (/^customer\.subscription\.(created|updated|deleted)$/.test(event.type)) {
    const row = await env.DB.prepare('SELECT user_id FROM subscriptions WHERE customer = ? OR sub_id = ?').bind(o.customer || '', o.id || '').first()
    const userId = row?.user_id || o.metadata?.user_id
    if (userId) {
      const status = event.type.endsWith('deleted') ? 'canceled' : String(o.status || 'active')
      const end = o.current_period_end || o.items?.data?.[0]?.current_period_end
      await save(env, { userId, status, source: 'stripe', customer: o.customer, subId: o.id, periodEnd: end ? end * 1000 : null }, now)
    }
  }
  return json({ received: true })
}

/** /api/billing/* for a signed-in player. Returns undefined for other paths. */
export async function billingRoute({ env, user, path, m, now, fetcher = fetch }) {
  if (!path.startsWith('/api/billing/')) return undefined
  if (!premiumOn(env)) return { status: 404, error: 'Foothold Plus isn’t available yet.' }
  if (path === '/api/billing/status' && m === 'GET') {
    const s = await env.DB.prepare('SELECT status, source, period_end FROM subscriptions WHERE user_id = ?').bind(user.id).first()
    return { plan: await planOf(env, user.id, now), status: s?.status || null, source: s?.source || null, renews: s?.period_end || null }
  }
  if (!env.STRIPE_SECRET_KEY || !env.STRIPE_PRICE_PLUS) return { status: 503, error: 'Payments aren’t set up yet.' }
  const back = `${String(env.APP_URL || '').replace(/\/$/, '')}/app/settings`
  if (path === '/api/billing/checkout' && m === 'POST') {
    if ((await planOf(env, user.id, now)) === 'plus') return { status: 409, error: 'You already have Plus. Thank you!' }
    const s = await stripe(env, '/checkout/sessions', {
      mode: 'subscription',
      client_reference_id: user.id,
      line_items: { 0: { price: env.STRIPE_PRICE_PLUS, quantity: 1 } },
      subscription_data: { metadata: { user_id: user.id } },
      success_url: `${back}?plus=thanks`,
      cancel_url: `${back}?plus=later`,
      allow_promotion_codes: 'true',
    }, fetcher)
    return { url: s.url }
  }
  if (path === '/api/billing/portal' && m === 'POST') {
    const row = await env.DB.prepare('SELECT customer FROM subscriptions WHERE user_id = ?').bind(user.id).first()
    if (!row?.customer) return { status: 404, error: 'There’s no Plus subscription to manage.' }
    const s = await stripe(env, '/billing_portal/sessions', { customer: row.customer, return_url: back }, fetcher)
    return { url: s.url }
  }
  return undefined
}

/** The admin page: give Plus to a player, or take a gift back. */
export async function grantPlus(env, userId, on, now = Date.now()) {
  const exists = await env.DB.prepare('SELECT id FROM users WHERE id = ?').bind(userId).first()
  if (!exists) return { status: 404, error: 'No player with that id.' }
  if (on) await save(env, { userId, status: 'granted', source: 'grant', periodEnd: null }, now)
  else await env.DB.prepare("DELETE FROM subscriptions WHERE user_id = ? AND source = 'grant'").bind(userId).run()
  return { plan: await planOf(env, userId, now) }
}

/** When an account is deleted: stop any Stripe subscription so nobody is charged again. */
export async function cancelForDelete(env, userId, fetcher = fetch) {
  if (!env.STRIPE_SECRET_KEY) return
  const row = await env.DB.prepare("SELECT sub_id FROM subscriptions WHERE user_id = ? AND source = 'stripe'").bind(userId).first().catch(() => null)
  if (!row?.sub_id) return
  await fetcher(`${STRIPE}/subscriptions/${encodeURIComponent(row.sub_id)}`, { method: 'DELETE', headers: { authorization: `Bearer ${env.STRIPE_SECRET_KEY}` } }).catch((e) => console.error('billing cancel', e?.message))
}
