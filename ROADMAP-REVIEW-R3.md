# GitOps Roadmap 第三輪審查：上下文、查證與修正計畫

> 產出日期：2026-09-18
> 對象檔案：`docs/gitops-roadmap.md`（1597 行，已 commit 於 `docs/gitops-roadmap-hardware`）
> 相關文件：`ROADMAP-REPLAN.md`（第一、二輪的背景與處置）
> 狀態：**計畫已列出，尚未動手修改**

> **修訂記錄**
> - **r1**：依第三輪審查的四點整理出 A~G 修正計畫。
> - **r2（本版）**：主要修改者複審後修訂三處 ——
>   (1) 第 1 點的變數不是「哪把 token」而是「classic protection 還是 ruleset」，
>   原本把 GitHub App token 標成「已知可行」是錯的；
>   (2) 補上第 2.2 節（manifest 放哪裡）必須一起重審，含第三個選項；
>   (3) smoke test 的觸發方式改掉（原本寫 `workflow_dispatch` + 「不進 `main`」，兩者不可能同時成立）。
>   另修正第 4 點的行號（`:1087` / `:1097`，不是 `:1081`）。

---

## 一、背景脈絡（讀這份文件需要知道的事）

### 1.1 這個 repo 是什麼

`liaooliver/notes` 是「個人筆記 repo + CI/CD 練習場」。已經上線並驗證過的部分：

| 項目 | 狀態 |
| --- | --- |
| 分支策略 `feature/* → staging → main`，兩層 gate | 已上線 |
| `ci.yml` 五個 job：build → white-box → encryption → ops-handoff → release | 已上線 |
| commitlint + husky 雙重把關 | 已上線 |
| semantic-release **tag-only** 發版（不寫回 `main`） | run #39 驗證通過，發出 `notes-v1.3.0` |
| Phase 0：`build` script 改成真的複製 `src/` | run #39 驗證（`dist-files` = 863 bytes） |

**目前分支**：`docs/gitops-roadmap-hardware`（從 `origin/staging` 開出），最終要 PR 進 `staging`。
**工作目錄現況**：`.gitignore` 有一處未 commit 的修改、`ROADMAP-REPLAN.md` 為 untracked。

### 1.2 roadmap 重寫的兩個起因

**(a) 硬體確定：MacBook M4 / 16 GB + Multipass。**
這帶出一個會讓原計畫失敗的硬傷：

```
GitHub Actions ubuntu-latest runner  →  linux/amd64
Apple Silicon 上的 Multipass VM      →  linux/arm64
```

原 Phase 2 不指定 `platforms`，產出的 image 只有 amd64；k3s 拉下去會噴
`no matching manifest for linux/arm64/v8` 或 `exec format error`，而且**要到最後一個 Phase 才會爆**，
前面全綠，錯誤訊息完全不提「架構」兩個字。

**(b) 學習目的確定：對標 Vue.js 前端工程師職缺。**
K8S / CI/CD / Docker 都在加分條件，工作內容是「協助 DevOps Team 進行 CI/CD 上版建置」。
→ 目標是「有能力參與容器化與 CI/CD 的前端」，不是叢集管理員。
→ 原 Phase 7（cosign 簽章、Kyverno 驗簽）投報率低，降級為選配 Phase 10。
→ 最大的缺口不是叢集不夠真實，而是**被部署的東西是 863 bytes 的靜態 HTML**。

### 1.3 已定案的架構決定

| 決定 | 選擇 |
| --- | --- |
| 叢集拓樸 | 單節點 k3s，一台 6 GB Multipass VM |
| 環境隔離 | 同叢集、兩個 namespace（`notes-staging` / `notes-production`） |
| image 架構 | multi-arch（amd64 + arm64） |
| 對外存取 | Ingress（k3s 內建 Traefik）+ Mac 的 `/etc/hosts` |
| 應用範圍 | Vue 3 + Express，不碰資料庫 |
| 實作順序 | 先用靜態檔跑通鏈路（Phase 0–6），再換內容物（Phase 7–9） |
| CI 工具 | 只做 GitHub Actions + Argo CD，不碰 Jenkins |
| image 識別 | 完整 40 碼 SHA tag（`type=sha,format=long`） |
| production image 來源 | `main` 重新 build 自己的（不沿用 staging 那份） |
| manifest 放哪裡 | 同 repo 的 `deploy/` 目錄（**第 2.5 節指出這項的前提已變，待重審**） |

