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
        <li><strong>Routes you plan.</strong> The name, type and line of routes you save in the planner, and the day and time you plan them for. Only you can see them, and you can delete them any time.</li>
        <li><strong>Routes you send.</strong> When you send a route to someone, we copy its name, type, line, distance and any day and time to them, and tell them who sent it. You can only send routes to people in your clubs and leagues. Their copy stays the same if you change or delete yours. They can hide it, and deleting your account removes the copies you sent.</li>
        <li><strong>Your name on the map</strong> and the colour and crest you pick.</li>
        <li><strong>Heart rate and cadence</strong>, only if your watch sends them, used to check activities are genuine.</li>
        <li><strong>FormTrack data</strong>, only if you link it: today's session, strength sessions and recovery numbers. You can unlink at any time. To show your readiness over time, the app keeps one readiness score a day on your device only, and clears it when you unlink.</li>
        <li><strong>Your times up hills</strong> (King of the hill): when an activity climbs a hill, we keep how long the climb took, which activity it was and when. Delete the activity and its times go.</li>
        <li><strong>Story ideas you send</strong>, only if you use "Know a local story?": the place and story you type, and, only if you tick the box, roughly where you are (rounded to about a kilometre). They're kept with your feedback, so you can download them, and deleting your account deletes them. The Foothold team reads them, and marks each one approved or not. An approved idea is used to research the place and write a story about it. The story never names you or says where you live.</li>
        <li><strong>How a run felt</strong>, only if you answer "How did that feel?" after a run: how hard it was, and where something hurt and how badly. It is saved with that activity, only you see it, and the coach uses it to ease your plan. Delete the activity and it goes too.</li>
      </ul>

      <h2>What other players see</h2>
      <ul>
        <li>Ground you hold, your name, colour and crest, and your activities' distance and time.</li>
        <li>Never your home. Ground inside your privacy zones is hidden from everyone else, and the start and end of your routes inside a zone are trimmed.</li>
        <li>Never where you are right now. Claims show up after a delay, not live.</li>
        <li>Comments you leave on an activity, with your name, to anyone who can see that activity. Deleting an activity deletes its comments.</li>
        <li>In a private league, the other members see your name, colour and how many hexes you hold and gained this week. Ground inside your privacy zones is never counted.</li>
        <li>On hills (King of the hill), your name, colour and best time up each hill you've climbed, on that hill's top 10. The fastest person's colour lights up the ground around the hill on the map. The first person up a new hill gives it its line: a simplified shape of the climb, never the rest of the activity. A climb that starts, ends or passes through one of your privacy zones never makes a hill and never counts.</li>
        <li>People in your clubs and leagues see your name, colour and crest when they choose who to send a route to. A route you send goes only to the people you pick.</li>
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
      <p>On Cloudflare's network, with data kept in Australia where the service allows. In the practice map (before you sign in), everything stays on your device. When you sign up, we ask whether to move your practice runs to your account; they only move if you say yes. Made-up practice loops never move.</p>

      <h2>Run recaps</h2>
      <p>When you watch a recap, the 3D map comes from Google Maps. Your phone asks Google for the imagery of the area the camera shows, the same as any map. Your track is drawn on your phone. We don't send Google your name, your account or your track as a file. Google's privacy policy covers what it does with map requests.</p>
      <p>When you turn on Terrain on the map, your phone fetches hill shading for the area on screen from the open elevation tiles Amazon Web Services hosts, the same way it fetches the street map. They see a request for that area, not who you are.</p>
      <p>When you make a reel from a recap, your phone makes the video itself, with the street map. Nothing is uploaded: the video stays on your phone until you share or save it. The trail leaves out the start and end of your route inside your privacy zones, and ground inside a zone isn't shown. Your name is only on it if you turn on Show my name.</p>

      <h2>Routes that follow paths</h2>
      <p>When the route planner follows paths, our server asks a routing service for the way between the points you drop: Openrouteservice or Google if we've set one up, otherwise the OpenStreetMap routing service run by FOSSGIS. They get the points and whether it's a run, walk or ride, never your name or account, and they see our server rather than your phone. Turn off Follow paths and nothing is sent.</p>

      <h2>Stories near you</h2>
      <p>When you tap Find stories near me, your phone asks for your location once and works out how far away each story is set. That all happens on your phone: your location isn't sent to us or kept.</p>

      <h2>Ghost runs</h2>
      <p>When you race a ghost, it's one of your own past runs, or a route at a pace you pick. The result and the ghost's line are kept on your phone so the recap can show both of you. Nothing about it is sent anywhere.</p>

      <h2>Elevation charts</h2>
      <p>To draw the hills on your run report, Foothold looks up ground heights from Open-Meteo, a weather and terrain service. Your phone never sends them your route. It sends our server the corners of a 100 m grid around your route, and our server asks Open-Meteo for those heights, so they don't see your phone, your name or your account. The heights are kept on your device so a run doesn't need looking up twice. Runs imported from a watch use the watch's own heights instead. To find hills (King of the hill), our server looks up the same grid of heights for each activity you save, the same way, and keeps none of it beyond the hill itself.</p>

      <h2>Spotify and the voice coach</h2>
      <p>If you connect Spotify, Foothold can see your playlists and start, pause and turn down music on your devices. The Spotify sign-in is kept on your phone, not on our servers, and we don't see your listening history. The voice coach's Australian voice is made by ElevenLabs: we send them only the words to say, like "2 kilometres, average pace 5 40 per k", never your name or account. If you pick the phone's own voice instead, it uses the voices built into your phone or browser. Some of these, like Google's online voices in Chrome, are made by the browser's maker, which then sees the words spoken (your distance and pace), not who you are to Foothold.</p>

      <h2>Plans built with AI</h2>
      <p>If you choose "Build it with AI" in the coach, what you type and a summary of your recent running (weekly distances, longest run, run count, estimated paces, your current goal and whether FormTrack is linked) go to Anthropic's Claude to set up your plan. We never send your name, email, account, routes or where you run. We ask before the first time, and remember your answer on your device. We don't keep what you typed on our servers, and it isn't used for anything else. Anthropic's commercial terms cover how it handles that data. The plan and its explanation are saved with your plan, like any other plan, and you can download or delete them. Plans built this way are labelled as built with AI and aren't medical advice.</p>

      <h2>Your choices</h2>
      <ul>
        <li>Download everything we hold about you from Settings.</li>
        <li>Delete an activity, or your whole account, at any time. Hills stay on the map for everyone without your name, and the next fastest person becomes King of the hill.</li>
        <li>Questions or a complaint: email privacy@formtrack.com.au. If you're not happy with our answer you can contact the OAIC.</li>
      </ul>
      <p class="small muted">Last updated 11 November 2026. This is a draft for review before launch.</p>
    </main>
  </div>
</template>

<style scoped>
.top { padding: calc(18px + env(safe-area-inset-top)) var(--gutter) 18px; }
.brand { display: inline-flex; align-items: center; gap: 10px; font-weight: 800; font-stretch: 112%; font-size: 1.15rem; text-decoration: none; color: var(--ink); }
.body { padding: 8px var(--gutter) 64px; max-width: 70ch; display: grid; gap: 14px; }
h1 { font-size: clamp(2.2rem, 6vw, 3.2rem); font-weight: 850; font-stretch: 112%; letter-spacing: -0.02em; }
h2 { font-size: 1.35rem; font-weight: 800; margin-top: 14px; }
.lede { font-size: 1.15rem; color: var(--ink-60); }
ul { margin: 0; padding-left: 20px; display: grid; gap: 8px; }
.small { font-size: 0.9rem; }
.muted { color: var(--ink-60); }
</style>
