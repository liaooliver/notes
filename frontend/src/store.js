import { reactive } from 'vue'

// 前端只打相對路徑 /api/...，不需要知道後端在哪台機器上。
// 線上是 Ingress 依路徑分流到 notes-api，本機是下面 vite.config.js 的 proxy，
// 兩邊在瀏覽器眼中都是「同一個 origin」，所以完全不用處理 CORS。
export const records = reactive([])

async function json(res) {
  if (!res.ok) throw new Error(`API ${res.status}`)
  return res.json()
}

export async function fetchRecords() {
  const data = await json(await fetch('/api/records'))
  // 換內容但保留同一個陣列物件——直接 records = data 會把 reactive 接線切斷
  records.splice(0, records.length, ...data)
}

export async function fetchRecord(id) {
  return json(await fetch(`/api/records/${id}`))
}

export async function addRecord(date, title) {
  const created = await json(
    await fetch('/api/records', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date, title }),
    }),
  )
  // id 由後端決定，所以推進列表的是「後端回傳的那筆」，不是自己組的
  records.push(created)
}
