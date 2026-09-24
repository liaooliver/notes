<script setup>
import { ref } from 'vue'
import { RouterLink } from 'vue-router'
import { records, addRecord } from '../store.js'
import { formatFixRecord } from '../utils/formatFixRecord.js'

const date = ref('')
const title = ref('')

function onSubmit() {
  addRecord(date.value, title.value)
  date.value = ''
  title.value = ''
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

  <ul>
    <li v-for="record in records" :key="record.id">
      <RouterLink :to="`/records/${record.id}`">
        {{ formatFixRecord(record.date, record.title) }}
      </RouterLink>
    </li>
  </ul>
</template>
