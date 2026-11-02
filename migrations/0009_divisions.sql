-- Weekly divisions: each Monday (Sydney) active players are grouped into divisions of about 20 at their tier; the top 5 move up, nobody moves down.
-- Only adds tables. Times are epoch milliseconds. Rules in src/lib/engine/divisions.js and docs/ENGINE.md.

CREATE TABLE divisions (
  id TEXT PRIMARY KEY,
  week TEXT NOT NULL,                   -- the week's Monday, 'YYYY-MM-DD' (Sydney)
  tier INTEGER NOT NULL,                -- 0 Scout, 1 Pathfinder, 2 Ranger, 3 Warden, 4 Sentinel, 5 Marshal
  mode TEXT NOT NULL DEFAULT 'all',     -- 'all': every map counts. Kept for per-map divisions later.
  city TEXT,                            -- coarse area key (H3 res 4) its players mostly come from, for late joiners; never sent to the app
  created_at INTEGER NOT NULL,
  finalised_at INTEGER                  -- set once the week has ended and ranks and promotions are stored
);
CREATE INDEX divisions_week ON divisions (week, tier);
CREATE INDEX divisions_open ON divisions (finalised_at, week);

CREATE TABLE division_members (
  division_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  week TEXT NOT NULL,                   -- copy of divisions.week, so one player is in one division a week
  tier INTEGER NOT NULL,                -- copy of divisions.tier
  score INTEGER NOT NULL DEFAULT 0,     -- cached: hexes claimed or taken + 10 an outing (max 5)
  hexes INTEGER NOT NULL DEFAULT 0,
  outings INTEGER NOT NULL DEFAULT 0,
  rank INTEGER,                         -- final place, set when the week is finalised
  promoted INTEGER NOT NULL DEFAULT 0,  -- 1 if this week moved them up a tier
  joined_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  PRIMARY KEY (division_id, user_id)
);
CREATE UNIQUE INDEX division_members_week ON division_members (user_id, week);
CREATE INDEX division_members_div ON division_members (division_id);

-- One row per week once grouping has run, so the cron (and any request that gets there first) groups a week only once
CREATE TABLE division_weeks (
  week TEXT PRIMARY KEY,
  grouped_at INTEGER NOT NULL,
  players INTEGER NOT NULL DEFAULT 0
);