### 1.4 前兩輪審查的結果

- **第一輪**：計畫核准，roadmap 從 702 行重寫為 1201 行。
- **第二輪**：獨立審查提出 6 個「實作時會實際卡住」的問題（staging 沒有 push 觸發、production image 來源矛盾、Phase 4 競態、Phase 9 規格不完整、短 SHA 不可變性、`paths-ignore` 未定案），全部處置完成，roadmap 擴為 **1597 行**。詳見 `ROADMAP-REPLAN.md` 第五節。
- **第三輪（本文件）**：再次審查提出四點，主要修改者逐行複查後全部確認屬實，並補了三項結構性修正。

### 1.5 一段關鍵歷史：run #32 的 GH006

第三輪的第 1 點完全繞著這件事，所以必須先講清楚。

run #32 時 `semantic-release` 的 `@semantic-release/git` 想把版本 commit 推回 `main`，被擋下：

```
git push --tags https://github.com/liaooliver/notes.git HEAD:main
remote: error: GH006: Protected branch update failed for refs/heads/main.
remote: - Changes must be made through a pull request.
remote: - 3 of 3 required status checks are expected.
```

當時的解法是「**不寫回 repo**，只打 tag + 發 GitHub Release」，run #39 已驗證可行
（見 `docs/release-automation.md` 第五、六階段）。

**但 Phase 4 的 manifest bump 退無可退** —— 發版可以不寫回 repo，改 image tag 不行，
一定要有一個能把 commit 送進受保護分支的路徑。這就是第 1 點的全部問題。

> **這段錯誤訊息裡藏著一個關鍵情報，見第 2.5 節：`GH006` 這個錯誤碼本身就告訴我們 `main` 目前用的是哪一套保護機制。**

---

## 二、第三輪審查的四點（含查證結果）

四點都經過逐行查證，**全部屬實**。嚴重度重排一項；行號修正一處。

> **重要：改的時候用內容定位，不要用行號。**
> 檔案在第二輪之後又動過，審查報告引用的行號有幾處飄了 5~6 行。
> 本文件的行號是 2026-09-18 當下的 1597 行版本，僅供定位參考。

### 2.1 第 1 點：`GITHUB_TOKEN` + bypass 尚未證實可行

**審查原文重點**：文件先承認 `GITHUB_TOKEN` 會被 branch protection 擋住，接著又把
「將 `github-actions[bot]` 加進 bypass 名單」當定案（`:852-870`）。這不能視為已解，
因為該 pseudo-user 在 branch protection / ruleset 的可選 bypass actor 支援度並不可靠，
且 run #32 已證實它無法直接 push。

**查證結果：屬實（`:857` 標題確實寫「定案：用做法 1」），而且影響面比審查說的更大。**

| 發現 | 證據 |
| --- | --- |
| 文件確實把它當定案 | `:857` |
| 影響面是 6 處不是 1 處 | `:258`（2.3 時序圖 Note）、`:852-855`、`:863`、`:1546`、`:1548`、`:1550` |
| 兩份文件對同一問題給了不同答案 | `docs/release-automation.md:117` 寫的是「建 GitHub App / PAT，**加入 ruleset 的 bypass 名單**」—— 重點在「ruleset」，不在 token 種類 |

**嚴重度：維持「嚴重」**（它卡住 Phase 4，而 Phase 4 是整條 GitOps 鏈路的核心）。

真正的變數是什麼，見第 2.5 節 —— 那是本輪最重要的一段。

### 2.2 第 2 點：private GHCR 情境下 `notes-api` 缺 pull secret

**查證結果：屬實。**

- `:580-584` `web-deployment.yaml` 有註解版的 `imagePullSecrets`
- `:1271` 起 `api-deployment.yaml` 的 `spec:` **直接接 `containers:`，沒有任何註解**
- `:1063` 卻明講「同一把 `ghcr-pull` secret 對兩個 package 都有效」
- `:1061` 只叫讀者取消 `web-deployment.yaml` 的註解

