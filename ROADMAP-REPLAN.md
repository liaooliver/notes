# GitOps Roadmap 依硬體條件重排 — 修改計畫

> 產出日期：2026-09-18
> 目標分支：`docs/gitops-roadmap-hardware`（已從 `origin/staging` 開出）
> 最終去向：PR → `staging`

---

## 一、背景（Context）

### 1.1 專案現況

`liaooliver/notes` 是一個「個人筆記 repo + CI/CD 練習場」。目前已經完成並驗證過的部分：

| 項目 | 狀態 |
| --- | --- |
| 分支策略 `feature/* → staging → main`，兩層 gate | 已上線 |
| `ci.yml` 五個 job：build → white-box → encryption → ops-handoff → release | 已上線 |
| commitlint + husky 雙重把關 | 已上線 |
| semantic-release **tag-only** 發版（不寫回 `main`） | run #39 驗證通過，發出 `notes-v1.3.0` |
| Phase 0：`build` script 從 placeholder 改成真的複製 `src/` | run #39 驗證（`dist-files` = 863 bytes） |

**分支狀態**：`origin/staging` 領先 `origin/main` 兩個 commit（PR #19 的文件）。
→ **本次工作必須從 `origin/staging` 出發**，因為 `main` 上的 `docs/` 還是舊版。

### 1.2 這次為什麼要改 roadmap

`docs/gitops-roadmap.md` 原本是在**不知道執行環境**的前提下寫的設計稿（標註「以 2026-09-17 的 repo 狀態為準」）。這次進來兩個新輸入，都會實質改變計畫：

**輸入一：硬體確定了** — MacBook M4 / 16 GB + Multipass

這帶出一個**會讓現有計畫失敗的硬傷**：

```
GitHub Actions ubuntu-latest runner  →  linux/amd64
Apple Silicon 上的 Multipass VM      →  linux/arm64
```

原本的 Phase 2 用 `docker/build-push-action` 不指定 `platforms`，產出的 image 只有 amd64。
k3s 拉下去會噴 `no matching manifest for linux/arm64/v8` 或 `exec format error`，
**而且要到 Phase 5（最後一個 Phase）才會爆**，前面四個 Phase 全綠。錯誤訊息完全不提「架構」兩個字。

**輸入二：學習目的明確了** — 對標一份 Vue.js 前端工程師職缺

該職缺的必要條件是 Vue v2/v3、RESTful API、Git、HTML/CSS/JS；
K8S/OCP、CI/CD（Jenkins / Argo CD）、Docker、Unit Test 全部在**加分條件**，
工作內容寫的是「**協助** DevOps Team 進行 CI/CD 上版建置」。

→ 目標是「**有能力參與**容器化與 CI/CD 的前端」，不是叢集管理員。
→ 原 roadmap 的 Phase 7（cosign 簽章、Kyverno 驗簽）投報率很低，該降級。
→ 原 roadmap 最大的缺口不是叢集不夠真實，而是**被部署的東西是 863 bytes 的靜態 HTML**，
   碰不到 multi-stage build、SPA fallback、API proxy 這些前端容器化真正會考的東西。

### 1.3 已經定案的六個決定

| 決定 | 選擇 | 理由 |
| --- | --- | --- |
| 叢集拓樸 | **單節點 k3s**，一台 6 GB VM | 多節點練的是 `drain` / `nodeSelector` / affinity，屬 SRE 範圍。省下的 RAM 給瀏覽器跟 `vite dev` |
| 環境隔離 | **同叢集、兩個 namespace** | 雙叢集要多一套 k3s + 跨 VM kubeconfig。RBAC / ResourceQuota / NetworkPolicy 單叢集就練得到 |
| image 架構 | **multi-arch（amd64 + arm64）** | 成本近乎零（image 只有 COPY、不編譯），解掉 1.2 的硬傷，且之後推雲端不用改 |
| 對外存取 | **Ingress + `/etc/hosts`** | 前端必須懂「網址怎麼被路由到我的服務」。NodePort 會跳過這段 |
| 應用範圍 | **Vue 3 + Express，不碰資料庫**（方案 B） | Postgres 會把人推進 StatefulSet / PV / PVC / StorageClass，那是 k8s 最難也最不相干的一塊 |
| 實作順序 | **先用靜態檔跑通鏈路，再換內容物** | 第一輪失敗只可能是 CI/k8s 設定，第二輪失敗只可能是前端。除錯範圍各自收斂 |
| CI 工具 | **只做 GitHub Actions + Argo CD，不碰 Jenkins** | Jenkins 要再開一台 VM + 學 Groovy；CI 概念（stage / artifact / 審核閘）相通 |

