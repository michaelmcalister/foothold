-- Push notifications (worker/push.js). One row per phone or browser that
-- said yes. kind: web (a browser's push endpoint and keys) or fcm (a
-- Firebase token for the iPhone and Android apps). Notifications gain
-- pushed_at, set when a notice went out as a push (or was folded into one).
CREATE TABLE push_subs (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  kind TEXT NOT NULL,
  endpoint TEXT NOT NULL,
  p256dh TEXT,
  auth TEXT,
  platform TEXT,
  created_at INTEGER NOT NULL,
  last_ok INTEGER,
  fails INTEGER NOT NULL DEFAULT 0
);
CREATE UNIQUE INDEX push_subs_endpoint ON push_subs (endpoint);
CREATE INDEX push_subs_user ON push_subs (user_id);
ALTER TABLE notifications ADD COLUMN pushed_at INTEGER;
CREATE INDEX notifications_unpushed ON notifications (pushed_at, at);
