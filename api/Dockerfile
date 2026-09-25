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

# 裝完相依之後就把 npm 本身從 image 裡拿掉。
# 原因不是省空間，是 CVE：node:22-alpine 附的那份 npm 自己 bundle 了一堆套件
# （brace-expansion / pacote / sigstore / ip-address / picomatch），Trivy 掃 image 時
# 會報出 8 個 HIGH。那些套件我們一行都沒用到——container 啟動只跑 `node api/server.js`，
# 但它們躺在 image 裡就是會被掃到，而且修不動（要等 Node 官方換新的 npm 進 base image）。
# 刪掉是真的把那些程式碼移出 production image，而不是把掃描結果調鬆當作沒看到。
RUN rm -rf /usr/local/lib/node_modules/npm /usr/local/bin/npm /usr/local/bin/npx

COPY api/server.js api/

EXPOSE 3000
CMD ["node", "api/server.js"]
