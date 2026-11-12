# Foothold Plus

Foothold Plus unlocks every episode after the first in each story series.
Episode 1 of every series, the Trailkeepers missions and the game show stay
free. It is built and **switched off**. While it's off, everything is free and
nobody sees Plus anywhere.

Code: `worker/billing.js` (server), `src/lib/plans.js` (what needs Plus),
`src/lib/plus.js` and `src/components/PlusSettings.vue` (the app).

## Store rules

The iPhone and Android apps never sell: no price, no link, no "upgrade"
button. Locked episodes say "Part of Foothold Plus". People who subscribe on
the website get Plus in the apps too. Selling inside the apps would need
Apple and Google in-app purchases (a later piece of work).

## Turning it on

1. In Stripe (https://dashboard.stripe.com), create a product "Foothold Plus"
   with a recurring price (say $4.99 a month). Copy the price id (`price_...`).
2. Stripe > Developers > Webhooks > Add endpoint:
   `https://foothold.com.au/api/billing/webhook`, with the events
   `checkout.session.completed`, `customer.subscription.created`,
   `customer.subscription.updated` and `customer.subscription.deleted`.
   Copy its signing secret (`whsec_...`).
3. Stripe > Settings > Billing > Customer portal: turn it on (for "Manage or
   cancel").
4. Cloudflare > Workers & Pages > foothold > Settings > Variables and Secrets:
   - secret `STRIPE_SECRET_KEY` (your `sk_live_...` key)
   - secret `STRIPE_WEBHOOK_SECRET` (the `whsec_...`)
   - variable `STRIPE_PRICE_PLUS` (the `price_...`)
   - variable `PLUS_PRICE_LABEL`, e.g. `$4.99 a month`
   - variable `PREMIUM_ON` = `1` (this is the switch)
5. Update the privacy policy and terms with the price before launch.

To give someone Plus for free: Admin > AI tab > Give someone Plus.
Deleting an account cancels its Stripe subscription.

Never paste a Stripe key into a chat, a commit or an issue.
