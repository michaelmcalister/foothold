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

## Seasons

The year runs in four seasons that follow the Australian ones, in Sydney
time: **summer** (Dec to Feb), **autumn** (Mar to May), **winter** (Jun to
Aug) and **spring** (Sep to Nov). Each starts at midnight in Sydney on the
1st. A season's id is its first month (`2026-12` is Summer 2026/27).
Code: `seasons.js`. Tests: `test/seasons.test.js`.

- **Season board:** ranks players by ground gained this season, the hexes
  they claimed or took (from activities that started in the season). Someone
  who starts in the last month can still top it. The all time board (hexes
  held right now) stays.
- **Soft reset:** at the start of each season every held hex keeps **half**
  its strength, but the reset never takes a hex below **10** (ground already
  under 10 is left as it is), so nobody's ground goes wild because of it. The
  stored strength is scaled, so fading carries on from the same last visit.
  Ground is easier to take early in a season, and a big lead from last
  season shrinks but doesn't vanish. Wild hexes, hexes visited since the
  season began and hexes already softened this season are skipped.
- **Once only:** each hex records the season that softened it. The server
  runs the reset in the hourly cron and marks the season done in
  `season_resets` when no hexes are left (a big map takes a few runs). The
  practice map does the same in its tick. When seasons first switch on, the
  season under way is noted and nothing is softened.
- **Summary:** early in a new season (the first 21 days) each player who
  gained ground last season sees it once: ground gained, their place, and a
  badge for taking part: Scout (1+), Pathfinder (25+), Trailblazer (100+),
  Vanguard (300+). There is no badge for losing.

## Hot spots

Each hex counts how often it changed hands (`flips`, taken by a rival; a
wild claim isn't a flip) and when it last did (`lastFlip`). Its heat is the
number of flips since it last had 30 quiet days, and it drops to 0 after 30
days without one. The Hot spots map shades by heat, and the hottest areas
nearby group hexes into H3 resolution 8 areas (about 0.7 km²). Code:
`hotspots.js`.

## The ladder

Foothold (1 hex), Outpost (60), Stronghold (250), Fortress (800), per map.

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

## Explored ground

Every hex your track passes through is explored, whether or not you closed a
loop. Gaps between GPS points are filled in every 50 m; a jump of more than
2 km is treated as a GPS gap. The map's Explored view dims everywhere else and
shows how much of the ground within 5 km of you you've been through.

## Weekly quests

Each week (Monday to Sunday, Sydney time) brings three quests, sized from your
last four weeks so they are within reach: take new hexes, close loops, get out
a few times, explore new hexes, go somewhere new, hold ground all week, take
back ground a rival took, or take ground from a rival. A hold quest is settled
when the week ends. Missing a quest costs nothing; next week brings new ones.
