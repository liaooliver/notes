import { expect, test } from 'vitest'
import { mount } from '@vue/test-utils'
import router from '../src/router.js'
import RecordList from '../src/views/RecordList.vue'

test('adding a record appends it to the list', async () => {
  // RecordList 用了 <RouterLink>，那個 component 要從 router 注入進來，
  // 所以 mount 時得把 router 當 plugin 裝上，否則會噴 injection not found。
  const wrapper = mount(RecordList, { global: { plugins: [router] } })

  await wrapper.find('input[type="date"]').setValue('2026-09-24')
  await wrapper.find('input[type="text"]').setValue('Fix pipeline')
  await wrapper.find('form').trigger('submit')

  expect(wrapper.text()).toContain('2026-09-24 - Fix pipeline')
})