private 情境下 web 起得來、API 卡 `ImagePullBackOff`，症狀是「畫面出得來但打 API 500」，
比整個掛掉更難查。**嚴重度：維持「高」**，但改起來最便宜。

### 2.3 第 3 點：Phase 5/6 的建立順序

**查證結果：屬實，但嚴重度降為「中」。**

- `grep -n 'Phase 5.5'` 全文只有 **1 筆**，就是 `:1043` 那個引用本身；Phase 5 實際只到 5.4 —— **目標不存在**。
- 不過 Phase 5 結尾 `:1037` 的驗證句已經寫了「（前提是 Phase 6 的 pull secret 已建好）」，
  語意是對的，**錯的只有編號**，稱不上「互相矛盾」。

審查提的修法（正式拆出 5.5、public/private 分兩條路）雙方一致同意。

### 2.4 第 4 點：改名後殘留的舊 Service 名稱

**查證結果：屬實，但行號是 `:1087` / `:1097`，不是審查寫的 `:1081`。**

- `:567` / `:605` Phase 3 早就統一成 `notes-web`
- `:1087` 請求路徑仍寫 `→ Service notes`
- `:1097` 排錯表 502/503 那格仍寫 `get endpoints notes`

照文件敲 `kubectl get endpoints notes` 會得到 `NotFound`，而這偏偏是排 502/503 的那一格 ——
讀者正在慌的時候拿到一個假線索。

**注意**：`ingress.yaml` 的 `metadata.name: notes` 是 Ingress 物件名稱，不是 Service，**要留著**。
`:1324` 與 `:1580` 已經是 `notes-web`，不用動。

### 2.5 本輪最重要的一段：真正的變數是保護機制，不是 token

**這一節推翻了 r1 版的判斷。** r1 把 fallback 寫成「GitHub App token（已知可行）」——**那是錯的**，
GitHub App token 和 `GITHUB_TOKEN` 卡在同一個地方。

#### classic branch protection 與 ruleset 是兩套不同的東西

| | classic branch protection | ruleset |
| --- | --- | --- |
| 形式 | 一組獨立開關 | 一組規則 + **一份整組共用的 bypass 名單** |
| 「必須透過 PR」的豁免 | 有專屬名單：「Allow specified actors to bypass required pull requests」 | 由 bypass 名單涵蓋 |
| 「required status checks」的豁免 | **沒有對應的 actor 名單**，唯一開關是「Include administrators」/「Do not allow bypassing the above settings」 | 由**同一份** bypass 名單涵蓋 |

名字就寫死了範圍：classic 那個名單叫 `bypass required pull requests`，它只豁免「必須透過 PR」這一條。

#### 所以 run #32 那兩行錯誤訊息，在 classic 底下是這樣

```
Changes must be made through a pull request.      ← bypass 名單能解
3 of 3 required status checks are expected.       ← bypass 名單解不掉
```

而 bump commit 帶 `[skip ci]`、又是 bot push，三個 check 一個都不會跑，**第二條必然觸發**。
換成 GitHub App token 也一樣 —— App 不會讓 status checks 憑空通過。
App 在別人專案能動，是因為他們把 App 加進了 **ruleset** 的 bypass 名單，那是整組豁免。

#### 完整矩陣（r1 的 smoke test 只測了左上角一格）

| | classic protection | ruleset + bypass 名單 |
| --- | --- | --- |
| `GITHUB_TOKEN`（`github-actions[bot]`） | 判斷會失敗 | 要看個人 repo 能不能把 bot 選為 bypass actor |
| GitHub App token | **也會失敗**（r1 誤標為「已知可行」） | 可行 —— 安裝在 repo 上的 App 通常選得到 |

> **個人 repo（非 organization）的 ruleset bypass 名單，可選的 actor 比 org 少。**
> `github-actions[bot]` 能不能直接選中沒有把握，但安裝在 repo 上的 GitHub App 通常可以。
> 這正是 smoke test 該測的東西。

#### 一個能直接縮小範圍的線索：錯誤碼

- classic branch protection 擋下來 → `GH006: Protected branch update failed`
- ruleset 擋下來 → `GH013: Repository rule violations found`

