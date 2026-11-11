-- The admin page's review of story ideas (and other feedback): approved
-- ideas are picked up by the story builder, which marks them built.
-- status: NULL (waiting), approved, declined, built. note: the owner's
-- direction for the writer. mission: the episode id once it's built.
ALTER TABLE feedback ADD COLUMN status TEXT;
ALTER TABLE feedback ADD COLUMN note TEXT;
ALTER TABLE feedback ADD COLUMN reviewed_at INTEGER;
ALTER TABLE feedback ADD COLUMN mission TEXT;
CREATE INDEX feedback_kind ON feedback (kind, at);
