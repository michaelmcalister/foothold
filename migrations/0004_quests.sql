-- Weekly quests, the explored map and weekly recaps: the hexes each activity passed through, and a log of hexes rivals took from each player.
-- Only adds a column and a table. Both are personal data, owner only.

ALTER TABLE activities ADD COLUMN visited TEXT;  -- JSON list of H3 res-10 ids the track passed through; goes when the activity is deleted

CREATE TABLE hex_losses (
  user_id TEXT NOT NULL,                -- who lost the hex
  mode TEXT NOT NULL,
  h3 TEXT NOT NULL,
  at INTEGER NOT NULL,
  by_user TEXT NOT NULL                 -- who took it
);
CREATE INDEX hex_losses_user ON hex_losses (user_id, at);
CREATE INDEX hex_losses_by ON hex_losses (by_user);
