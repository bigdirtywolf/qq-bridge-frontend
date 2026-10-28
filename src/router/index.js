import { createRouter, createWebHistory } from 'vue-router'

const routes = [
  {
    path: '/',
    name: 'Layout',
    component: () => import('@/components/Layout.vue'),
    redirect: '/main',
    children: [{
      path: '/main',
      name: 'Main',
      component: () => import('@/views/Main.vue'),
      meta: {
        title: '主页'
      }
    }]
  },
  {
    path: '/404',
    name: '404',
    component: () => import('@/views/404.vue'),
    meta: {
      title: '页面不存在',
    }
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'NotFound',
    redirect: '/404'
  },
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
})

export default router
