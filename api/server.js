import { fileURLToPath } from 'node:url'
import express from 'express'

// 資料只放在記憶體：pod 一重建就全部消失。
// 這是刻意的（見 gitops-roadmap 的 Phase 9-e），不是還沒做完——
// 容器本來就該被當成可拋棄的東西，要持久化得用 StatefulSet + PV，那是另一個主題。
// 也刻意不用 SQLite：better-sqlite3 是 native module，multi-arch build 時
// arm64 那份要在 QEMU 裡編譯，CI 會從幾十秒變好幾分鐘。
const records = [{ id: 1, date: '2026-09-17', title: 'Fix login bug' }]
let nextId = 2

export function createApp() {
  const app = express()
  app.use(express.json())

  // k8s 的 readinessProbe 打這條；回 200 之前不會有流量進來。
  app.get('/api/health', (req, res) => res.json({ status: 'ok' }))

  app.get('/api/records', (req, res) => res.json(records))

  app.get('/api/records/:id', (req, res) => {
    // 網址上的 :id 一律是字串，records 裡是數字，要轉過再比
    const record = records.find((r) => String(r.id) === req.params.id)
    if (!record) return res.status(404).json({ error: 'record not found' })
    res.json(record)
  })

  app.post('/api/records', (req, res) => {
    const { date, title } = req.body ?? {}
    if (!date || !title) return res.status(400).json({ error: 'date and title are required' })
    const record = { id: nextId++, date, title }
    records.push(record)
    res.status(201).json(record)
  })

  return app
}

// 只有「直接 node server.js」才 listen。被測試 import 進來時不要佔 port，
// 測試自己會用 listen(0) 開在隨機 port 上。
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const port = process.env.PORT || 3000
  createApp().listen(port, () => console.log(`notes-api listening on ${port}`))
}
