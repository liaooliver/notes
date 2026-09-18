// 每個 UC 對應的程式碼片段。steps = 時序圖裡（0 起算）的步驟索引；程式碼中以 ">>" 開頭的行會被標成重點行。
export default {
  'uc-01': [
    { file: '.husky/commit-msg', steps: [0, 1], why: 'git commit 寫入前先跑這個 hook，把訊息檔路徑 $1 交給 commitlint。', code: `
>>npx --no -- commitlint --edit \${1}` },
    { file: 'commitlint.config.js', steps: [1, 2, 3], why: '規則來源：Conventional Commits 預設集，沒有 type: 前綴就判定失敗。', code: `
module.exports = {
>>  extends: ['@commitlint/config-conventional'],
};` },
    { file: 'package.json', steps: [0], why: 'npm install 時 husky 會把 .husky/ 裡的 hook 裝進 .git/hooks，所以每個 clone 都會擋。', code: `
"scripts": {
  "test": "node --test",
>>  "prepare": "husky",
  "commitlint": "commitlint"
}` },
  ],
  'uc-02': [
    { file: '.github/workflows/ci.yml', steps: [4, 5], why: 'push 事件只監聽這兩個分支，功能分支的 push 完全不會進到這個 workflow。', code: `
on:
  push:
>>    branches: [ "main", "staging" ]
  pull_request:
>>    branches: [ "main", "staging" ]` },
    { file: '.github/workflows/commitlint.yml', steps: [4, 5], why: '同樣只在 main / staging 的 push 才跑；PR 事件則沒有分支限制。', code: `
on:
  pull_request:
  push:
>>    branches: [ "main", "staging" ]` },
    { file: '.github/workflows/llm-pr-assist.yml', steps: [4, 5], why: '完全沒有 push 觸發，只有 pull_request。', code: `
on:
>>  pull_request:
>>    types: [opened, synchronize, reopened]` },
    { file: '.husky/commit-msg', steps: [0, 1], why: '本機 commit 一樣要先過 hook。', code: `
>>npx --no -- commitlint --edit \${1}` },
  ],
  'uc-03': [
    { file: '.github/workflows/ci.yml', steps: [1], why: 'PR 的 base 是 staging，符合 pull_request.branches。', code: `
on:
  pull_request:
>>    branches: [ "main", "staging" ]` },
    { file: '.github/workflows/commitlint.yml', steps: [2, 3], why: 'job 名稱 Validate Commit Messages 就是 branch protection 裡的 required check 名稱。', code: `
jobs:
  commitlint:
>>    name: Validate Commit Messages
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
>>      - uses: wagoid/commitlint-github-action@v6` },
    { file: '.github/workflows/ci.yml', steps: [4, 5], why: 'build job：測試在 build 之前，測試掛了 artifact 根本不會上傳。', code: `
  build:
>>    name: Build Application
    steps:
      - uses: actions/setup-node@v4
        with:
          node-version: 22
      - name: Install Dependencies
        run: npm ci
>>      - name: Run Tests
>>        run: npm test
      - name: Run Build
        run: npm run build
      - uses: actions/upload-artifact@v4
        with:
          name: dist-files
          path: dist/` },
    { file: '.github/workflows/ci.yml', steps: [6, 7], why: 'needs: build 讓它排在 build 之後；Trivy exit-code 1 等於「掃到就熔斷」。', code: `
  white-box:
>>    name: White-box Security Scan
>>    needs: build
    steps:
      - name: Run Semgrep SAST
        run: docker run --rm -v "\${{ github.workspace }}:/src" returntocorp/semgrep semgrep --config=p/ci /src
      - name: Run Trivy Vulnerability Scanner
        uses: aquasecurity/trivy-action@master
        with:
          scan-type: 'fs'
          severity: 'CRITICAL,HIGH'
>>          exit-code: '1'` },
    { file: '.github/workflows/ci.yml', steps: [8], why: '三個 job 都掛這個 if；PR 事件的 event_name 是 pull_request，條件不成立，job 不會出現在 run 裡。', code: `
  encryption:
    needs: white-box
>>    if: github.event_name == 'push' && github.ref == 'refs/heads/main'
  ops-handoff:
    needs: encryption
>>    if: github.event_name == 'push' && github.ref == 'refs/heads/main'
  release:
    needs: ops-handoff
>>    if: github.event_name == 'push' && github.ref == 'refs/heads/main'` },
    { file: '.github/workflows/llm-pr-assist.yml', steps: [9, 10, 11], why: 'commit-message-suggestion：用 gh 抓 PR 的 commit 標題，組成 prompt 丟給 Gemini，再用 gh 貼留言。', code: `
      - name: Collect PR Commit Messages
        run: |
>>          gh pr view "$PR_NUMBER" --json commits \\
>>            --jq '.commits[].messageHeadline' > commit-messages.txt
      - name: Ask Gemini for Commit Message Suggestions
        continue-on-error: true
        run: |
>>          node scripts/llm/call-gemini.mjs --prompt-file prompt.txt > gemini-output.txt
      - name: Post Commit Message Suggestion Comment
        run: |
          { echo "### 🤖 Commit Message 建議 (Gemini)"; echo ""; cat gemini-output.txt; } > comment-body.txt
>>          gh pr comment "$PR_NUMBER" --body-file comment-body.txt` },
    { file: '.github/workflows/llm-pr-assist.yml', steps: [12, 13, 14, 15, 16, 17], why: 'pr-diff-summary 與 code-review-comment 共用同一段 diff 收集：跟 base 分支比、排除 lock file、截前 20000 bytes。', code: `
      - name: Collect PR Diff
        env:
          BASE_REF: \${{ github.event.pull_request.base.ref }}
        run: |
          git fetch origin "$BASE_REF"
>>          git diff "origin/$BASE_REF"...HEAD -- . ':!package-lock.json' > pr.diff
>>          head -c 20000 pr.diff > pr-diff-truncated.txt` },
    { file: 'scripts/llm/call-gemini.mjs', steps: [9, 12, 15], why: '三個 job 都經過這支腳本：直接用 Node 內建 fetch 打 generateContent。', code: `
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-3.6-flash';
>>const GEMINI_ENDPOINT = \`https://generativelanguage.googleapis.com/v1beta/models/\${GEMINI_MODEL}:generateContent\`;

async function callGemini(prompt) {
  const apiKey = process.env.GEMINI_API_KEY;
>>  const response = await fetch(\`\${GEMINI_ENDPOINT}?key=\${apiKey}\`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
  });` },
  ],
  'uc-04': [
    { file: '.github/workflows/llm-pr-assist.yml', steps: [1], why: 'synchronize = PR 分支有新 commit；三種 type 都會重跑。', code: `
on:
  pull_request:
>>    types: [opened, synchronize, reopened]` },
    { file: '.github/workflows/llm-pr-assist.yml', steps: [2], why: '同一個 PR number 共用一個 concurrency group，新 run 進來就取消還在跑的舊 run。', code: `
>>concurrency:
>>  group: llm-pr-assist-\${{ github.event.pull_request.number }}
>>  cancel-in-progress: true` },
    { file: '.github/workflows/ci.yml', steps: [3, 7], why: 'ci.yml 沒有 concurrency，舊 run 會跑完；required check 只看最新 commit。', code: `
on:
  pull_request:
>>    branches: [ "main", "staging" ]
# （沒有 concurrency 區塊）` },
    { file: '.github/workflows/llm-pr-assist.yml', steps: [6], why: '每輪都用 gh pr comment 新增留言，不會編輯或刪除舊的。', code: `
      - name: Post PR Summary Comment
        continue-on-error: true
        run: |
>>          gh pr comment "$PR_NUMBER" --body-file comment-body.txt` },
  ],
  'uc-05': [
    { file: '.github/workflows/ci.yml', steps: [2, 3], why: 'npm ci 或 npm test 任一步非 0，整個 build job 就是紅的。', code: `
  build:
    steps:
>>      - name: Install Dependencies
>>        run: npm ci
>>      - name: Run Tests
>>        run: npm test
      - name: Run Build
        run: npm run build` },
    { file: 'test/app.test.js', steps: [2, 3], why: 'npm test = node --test，跑的就是這三個測試。', code: `
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { formatFixRecord } = require('../src/app.js');

>>test('formats a date and title into a fix record line', () => {
>>  assert.equal(formatFixRecord('2026-09-17', 'Fix login bug'), '2026-09-17 - Fix login bug');
>>});
test('throws when date is missing', () => {
  assert.throws(() => formatFixRecord('', 'Fix login bug'));
});` },
    { file: '.github/workflows/ci.yml', steps: [4], why: 'needs: build 讓 white-box 在 build 失敗時直接 skipped。', code: `
  white-box:
    name: White-box Security Scan
>>    needs: build` },
    { file: '.github/workflows/ci.yml', steps: [6, 7], why: 'exit-code 1：Trivy 掃到 CRITICAL/HIGH 就讓 step 失敗。ignore-unfixed 只放過還沒有修補版本的 CVE。', code: `
      - name: Run Trivy Vulnerability Scanner
        uses: aquasecurity/trivy-action@master
        with:
          scan-type: 'fs'
          ignore-unfixed: true
>>          severity: 'CRITICAL,HIGH'
>>          exit-code: '1'` },
  ],
  'uc-06': [
    { file: 'scripts/llm/call-gemini.mjs', steps: [0, 8, 9], why: 'model 名稱寫死在這裡；Google 汰換 model 時 API 回 404，走 GENERIC_FALLBACK。', code: `
>>const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-3.6-flash';` },
    { file: 'scripts/llm/call-gemini.mjs', steps: [0, 2, 6, 8], why: '非 2xx 時把 HTTP 狀態碼掛在 error.status 上，讓外層決定要不要重試。', code: `
  const body = await response.json();

  if (!response.ok) {
    const error = new Error(body?.error?.message || \`Gemini API error: \${response.status}\`);
>>    error.status = response.status;
    throw error;
  }` },
    { file: 'scripts/llm/call-gemini.mjs', steps: [2, 3, 4, 5, 6, 7], why: '429 / 503 都算暫時性：等 5 秒重試一次，還是不行就回對應的 fallback 文字而不是丟例外。', code: `
>>const TRANSIENT_STATUSES = new Set([429, 503]);

async function callGeminiWithRetry(prompt) {
  try {
    return await callGemini(prompt);
  } catch (error) {
>>    if (TRANSIENT_STATUSES.has(error.status)) {
>>      await sleep(5000);
      try {
>>        return await callGemini(prompt);
      } catch (retryError) {
        if (TRANSIENT_STATUSES.has(retryError.status)) {
>>          return fallbackForStatus(retryError.status);
        }
        throw retryError;
      }
    }
    throw error;
  }
}` },
    { file: 'scripts/llm/call-gemini.mjs', steps: [7, 9], why: '三種 fallback 文字；main() 最後一層 catch 保證任何錯誤都以 exit 0 結束並印出提示。', code: `
const RATE_LIMIT_FALLBACK = '_(LLM 建議暫時不可用：Gemini 免費額度已達上限，請稍後再試)_';
const OVERLOADED_FALLBACK = '_(LLM 建議暫時不可用：Gemini 服務目前負載過高，請稍後再試)_';
const GENERIC_FALLBACK = '_(LLM 建議暫時不可用：呼叫 Gemini API 時發生錯誤)_';

>>function fallbackForStatus(status) {
>>  if (status === 429) return RATE_LIMIT_FALLBACK;
>>  if (status === 503) return OVERLOADED_FALLBACK;
>>  return GENERIC_FALLBACK;
>>}

async function main() {
  try {
    console.log(await callGeminiWithRetry(prompt));
  } catch (error) {
    console.error(error.message);
>>    console.log(GENERIC_FALLBACK);
  }
}` },
    { file: '.github/workflows/llm-pr-assist.yml', steps: [10, 11], why: '呼叫與貼留言兩個 step 都 continue-on-error，job 永遠綠燈；加上不在 required checks 裡，所以擋不了 merge。', code: `
      - name: Ask Gemini for Code Review
>>        continue-on-error: true
        run: node scripts/llm/call-gemini.mjs --prompt-file prompt.txt > gemini-output.txt
      - name: Post Code Review Comment
>>        continue-on-error: true
        run: gh pr comment "$PR_NUMBER" --body-file comment-body.txt` },
  ],
  'uc-07': [
    { file: '.github/workflows/ci.yml', steps: [1, 3, 4], why: 'merge 產生的 push 落在 staging，符合 push.branches。', code: `
on:
  push:
>>    branches: [ "main", "staging" ]` },
    { file: '.github/workflows/commitlint.yml', steps: [2], why: 'push staging 也會再檢一次 commit 訊息。', code: `
on:
  pull_request:
  push:
>>    branches: [ "main", "staging" ]` },
    { file: '.github/workflows/ci.yml', steps: [5], why: 'github.ref 是 refs/heads/staging，不等於 main，三個發布 job 不出現。', code: `
  encryption:
>>    if: github.event_name == 'push' && github.ref == 'refs/heads/main'` },
    { file: '.github/workflows/llm-pr-assist.yml', steps: [6], why: '沒有 push 觸發。', code: `
on:
>>  pull_request:
    types: [opened, synchronize, reopened]` },
  ],
  'uc-08': [
    { file: '.github/workflows/ci.yml', steps: [1, 2], why: 'base 是 main，一樣落在 pull_request.branches。', code: `
on:
  pull_request:
>>    branches: [ "main", "staging" ]` },
    { file: '.github/workflows/llm-pr-assist.yml', steps: [3, 4, 5], why: 'BASE_REF 這次是 main，diff 涵蓋 staging 上累積的所有變更，所以摘要特別有價值。', code: `
      - name: Collect PR Diff
        env:
>>          BASE_REF: \${{ github.event.pull_request.base.ref }}
        run: |
          git fetch origin "$BASE_REF"
>>          git diff "origin/$BASE_REF"...HEAD -- . ':!package-lock.json' > pr.diff` },
    { file: '.github/workflows/ci.yml', steps: [7], why: '事件是 pull_request 不是 push，發布 job 仍不出現。', code: `
  ops-handoff:
>>    if: github.event_name == 'push' && github.ref == 'refs/heads/main'` },
  ],
  'uc-09': [
    { file: '.github/workflows/ci.yml', steps: [1], why: 'merge commit push 到 main，event_name = push、ref = refs/heads/main，五個 job 條件全部成立。', code: `
on:
  push:
>>    branches: [ "main", "staging" ]` },
    { file: '.github/workflows/ci.yml', steps: [3, 4], why: 'build 產出的 dist/ 以 artifact 形式交給後面的 job，只保留 1 天。', code: `
      - name: Run Build
        run: npm run build
>>      - name: Upload Build Artifact
>>        uses: actions/upload-artifact@v4
        with:
          name: dist-files
          path: dist/
          retention-days: 1` },
    { file: '.github/workflows/ci.yml', steps: [6, 7, 8], why: 'encryption：下載 dist-files，tar 後用 openssl 加密，金鑰來自 repo secret。', code: `
  encryption:
    name: Encrypt Artifacts
    needs: white-box
    if: github.event_name == 'push' && github.ref == 'refs/heads/main'
    steps:
      - uses: actions/download-artifact@v4
        with:
          name: dist-files
      - name: Package and Encrypt Artifact
        run: |
          tar -czf dist.tar.gz dist/
>>          openssl enc -aes-256-cbc -salt -pbkdf2 \\
>>            -in dist.tar.gz -out dist.tar.gz.enc \\
>>            -k "\${{ secrets.DEPLOY_ENCRYPTION_KEY }}"
      - uses: actions/upload-artifact@v4
        with:
          name: encrypted-dist
          retention-days: 7` },
    { file: '.github/workflows/ci.yml', steps: [9, 10, 11], why: 'environment: production 綁了 required reviewers，GitHub 在 job 開始前就暫停並通知審核者。', code: `
  ops-handoff:
    name: Ops Handoff / Production Release
    needs: encryption
    if: github.event_name == 'push' && github.ref == 'refs/heads/main'
>>    environment: production
    steps:
      - uses: actions/download-artifact@v4
        with:
          name: encrypted-dist
      - name: Execute Deployment
        run: echo "審核通過，取得加密檔 dist.tar.gz.enc，開始執行發布邏輯..."` },
    { file: '.github/workflows/ci.yml', steps: [11], why: 'release 排在 ops-handoff 後面，前面沒放行它連排隊都不會。', code: `
  release:
    name: Semantic Release
>>    needs: ops-handoff` },
  ],
  'uc-10': [
    { file: '.github/workflows/ci.yml', steps: [1, 2], why: 'Approve 之後 ops-handoff 才開始跑；目前 Execute Deployment 只是 echo。', code: `
  ops-handoff:
    environment: production
    steps:
      - uses: actions/download-artifact@v4
        with:
          name: encrypted-dist
>>      - name: Execute Deployment
>>        run: echo "審核通過，取得加密檔 dist.tar.gz.enc，開始執行發布邏輯..."` },
    { file: '.github/workflows/ci.yml', steps: [3, 4, 5, 8], why: 'release job：唯一有 contents: write 的 job；fetch-depth 0 讓 semantic-release 看得到所有 tag；Node 22 是 PR #12 修的。', code: `
  release:
    name: Semantic Release
    needs: ops-handoff
>>    permissions:
>>      contents: write
    steps:
      - uses: actions/checkout@v4
        with:
>>          fetch-depth: 0
      - uses: actions/setup-node@v4
        with:
>>          node-version: 22
      - run: npm ci
>>      - run: npx semantic-release
        env:
          GITHUB_TOKEN: \${{ secrets.GITHUB_TOKEN }}` },
    { file: '.releaserc.json', steps: [6, 7, 9, 12], why: 'plugin 依序執行：分析 commit → 產 notes → 寫 CHANGELOG → 改 package.json 版號（不發 npm）→ commit + tag → 開 GitHub Release。', code: `
{
  "branches": ["main"],
>>  "tagFormat": "notes-v\${version}",
  "plugins": [
>>    "@semantic-release/commit-analyzer",
>>    "@semantic-release/release-notes-generator",
>>    "@semantic-release/changelog",
>>    ["@semantic-release/npm", { "npmPublish": false }],
    ["@semantic-release/git", { ... }],
>>    "@semantic-release/github"
  ]
}` },
    { file: '.releaserc.json', steps: [8, 10], why: 'git plugin 的 commit 訊息固定帶 [skip ci]；加上 GITHUB_TOKEN 的 push 本來就不觸發 workflow，雙重保險不會迴圈。', code: `
    ["@semantic-release/git", {
      "assets": ["package.json", "package-lock.json", "CHANGELOG.md"],
>>      "message": "chore(release): \${nextRelease.version} [skip ci]\\n\\n\${nextRelease.notes}"
    }]` },
    { file: 'package.json', steps: [7], why: 'npm plugin 只改這個 version 欄位，然後由 git plugin 一起 commit。', code: `
{
  "name": "notes",
>>  "version": "1.2.1",` },
  ],
  'uc-11': [
    { file: '.github/workflows/ci.yml', steps: [0, 1, 5, 6], why: '停在這一行：environment 有 required reviewers，沒人動作就一直 Waiting，預設 30 天 timeout。', code: `
  ops-handoff:
    name: Ops Handoff / Production Release
    needs: encryption
>>    environment: production` },
    { file: '.github/workflows/ci.yml', steps: [2, 3, 4, 7], why: 'Reject 讓 ops-handoff 失敗；release 因 needs 連帶 skipped。', code: `
  release:
    name: Semantic Release
>>    needs: ops-handoff` },
  ],
  'uc-12': [
    { file: '.husky/commit-msg', steps: [0, 1], why: '本機 hook 只管訊息格式，不管你在哪個分支。', code: `
>>npx --no -- commitlint --edit \${1}` },
    { file: 'GitHub → Settings → Branches（非程式碼）', steps: [3, 4, 5], why: 'main 與 staging 的 classic branch protection：不在 repo 檔案裡，是 GitHub 端設定。', code: `
Branch name pattern: main（staging 同）
>>[x] Require a pull request before merging
>>    [ ] Require approvals        ← 單人 repo 刻意不勾
>>[x] Require status checks to pass before merging
>>    Build Application
>>    White-box Security Scan
>>    Validate Commit Messages
[ ] Allow specified actors to bypass required pull requests   ← 尚未設定` },
    { file: '.releaserc.json', steps: [3, 4], why: '同一條規則也會擋住這裡：git plugin 用 GITHUB_TOKEN 直接 push 版本 commit 到 main。', code: `
>>    ["@semantic-release/git", {
      "assets": ["package.json", "package-lock.json", "CHANGELOG.md"],
      "message": "chore(release): \${nextRelease.version} [skip ci]\\n\\n\${nextRelease.notes}"
    }]` },
    { file: '.github/workflows/ci.yml', steps: [3, 4], why: 'release job 只有 GITHUB_TOKEN，沒有 bypass 權限；run #32 approve 後會驗證是否被擋。', code: `
      - run: npx semantic-release
        env:
>>          GITHUB_TOKEN: \${{ secrets.GITHUB_TOKEN }}` },
  ],
  'uc-13': [
    { file: 'commitlint.config.js', steps: [0, 1], why: 'fix: 是 config-conventional 允許的 type 之一，跟 feat: 走同一套檢查。', code: `
module.exports = {
>>  extends: ['@commitlint/config-conventional'],
};` },
    { file: '.github/workflows/ci.yml', steps: [1, 2, 3, 4, 5, 6], why: 'PR 與 push 都落在同一組分支過濾，hotfix 沒有任何捷徑。', code: `
on:
  push:
>>    branches: [ "main", "staging" ]
  pull_request:
>>    branches: [ "main", "staging" ]` },
    { file: '.github/workflows/ci.yml', steps: [7, 8], why: 'hotfix 一樣要過 production 審核。', code: `
  ops-handoff:
>>    environment: production` },
    { file: '.releaserc.json', steps: [9, 10], why: 'commit-analyzer 預設規則：fix → patch、feat → minor、BREAKING CHANGE → major。', code: `
  "plugins": [
>>    "@semantic-release/commit-analyzer",
    "@semantic-release/release-notes-generator",` },
  ],
  'uc-14': [
    { file: '.github/workflows/ci.yml', steps: [1, 2, 3], why: '只有 branches 過濾，沒有 paths / paths-ignore，改 markdown 也照跑 build 與掃描。', code: `
on:
  pull_request:
>>    branches: [ "main", "staging" ]
>>    # 沒有 paths-ignore` },
    { file: '.github/workflows/llm-pr-assist.yml', steps: [2, 4, 5], why: '同樣沒有路徑過濾，三次 Gemini 呼叫照燒額度。', code: `
on:
>>  pull_request:
    types: [opened, synchronize, reopened]` },
    { file: '.releaserc.json', steps: [7], why: 'docs: type 在 commit-analyzer 預設規則裡不觸發版號，promote 到 main 也不會發空 release。', code: `
  "plugins": [
>>    "@semantic-release/commit-analyzer",` },
  ],
};
