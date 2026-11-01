-- Foothold's first schema: players, activities, hex territory, battles, clubs, kudos, notifications, plans, feedback and rate limits.
-- Times are epoch milliseconds. JSON columns hold the same shapes as docs/API.md.

CREATE TABLE users (
  id TEXT PRIMARY KEY,
  auth_sub TEXT UNIQUE,                 -- Auth0 subject, null for dev device accounts
  device_id TEXT UNIQUE,                -- X-Device-Id, dev only (ALLOW_DEVICE_IDS=1)
  name TEXT NOT NULL,
  colour TEXT NOT NULL,
  mode TEXT NOT NULL DEFAULT 'run',
  zones TEXT NOT NULL DEFAULT '[]',     -- privacy zones [{ lat, lng, radiusM, label }]
  prefs TEXT NOT NULL DEFAULT '{}',     -- units, onboarded, goal, homeCentre
  club_id TEXT,
  formtrack_token_enc TEXT,             -- AES-GCM with TOKEN_KEY, never sent to the app
  formtrack_linked_at INTEGER,
  created_at INTEGER NOT NULL
);

CREATE TABLE activities (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  mode TEXT NOT NULL,
  source TEXT NOT NULL,
  started_at INTEGER NOT NULL,
  distance_m REAL NOT NULL DEFAULT 0,
  duration_s REAL NOT NULL DEFAULT 0,
  moving_s REAL NOT NULL DEFAULT 0,
  pace_s_per_km REAL,
  elev_gain_m REAL NOT NULL DEFAULT 0,
  loops INTEGER NOT NULL DEFAULT 0,
  gain INTEGER NOT NULL DEFAULT 0,
  claimed INTEGER NOT NULL DEFAULT 0,
  reinforced INTEGER NOT NULL DEFAULT 0,
  taken INTEGER NOT NULL DEFAULT 0,
  held INTEGER NOT NULL DEFAULT 0,
  trust REAL NOT NULL DEFAULT 0,
  flags TEXT NOT NULL DEFAULT '[]',
  rejected INTEGER NOT NULL DEFAULT 0,
  reject_reason TEXT,
  appeal TEXT,                          -- { note, status, at } or null
  start TEXT,                           -- { lat, lng }, owner only
  bbox TEXT,                            -- [w, s, e, n]
  lat REAL,                             -- bbox centre, for the nearby feed (never the start)
  lng REAL,
  track TEXT,                           -- full cleaned track, owner only (compact form, see worker/db.js)
  public_track TEXT,                    -- track with privacy zone ends trimmed
  created_at INTEGER NOT NULL
);
CREATE INDEX activities_user ON activities (user_id, started_at DESC);
CREATE INDEX activities_started ON activities (started_at DESC);
CREATE INDEX activities_area ON activities (lat, lng);

CREATE TABLE cells (
  mode TEXT NOT NULL,
  h3 TEXT NOT NULL,
  owner TEXT NOT NULL,
  strength REAL NOT NULL,
  visits INTEGER NOT NULL DEFAULT 1,
  last_visit INTEGER NOT NULL,
  claimed_at INTEGER NOT NULL,
  private INTEGER NOT NULL DEFAULT 0,   -- inside the owner's privacy zone: hidden from everyone else
  lat REAL NOT NULL,                    -- hex centre, for bounding box lookups
  lng REAL NOT NULL,
  wild_at INTEGER NOT NULL,             -- when it fades to wild if nobody visits
  PRIMARY KEY (mode, h3)
);
CREATE INDEX cells_owner ON cells (owner, mode, wild_at);
CREATE INDEX cells_area ON cells (mode, lat, lng);
CREATE INDEX cells_wild ON cells (wild_at);

CREATE TABLE battles (
  id TEXT PRIMARY KEY,
  mode TEXT NOT NULL,
  attacker TEXT NOT NULL,
  defender TEXT NOT NULL,
  hexes TEXT NOT NULL DEFAULT '[]',
  started_at INTEGER NOT NULL,
  ends_at INTEGER NOT NULL,
  ended_at INTEGER,
  winner TEXT,
  final_score TEXT                      -- { attacker, defender, leader } once ended
);
CREATE INDEX battles_attacker ON battles (attacker, ended_at);
CREATE INDEX battles_defender ON battles (defender, ended_at);
CREATE INDEX battles_ends ON battles (ended_at, ends_at);

CREATE TABLE clubs (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  created_by TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE UNIQUE INDEX clubs_name ON clubs (lower(name));

CREATE TABLE club_members (
  club_id TEXT NOT NULL,
  user_id TEXT NOT NULL UNIQUE,         -- one club per player
  joined_at INTEGER NOT NULL,
  PRIMARY KEY (club_id, user_id)
);

CREATE TABLE kudos (
  activity_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  at INTEGER NOT NULL,
  PRIMARY KEY (activity_id, user_id)
);

CREATE TABLE notifications (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  at INTEGER NOT NULL,
  kind TEXT NOT NULL,
  text TEXT NOT NULL,
  read INTEGER NOT NULL DEFAULT 0,
  day_key TEXT                          -- set for once-a-day notices so the cron can't repeat them
);
CREATE INDEX notifications_user ON notifications (user_id, at DESC);
CREATE UNIQUE INDEX notifications_daily ON notifications (user_id, kind, day_key) WHERE day_key IS NOT NULL;

CREATE TABLE plans (
  user_id TEXT PRIMARY KEY,
  plan TEXT NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE feedback (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  kind TEXT NOT NULL,
  text TEXT NOT NULL,
  at INTEGER NOT NULL
);

-- Fixed-window counters for light abuse limits (worker/db.js hit)
CREATE TABLE rate_limits (
  bucket TEXT NOT NULL,
  key TEXT NOT NULL,
  win INTEGER NOT NULL,
  count INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (bucket, key, win)
);
