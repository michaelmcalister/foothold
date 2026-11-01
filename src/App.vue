<script setup>
// Root: the startup animation (once per session, or ?intro=1), then the routes.
import { ref } from 'vue'
import IntroScreen from './components/IntroScreen.vue'

function shouldShowIntro() {
  if (new URLSearchParams(location.search).has('intro')) return true
  try {
    if (sessionStorage.getItem('fh-intro-seen')) return false
    sessionStorage.setItem('fh-intro-seen', '1')
  } catch { /* storage blocked: just play it */ }
  return true
}
const showIntro = ref(shouldShowIntro())
const viewKey = ref(0)

function introDone() {
  showIntro.value = false
  viewKey.value++ // replay the landing map now that it's visible
}
</script>

<template>
  <IntroScreen v-if="showIntro" @done="introDone" />
  <RouterView :key="viewKey" />
</template>
