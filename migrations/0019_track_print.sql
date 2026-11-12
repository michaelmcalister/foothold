-- A fingerprint of each activity's line (worker/validate.js trackPrint), so
-- the same track can't take ground twice: a saved run replayed, or someone
-- else's GPX uploaded as your own. Saving the same run again (a retry after
-- the network dropped) returns the one already saved.
ALTER TABLE activities ADD COLUMN print TEXT;
CREATE INDEX IF NOT EXISTS idx_activities_print ON activities(print);