### 1.4 目前進度

**已完成（工作目錄，尚未 commit）**：`docs/gitops-roadmap.md` 已依上述決定重寫，702 → 1201 行（+532 / −33）。

**尚未處理**：Artifact 同步、跨文件一致性、commit + PR。

---

## 二、修改計畫

### 步驟 0：把這份計畫存一份到 repo 根目錄

```
/Users/oliver/Desktop/projects/notes/ROADMAP-REPLAN.md
```

（plan mode 只能寫 `~/.claude/plans/`，執行時複製過去。若不想進版控就加進 `.gitignore`。）

---

### A. `docs/gitops-roadmap.md` — 已改完，待你審閱

檔案：`/Users/oliver/Desktop/projects/notes/docs/gitops-roadmap.md`

| 區塊 | 動作 | 內容 |
| --- | --- | --- |
| 開頭 | 改 | 狀態從「設計稿，尚未實作」→「設計稿，Phase 0 已完成」，加註執行環境 |
| **第 0 節（全新）** | 增 | 0.1 硬體與 arm64/amd64 衝突（附兩種錯誤訊息實體）· 0.2 記憶體預算圖 · 0.3 **學習深度的界線**（值得做 / 不值得優先做兩張表）· 0.4 兩輪推進 · 0.5 刻意不做的事（各附原因） |
| 第 1 節表格 | 改 | `build` 列補「第二輪改 Vue 後這個 job 一行都不用改」；新增第二輪一列；Phase 7 引用 → Phase 10 |
| 第 2.1 節 | 改 | mermaid 圖加上 **Multipass VM 邊界**、Traefik、瀏覽器入口；`docker` 節點標成 multi-arch；補「三個容易混淆的邊界」 |
| 第 3 節 | **重組** | 拆成 3.1 第一輪（Phase 0–6）/ 3.2 第二輪（Phase 7–9）/ 3.3 選配（Phase 10），Phase 標題降一級為 `####` |
| Phase 1 | 改 | 加註「這個單層設計在 Phase 8 會被推翻，第一輪重點是跑通不是寫到最終型態」 |
| Phase 2 | **大改** | 加 `setup-qemu-action` + `setup-buildx-action` + `platforms: linux/amd64,linux/arm64` + `cache-*: type=gha`；`actions/*` 升 v5；新增「multi-arch 到底做了什麼」（manifest list 結構 + `imagetools inspect` 驗證） |
| Phase 4 | 改 | `actions/checkout@v4` → `v5` |
| Phase 5 | **大改** | 從三行 `curl \| sh` 擴寫成 5.1 開 VM（`multipass launch` 參數）/ 5.2 裝 k3s / **5.3 kubeconfig 的 `server: 127.0.0.1` 要 sed 成 VM IP** / 5.4 裝 Argo CD（附「UI 為什麼用 port-forward 不用 Ingress」） |
| Phase 6 | 改 | 標題改為「GHCR pull 權限與對外存取」，新增 `/etc/hosts` 設定、完整請求路徑、**由外往內的四層排錯對照表** |
| **Phase 7（全新）** | 增 | Vue 3 + Vite。重點：`npm run build` 介面沒變 → CI 的 `build` job 一行都不用改；既有 `test/` 要改用 Vitest |
| **Phase 8（全新）** | 增 | multi-stage Dockerfile + `nginx.conf`。兩個關鍵：`FROM --platform=$BUILDPLATFORM` 避開 QEMU 跑 Node（CI 1 分鐘 vs 8 分鐘）；`index.html` 必須 `no-cache`（否則換版後白畫面且重整救不回） |
| **Phase 9（全新）** | 增 | Express + Ingress path 分流。Service DNS、同 origin 免 CORS、`emptyDir` 資料消失當教學點 |
| Phase 7 → **Phase 10** | 改 | 選配降級，前面加優先序說明 |
| 第 5 節 | **重組** | 分成「環境與硬體」（5 條全新）/「CI / CD」/「第二輪（前端）」（4 條全新）/「其他」 |

