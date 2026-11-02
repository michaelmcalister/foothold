<script setup>
// Privacy in plain words. Foothold handles location, so this has to be
// clear before anyone records a run. Draft: have it reviewed before launch.
import BrandMark from '../components/BrandMark.vue'
</script>

<template>
  <div class="privacy">
    <header class="top">
      <RouterLink class="brand" to="/"><BrandMark :size="28" /> Foothold</RouterLink>
    </header>
    <main class="body">
      <h1>Your privacy</h1>
      <p class="lede">Foothold is an Australian app. We follow the Privacy Act 1988 and the Australian Privacy Principles. Here's what that means for you, in plain words.</p>

      <h2>What we collect</h2>
      <ul>
        <li><strong>Your routes.</strong> GPS points from runs, walks and rides you record or import, with times. This is how loops and ground are worked out.</li>
        <li><strong>Your name on the map</strong> and the colour you pick.</li>
        <li><strong>Heart rate and cadence</strong>, only if your watch sends them, used to check activities are genuine.</li>
        <li><strong>FormTrack data</strong>, only if you link it: today's session, strength sessions and recovery numbers. You can unlink at any time.</li>
      </ul>

      <h2>What other players see</h2>
      <ul>
        <li>Ground you hold, your name and colour, and your activities' distance and time.</li>
        <li>Never your home. Ground inside your privacy zones is hidden from everyone else, and the start and end of your routes inside a zone are trimmed.</li>
        <li>Never where you are right now. Claims show up after a delay, not live.</li>
        <li>Comments you leave on an activity, with your name, to anyone who can see that activity. Deleting an activity deletes its comments.</li>
        <li>In a private league, the other members see your name, colour and how many hexes you hold and gained this week. Ground inside your privacy zones is never counted.</li>
      </ul>

      <h2>Reports</h2>
      <p>If you report a comment, we keep a copy of it and who reported it so we can review it. The person who wrote it isn't told who reported them.</p>

      <h2>What we never do</h2>
      <ul>
        <li>Sell your data or use it for advertising.</li>
        <li>Publish a heatmap of individual people's routes.</li>
        <li>Share your routes with FormTrack or anyone else unless you turn that on.</li>
      </ul>

      <h2>Where it's kept</h2>
      <p>On Cloudflare's network, with data kept in Australia where the service allows. In the practice map (before you sign in), everything stays on your device.</p>

      <h2>Run recaps</h2>
      <p>When you watch a recap, the 3D map comes from Google Maps. Your phone asks Google for the imagery of the area the camera shows, the same as any map. Your track is drawn on your phone. We don't send Google your name, your account or your track as a file. Google's privacy policy covers what it does with map requests.</p>

      <h2>Spotify and the voice coach</h2>
      <p>If you connect Spotify, Foothold can see your playlists and start, pause and turn down music on your devices. The Spotify sign-in is kept on your phone, not on our servers, and we don't see your listening history. The voice coach uses the voices built into your phone or browser. Some of these, like Google's online voices in Chrome, are made by the browser's maker, which then sees the words spoken (your distance and pace), not who you are to Foothold.</p>

      <h2>Your choices</h2>
      <ul>
        <li>Download everything we hold about you from Settings.</li>
        <li>Delete an activity, or your whole account, at any time.</li>
        <li>Questions or a complaint: email privacy@formtrack.com.au. If you're not happy with our answer you can contact the OAIC.</li>
      </ul>
      <p class="small muted">Last updated 1 November 2026. This is a draft for review before launch.</p>
    </main>
  </div>
</template>

<style scoped>
.top { padding: 18px var(--gutter); }
.brand { display: inline-flex; align-items: center; gap: 10px; font-weight: 800; font-stretch: 112%; font-size: 1.15rem; text-decoration: none; color: var(--ink); }
.body { padding: 8px var(--gutter) 64px; max-width: 70ch; display: grid; gap: 14px; }
h1 { font-size: clamp(2.2rem, 6vw, 3.2rem); font-weight: 850; font-stretch: 112%; letter-spacing: -0.02em; }
h2 { font-size: 1.35rem; font-weight: 800; margin-top: 14px; }
.lede { font-size: 1.15rem; color: var(--ink-60); }
ul { margin: 0; padding-left: 20px; display: grid; gap: 8px; }
.small { font-size: 0.9rem; }
.muted { color: var(--ink-60); }
</style>