`docs/release-automation.md:103` 保留的 run #32 原始輸出是 **`GH006`**，
所以 **`main` 目前用的是 classic**，矩陣的**左欄才是現況** —— 而左欄兩格都是失敗。

> 這是從錯誤碼推的（本機沒有 `gh` CLI，也讀不到 repo 設定）。
> 動手前仍要到 Settings → Branches / Rules 直接看一眼確認，30 秒，比推論可靠。

#### 結論

**「要用哪一把 token」是偽命題。真正要做的決定是「要不要把 `main` / `staging` 從 classic 遷成 ruleset」。**
這是架構決定，不是換一行 `token:`。4-a 要測的東西也因此改變（見 A-3）。

### 2.6 第 2.2 節（manifest 放哪裡）必須一起重審

r1 把整個 A 組都押在「讓 push 成功」，**沒考慮「繞開這個 push」**。

roadmap 第 2.2 節已經比較過「同 repo `deploy/`」vs「獨立 `notes-deploy` repo」，結論選同 repo。
但那張表有兩個問題：

1. **六個比較項目裡沒有「會不會撞 branch protection」這一項** —— 寫的時候還不知道這是硬傷。
2. **少了第三個選項**：同 repo，但 Argo CD 讀一條**不受保護的 `deploy` 分支**。
   bump job 只 push 到那條分支，永遠碰不到 `main` / `staging` 的保護規則 ——
   一個 repo、不用 App、不用遷 ruleset、不用賭 bypass 名單，連 `[skip ci]` 都不需要
   （那條分支根本不在 `ci.yml` 的 `on.push.branches` 裡）。

代價要誠實列出來，不是免費的：

- `deploy` 分支要定期從 `main` merge，否則 base manifest 的改動不會生效（或只在該分支放 overlay 的 image tag）
- 部署歷史與程式碼歷史分家（這其實一半是優點，`git log` 全是 image bump）
- production 的人工閘從「PR review」移到 GitHub Environment approve —— 但 `ops-handoff` 本來就有這道閘，等於沒損失
- Argo CD 要改 `targetRevision`（例如 `deploy-staging` / `deploy-production` 兩條）

**不是說一定要改結論。** 是說：如果第 1 點真的走到「必須遷 ruleset 或建 GitHub App」，
第 2.2 節的取捨前提已經變了，得把它拉進來一起看。

### 2.7 額外發現：坑清單有一條跟定案自相矛盾

前兩輪與第三輪審查都沒抓到：

- `:1548` 說「如果改用 PAT，第 (2) 層保險失效，**此時要再加第三層 `paths-ignore`**」
- `:1550` 說「**`paths-ignore` 是陷阱，不要加**」（會造成 rollback PR 的 required check 永久 Pending 死結）

改用 App/PAT 正是「第 (2) 層失效」的情境，所以這兩條會正面對撞，必須一起重寫。

### 2.8 判定總表

| # | 審查判定 | 最終判定 | 核心處置 |
| --- | --- | --- | --- |
| 1 | 嚴重 | **嚴重（且問題被重新定義：是保護機制的選擇，不是 token 的選擇）** | 降級為待驗證；盤點 classic/ruleset；smoke test 測矩陣；連帶重審第 2.2 節 |
| 2 | 高 | 高 | 補註解版 `imagePullSecrets` + 附 ServiceAccount 對照 |
| 3 | 中高 | **中** | 正式拆出 5.5，分 public/private 兩條路 |
| 4 | 中 | 中 | `notes` → `notes-web`（`:1087` / `:1097`，Ingress 名稱不動） |
| — | （未提出） | 中 | `:1548` / `:1550` 自相矛盾，一併重寫 |

---

## 三、修正計畫

執行順序：**A → B → C → D → E → F → G**。全部用內容定位，不用行號。

### A 組｜第 1 點：把「定案」降級為「待驗證」+ 重寫連帶影響

這組最大，共 6 處編輯 + 2 處新增。

#### A-1. Phase 4 解法段落（`:852-855` 附近）

改成三段式：