**已驗證**：88 個 code fence 全部成對、跨節引用（`第 X.Y 節`、`Phase N`）全部指向存在的目標、`npm test` 3 passed。

---

### B. Artifact 同步 — 待做

`https://claude.ai/artifact/9EbPRiqXcJY8ZrqcJXputd`（標題 `Notes GitOps Roadmap`，你擁有，連結分享中）

**發布檔案三個**：`index.html`（55771 B）、`flowviz.js`（12462 B）、`seqviz.js`（16428 B）。
**架構流程圖的資料在 `flowviz.js`，不在 HTML 裡**（`nodes` / `edges` / `scenarios` 三個陣列，座標手排），所以要動兩個檔。

> 作法遵循 `.claude/skills/scenario-atlas/SKILL.md`：版面與渲染器不重新設計，只替換資料與內容。

#### B-1. `index.html`

| 位置 | 動作 |
| --- | --- |
| `.brand small` | 「設計稿，尚未實作」→「M4 + Multipass + k3s」 |
| `.status` 狀態框 | 「以 2026-09-17 的 repo 狀態為準」→ 執行環境 + Phase 0 已完成 |
| 頂欄 `.filters` / 左側 `.nav` | 新增 `#s0` 一項；Phase 清單 P0–P7 → **P0–P10，並分成第一輪 / 第二輪 / 選配三組** |
| **新增 `<section id="s0">`** | 對應 markdown 第 0 節。記憶體預算用 `<pre class="code">` 的方塊圖；「值得做 / 不值得優先做」用兩張 `table` |
| `#s1` 表格 | 同 markdown：`build` 列、新增第二輪列、Phase 7 → Phase 10 |
| `#s3` Phase 區 | Phase 1/2/5/6 內容同步；**新增 Phase 7/8/9 三個 `<h3 id="p7|p8|p9">` 區塊**；Phase 7 選配改 `id="p10"` |
| `#s5` 坑 | 依 markdown 重組成四類 |
| `#s3` 前 | 插入兩輪切分的說明表 |

#### B-2. `flowviz.js`

**只改文字標籤與情境敘述，不動任何座標**（避免重排版風險）：

- `docker` 節點 `l: ['docker job', 'build + push']` → `['docker job', 'buildx multi-arch']`
- `clusters` 第二個 `label: 'k3s cluster'` → `'Multipass VM · k3s（arm64）'`
- `s1` / `s2` 情境中 docker 與 GHCR 那兩步的 `t`，補上「同時出 amd64 + arm64」「k3s 自動挑 arm64 那份」

> 新增節點（例如瀏覽器入口）需要重算 SVG 座標，**本次不做**。真要加再單獨處理。

#### B-3. 發布

用 `Artifact` 工具帶 `url` 原地更新（同一個連結，看的人即時看到新版）。
`seqviz.js` 不在這次變更範圍，publish 時不傳它即可保留。
發布前必須先 `action: "read"` 讀完現行版本全文，從那份檔案改起。

---

### C. 跨文件一致性 — 影響很小

查過全 repo 對 `gitops-roadmap` 的引用，只有四處，**三處不需要動**：

