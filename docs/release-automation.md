# Commit 規範化與版本發布自動化筆記

紀錄這個 repo 從「commit 訊息隨性寫」演變到「merge 進 main、CI 全過就自動發版」的過程，包含中間繞過的路、踩到的坑，以及為什麼最後長成現在這個架構。

## 起點：問題是什麼

一開始的目標很單純：commit 訊息要怎麼規範化，讓 CI 可以自動判斷版本號該怎麼跳（major/minor/patch）、自動產生 CHANGELOG、自動發 Release，不用每次手動 `git tag` 再手動在 GitHub 網頁上寫 Release notes。

規範化的部分沒什麼爭議，業界標準做法：

- **Conventional Commits**：`feat:` / `fix:` / `chore:` 這種前綴，footer 出現 `BREAKING CHANGE:` 代表跳 major。
- **commitlint**：套用 `@commitlint/config-conventional` 規則檢查訊息格式。
- **雙重把關**：
  - 本機用 husky 的 `commit-msg` hook，commit 當下就擋，比等到 CI 才發現快很多。
  - CI 端另外跑一次（`wagoid/commitlint-github-action`），防止有人用 `--no-verify` 跳過本機 hook。

這兩件事從頭到尾沒有變過，一直保留到現在。

## 第一階段：選了 release-please

版本自動化工具最初選了 **release-please**，理由是它跟這個 repo 既有的 `ci.yml`（`ops-handoff` job 綁 `environment: production`，需要人工審核才會部署）風格一致：

- push 到 main 有符合規範的 `feat:`/`fix:` commit → release-please 開一張「Release PR」草稿（版本號 bump + CHANGELOG），**不會馬上發布**。
- 人工 review 這張 PR，確認沒問題才合併 → 合併那一刻才真正打 tag、發 GitHub Release。

也就是「技術上 CI 過了」跟「正式對外發布這個版本號」是兩個分開的決策，中間留一個人工確認點。

實際落地的東西：`commitlint.config.js`、`.husky/commit-msg`、`.github/workflows/commitlint.yml`、`.github/workflows/release-please.yml`、`release-please-config.json`、`.release-please-manifest.json`。三個 workflow 檔案故意分開（不是全部塞進 `ci.yml`），理由：

1. **觸發時機不同**：release-please 只該在 push main 時跑，不該被 PR（尤其是 fork 來的 PR）觸發打 tag。
2. **最小權限**：release-please 需要 `contents: write`／`pull-requests: write`，`ci.yml` 裡的白盒掃描、加密步驟不需要這麼高的權限，混在一起等於整個 workflow 共用高權限，權限沒有最小化。
3. **職責分離**：三件事失敗原因完全不同，分開才能一眼看出是哪個維度出問題。

## 第二階段：實測發現的坑

用一個乾淨的子代理模擬「完全不知道規範的隨性開發者」，故意寫不合格式的 commit 訊息去 push——結果連 `git commit` 都做不出來，本機 hook 就直接擋下。這代表規範化這一關擋得比預期還早（好事）。

接著實際開了一個真的 PR（`sub-agent` 分支）並合併，觀察到完整鏈路：

```
feature PR 合併 → push main
   → Commit Lint / CI Pipeline 正常跑
   → release-please 開 Release PR（notes-v1.1.0 草稿）
Release PR 合併 → push main（又一次！）
   → Commit Lint / CI Pipeline 全部重跑一次
   → release-please 真正打 tag、發 Release
```

問題就在這裡：**Release PR 合併產生的 commit 只改了 `package.json` 版本號跟 `CHANGELOG.md`，沒有任何程式碼變更**，但因為三個 workflow 都只是單純監聽「push 到 main」這個事件，完全沒有能力區分「這是真的程式碼變更」還是「這只是 release-please 自己的版本標籤 commit」，所以照樣把 build、SAST/漏洞掃描、加密、`ops-handoff` 人工審核整條 pipeline 重跑一次——白白多耗一次掃描時間，還要人多按一次核准。

當時的修法是**治標**：在 `ci.yml` 的 `build` job 跟 `commitlint.yml` 加 `if` 條件，偵測到 commit 訊息符合 `chore(main): release` 這個 release-please 固定格式就跳過整條 pipeline（下游 job 靠 `needs` 自動跟著跳過）。這個做法有效，但本質上是在繞開 release-please「兩次觸發」的設計，不是解決根本問題。

同一階段也順手驗證了一個容易搞混的點：release-please 開 PR 用的那個 `release-please--branches--main--components--notes` 分支是**純 bot 自動管理、永遠不會手動去改**的。真正要修 bug（hotfix）時，是開一個全新、跟這個 bot 分支完全無關的分支走正常 PR 流程進 main；release-please 偵測到 main 多了新 commit，自動把它算進下一輪的 Release PR，不需要也不應該直接去動 bot 的分支。

## 第三階段：為什麼換成 semantic-release

用過一輪之後回頭看，發現真正想要的其實不是「多一道人工確認」，而是「merge 進 main、CI（build/test/掃描）全部跑完確認沒問題，就順便直接給版本號、直接發布」——完全自動、不要額外再點一次合併鍵。

這正好戳破 release-please 的核心設計前提：它是**故意**要有那道人工確認的（版本號是給人看的溝通產物，不只是技術上的 build tag），所以「Release PR 需要額外合併一次」不是它的限制或 bug，是它刻意的設計。想要「CI 綠燈 = 立刻正式發布，零額外點擊」，對應的工具是 **semantic-release**，不是想辦法讓 release-please 自動合併自己開的 PR（那樣只是繞一圈重造 semantic-release 的行為）。

