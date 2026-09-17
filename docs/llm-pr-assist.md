# LLM PR Assist

`.github/workflows/llm-pr-assist.yml` 在每個 PR（opened / synchronize / reopened）觸發三個獨立 job，
各自呼叫 Google AI Studio 的 Gemini API，把結果貼成 PR comment：

- `commit-message-suggestion`：檢查 PR 內 commit 標題是否符合 Conventional Commits，給改寫建議
- `pr-diff-summary`：摘要這個 PR 改了什麼、影響範圍
- `code-review-comment`：對 diff 做簡單的 bug / 安全性 review

三個 job 共用 `scripts/llm/call-gemini.mjs` 這支腳本呼叫 Gemini `generateContent` API。

## 設定 Gemini API Key

1. 到 [Google AI Studio](https://aistudio.google.com/apikey) 建立一組免費的 API key
2. 在 repo 的 Settings → Secrets and variables → Actions 新增 secret：`GEMINI_API_KEY`
3. 不需要額外安裝 SDK，`call-gemini.mjs` 直接用 Node 20 內建的 `fetch` 打 REST API
4. 預設 model 是 `gemini-2.0-flash`（免費層額度最高），可用 `GEMINI_MODEL` 環境變數覆寫

## 免費額度用完時的處理

Gemini 免費層超過額度會回傳 HTTP 429。這幾個 job 是輔助性質，設計原則是**LLM 掛了不該擋住 PR 流程**：

- `call-gemini.mjs` 遇到 429 會等待 5 秒後重試一次；如果還是 429，就回傳一段 fallback 文字
  （例如「LLM 建議暫時不可用：Gemini 免費額度已達上限」）而不是丟出未捕捉的例外
- 呼叫 Gemini 與貼留言的 step 都加了 `continue-on-error: true`，即使發生非預期錯誤也不會讓 job 失敗
- workflow 層級設定了 `concurrency`（依 PR number 分組、`cancel-in-progress: true`），同一個 PR 有新的
  push 時會取消還在跑的舊執行，避免重複呼叫浪費額度
- 每個 job 都有 `timeout-minutes: 10`，避免呼叫卡住佔用 runner 時間

這組 workflow 完全不會影響 `ci.yml` 的 build / 掃描 / 加密 / release 流程，兩者互相獨立。