| 檔案 | 引用內容 | 處置 |
| --- | --- | --- |
| `docs/branching-strategy.md:52` | 「把這條 pipeline 延伸到 Docker / GHCR / Argo CD / k3s」 | 不動，仍正確 |
| `docs/use-cases.md:343` | 「對應 gitops-roadmap 的 Phase 0」 | 不動，Phase 0 編號沒變 |
| `docs/release-automation.md:149` | 「`gitops-roadmap.md` 的 Phase 0」 | 不動 |
| `docs/release-automation.md:161` | 「Phase 2 要加的 `docker/*` action 之後也會遇到同一波」（Node 20 淘汰） | **小改**：Phase 2 現在已直接寫 v5，把這句改成「Phase 2 已直接採用 v5」 |
| `README.md:23` | 「下一步：Docker → GHCR → Argo CD → k3s 的 GitOps 延伸設計」 | **小改**：補上「（M4 + Multipass 環境，分兩輪）」 |

---

### D. Commit 與 PR

```
分支：docs/gitops-roadmap-hardware（已從 origin/staging 開好）
```

Conventional Commits，預計兩個 commit：

1. `docs(gitops): replan roadmap for Apple Silicon + Multipass and split into two rounds`
2. `docs: sync README and release-automation cross-references`

PR 標題：`docs: 依 M4 + Multipass 硬體條件重排 GitOps roadmap`
PR 內文需說明：arm64/amd64 硬傷、兩輪切分、Phase 7–9 新增、Phase 7→10 降級。
Base 分支 **`staging`**（不是 `main`）。

> `commitlint` 會在 PR 上跑，訊息必須符合 Conventional Commits。
> Gemini LLM PR Assist 會自動留 review 留言，照往例值得看一眼。

---

## 三、驗證方式

| 項目 | 怎麼驗 |
| --- | --- |
| Markdown 結構 | `grep -c '^```' docs/gitops-roadmap.md` 為偶數；標題層級 `## → ### → #### → #####` 不跳級 |
| 交叉引用 | `grep -o '第 [0-9.]* 節\|Phase [0-9]*'` 的結果全部指向存在的章節（第 0–6 節、Phase 0–10） |
| mermaid | 在 GitHub 上開 PR 的 Files changed 預覽，確認第 2.1 節的圖能算繪（巢狀 subgraph + 引號標籤） |
| 既有測試 | `npm test` → 3 passed（已確認不受影響） |
| CI | PR 開出後 `Build Application` / `White-box` / `Commit Lint` 三個 check 全綠 |
| Artifact | 發布後開連結：頂欄多一個「執行環境」、左側 Phase 清單到 P10 且分三組、流程圖標籤顯示 multi-arch、手機寬度沒有橫向捲動 |
| 文件與 Artifact 一致 | 兩邊的 Phase 編號、兩輪切分、第 0 節內容對得上 |

---

## 四、本次刻意不做的事

| 不做 | 原因 |
| --- | --- |
| 真的開始實作 Phase 1（寫 Dockerfile） | 這次只重排計畫。實作要等計畫定案 |
| 升級 `.github/workflows/ci.yml` 現有的 `actions/*` 到 v5 | 是獨立的一張小 PR，跟文件重排混在一起會讓 review 失焦 |
| 刪除 11 條已合併的遠端分支 | 我被 `Git Destructive` 分類器擋下，需要你自己執行 |
| 在 flowviz.js 新增節點 | 座標手排，新增要重算版面，風險與收益不成比例 |
| 把 `staging` promote 到 `main` | 等 Phase 1 有實際產出時再一起發版 |

---

## 五、審查回饋與定案（2026-09-18 第二輪）

計畫核准後做了一次獨立審查，提出 6 個「實作時會實際卡住」的問題。逐條處置如下。

### 5.1 審查提對、已修正的六點

