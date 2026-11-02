-- AI plan building (worker/aiplan.js): one row per paid Claude call, for the global daily spend cap.
-- Add only. Holds no user text and no user id: just the day, feature, model, token counts and the estimated cost.

CREATE TABLE IF NOT EXISTS ai_usage (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  day TEXT NOT NULL, -- UTC date, YYYY-MM-DD
  feature TEXT NOT NULL,
  model TEXT NOT NULL,
  tokens_in INTEGER NOT NULL DEFAULT 0,
  tokens_out INTEGER NOT NULL DEFAULT 0,
  cost_aud REAL NOT NULL DEFAULT 0,
  at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS ai_usage_day ON ai_usage (day);
