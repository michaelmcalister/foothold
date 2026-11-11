<script setup>
// Root: the startup animation (once per session, or ?intro=1), the first-open
// permissions explainer in the apps (PermissionsIntro), then the routes.
import { ref } from 'vue'
import IntroScreen from './components/IntroScreen.vue'
import PermissionsIntro from './components/PermissionsIntro.vue'
import { shouldExplainPermissions } from './lib/permissions.js'

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
// The first time the app opens: explain and ask for each permission up front
const showPerms = ref(shouldExplainPermissions())

function introDone() {
  showIntro.value = false
  viewKey.value++ // replay the landing map now that it's visible
}
</script>

<template>
  <IntroScreen v-if="showIntro" @done="introDone" />
  <PermissionsIntro v-else-if="showPerms" @done="showPerms = false" />
  <RouterView :key="viewKey" />
</template>