| # | 問題 | 處置 |
| --- | --- | --- |
| 1 | **`staging` 根本不會觸發新部署鏈路。** `ci.yml` 的 `on.push.branches` 只有 `main`，Phase 2/4 的 staging 路徑永遠不會執行 | Phase 2 新增 **2-a 小節**，把改觸發條件列為第一步，並附各分支會跑哪些 job 的對照表。第 1 節與第 5 節各加一段警告 |
| 2 | **「production 沿用 staging image、不重 build」與 workflow 矛盾。** `staging → main` 的 merge commit SHA 必然不同 | 第 4 節新增 **「production 跑的不是 staging 那個 image」**，用表格對比兩種作法並說明為何選「main 重新 build」，同時誠實列出代價 |
| 3 | **Phase 4 有競態條件。** `IMAGE_TAG` 來自 `github.sha`，`checkout` 拿到的是當下 HEAD，兩次 push 靠近時舊 run 會寫回舊 image | Phase 4 新增「先處理競態」小節 + 時間軸示意，加入三道防線：`concurrency`（`cancel-in-progress: false`）、bump 前比對 `origin/<branch>` 是否仍等於 `GITHUB_SHA`、push 失敗讓 job 紅掉 |
| 4 | **Phase 9 規格不完整。** Phase 3 的 Service 叫 `notes`，Phase 9 卻導到未定義的 `notes-web` | **Phase 3 就改用最終名稱 `notes-web`**（避免 Phase 9 改名造成 Argo CD prune 停機），加上 `component: web/api` label。Phase 9 重寫成 9-a ~ 9-e：完整檔案樹、兩份新 manifest、Ingress 差異、matrix 雙 image 的 CI、兩筆 `images:` 的 bump |
| 5 | **7 碼短 SHA 不是不可變識別** | 全面改用**完整 40 碼 SHA**（`type=sha,format=long`）。新增「為什麼不用短 SHA」小節，附三種寫法的對照表，並說明 digest 才是真正不可變、以及為何本文為了 `git log` 可讀性不選它 |
| 6 | **`paths-ignore` / `[skip ci]` / required checks 只列選項未定案** | Phase 4 新增「定案」表格：用 `GITHUB_TOKEN` + bypass 名單、**不對主 CI 加 `paths-ignore`**（會造成 rollback PR 的 required check 永久 Pending 死結）、另加一個永遠會跑的 `manifest-check` job |

補充兩點也已修正：

- **Phase 5/6 的 pull secret 順序**：Phase 3 的 `imagePullSecrets` 改為預設註解（public repo 不需要），Phase 6 加上明確的順序警告（建 namespace → 建 secret → 取消註解 → 建 Argo CD Application）
- **commit 訊息的全形箭頭**：Phase 4 範例、2.3 時序圖、Rollback 範例全部統一成 ASCII 的 `chore(deploy): bump <env> image to sha-... [skip ci]`

### 5.2 審查說錯的一點

> 「修改計畫的 commit 訊息是英文，與目前要求的繁體中文 commit message 衝突」

**這個 repo 沒有繁中 commit 的要求。** 沒有 `CLAUDE.md`，最近 15 筆 commit 全部是英文（`docs:`、`fix(skill):`、`chore:`、`ci:`）。維持英文 Conventional Commits。

### 5.3 本輪新增的三個決定

| 決定 | 選擇 | 關鍵理由 |
| --- | --- | --- |
| `staging` 要不要有部署環境 | **要，把 `push staging` 加回 `ci.yml`** | 沒有它 GitOps 只有一半會動。代價是 build + white-box 在 merge 後重跑一次（約 1 分鐘），等於推翻 PR #14 —— 這個取捨要寫進 commit 訊息 |
| production 的 image 從哪來 | **`main` 重新 build 自己的** | 跟現有 workflow 結構一致、`main` 保有獨立性（可直接 hotfix）。代價是嚴格說 production 跑的不是 staging 驗過的那份二進位，已寫進文件 |
| manifest 的 image 識別 | **完整 40 碼 SHA tag** | 消除短 SHA 碰撞；保留 `git log` 可讀性。`image_digest` output 先留著，要收緊時（如加 Kyverno 驗簽）可直接改用 |

### 5.4 修改後的規模

`docs/gitops-roadmap.md`：702 → 1597 行（+977 / −82）

---

## 六、第三輪審查與處置（2026-09-18）

完整的查證過程、機制對照與修正計畫在 [`ROADMAP-REVIEW-R3.md`](./ROADMAP-REVIEW-R3.md)（r2，490 行）。這裡只記結論。

### 6.1 審查提的四點，全部屬實

