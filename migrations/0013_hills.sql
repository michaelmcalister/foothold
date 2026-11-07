-- King of the hill: climbs found in activities become hills, and the fastest
-- time up each one (run, walk and ride apart) holds it. Add only: two new tables.
-- See src/lib/engine/hills.js for how climbs are found and matched.

-- One row per hill. key is mode:start hex>end hex at H3 resolution 9, so
-- different people's efforts on the same climb meet. line is the first
-- effort's track, simplified, as JSON [[lng, lat], ...]; profile is JSON
-- [[metres from the start, height]] for the chart. holder_user and holder_s
-- are the fastest effort, kept here so the map can colour hills cheaply.
CREATE TABLE hills (
  id TEXT PRIMARY KEY,
  key TEXT NOT NULL,
  name TEXT NOT NULL,
  mode TEXT NOT NULL,
  line TEXT NOT NULL,
  profile TEXT,
  gain_m REAL NOT NULL,
  length_m REAL NOT NULL,
  grade REAL NOT NULL,
  start_lat REAL NOT NULL,
  start_lng REAL NOT NULL,
  end_lat REAL NOT NULL,
  end_lng REAL NOT NULL,
  holder_user TEXT,
  holder_s REAL,
  created_at INTEGER NOT NULL
);
CREATE UNIQUE INDEX hills_key ON hills (key);
CREATE INDEX hills_area ON hills (mode, start_lat, start_lng);
CREATE INDEX hills_holder ON hills (holder_user);

-- One row per hill climbed in an activity (the best pass in that activity).
-- took_crown is 1 when this effort made the player the holder.
CREATE TABLE hill_efforts (
  id TEXT PRIMARY KEY,
  hill_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  activity_id TEXT NOT NULL,
  seconds REAL NOT NULL,
  took_crown INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL
);
CREATE INDEX hill_efforts_board ON hill_efforts (hill_id, seconds);
CREATE INDEX hill_efforts_user ON hill_efforts (user_id, hill_id);
CREATE INDEX hill_efforts_activity ON hill_efforts (activity_id);
