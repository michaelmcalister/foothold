-- Social features: comments on activities, reports for review, ground swaps between rivals, and private leagues.
-- Only adds tables. Times are epoch milliseconds.

CREATE TABLE comments (
  id TEXT PRIMARY KEY,
  activity_id TEXT NOT NULL,
  user_id TEXT NOT NULL,                -- who wrote it
  text TEXT NOT NULL,                   -- tidied and filtered, max 280 characters
  at INTEGER NOT NULL
);
CREATE INDEX comments_activity ON comments (activity_id, at);
CREATE INDEX comments_user ON comments (user_id);

-- A member flagged a comment. The owner reviews these by hand.
CREATE TABLE reports (
  id TEXT PRIMARY KEY,
  comment_id TEXT NOT NULL,
  activity_id TEXT NOT NULL,
  reporter TEXT NOT NULL,
  author TEXT NOT NULL,
  text TEXT NOT NULL,                   -- copy of the comment, so a deleted comment can still be reviewed
  reason TEXT,
  status TEXT NOT NULL DEFAULT 'open',  -- open, kept, removed
  at INTEGER NOT NULL
);
CREATE UNIQUE INDEX reports_once ON reports (comment_id, reporter);
CREATE INDEX reports_status ON reports (status, at);

-- Hexes one player took from another in one activity, for the rivals list
CREATE TABLE swaps (
  activity_id TEXT NOT NULL,
  mode TEXT NOT NULL,
  taker TEXT NOT NULL,
  loser TEXT NOT NULL,
  n INTEGER NOT NULL,
  at INTEGER NOT NULL,
  PRIMARY KEY (activity_id, loser)
);
CREATE INDEX swaps_taker ON swaps (taker, at);
CREATE INDEX swaps_loser ON swaps (loser, at);

CREATE TABLE leagues (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,            -- 6 character invite code
  created_by TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE TABLE league_members (
  league_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  joined_at INTEGER NOT NULL,
  PRIMARY KEY (league_id, user_id)
);
CREATE INDEX league_members_user ON league_members (user_id);
