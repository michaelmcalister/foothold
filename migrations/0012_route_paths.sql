-- Planned routes keep the points you drew (so a route snapped to paths can be
-- edited by dragging those points again) and the metres it climbs (for the
-- climb filter). Add only. waypoints is JSON [[lng, lat], ...].
ALTER TABLE routes ADD COLUMN waypoints TEXT;
ALTER TABLE routes ADD COLUMN climb_m INTEGER;
