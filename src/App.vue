<script setup>
import HeroMap from './components/HeroMap.vue'
</script>

<template>
  <header class="top">
    <a class="brand" href="#">
      <svg viewBox="0 0 64 64" aria-hidden="true">
        <path d="M32 6 54 19v26L32 58 10 45V19Z" fill="currentColor" />
        <path d="M24 44V22h17M24 33h13" fill="none" stroke="var(--paper)" stroke-width="5"
              stroke-linecap="round" stroke-linejoin="round" />
      </svg>
      Foothold
    </a>
    <a class="top-cta" href="#beta">Join the Sydney beta</a>
  </header>

  <main>
    <section class="hero">
      <div class="hero-copy">
        <h1>Take ground.<br />Hold it.</h1>
        <p class="lede">
          Foothold turns your runs, walks and rides into a game for your suburb.
          Close a loop and every street inside it is yours, until someone runs it back.
        </p>
        <a class="button" href="#beta">Join the Sydney beta</a>
      </div>
      <HeroMap class="hero-map" />
    </section>

    <section class="how" aria-labelledby="how-title">
      <h2 id="how-title">How a run becomes ground</h2>
      <ol class="steps">
        <li>
          <h3>Run a loop</h3>
          <p>Record on your phone or your watch. Head out, wind through your streets and finish where you started.</p>
        </li>
        <li>
          <h3>Claim what's inside</h3>
          <p>The map is cut into small hexes. Close the loop and every hex inside turns your colour, including any a rival held.</p>
        </li>
        <li>
          <h3>Hold it</h3>
          <p>Run the same ground again and it gets stronger. Leave it for a few weeks and it slowly fades back to wild.</p>
        </li>
      </ol>
    </section>

    <section class="legend" aria-labelledby="legend-title">
      <div class="legend-intro">
        <h2 id="legend-title">Reading the map</h2>
        <p>Every colour on the map follows a rule. The rules are there to keep it fair and keep you safe.</p>
      </div>
      <dl>
        <div>
          <dt><span class="swatch you" aria-hidden="true"></span>Your ground</dt>
          <dd>Strength builds with effort. A long run makes a stronger claim than a short stroll, so hard work is hard to steal.</dd>
        </div>
        <div>
          <dt><span class="swatch rival" aria-hidden="true"></span>A rival's ground</dt>
          <dd>Take it and a head-to-head battle starts for a week. Runners, walkers and riders each play on their own map.</dd>
        </div>
        <div>
          <dt><span class="swatch wild" aria-hidden="true"></span>Wild ground</dt>
          <dd>Nobody holds it yet. Quiet suburb? Wild ground still counts, so you always have something to win.</dd>
        </div>
        <div>
          <dt><span class="swatch private" aria-hidden="true"></span>Your privacy zone</dt>
          <dd>Your home is never shown as yours. Claims show up for others after a delay, never live.</dd>
        </div>
      </dl>
    </section>

    <section class="coach" aria-labelledby="coach-title">
      <h2 id="coach-title">A coach that knows the map</h2>
      <p>
        Training for a 5K or a marathon? Foothold's plans pick a loop that hits today's session
        and takes back ground on the way. They build slowly, adjust when you're sick or sore,
        and won't let the game push you past a safe week.
      </p>
      <p class="note">Coaching arrives after the beta, in 2027.</p>
    </section>

    <section id="beta" class="beta" aria-labelledby="beta-title">
      <h2 id="beta-title">Sydney gets the map first</h2>
      <p>
        We're opening Foothold suburb by suburb, starting with Sydney and its run clubs
        in early 2027. Beta sign-ups open soon on this page.
      </p>
    </section>
  </main>

  <footer class="foot">
    <p>Foothold is made in Sydney.</p>
  </footer>
</template>
