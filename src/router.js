// Routes. Hash history so deep links work on GitHub Pages without server rewrites.
import { createRouter, createWebHashHistory } from 'vue-router'
import Landing from './views/Landing.vue'

export const router = createRouter({
  history: createWebHashHistory(import.meta.env.BASE_URL),
  scrollBehavior: () => ({ top: 0 }),
  routes: [
    { path: '/', name: 'landing', component: Landing },
    { path: '/privacy', name: 'privacy', component: () => import('./views/Privacy.vue') },
    {
      path: '/app',
      component: () => import('./app/AppShell.vue'),
      children: [
        { path: '', name: 'map', component: () => import('./views/app/MapView.vue') },
        { path: 'record', name: 'record', component: () => import('./views/app/RecordView.vue'), meta: { full: true } },
        { path: 'result/:id', name: 'result', component: () => import('./views/app/ResultView.vue'), meta: { full: true } },
        { path: 'activity/:id', name: 'activity', component: () => import('./views/app/ActivityView.vue') },
        { path: 'battles', name: 'battles', component: () => import('./views/app/BattlesView.vue') },
        { path: 'coach', name: 'coach', component: () => import('./views/app/CoachView.vue') },
        { path: 'you', name: 'you', component: () => import('./views/app/YouView.vue') },
        { path: 'settings', name: 'settings', component: () => import('./views/app/SettingsView.vue') },
        { path: 'notifications', name: 'notifications', component: () => import('./views/app/NotificationsView.vue') },
        { path: 'clubs', name: 'clubs', component: () => import('./views/app/ClubsView.vue') },
        { path: 'welcome', name: 'onboarding', component: () => import('./views/app/OnboardingView.vue'), meta: { full: true } },
      ],
    },
    { path: '/:pathMatch(.*)*', redirect: '/' },
  ],
})
