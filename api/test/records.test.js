import { afterAll, beforeAll, expect, test } from 'vitest'
import { createApp } from '../server.js'

// 不裝 supertest：起一個真的 server 在隨機 port（0 = 讓 OS 挑一個沒人用的），
// 再用 Node 內建的 fetch 打進去。測到的路徑跟線上完全一樣。
let server
let base

beforeAll(async () => {
  server = createApp().listen(0)
  await new Promise((resolve) => server.once('listening', resolve))
  base = `http://127.0.0.1:${server.address().port}`
})

afterAll(() => new Promise((resolve) => server.close(resolve)))

test('health 回 ok', async () => {
  const res = await fetch(`${base}/api/health`)
  expect(res.status).toBe(200)
  expect(await res.json()).toEqual({ status: 'ok' })
})

test('POST 一筆之後，GET 列表拿得到', async () => {
  const created = await fetch(`${base}/api/records`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ date: '2026-09-24', title: 'Fix pipeline' }),
  }).then((res) => res.json())

  const list = await fetch(`${base}/api/records`).then((res) => res.json())
  expect(list).toContainEqual(created)
})

test('缺欄位回 400', async () => {
  const res = await fetch(`${base}/api/records`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title: '只有標題' }),
  })
  expect(res.status).toBe(400)
})

test('不存在的 id 回 404', async () => {
  const res = await fetch(`${base}/api/records/9999`)
  expect(res.status).toBe(404)
})
