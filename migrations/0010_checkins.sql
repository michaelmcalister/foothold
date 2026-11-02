-- Post-run check-ins ("How did that feel?"): how a run felt and anything that hurt, on the activity itself. Add only.
-- feel: '1' easy, '2' comfortable, '3' hard work, '4' very hard, '5' all out, or 'hurt'.
-- hurt: JSON { area, level } when something hurt. checkin_at: when it was answered or dismissed (dismissed leaves feel NULL).

ALTER TABLE activities ADD COLUMN feel TEXT;
ALTER TABLE activities ADD COLUMN hurt TEXT;
ALTER TABLE activities ADD COLUMN checkin_at INTEGER;
