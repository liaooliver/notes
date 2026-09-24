<script setup>
import { RouterLink, RouterView } from 'vue-router'
</script>

<template>
  <h1>Try Demo</h1>
  <nav><RouterLink to="/">← 回列表</RouterLink></nav>
  <!-- 路由對到哪個 component，就畫在這裡 -->
  <RouterView />
</template>
