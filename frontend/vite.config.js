import vue from '@vitejs/plugin-vue'
// 從 vitest/config 匯入（不是 vite）：它多吃一個 test 欄位，
// 這樣 build 和測試共用同一份 plugins，不會兩邊漂移。
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [vue()],
  test: {
    // component test 要操作 DOM，node 沒有 document，給它一個假的瀏覽器環境
    environment: 'jsdom',
  },
})