| # | 問題 | 處置 |
| --- | --- | --- |
| 1 | `GITHUB_TOKEN` + bypass 被當成定案，但未經證實 | 見 6.2，這點的範圍最後比審查原本說的大很多 |
| 2 | private GHCR 情境下 `api-deployment.yaml` 沒有 `imagePullSecrets` | 補上與 web 一致的註解區塊；Phase 6 改寫成「兩份都要取消註解」，並加 ServiceAccount 對照方案 |
| 3 | `Phase 5.5` 是幽靈引用，全文只有引用沒有目標 | 正式拆出 `##### 5.5 建 namespace 與 Argo CD Application`，開頭加 public / private 兩條路的分岔 |
| 4 | Phase 3 改名 `notes-web` 之後，Phase 6 還有兩處舊名 | 請求路徑圖與 502/503 排錯格改成 `notes-web`；`ingress.yaml` 的 `metadata.name: notes` 是 Ingress 物件名稱，維持不動 |

另外抓到一條前兩輪都沒發現的**內部自相矛盾**：坑清單先說「改用 PAT 時要加第三層 `paths-ignore`」，下一條又說「`paths-ignore` 是陷阱，不要加」——而改用 PAT 正是前一條的觸發條件。已重寫成一致。

### 6.2 第 1 點最後演變成「重新定義問題」

審查原本的建議是「降級為待驗證，fallback 用 GitHub App」。查下去發現 **fallback 本身不成立**，真正的變數不是 token：

run #32 的 GH006 同時列出兩條規則——「必須透過 PR」（規則 A）與「3 個 required status check」（規則 B）。
classic branch protection 的豁免名單叫「Allow specified actors to bypass **required pull requests**」，只解掉規則 A；規則 B 在 classic 底下**沒有任何針對身分的豁免**，唯一開關是 Include administrators，而 `github-actions[bot]` 不可能是 admin。
bump commit 帶 `[skip ci]`，三個 check 一個都不會跑 → 規則 B 必然觸發 → **換成 GitHub App token 或 PAT 一樣失敗**。

ruleset 的 bypass list 才是整組豁免（A 和 B 都解）。所以決定是「要不要把 `main` / `staging` 從 classic 遷成 ruleset」。

**審查者補的辨識法**：classic 擋下來是 `GH006`，ruleset 擋下來是 `GH013`。`release-automation.md` 保留的 run #32 原始輸出是 `GH006`，所以 `main` 今天就是 classic，也就是矩陣中全部失敗的那一欄。仍建議到 Settings 眼見為憑。

連帶的三項處置：

1. Phase 4 的「定案」改成「未定案」，並新增 `##### 4-a. 動手之前：盤點保護機制並實測`（盤點 → 決定 → 實測三步）。
2. **第 2.2 節（manifest 放哪裡）一併重審**：原本的比較表沒有「會不會撞 branch protection」這一項，因為寫的時候還不知道這是硬傷。現在補上該列，並新增第三個選項——**同 repo、但 Argo CD 讀一條不受保護的 `deploy` 分支**，完全繞開這個問題。若 4-a 的結論是「必須遷 ruleset」，要回頭重讀那一節。
3. 時序圖的 Note 加註「push 身分與目標分支待 Phase 4-a 決定」，避免圖與內文各說各話。

### 6.3 smoke test 的 workflow 用 `push` 觸發，不用 `workflow_dispatch`

`workflow_dispatch` 的 workflow 必須存在於**預設分支**才會出現在 Actions 的 Run workflow 選單，用它就得先讓檔案進 `main`、合併、觸發、再開 PR 刪掉，`main` 平白被動兩次。
改成 `on.push.branches: [chore/push-smoke-test]`，檔案待在拋棄式分支即可——**workflow 檔案所在的分支，和它 push 目標的分支，是兩件獨立的事**。測完刪分支，`main` 完全沒被碰過。

### 6.4 兩件待決事項的定案

- **規劃文件納入版控**：`ROADMAP-REPLAN.md` 與 `ROADMAP-REVIEW-R3.md` 都 `git add`，`.gitignore` 裡的忽略規則整段刪除。理由：這兩份記的是「為什麼這樣決定」，跟 `release-automation.md` 的踩坑紀錄同性質，是這個 repo 最值錢的部分。
- **先不建 `push-smoke-test.yml` 實體檔案**：要等 4-a 的盤點做完，才知道該測矩陣的哪一格。

