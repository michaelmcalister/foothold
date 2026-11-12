-- Foothold Plus (worker/billing.js): who has it, from where, and until when.
-- source: stripe (the website), grant (given by the owner on the admin page),
-- apple or google (the store apps, later). Off until PREMIUM_ON = "1".
CREATE TABLE subscriptions (
  user_id TEXT PRIMARY KEY,
  plan TEXT NOT NULL DEFAULT 'plus',
  status TEXT NOT NULL,
  source TEXT NOT NULL,
  customer TEXT,
  sub_id TEXT,
  period_end INTEGER,
  updated_at INTEGER NOT NULL
);
CREATE INDEX subscriptions_customer ON subscriptions (customer);
