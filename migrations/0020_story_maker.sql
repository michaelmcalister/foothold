-- The Story Maker (worker/storymaker.js): stories written around real
-- landmarks, a chapter at a time, kept so others can run them. Only public
-- landmark names and places are stored, never where anyone started or ran.
CREATE TABLE IF NOT EXISTS made_stories (
  id TEXT PRIMARY KEY,
  maker TEXT NOT NULL,
  title TEXT,
  mood TEXT NOT NULL,
  target_km REAL NOT NULL,
  area TEXT NOT NULL,          -- rounded to about a kilometre
  area_lat REAL NOT NULL,
  area_lng REAL NOT NULL,
  suburb TEXT,
  area_history TEXT,           -- the area's Wikipedia summary, if any (JSON)
  places TEXT NOT NULL,        -- the public landmarks the story can use (JSON)
  first_stop TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft', -- draft, shared or hidden
  plays INTEGER NOT NULL DEFAULT 0,
  finishes INTEGER NOT NULL DEFAULT 0,
  reports INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  shared_at INTEGER
);
CREATE INDEX IF NOT EXISTS idx_made_stories_area ON made_stories(status, area_lat, area_lng);
CREATE INDEX IF NOT EXISTS idx_made_stories_maker ON made_stories(maker);

-- One chapter per path through a story (the stops so far, joined by >)
CREATE TABLE IF NOT EXISTS made_chapters (
  story_id TEXT NOT NULL,
  path TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  PRIMARY KEY (story_id, path)
);

CREATE TABLE IF NOT EXISTS made_reports (
  story_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  at INTEGER NOT NULL,
  PRIMARY KEY (story_id, user_id)
);