### 6.5 修改後的規模

`docs/gitops-roadmap.md`：1597 → 1716 行。

---

## 七、4-a 執行結果與 manifest 位置改判（2026-09-19）

### 7.1 4-a 盤點：已執行，結論是 classic

第六輪留下的唯一待辦是「到 Settings 看一眼 `main` / `staging` 是 classic 還是 ruleset」。已執行，而且不只看截圖，另外用 `gh api repos/liaooliver/notes/branches/<branch>/protection` 讀出實際值。

`main` 與 `staging` 設定完全相同：

| 項目 | 實際值 |
| --- | --- |
| 機制 | **classic branch protection**（Rulesets 頁面是空的） |
| 規則 A：必須透過 PR | 開啟，`required_approving_review_count: 0`，bypass 名單空 |
| 規則 B：required status checks | 開啟，3 個 context |
| Include administrators | 關閉 |
| Restrict who can push | 未啟用 |
| Force push | 禁止 |

跟 run #32 的 `GH006` 兩行錯誤逐行對上。**第三輪從錯誤碼推出來的結論成立，矩陣落在左欄，左欄三格全部失敗。**

盤點時多查到兩件文件裡沒有的事：

1. **`required_approving_review_count: 0`** —— 規則 A 只要求「走 PR」，不要求有人 approve。這讓「bot 自己開 PR + auto-merge」看起來像第四條路，但它是死路：repo 的 `allow_auto_merge` 是 `false`，更致命的是 `GITHUB_TOKEN` 開的 PR 不觸發 workflow，三個 check 永遠 Pending，auto-merge 永遠不啟動。要解就得用 App token，於是繼承建 App 的全部成本還多一層 PR 生命週期——比直接走 bypass 更差，已排除。
2. **`default_workflow_permissions: read`** —— 任何要寫入的 job 都得自己宣告 `permissions:`。

### 7.2 決定從「繞過」升級成「換架構」：manifest 移到獨立 repo

classic 無解之後有三條路：轉 ruleset、走不受保護的 `deploy` 分支、manifest 另開 repo。

一開始建議的是 `deploy` 分支（成本最低、不動 `main`）。**使用者反問「依照業界最佳實務，把記錄進版的檔案放到 `deploy` 會不會很奇怪？」——這個問題問對了，而且推翻了那個建議。**

誠實的排序是：

| 做法 | 常見度 |
| --- | --- |
| 另一個 repo | **標準答案**（Argo CD 官方 Best Practices 就是這樣建議） |
| 同 repo、同分支、`deploy/` 目錄 | 很常見 |
| 同 repo、`deploy` 分支 | 最少見，Argo CD 文件還特別提醒過用分支分環境容易出問題 |

我先前把 `deploy` 分支說成「正規 GitOps 寫法」是講過頭了，已在文件與對話中更正。**定案改為獨立 repo `liaooliver/notes-deploy`。**

### 7.3 這個改動一次解掉三個難題

拆出獨立 repo 之後，Phase 4 原本互相牽動的三個未定案有兩個直接作廢：

| 原本的難題 | 為什麼消失 |
| --- | --- |
| branch protection 擋住 bot push | 寫入目標是 `notes-deploy`，不設保護。`main` / `staging` 的設定一個字都不用改 |
| 循環觸發 → 需要 `[skip ci]` | 改的是另一個 repo，`notes` 的 workflow 不會被觸發。`[skip ci]` 從設計中移除 |
| `paths-ignore` 的 merge 死結 | `notes` 裡不再有 `deploy/**`，兩難一起作廢 |

附帶好處：rollback 不必再開 PR 走 branch protection，直接在 `notes-deploy` 上 `git revert` + push。出事的時候這點差很多。

**代價只有一項**：跨 repo 寫入需要憑證。用 deploy key（`ssh-keygen` + `gh repo deploy-key add --allow-write` + `gh secret set DEPLOY_REPO_SSH_KEY`），設定一次。deploy key 綁死單一 repo，比 PAT（預設橫跨帳號下所有 repo）小得多。