1. 保留現況描述（run #32 的 GH006、為什麼 Phase 4 退無可退）
2. **新增「這裡有兩條規則，而且分屬不同機制」** —— 把第 2.5 節的
   classic vs ruleset 對照表、兩行錯誤訊息的歸屬、GH006/GH013 的辨識法寫進去
3. 「解法二選一」改成**矩陣**，而不是 token 清單：

| | classic protection | ruleset + bypass |
| --- | --- | --- |
| `GITHUB_TOKEN` | 判斷會失敗 | 待測：個人 repo 能不能選 bot 當 actor |
| GitHub App token | 也會失敗 | 可行 |

並明說：**這是「要不要遷 ruleset」的決定，不是「用哪把 token」的決定。**
Fine-grained PAT 明確標為不採用（綁個人帳號、會過期、權限是帳號層級）。

#### A-2. `##### 定案：…` → 改標題為 `##### 未定案：先確認保護機制`

三列表格的**第一列**（誰來 push bump commit）改為「待 4-a 決定」，底下列出三條分支的後續：

| 4-a 的結果 | Phase 4 怎麼寫 |
| --- | --- |
| 維持 classic | **不可能讓 bot push 成功** → 走第 2.2 節的 `deploy` 分支方案，或遷 ruleset |
| 遷 ruleset + bot 可選為 actor | 維持 `GITHUB_TOKEN`；`[skip ci]` +「bot push 不觸發 workflow」兩層保險都在 |
| 遷 ruleset + 只能選 App | 改 `actions/create-github-app-token@v2`；`actions/checkout` 要帶 `token:`；**「不觸發 workflow」那層保險消失，`[skip ci]` 成為唯一防線**；`paths-ignore` 仍然不准加 |

**後兩列維持定案不動**（不加 `paths-ignore`、另加 `manifest-check` job）——
它們的理由跟用哪把 token、哪套機制都無關。

#### A-3. 新增 `##### 4-a. 動手之前：盤點保護機制並實測`

三個步驟，順序不能顛倒：

1. **盤點（人工，30 秒）**：Settings → Branches / Rules，確認 `main` / `staging` 目前是 classic 還是 ruleset。
   run #32 的 `GH006` 指向 classic，但眼見為憑。
2. **決定**：若是 classic，要不要遷 ruleset？這會牽動第 2.2 節（見 A-6），一起決定。
3. **實測**：用下面的 workflow 驗證所選組合。

```yaml
# .github/workflows/push-smoke-test.yml
# 放在拋棄式分支 chore/push-smoke-test 上。push 觸發的 workflow 從「收到 push 的那條分支」執行，
# 檔案不需要進 main —— workflow 檔案的所在分支，和它 push 的目標分支，是兩件獨立的事。
on:
  push:
    branches: [chore/push-smoke-test]
jobs:
  t:
    runs-on: ubuntu-latest
    permissions: { contents: write }
    steps:
      - uses: actions/checkout@v5
        with: { ref: staging, fetch-depth: 0 }
      - run: |
          git config user.name  "github-actions[bot]"
          git config user.email "41898282+github-actions[bot]@users.noreply.github.com"
          git commit --allow-empty -m "chore: verify bot push permission [skip ci]"
          git push origin HEAD:staging
```

> **為什麼不用 `workflow_dispatch`？** `workflow_dispatch` 的 workflow 必須存在於**預設分支**才叫得出來，
> 放在 feature 分支上，Actions 頁面的 Run workflow 下拉選單不會出現它。
> 用它就得先開 PR 進 `main` → 合併 → 手動觸發 → 再開一張 PR 刪掉，`main` 一定會被動到兩次。
> push 觸發沒有這個限制，測完刪分支即可，`main` 完全沒被碰過。

文件裡要一起寫清楚的三件事：

- **先測 `staging`，通過再測 `main`。** 兩條分支的規則可能不同，`staging` 的結論不能直接套到 `main`。
- **保留策略：不 revert，保留那筆 empty commit。**
  `git revert` 一個空 commit 會直接報 `nothing to commit`；硬要清只能 force-push，
  而受保護分支又做不到。訊息本身就是記錄，保留最乾淨。
- **失敗時錯誤碼就是答案。** `GH006` = classic、`GH013` = ruleset，
  下面列出的規則直接告訴你是哪一條擋的，決定走矩陣的哪一格。

