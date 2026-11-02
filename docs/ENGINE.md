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

## Weekly streaks (`streaks.js`)

A streak counts Sydney weeks in a row with at least one outing (any mode,
not rejected). Each finished week with an outing banks one rest week, up to
three. A finished week with no outing spends a rest week ("Rest week used.
Streak kept.") and counts towards the streak; with none banked, the streak
ends. A new streak starts with nothing banked. This week is in progress:
it joins the streak once it has an outing and is never counted as missed.
Milestones at 4, 8, 12, 26 and 52 weeks are celebrated once each. Nothing
ever warns about losing a streak.

## The first week (`firstweek.js`)

For new players (fewer than three outings from before they joined, account
or practice map under 14 days old): 1) plant your first flag (the first
outing that closes a loop; the suggested loop is 1.2 to 2 km walking, 2 to 3
km running), 2) come back for more (any outing after it, aiming for within
4 days), 3) hold your ground (a third outing, aiming for the first 10 days).
A missed aim never fails a step; it stretches ("No rush. Whenever you're
ready."). All three earn the Founding foothold badge, kept for good.
## Weekly divisions

Six tiers: **Scout, Pathfinder, Ranger, Warden, Sentinel, Marshal**. Everyone
starts as a Scout. Code: `divisions.js`. Tests: `test/divisions.test.js`.

- **Who plays:** anyone with an outing in the last **14 days** is placed each
  Monday (Sydney). Divisions count **every map** together (run, walk and
  ride), so the `mode` column is `all`; it is kept for per-map divisions later.
- **Grouping:** same tier only, about **20** a division (never more than 25).
  Within a tier players are sorted by last week's score so each division is
  evenly matched. A city (H3 resolution 4 cell of the last outing) with 15 or
  more players at a tier gets divisions of its own; the rest share.
- **Late joiners** (a first outing mid-week, or back after a break) go into a
  division of their tier with room, their city first, else a new one.
- **Score:** 1 point for each hex claimed or taken that week, plus **10** for
  each outing, up to 5 outings. Frequency matters as much as big loops.
- **End of the week:** the top **5** who scored move up one tier. Ties share
  a rank, so a tie for 5th moves everyone on it up. **Nobody moves down**, and
  a week without an outing leaves you where you are. Marshal is the top.
- **Words:** "You're in a new Pathfinder division this week. Top 5 move up."
  and "You moved up to Ranger." Never anything about dropping or falling behind.
