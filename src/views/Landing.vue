<script setup>
// The public landing page at the site root. It tells the whole story of
// Foothold: the game, friends, the coach, the run itself, the recap, imports,
// FormTrack, and how it stays fair and private. The drawings are small SVGs
// in components/landing; the hero map is the main moment.
import HeroMap from '../components/HeroMap.vue'
import BrandMark from '../components/BrandMark.vue'
import ModesVignette from '../components/landing/ModesVignette.vue'
import FadeCurve from '../components/landing/FadeCurve.vue'
import BattleVignette from '../components/landing/BattleVignette.vue'
import CrownVignette from '../components/landing/CrownVignette.vue'
import LadderVignette from '../components/landing/LadderVignette.vue'
import SeasonVignette from '../components/landing/SeasonVignette.vue'
import RampVignette from '../components/landing/RampVignette.vue'
import RouteVignette from '../components/landing/RouteVignette.vue'
import FlyoverVignette from '../components/landing/FlyoverVignette.vue'
import PrivacyVignette from '../components/landing/PrivacyVignette.vue'
import '../components/landing/landing.css'

const chapters = [
  { id: 'game', name: 'The game' },
  { id: 'friends', name: 'Run with friends' },
  { id: 'coach', name: 'The coach' },
  { id: 'run', name: 'On the run' },
  { id: 'after', name: 'After the run' },
  { id: 'history', name: 'Bring your history' },
  { id: 'formtrack', name: 'Strength with FormTrack' },
  { id: 'fair', name: 'Fair and private' },
]

// Hash routing owns the URL, so jump to sections by scrolling instead.
function jump(id) {
  const el = document.getElementById(id)
  if (!el) return
  const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' })
  el.focus({ preventScroll: true })
}

const rivals = [
  { name: 'Sam K', crest: 'gold', won: 4, lost: 2, note: 'Battle on, day 5 of 7' },
  { name: 'Priya', crest: 'gold', won: 1, lost: 3, note: 'Holds the Lake loop crown' },
  { name: 'Jordan Springs Run Club', crest: 'club', won: 2, lost: 2, note: 'Took 12 of your hexes on Saturday' },
]
</script>

