-- Capture the story (worker/storyflags.js): finishing a story episode at its
-- real place plants your flag there, once per episode per player.
CREATE TABLE story_flags (
  user_id TEXT NOT NULL,
  mission_id TEXT NOT NULL,
  activity_id TEXT NOT NULL,
  at INTEGER NOT NULL,
  PRIMARY KEY (user_id, mission_id)
);
CREATE INDEX story_flags_mission ON story_flags (mission_id, at);

-- Group runs (worker/groups.js): two to six friends run the same episode at
-- the same time from wherever they are, and vote on the choices together.
CREATE TABLE run_groups (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL,
  host TEXT NOT NULL,
  mission_id TEXT NOT NULL,
  start_at INTEGER,
  created_at INTEGER NOT NULL
);
CREATE UNIQUE INDEX run_groups_code ON run_groups (code);
CREATE TABLE run_group_members (
  group_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  joined_at INTEGER NOT NULL,
  surges INTEGER NOT NULL DEFAULT 0,
  done INTEGER NOT NULL DEFAULT 0,
  seen_at INTEGER NOT NULL,
  PRIMARY KEY (group_id, user_id)
);
CREATE INDEX run_group_members_user ON run_group_members (user_id);
CREATE TABLE run_group_votes (
  group_id TEXT NOT NULL,
  choice_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  pick TEXT NOT NULL,
  at INTEGER NOT NULL,
  PRIMARY KEY (group_id, choice_id, user_id)
);