#### A-4. 坑清單三條

| 位置 | 動作 |
| --- | --- |
| `:1546` | 「要加 bypass actor，或改用 PAT」→ 改成「**先盤點 classic / ruleset**，classic 底下 status checks 那條無解」，並補兩條規則分屬不同機制 |
| `:1548` | **刪掉**「此時要再加第三層 `paths-ignore`」（與下一條正面衝突），改成「此時 `[skip ci]` 是唯一防線，而 `paths-ignore` 仍然不能加，理由見下一條」 |
| `:1550` | 結論不動；把「已經被 `GITHUB_TOKEN` + `[skip ci]` 兩層擋住」補成「兩層或一層（視 token 而定）」 |

#### A-5. `:258` 2.3 時序圖的 Note

`用 GITHUB_TOKEN push + [skip ci]，不會再觸發 ci.yml`
→ 加註「（push 身分與目標分支待 Phase 4-a 決定）」，避免圖跟內文各說各話。

#### A-6. 第 2.2 節補一個比較項與一個選項（新增，r1 遺漏）

- 表格加一列：**「會不會撞 branch protection」** —— 同 repo `deploy/`：**會**（這是 Phase 4 的核心難題）；獨立 repo：不會（deploy repo 不必設保護）。
- 表格加一欄：**同 repo + 不受保護的 `deploy` 分支**，內容依第 2.6 節，代價一併列出。
- 「建議：先用同 repo `deploy/` 目錄」那段加一句轉折：
  **若 4-a 的結論是「必須遷 ruleset 或建 GitHub App」，回來重讀這一節** —— 第三個選項的成本可能比遷機制低。

### B 組｜第 2 點：`notes-api` 的 pull secret

**B-1.** `api-deployment.yaml` 的 `spec:` 底下補上與 web 一致的註解區塊：

```yaml
    spec:
      # repo 是 public 時 GHCR package 也是 public，不需要 secret，這兩行先註解掉。
      # 改成 private 時，web 與 api 兩份都要一起取消註解。
      # imagePullSecrets:
      #   - name: ghcr-pull
      containers:
```

**B-2.** `:1061`「然後把 `web-deployment.yaml` 裡的註解拿掉」
→ 改成「**`web-deployment.yaml` 與 `api-deployment.yaml` 兩份都要拿掉**」，
並補症狀說明：只改一份的話畫面出得來但打 API 500，比整個掛掉更難查。

**B-3.** 在 `:1063` 那段引言後補上 ServiceAccount 的對照方案：

```bash
kubectl -n notes-staging patch serviceaccount default \
  -p '{"imagePullSecrets":[{"name":"ghcr-pull"}]}'
```

一行覆蓋整個 namespace 的所有 pod，未來加第三個服務不用再改 manifest。
代價是它是 imperative、不在 Git 裡、Argo CD 管不到 —— 寫成
「知道有這招，但本文選 manifest」的對照，當作 GitOps 精神的教學點。

### C 組｜第 3 點：正式拆出 5.5

**C-1.** 在「建兩個 namespace：」之前插入 `##### 5.5 建 namespace 與 Argo CD Application`，
把該段到 Phase 5 結尾整段納入。Phase 5 因此變成 5.1 ~ 5.5。

**C-2.** 5.5 開頭加分岔（這是 `:1043` 那個幽靈引用真正該指向的地方）：

```
public repo  → namespace → Argo CD Application（本節做完即可）
private repo → namespace → 先跳到 Phase 6 建 ghcr-pull secret
             → 取消 web + api 兩份 Deployment 的 imagePullSecrets 註解
             → 再回來套用 Application
```

**C-3.** Phase 5 結尾的驗證句「（前提是 Phase 6 的 pull secret 已建好）」
→ 改成「（private repo 的前提見本節開頭的分岔）」。

**C-4.** `:1043` 的 `Phase 5.5` 改為 `第 5.5 節` —— 此時目標真的存在。

### D 組｜第 4 點：`notes` → `notes-web`

只動兩處：

- `:1087` 請求路徑圖：`→ Service notes` → `→ Service notes-web`
- `:1097` 排錯表 502/503 那格：`get endpoints notes` → `get endpoints notes-web`

