<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { records } from '../store.js'
import { formatFixRecord } from '../utils/formatFixRecord.js'

const route = useRoute()
// 網址上的 :id 一律是字串，records 裡是數字，要轉過再比
const record = computed(() => records.find((r) => String(r.id) === route.params.id))
</script>

<template>
  <p v-if="record">{{ formatFixRecord(record.date, record.title) }}</p>
  <p v-else>找不到這筆紀錄</p>
</template>