<template>
  <div class="landing">
    <header class="top">
      <RouterLink class="brand" to="/">
        <BrandMark :size="30" />
        Foothold
      </RouterLink>
      <a class="top-cta" href="#/app?signin=1">Sign in</a>
    </header>

    <main>
      <section class="hero">
        <div class="hero-copy">
          <h1>Take ground.<br />Hold it.</h1>
          <p class="lede">
            Foothold turns your runs, walks and rides into a game for your suburb.
            Close a loop and every hex inside it turns your colour, until a rival runs it back.
          </p>
          <div class="hero-actions">
            <a class="button" href="#/try">Try a demo run</a>
            <a class="link" href="#/app?signin=1&amp;signup=1">Sign up free</a>
          </div>
          <p class="lp-small">The demo takes a minute and needs no account. Or <a href="#/app">open the practice map</a>.</p>
        </div>
        <HeroMap class="hero-map" />
      </section>

      <nav class="lp-index" aria-label="What's on this page">
        <ul>
          <li v-for="c in chapters" :key="c.id">
            <a :href="`#${c.id}`" @click.prevent="jump(c.id)">{{ c.name }}</a>
          </li>
        </ul>
      </nav>

      <!-- The game -->
      <section id="game" class="lp-chapter" tabindex="-1" aria-labelledby="game-title">
        <header class="lp-head">
          <h2 id="game-title">The game</h2>
          <p>
            The map is cut into hexes about 130 metres across. Finish where you started and
            every hex inside your loop is yours, even the ones a rival held.
          </p>
        </header>

        <div class="lp-pairs">
          <article class="lp-feature">
            <ModesVignette />
            <h3>A map for each way you move</h3>
            <p>Runs, walks and rides each have their own map. A ride can't wipe out a walker's ground, and you can play all three.</p>
          </article>
          <article class="lp-feature">
            <FadeCurve />
            <h3>Ground fades if you leave it</h3>
            <p>Every loop makes your ground stronger. Leave it alone and it holds for 14 days, then halves every three weeks until it goes back to wild.</p>
          </article>
        </div>

        <div class="lp-pairs">
          <article class="lp-feature">
            <BattleVignette />
            <h3>Take ground, start a battle</h3>
            <p>Take someone's hexes and a battle runs for seven days. Whoever holds more of that ground at the end wins it for their record.</p>
          </article>
          <article class="lp-feature">
            <CrownVignette />
            <h3>Strongholds</h3>
            <p>Some loops are named landmarks: a lake, a park, a river lap. Whoever runs one most in 90 days holds the crown.</p>
          </article>
        </div>

        <div class="lp-pairs">
          <article class="lp-feature">
            <LadderVignette />
            <h3>Four levels on each map</h3>
            <p>Hold more ground to climb from Foothold to Outpost, Stronghold and Fortress.</p>
          </article>
          <article class="lp-feature">
            <SeasonVignette />
            <h3>Seasons, the Australian way</h3>
            <p>A new season starts every three months with its own leaderboard. Held ground softens at the start, so someone who joined last week can still win some.</p>
          </article>
        </div>

        <dl class="lp-list">
          <div>
            <dt>Hot spots</dt>
            <dd>A map of the ground that keeps changing hands. Find a fight, or steer clear of one.</dd>
          </div>
          <div>
            <dt>Explored map</dt>
            <dd>Every street you've been down shows clear. The rest sits under fog until you go and look.</dd>
          </div>
          <div>
            <dt>Weekly quests</dt>
            <dd>Three goals each week, sized to what you've done lately. Take back a hex, find a new street, close two loops.</dd>
          </div>
        </dl>
      </section>

      <!-- Friends -->
      <section id="friends" class="lp-chapter lp-split" tabindex="-1" aria-labelledby="friends-title">
        <div>
          <header class="lp-head">
            <h2 id="friends-title">Run with friends</h2>
            <p>Ground means more when you know who took it.</p>
          </header>
          <dl class="lp-list lp-list-single">
            <div>
              <dt>Feed, kudos and comments</dt>
              <dd>See what your friends ran and the ground they took. Give kudos and say something nice.</dd>
            </div>
            <div>
              <dt>Rivals</dt>
              <dd>Everyone you've swapped ground with, and your head to head record against each.</dd>
            </div>
            <div>
              <dt>Clubs and private leagues</dt>
              <dd>Join your run club's map. Start a league for friends or work and share the invite code. The table counts ground gained in the last seven days.</dd>
            </div>
            <div>
              <dt>Crests and colours</dt>
              <dd>Pick your colour and a crest, so everyone knows whose ground it is.</dd>
            </div>
            <div>
              <dt>Leaderboards</dt>
              <dd>Local, club and season boards, for each map.</dd>
            </div>
          </dl>
        </div>

        <figure class="lp-panel" aria-label="An example rivals list">
          <h3 class="lp-panel-title">Your rivals</h3>
          <ul>
            <li v-for="r in rivals" :key="r.name">
              <span class="lp-crest" :class="r.crest" aria-hidden="true"></span>
              <span class="lp-rival">
                <strong>{{ r.name }}</strong>
                <span>{{ r.note }}</span>
              </span>
              <span class="lp-record">{{ r.won }} won<br />{{ r.lost }} lost</span>
            </li>
          </ul>
          <figcaption class="lp-small">An example. Real rivals appear after your first loops.</figcaption>
        </figure>
      </section>

      <!-- Coach -->
      <section id="coach" class="lp-chapter" tabindex="-1" aria-labelledby="coach-title">
        <header class="lp-head">
          <h2 id="coach-title">The coach knows the map</h2>
          <p>Pick a goal and get a plan built from the running you already do.</p>
        </header>

        <div class="lp-pairs">
          <article class="lp-feature">
            <RampVignette />
            <h3>Builds slowly, on purpose</h3>
            <p>Plans for 5K, 10K, half and full marathon, plus base fitness and a run walk plan for coming back from injury. At most 10% more each week, with an easier week every fourth.</p>
          </article>
          <article class="lp-feature">
            <RouteVignette />
            <h3>Find a loop that takes ground</h3>
            <p>Turn today's session into a route near you. Or draw your own in the route planner and see which hexes it would take, and whose, before you head out.</p>
          </article>
        </div>

        <dl class="lp-list">
          <div>
            <dt>Changes when life does</dt>
            <dd>Sick, sore or away? Tell the coach and the week changes. Missed kilometres are never crammed into the next one.</dd>
          </div>
          <div>
            <dt>Paces and predictions</dt>
            <dd>Training paces and race time predictions come from your own runs, and update as you get fitter.</dd>
          </div>
          <div>
            <dt>Coach's notes</dt>
            <dd>A short note after every run on how it went and what comes next.</dd>
          </div>
        </dl>
      </section>

      <!-- On the run -->
      <section id="run" class="lp-chapter lp-ink" tabindex="-1" aria-labelledby="run-title">
        <header class="lp-head">
          <h2 id="run-title">On the run</h2>
          <p>Press start, pocket your phone and listen.</p>
        </header>

        <div class="lp-voice" aria-label="Things the voice coach says">
          <blockquote>"Three kilometres. Five twenty a kilometre. Nice and steady."</blockquote>
          <blockquote class="lp-voice-loop">"80 metres back to your start closes the loop."</blockquote>
        </div>

        <dl class="lp-list">
          <div>
            <dt>Records on your phone</dt>
            <dd>Your phone's GPS draws the route and shows how close you are to closing a loop.</dd>
          </div>
          <div>
            <dt>An Australian voice coach</dt>
            <dd>Updates each kilometre or every few minutes. Turn the encouragement up, down or off.</dd>
          </div>
          <div>
            <dt>Your Spotify</dt>
            <dd>Music starts when you start and turns down while the coach talks. Needs Spotify Premium. On iPhone it pauses for a moment instead.</dd>
          </div>
        </dl>
      </section>

      <!-- After the run -->
      <section id="after" class="lp-chapter lp-split lp-split-media" tabindex="-1" aria-labelledby="after-title">
        <FlyoverVignette class="lp-flyover" />
        <div>
          <header class="lp-head">
            <h2 id="after-title">After the run</h2>
            <p>
              Watch a 3D flyover of your run on Google's photorealistic map. It flies in, follows
              your route, then circles the ground you took. Where the 3D map isn't available,
              the recap plays on a flat street map.
            </p>
          </header>
          <a class="lp-button-quiet" href="#/app/recap/demo">Watch a flyover</a>
          <dl class="lp-list lp-list-single">
            <div>
              <dt>Personal bests</dt>
              <dd>From 400 metres to the marathon on foot, and 10 to 40 kilometres on the bike.</dd>
            </div>
            <div>
              <dt>Weekly recap</dt>
              <dd>Your distance, ground taken and held, and quests done, next to last week.</dd>
            </div>
            <div>
              <dt>Share card</dt>
              <dd>A clean picture of your loop and your ground, ready to post.</dd>
            </div>
          </dl>
        </div>
      </section>

      <div class="lp-duo">
      <!-- History -->
      <section id="history" class="lp-chapter lp-history" tabindex="-1" aria-labelledby="history-title">
        <h2 id="history-title">Bring your history</h2>
        <p class="lp-formats" aria-hidden="true"><span>GPX</span> <span>TCX</span> <span>FIT</span></p>
        <p>
          Import GPX, TCX and FIT files from Garmin, Coros, Wahoo or Apple, or a whole Strava
          export in one go. Old loops are played like new ones, so your history can take ground on day one.
        </p>
      </section>

      <!-- FormTrack -->
      <section id="formtrack" class="lp-chapter lp-formtrack" tabindex="-1" aria-labelledby="formtrack-title">
        <h2 id="formtrack-title">Strength with FormTrack</h2>
        <p>
          FormTrack is our strength training app, and one account signs in to both. Link them and
          strength sessions slot into your running plan. When you need recovery, the coach eases the week.
        </p>
      </section>
      </div>

      <!-- Fair and private -->
      <section id="fair" class="lp-chapter lp-split" tabindex="-1" aria-labelledby="fair-title">
        <div>
          <header class="lp-head">
            <h2 id="fair-title">Fair and private</h2>
            <p>A game on real streets has to be safe to play.</p>
          </header>
          <PrivacyVignette />
        </div>
        <dl class="lp-list lp-list-single">
          <div>
            <dt>Privacy zones</dt>
            <dd>Your home is never shown as yours, and the ends of your route are trimmed from what others see.</dd>
          </div>
          <div>
            <dt>Never live</dt>
            <dd>Your claims show up for others after a delay, so nobody can follow you around.</dd>
          </div>
          <div>
            <dt>Fair play</dt>
            <dd>If a run looks wrong, say too fast for a walk, we tell you why it didn't count. Appeal in one tap.</dd>
          </div>
          <div>
            <dt>Your data is yours</dt>
            <dd>Handled under Australian privacy law. Download it or delete it any time.</dd>
          </div>
          <div>
            <dt>Habits without guilt</dt>
            <dd>No streak shaming and no nagging. Ground fades slowly, so a week off won't cost you your suburb.</dd>
          </div>
        </dl>
      </section>

      <section class="lp-cta" aria-labelledby="cta-title">
        <h2 id="cta-title">Have a run around Penrith</h2>
        <p>
          The practice map needs no account. Penrith and Jordan Springs have local rivals on real loops,
          so you can take some ground and see what happens. Practice runs stay on your device.
        </p>
        <div class="hero-actions">
          <a class="button" href="#/try">Try a demo run</a>
          <a class="link" href="#/app?signin=1&amp;signup=1">Sign up free</a>
          <a class="link" href="#/app">Open the practice map</a>
        </div>
      </section>
    </main>

    <footer class="foot lp-foot">
      <p>Foothold is made in Sydney.</p>
      <p><RouterLink to="/privacy">Privacy</RouterLink> <a href="brand/">Logo concepts</a></p>
    </footer>
  </div>
</template>
