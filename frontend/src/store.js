import { reactive } from 'vue'

// reactive = 這個陣列變動時，用到它的畫面會自動重畫。
// 資料只在記憶體，重整就沒了 —— 跟原本那版一樣。Phase 9 接 API 才會存下來。
export const records = reactive([
  { id: 1, date: '2026-09-17', title: 'Fix login bug' },
])

let nextId = 2

export function addRecord(date, title) {
  records.push({ id: nextId++, date, title })
}
