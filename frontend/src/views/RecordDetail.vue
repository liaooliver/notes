<script setup>
import { ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { fetchRecord } from '../store.js'
import { formatFixRecord } from '../utils/formatFixRecord.js'

const route = useRoute()
const record = ref(null)
const error = ref('')

// 直接貼網址進來（/records/1）時列表根本沒載過，所以這頁自己跟 API 要那一筆。
// immediate: true = 一掛載就跑一次，不用再寫 onMounted。
watch(
  () => route.params.id,
  async (id) => {
    try {
      record.value = await fetchRecord(id)
      error.value = ''
    } catch (e) {
      record.value = null
      error.value = '找不到這筆紀錄'
    }
  },
  { immediate: true },
)
</script>

<template>
  <p v-if="record">{{ formatFixRecord(record.date, record.title) }}</p>
  <p v-else-if="error">{{ error }}</p>
  <p v-else>載入中…</p>
</template>
