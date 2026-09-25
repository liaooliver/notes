# 純靜態站，不需要 Node runtime，直接用 nginx 出 dist/
# stable 分支（1.30.x），官方同時發 amd64 與 arm64，所以這份 Dockerfile
# 不用改就能 build 出兩種架構——multi-arch 要做的事全在 CI 設定裡（Phase 2）。
FROM nginx:1.30-alpine

# 把 base image 裡已經有修補版本的系統套件升上去。
# nginx:1.30-alpine 目前帶的 libexpat 2.8.4-r0 有一個 HIGH（CVE-2026-93990），
# Alpine 那邊 2.8.5-r0 早就修好了，只是 nginx 官方還沒重新 build image。
# 這一行讓我們不用等上游，CI 的 image 掃描也才能維持「掃到就擋」的設定。
RUN apk upgrade --no-cache libexpat

# 覆蓋 nginx 預設的 server 設定，加上 SPA fallback
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf

# 把 build 好的靜態檔放到 nginx 預設 docroot
COPY dist/ /usr/share/nginx/html/

# nginx:alpine 已經 EXPOSE 80 且有預設 CMD，不用再寫
