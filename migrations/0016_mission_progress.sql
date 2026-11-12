-- Story progress kept with the account (worker/missions.js), so a new phone
-- or a reinstall keeps your place in every series. One row per mission you
-- have tried: how many tries, how many finished, and when you last ran it.
CREATE TABLE mission_progress (
  user_id TEXT NOT NULL,
  mission_id TEXT NOT NULL,
  tries INTEGER NOT NULL DEFAULT 0,
  completed INTEGER NOT NULL DEFAULT 0,
  last_at INTEGER NOT NULL,
  PRIMARY KEY (user_id, mission_id)
);
CREATE INDEX mission_progress_recent ON mission_progress (last_at);
