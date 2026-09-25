<script setup>
import { onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { records, addRecord, fetchRecords } from '../store.js'
import { formatFixRecord } from '../utils/formatFixRecord.js'

const date = ref('')
const title = ref('')
const error = ref('')

// 資料不再寫死在前端，開頁時跟 API 要
onMounted(() => load())

async function load() {
  try {
    await fetchRecords()
    error.value = ''
  } catch (e) {
    error.value = `讀不到資料：${e.message}`
  }
}

async function onSubmit() {
  try {
    await addRecord(date.value, title.value)
    date.value = ''
    title.value = ''
    error.value = ''
  } catch (e) {
    error.value = `新增失敗：${e.message}`
  }
}
</script>

<template>
  <h2>add fix record</h2>

  <!-- .prevent 就是原本手寫的 event.preventDefault() -->
  <form @submit.prevent="onSubmit">
    <input type="date" v-model="date" required>
    <input type="text" v-model="title" placeholder="fix title" required>
    <button type="submit">Add</button>
  </form>

  <p v-if="error">{{ error }}</p>

  <ul>
    <li v-for="record in records" :key="record.id">
      <RouterLink :to="`/records/${record.id}`">
        {{ formatFixRecord(record.date, record.title) }}
      </RouterLink>
    </li>
  </ul>
</template>
