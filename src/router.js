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
        { path: 'plan', name: 'plan', component: () => import('./views/app/PlanView.vue'), meta: { full: true } },
        { path: 'record', name: 'record', component: () => import('./views/app/RecordView.vue'), meta: { full: true } },
        { path: 'result/:id', name: 'result', component: () => import('./views/app/ResultView.vue'), meta: { full: true } },
        { path: 'wrapped', name: 'wrapped', component: () => import('./views/app/WrappedView.vue'), meta: { full: true } }, // Foothold Wrapped, your year in review
        { path: 'recap/:id', name: 'recap', component: () => import('./views/app/RecapView.vue'), meta: { full: true } },
        { path: 'activity/:id', name: 'activity', component: () => import('./views/app/ActivityView.vue') },
        { path: 'battles', name: 'battles', component: () => import('./views/app/BattlesView.vue') },
        { path: 'coach', name: 'coach', component: () => import('./views/app/CoachView.vue') },
        { path: 'you', name: 'you', component: () => import('./views/app/YouView.vue') },
        { path: 'fitness', name: 'fitness', component: () => import('./views/app/FitnessView.vue') },
        { path: 'week', name: 'week', component: () => import('./views/app/WeekView.vue') },
        { path: 'admin', name: 'admin', component: () => import('./views/app/AdminView.vue') }, // the owner's admin page (worker/admin.js)
        { path: 'settings', name: 'settings', component: () => import('./views/app/SettingsView.vue') },
        { path: 'notifications', name: 'notifications', component: () => import('./views/app/NotificationsView.vue') },
        { path: 'hill/:id', name: 'hill', component: () => import('./views/app/HillView.vue') },
        { path: 'strongholds/:id?', name: 'strongholds', component: () => import('./views/app/StrongholdsView.vue') },
        { path: 'clubs', name: 'clubs', component: () => import('./views/app/ClubsView.vue') },
        { path: 'rivals', name: 'rivals', component: () => import('./views/app/RivalsView.vue') },
        { path: 'leagues', name: 'leagues', component: () => import('./views/app/LeaguesView.vue') },
        { path: 'leagues/join/:code', name: 'league-join', component: () => import('./views/app/LeaguesView.vue') },
        { path: 'leagues/:id', name: 'league', component: () => import('./views/app/LeagueView.vue') },
        // "Try it now": a demo run's flyover and full report, then sign up. No account needed.
        { path: 'try', name: 'try', component: () => import('./views/try/TryView.vue'), meta: { full: true } },
        { path: 'try/flyover', name: 'try-flyover', component: () => import('./views/app/RecapView.vue'), props: { id: 'demo', trial: true }, meta: { full: true } },
        { path: 'try/report', name: 'try-report', component: () => import('./views/try/TryReport.vue'), meta: { full: true } },
        { path: 'welcome', name: 'onboarding', component: () => import('./views/app/OnboardingView.vue'), meta: { full: true } },
      ],
    },
    { path: '/try', redirect: '/app/try' },
    { path: '/try/:rest(.*)', redirect: (to) => `/app/try/${to.params.rest}` },
    { path: '/:pathMatch(.*)*', redirect: '/' },
  ],
})