### 7.4 public repo 的資安界線

兩個 repo 都是 public，逐條確認過：

| 疑慮 | 結論 |
| --- | --- |
| 私鑰會不會外洩 | 不會。存在 Actions Secrets，不在程式碼裡 |
| fork 來的 PR 能不能偷到 | 不能。GitHub 不把 secrets 傳給 fork PR。例外是 `pull_request_target`，三個 workflow 都沒用（升級 actions 時一併查證過） |
| 金鑰外洩的影響範圍 | 只有 `notes-deploy` 一個 repo |
| manifest 本身有沒有敏感資訊 | 沒有。image 名稱、副本數、資源上限、`.local` 網址而已 |

**唯一紅線：`notes-deploy` 裡永遠不能出現 k8s 的 `Secret` 資源。** `Secret` 的 `data` 只是 base64，不是加密。目前規劃剛好踩不到（repo public → GHCR package public → 拉 image 不需憑證），`imagePullSecrets` 維持註解狀態。將來真要用得先過 Sealed Secrets 或 SOPS。

### 7.5 `push-smoke-test.yml` 取消，改測真正要緊的那一格

原本的 smoke test 是要驗證「bot 能不能 push 進受保護分支」。現在不需要那個能力了，測了沒有意義。

換成測「CI 能不能用 deploy key 寫進 `notes-deploy`」，**而且當天就測了**（用同一招：workflow 放在拋棄式分支 `chore/deploy-key-smoke-test` 上，`push` 觸發，測完刪分支）。

結果三項全中：

| 驗證項目 | 結果 |
| --- | --- |
| `github-actions[bot]` 用 deploy key push 進 `notes-deploy` 的 `main` | 成功（commit `fcf76a8`） |
| `notes` 有沒有因此多出 workflow run | **沒有** —— 拆 repo 解決循環觸發拿到實證，不是推論 |
| deploy key 推的 commit 會不會觸發 `notes-deploy` 自己的 workflow | **會**，`Manifest Check` 跑了且綠燈 |

第三項跟 `GITHUB_TOKEN` 的行為相反（後者產生的 push 不觸發任何 workflow），所以 Phase 4 的每一次 bump 都會自動被驗一次 kustomize。

那筆 empty commit 保留不 revert，它本身就是紀錄。

### 7.5-a 實作內容（已完成）

`liaooliver/notes-deploy` 已建立並推上內容：

```
base/{web-deployment,web-service,ingress,kustomization}.yaml
overlays/{staging,production}/kustomization.yaml
argocd/{notes-staging,notes-production}.yaml
.github/workflows/manifest-check.yml
README.md
```

- public、**刻意不設任何 branch protection**（`gh api .../branches/main/protection` 回 404 Branch not protected）
- deploy key「notes CI」已掛上，`read_only=false`
- `notes` 的 Actions secret `DEPLOY_REPO_SSH_KEY` 已設定
- 本機 `kubectl kustomize` 兩個 overlay 都算得出來，namespace / image / host 三項逐一核對過
- `Manifest Check` 在 GitHub 上跑過兩次都是綠的

### 7.6 順帶處理：`actions/*` 升級（PR #21）

原訂「升 v5」。實際動手前用 `gh api repos/actions/<name>/releases/latest` 查了一次，**發現 v5 在寫下那句話的當天就已經過期**（v5 是 2025-08 發布，當時最新已是 v7 / v8）。改為升到當時的 major：`checkout@v7`、`setup-node@v7`、`upload-artifact@v7`、`download-artifact@v8`，三個 workflow 檔案共 16 處。

跨了三到四個 major，五條 breaking change 逐條對照過這個 repo，沒有一條打到。`release-automation.md` 補上教訓：**文件裡寫死的版本號是寫下當天的快照，不是常數。**

### 7.7 本輪未做

- 沒有動 `main` / `staging` 的任何保護設定——這正是這個方案的重點。
- 沒有轉 ruleset，也沒有建 GitHub App。
