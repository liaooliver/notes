import { afterEach, expect, test, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import router from '../src/router.js'
import RecordList from '../src/views/RecordList.vue'

// 元件現在會打 API，測試不該真的連線出去（會慢、會不穩、CI 上根本沒有那台 server）。
// 用假的 fetch 把回應寫死，測的就只剩「元件拿到資料後有沒有畫對」。
function stubApi() {
  const stored = []
  vi.stubGlobal('fetch', async (url, options = {}) => {
    if (options.method === 'POST') {
      const record = { id: stored.length + 1, ...JSON.parse(options.body) }
      stored.push(record)
      return new Response(JSON.stringify(record), { status: 201 })
    }
    return new Response(JSON.stringify(stored), { status: 200 })
  })
}

afterEach(() => vi.unstubAllGlobals())

test('adding a record appends it to the list', async () => {
  stubApi()

  // RecordList 用了 <RouterLink>，那個 component 要從 router 注入進來，
  // 所以 mount 時得把 router 當 plugin 裝上，否則會噴 injection not found。
  const wrapper = mount(RecordList, { global: { plugins: [router] } })
  await flushPromises()   // 等 onMounted 那次 GET 回來

  await wrapper.find('input[type="date"]').setValue('2026-09-24')
  await wrapper.find('input[type="text"]').setValue('Fix pipeline')
  await wrapper.find('form').trigger('submit')
  await flushPromises()   // 等 POST 回來、列表更新

  expect(wrapper.text()).toContain('2026-09-24 - Fix pipeline')
})

test('API 掛掉時顯示錯誤訊息，不是整頁白掉', async () => {
  vi.stubGlobal('fetch', async () => new Response('boom', { status: 500 }))

  const wrapper = mount(RecordList, { global: { plugins: [router] } })
  await flushPromises()

  expect(wrapper.text()).toContain('讀不到資料')
})
