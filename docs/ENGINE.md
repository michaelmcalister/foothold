# The rules of the map

Everything here lives in `src/lib/engine/` and is shared by the app and the
Worker, so the rules are the same everywhere. Tests: `test/engine.test.js`.

## Loops

A loop closes when your route comes back within **30 m** of an earlier point
after at least **400 m**. It must enclose at least **8,000 m²** and be a
real shape, not a sliver: an out-and-back on two sides of one street
doesn't count (compactness 4πA/P² of at least 0.1). A run can close several
loops; they don't overlap.

## Hexes

The map is cut into H3 hexes at resolution 10, about 130 m across, roughly
a suburban block. Closing a loop claims every hex inside it, plus the hexes
the loop line runs through. Runs, walks and rides each have their own map.

## Strength

Each activity is worth 8 to 60 points per hex, from distance (with
diminishing returns) and time moving. Walks count 0.85 per km, rides 0.35.

- **Wild hex:** it becomes yours at that strength.
- **Your hex:** it gets stronger, with smaller gains each visit, up to 100.
- **A rival's hex:** you take it only if your effort beats its current
  strength. If not, their hold weakens.

## Fading

Ground holds its strength for **14 days** without a visit, then halves
every **21 days**. Under 5 it goes wild. Holidays don't wipe you out.

## Battles

Taking someone's ground starts a **7 day** battle over those hexes. Whoever
holds more of them at the end wins.

## The ladder

Foothold (1 hex), Outpost (60), Stronghold (250), Fortress (800), per map.

## Personal bests

Every saved run or walk is searched for its fastest continuous 400 m, 1K,
1 mile, 5K, 10K, half marathon and marathon; rides for 10, 20 and 40 km and
the longest ride. Times are elapsed, start to finish, with the start
interpolated inside a GPS fix. The track is split wherever the GPS jumped or
a part was cut out by anti-cheat, so no effort spans a gap, and any effort
averaging over the mode's sustained speed ceiling is ignored. Runs, walks and
rides each keep their own records. (`engine/bests.js`)

## Strongholds

A stronghold is a named closed route. The route is checked every 25 m; an
activity completes it when the track passes within 30 m of at least 90% of
those check points, in order, either way round. On a loop you can join and
leave anywhere, as long as you run a full lap. One effort per activity per
stronghold, timed from the first check point to the last.

The crown goes to whoever has the most efforts in the last **90 days**. A
draw goes to the most recent effort, so matching the holder's count takes it.
There is also a fastest time board (all time). Each map has its own crowns.
(`engine/strongholds.js`)

## Anti-cheat

Speed ceilings per mode (sustained over 30 seconds and in bursts), GPS jumps,
and heart rate that doesn't match pace. Flagged parts are cut out, not the
whole activity, and every flag has a plain-English reason. If more than 30%
is flagged, the activity can't claim ground and can be appealed. Watch
recordings earn more trust than phone recordings.

## Healthy play

The load check compares this week with the average of the four before. Over
30% more gets a gentle question; over 50% suggests a shorter loop that still
takes ground.
