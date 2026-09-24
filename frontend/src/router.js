import { createRouter, createWebHistory } from 'vue-router'

export default createRouter({
  // 必須 history 模式。hash 模式網址是 /#/records/1，# 後面不會送到 server，
  // nginx 永遠只收到 /，Phase 8 的 SPA fallback 就沒東西可練了。
  history: createWebHistory(),
  routes: [
    { path: '/', component: () => import('./views/RecordList.vue') },
    { path: '/records/:id', component: () => import('./views/RecordDetail.vue') },
  ],
})
