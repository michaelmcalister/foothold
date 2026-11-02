-- Seasons, hot spots and crests: a player's crest, how often each hex changes hands, and which seasons have had their soft reset.
-- Only adds tables and columns. Times are epoch milliseconds.

ALTER TABLE users ADD COLUMN crest TEXT;                               -- one of src/lib/crests.js, null for the default

ALTER TABLE cells ADD COLUMN flips INTEGER NOT NULL DEFAULT 0;         -- times this hex was taken from its owner
ALTER TABLE cells ADD COLUMN last_flip INTEGER;                        -- when it last changed hands
ALTER TABLE cells ADD COLUMN recent_flips INTEGER NOT NULL DEFAULT 0;  -- flips since it last had 30 quiet days
ALTER TABLE cells ADD COLUMN season_reset TEXT;                        -- id of the last season whose soft reset touched it
CREATE INDEX cells_flip ON cells (mode, last_flip);

CREATE TABLE season_resets (
  season_id TEXT PRIMARY KEY,           -- '2026-12' is the summer that starts in December 2026
  starts_at INTEGER NOT NULL,
  applied_at INTEGER NOT NULL,
  cells INTEGER NOT NULL DEFAULT 0      -- hexes softened; 0 for the season the feature went live in
);
