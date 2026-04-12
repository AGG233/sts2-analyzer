import { createRouter, createWebHashHistory } from 'vue-router'

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    {
      path: '/',
      name: 'home',
      component: () => import('../views/HomeView.vue'),
    },
    {
      path: '/run/:seed',
      name: 'run',
      component: () => import('../views/RunDetailView.vue'),
      props: true,
    },
  ],
  scrollBehavior(to, from) {
    if (to.name === 'home') {
      const y = Number.parseInt(sessionStorage.getItem('homeScrollY') ?? '0', 10)
      sessionStorage.removeItem('homeScrollY')
      return { top: y, behavior: 'instant' as const }
    }
    if (from.name === 'home') {
      sessionStorage.setItem('homeScrollY', String(window.scrollY))
    }
    return { top: 0 }
  },
})

export default router
