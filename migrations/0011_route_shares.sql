-- Routes sent to your crew (people in your clubs and leagues), and a day and time on a planned route. Add only.
-- A share is a copy: name, mode, ring and distance are taken when it is sent, so later edits or a delete by the sender don't change it.
-- ring is JSON [[lng, lat], ...]. planned_at: epoch ms or NULL. hidden: 1 once the recipient hides it.

CREATE TABLE IF NOT EXISTS route_shares (
  id TEXT PRIMARY KEY,
  route_id TEXT NOT NULL,
  from_user TEXT NOT NULL,
  to_user TEXT NOT NULL,
  name TEXT NOT NULL,
  mode TEXT NOT NULL DEFAULT 'run',
  ring TEXT NOT NULL,
  distance_m REAL NOT NULL DEFAULT 0,
  planned_at INTEGER,
  created_at INTEGER NOT NULL,
  hidden INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS route_shares_to ON route_shares (to_user, hidden, created_at DESC);
CREATE INDEX IF NOT EXISTS route_shares_from ON route_shares (from_user, route_id);

ALTER TABLE routes ADD COLUMN planned_at INTEGER;