**`ingress.yaml` 的 `metadata.name: notes` 不動；`:1324` 與 `:1580` 已經正確，不動。**

### E 組｜驗證

| 項目 | 指令 / 方式 |
| --- | --- |
| code fence 成對 | ``grep -c '^```' docs/gitops-roadmap.md`` 為偶數 |
| 無幽靈引用 | `grep -n 'Phase 5\.5'` 為 0；`第 5.5 節` 有對應標題 |
| 標題不跳級 | Phase 5 底下 5.1 ~ 5.5 連號 |
| 舊 Service 名 | `grep -n 'Service notes$\|endpoints notes$'` 為 0 |
| 內部無矛盾 | `paths-ignore` 三處說法一致；push 身分四處說法一致；第 2.2 節與 Phase 4 的結論不打架 |
| 既有測試 | `npm test` → 3 passed |

### F 組｜Artifact 同步

Artifact：`https://claude.ai/artifact/9EbPRiqXcJY8ZrqcJXputd`（標題 `Notes GitOps Roadmap`）

先 `action: "read"` 讀現行版本，確認上一輪（1597 行那版）有沒有推上去，再決定範圍。
預期要動的是 `index.html`：

- `#s2`：第 2.2 節的選項表多一欄、多一列
- `#s3`：Phase 4 的定案框改成待驗證框 + 新增 4-a、Phase 5 清單多一項 5.5、Phase 6 的 Service 名
- `#s5`：坑清單三條

`flowviz.js` / `seqviz.js` 本次不動（publish 時不傳即可保留）。
作法遵循 `.claude/skills/scenario-atlas/SKILL.md`：版面與渲染器不重新設計，只替換資料與內容。

### G 組｜收尾

1. `ROADMAP-REPLAN.md` 新增「六、第三輪審查與處置」，並指回本文件
2. Commit（英文 Conventional Commits，維持既有慣例）：
   - `docs(gitops): reframe phase 4 blocker as branch protection mechanism choice`
   - `docs(gitops): fix api pull secret, split phase 5.5, rename stale service refs`
   - `chore: track roadmap planning notes`（含 `.gitignore`）
3. PR base **`staging`**（不是 `main`）

---

## 四、已決定的兩件事

### 4.1 規劃文件**納入版控**

`.gitignore` 目前這處未 commit 的修改：

```diff
 # 本機用的規劃草稿，不進版控
-ROADMAP-REPLAN.md
+# ROADMAP-REPLAN.md
```

**定案：納入。** 這兩份是「為什麼這樣決定」的記錄，跟 `docs/release-automation.md` 的踩坑紀錄性質一樣，
是這個 repo 最值錢的部分。執行方式：

- `.gitignore` 那行與上面的註解**直接刪掉**，不要留註解狀態
- `ROADMAP-REPLAN.md` 與 `ROADMAP-REVIEW-R3.md` 兩份一起 `git add`

### 4.2 **先不建** `push-smoke-test.yml` 實體檔案

只寫進文件的 code block。理由有二：

1. 建了檔案就等於把「準備要測」變成「隨時可能被誤觸發」，而目前決定暫不測。
2. 它要等 4-a 的**盤點**做完才知道該測哪一格 —— 先建檔案也用不到。

---

## 五、本次刻意不做的事

| 不做 | 原因 |
| --- | --- |
| 跑 push smoke test | 會留下一筆刻意的 commit，且要等 4-a 盤點完才知道測哪一格 |
| 改 `docs/release-automation.md:117` | 那是歷史記錄，寫的本來就是「加入 **ruleset** 的 bypass 名單」，方向一直是對的；是 roadmap 讀偏了 |
| 現在就決定要不要遷 ruleset | 那是 4-a 的產出，不是文件修正的產出。本輪只負責把選項與代價寫清楚 |
| 真的開始實作 Phase 1 | 這次只修計畫文件 |
| 在 `flowviz.js` 新增節點 | 座標手排，新增要重算版面 |
| 升級 `ci.yml` 現有的 `actions/*` 到 v5 | 獨立的一張小 PR，混進來會讓 review 失焦 |