於是決定整個換掉：

| | release-please（舊） | semantic-release（新） |
|---|---|---|
| 觸發到真正發布之間 | 多一次人工合併 Release PR | 無，CI 綠燈當場發布 |
| 版本號怎麼算 | 依 main 上 commit 歷史，累積到 Release PR | 依上次 tag 之後的 commit 歷史，pipeline 最後一步當場算 |
| CHANGELOG 能不能先預覽再發 | 可以（PR 裡看得到） | 不行，發布即公開 |
| 適合的情境 | 想要「攢著發」、要人審核版本文案 | 想要「merge 就是發布」，零手續 |

## 現在的架構

`.releaserc.json`：

- `tagFormat: "notes-v${version}"`——刻意延續 release-please 時代留下的 tag 命名習慣（`notes-v1.0.0` ~ `notes-v1.2.1`），讓版本號銜接不中斷，不是從頭重來。已經用本機 dry-run 驗證過：`Found git tag notes-v1.2.1 associated with version 1.2.1`，接續正確。
- plugin pipeline：`commit-analyzer` → `release-notes-generator` → `changelog` → `npm`（`npmPublish: false`，只借它更新 `package.json` 版本號，不會真的發 npm 套件）→ `git`（commit 版本號 + CHANGELOG，訊息固定帶 `[skip ci]`）→ `github`（建 GitHub Release）。

`.github/workflows/ci.yml`：

- 加了明確的 `permissions: contents: read` 當預設（最小權限），只有新增的 `release` job 用 job 層級的 `permissions: contents: write` 覆寫，其他 job（build/掃描/加密/ops-handoff）維持只讀。
- 新增第 5 個 job `release`，`needs: ops-handoff`、且只在 push main 時跑——等於**build、白盒掃描、加密、ops-handoff 人工審核全部通過之後，才是最後一步去算版本號、打 tag、發 Release**，直接對應最初想要的那句話：「CI build test code-review 都做完之後順便給版本號」。
- 拿掉了第二階段那個治標用的 `chore(main): release` 訊息比對 `if` 條件——不需要了，理由在下面。

**為什麼不需要再手動判斷「這是不是版本 commit」了：** semantic-release 的 commit 訊息固定帶 `[skip ci]`，這是 GitHub Actions 原生就認得的標記，遇到會直接不觸發整個 workflow，不需要自己寫字串比對邏輯。而且更根本的是：semantic-release 用 `GITHUB_TOKEN` 直接在 CI job 裡 push 版本 commit，GitHub Actions 對「用 `GITHUB_TOKEN` 產生的 push」本來就不會再觸發新的 workflow run（防止無限迴圈）——release-please 那種「重複觸發」的問題，是因為合併 Release PR 是人在 GitHub 網頁上按按鈕（算真人事件），跟 semantic-release 這種「CI 自己直接 push」的模式在機制上就不一樣，所以這個問題在新架構下基本上不會發生。

## 第四階段：staging 分支與實跑踩到的坑

架構改成 `feature/* → staging → main`（見 `branching-strategy.md`）之後，第一次真的把 `staging` 推進 `main` 跑完整 pipeline，一路 build → 掃描 → 加密 → 人工核准 production 都過了，最後一步 `Semantic Release` 卻掛掉：

```
[semantic-release]: node version ^22.14.0 || >= 24.10.0 is required. Found v20.20.2.
```

`semantic-release` v25 要 Node 22+，但 `ci.yml` 的 `build` 跟 `release` job 都寫 `node-version: 20`。這個錯誤**只看 workflow 檔看不出來**，一定要真的跑到最後一個 job 才會出現，所以整條流程從頭到尾實際走過一次是有價值的。修法是兩個 job 都升到 `node-version: 22`（PR #12），再把 `staging` 推進 `main`（PR #13）驗證。

同一輪還撞到另一個更早就存在的問題：`package-lock.json` 跟 `package.json` 不同步（`conventional-commits-filter` 鎖 5.0.0 但要求 `^6.0.0`），`npm ci` 直接以 `EUSAGE` 失敗，導致所有 PR 的 `Build Application` 都是紅的。用 `npm install` 重新產生 lock file、`npm ci --dry-run` 驗證後單獨開 PR #8 修掉。教訓：本機改 `package.json` 之後一定要連 lock file 一起 commit。

## 已知的坑，還沒踩到但要留意

- `package.json` 的 `build` script 目前只是 placeholder（`echo '<h1>Hello CI</h1>' > dist/index.html`），並沒有真的把 `src/` 複製進 `dist/`。現階段沒差，但要延伸到 Docker image 時就必須先修，`gitops-roadmap.md` 的 Phase 0 就是這件事。
- `main` **現在已經設了** branch protection、要求「必須透過 PR 才能合併」（見 `branching-strategy.md`）。semantic-release 用 `GITHUB_TOKEN` 直接 push 版本 commit 到 `main` 這個動作**很可能會被擋下來**。截至 2026-09-17，PR #13 觸發的 run 還停在 `ops-handoff` 等審核，`release` job 尚未在有 protection 的狀態下跑過，所以這一點還沒被實際驗證。若真的被擋，解法有兩種：在 protection rule 加 bypass（允許 GitHub Actions app 略過），或改用有 bypass 權限的 PAT 取代 `GITHUB_TOKEN`。
- 舊的 `CHANGELOG.md` 是 release-please 產生的格式，semantic-release 之後會用自己的格式接著往上疊，同一個檔案裡會有兩種格式並存，這是預期中的過渡痕跡，沒有特別去改寫歷史紀錄。
