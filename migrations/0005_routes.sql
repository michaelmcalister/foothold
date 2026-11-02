-- Planned routes from the route planner: name, mode and the line to follow, private to the player who made them.
-- Add only. ring is JSON [[lng, lat], ...]; a closed loop ends where it starts.

CREATE TABLE IF NOT EXISTS routes (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  mode TEXT NOT NULL DEFAULT 'run',
  ring TEXT NOT NULL,
  distance_m REAL NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS routes_user ON routes (user_id, updated_at DESC);
