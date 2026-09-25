# 單層就夠：Express 沒有 build 步驟（不像前端要 vite build 產 dist/），
# 所以沒有「build 階段的東西不該進 image」的問題。
FROM node:22-alpine
WORKDIR /app

# 注意 build context 是 repo 根目錄，不是 api/：
# npm workspaces 全 repo 只有根目錄那一份 package-lock.json，
# 少了它就只能 npm install，裝到的版本不保證跟 CI 測過的一樣。
# frontend/package.json 也得 COPY —— npm ci 會檢查 lockfile 跟「每一個」
# workspace 的 package.json 對不對得上，少一份就直接報錯。
COPY package.json package-lock.json ./
COPY api/package.json api/
COPY frontend/package.json frontend/

# --omit=dev        vitest 只有測試要用，不進 image
# --workspace       只裝 api 的相依，不裝 frontend 的 vue / vite
# --ignore-scripts  根 package.json 有 "prepare": "husky"，而 husky 是 devDependency，
#                   被 --omit=dev 擋掉之後那行會噴 command not found（exit 127），
#                   整個 build 掛在這裡。順帶一提這也是安全上的好習慣：
#                   不讓第三方套件的 install script 在 build 時執行任意指令。
RUN npm ci --omit=dev --ignore-scripts --workspace notes-api

COPY api/server.js api/

EXPOSE 3000
CMD ["node", "api/server.js"]
