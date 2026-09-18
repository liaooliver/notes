---
name: scenario-atlas
description: 產出「情境圖鑑」型的知識 Artifact：逐條案例（情境 / 觸發 / 依序 / 結果）+ 可逐步播放的 SVG 時序圖 + 右側跟著步驟點亮的對照程式碼，以及可選的情境式 SVG 架構流程圖，整頁用固定的低亮度墨綠風格。使用者提到「情境圖鑑」、「像 Notes CI 情境圖鑑那樣」、「用一樣的介面做 ＜某主題＞」、「案例 + 時序圖 + 程式碼對照」、「可以一步一步看的流程圖」、「使用者做了什麼系統會怎麼反應」這類需求時，一律用這個 skill，不要從零設計版面或用 Mermaid 原生渲染；即使使用者沒說 Artifact，只要是要把一套流程／系統行為整理成可互動瀏覽的頁面，也套用這個 skill。
---

# Scenario Atlas（情境圖鑑）

把「某個系統在各種情境下會怎麼反應」整理成一份可互動的 Artifact。第一份是 repo 的 CI/CD
（https://claude.ai/artifact/9q6a6Bs7uWDND4WBYasWLC），使用者希望之後任何主題都長得一模一樣，
所以版面、色系、圖表渲染器都固定在 `assets/`，你的工作只有兩件：**填內容**與**驗證**。

## 為什麼要用套件而不是重新設計

時序圖與流程圖是幾百行手寫 JS 畫成 SVG 並提供逐步播放；每次重新生成一定會漂移，
使用者已明確要求「介面與圖表互動要一樣」。因此：

- `assets/theme.css`、`assets/seqviz.js`、`assets/flowviz.js` 原封不動使用，只有 `flowviz.js` 裡的
  `nodes / edges / scenarios` 三個資料陣列可以替換。
- 版面結構從 `assets/template.html` 複製，不要自己排。
- 圖表資料仍用 Mermaid `sequenceDiagram` 語法寫（門檻低、可放進 markdown），但渲染一律交給 `seqviz.js`。

## 產出流程

### 1. 收集內容

先確認三件事，缺的就問使用者（一次問完）：

1. 這份文件回答的問題是什麼（會變成 `<h1>`），參與者有哪些（時序圖 participant 的固定名稱）。
2. 案例清單：每條是「誰做了什麼 → 系統怎麼反應」，並分到 2 到 5 個階段（頂欄篩選用）。
3. 對照程式碼的來源檔案。右側面板**只能放這些檔案的真實內容**，不能編；先 Read 一遍再摘。

有真的發生過的事（錯誤訊息、PR 編號、run 編號）就放進該案例的「實際發生過」區塊，這是使用者最重視的部分。

### 2. 組頁面

```bash
SK=.claude/skills/scenario-atlas
mkdir -p <workdir> && cp $SK/assets/template.html <workdir>/<topic>.html
cp $SK/assets/seqviz.js <workdir>/          # 有流程圖再 cp flowviz.js
```

- 把 `assets/theme.css` 整段貼進頁面的 `<style>`（Artifact 的 CSP 不允許外部 stylesheet）。
- `<title>` 用兩到四個字的專名（例如「Notes CI 情境圖鑑」），不要加冒號解釋。
- 每個案例一個 `<article class="case" id="uc-NN" data-stage="...">`，內容照 template 的四段 `dl.story`。
  結果標籤用 `<span class="pill pass|wait|fail|none">`，四種語意：通過或發版 / 等待 / 擋下或失敗 / 無影響。
- 時序圖寫在 `<div class="seq"><script type="text/plain">` 裡，語法子集見 `references/seq-syntax.md`。
  `</script>` 不能出現在裡面；`<br/>` 可直接寫。
- 總覽表、左側目錄、頂欄篩選的 `data-stage` 要跟案例一致，否則篩選會漏。

### 3. 對照程式碼

寫 `<workdir>/snippets.mjs`（格式見 `references/snippets.example.mjs`）：

```js
export default {
  'uc-01': [
    { file: '.husky/commit-msg', steps: [0, 1], why: '一句話說這段跟這幾步的關係', code: `
>>npx --no -- commitlint --edit \${1}` },
  ],
};
```

- `steps` 是該圖的步驟索引，0 起算；**每則訊息、自我訊息、Note 各算一步，alt/par 等區塊標頭不算**。
  先跑 `node $SK/scripts/check-steps.mjs <topic>.html --list` 印出每張圖的步驟編號與文字，再對照著填，不要用猜的。
- `code` 裡以 `>>` 開頭的行會標亮，是「這一步真正對應的那幾行」，一段控制在 3 到 20 行。
- 每個案例 2 到 5 段就夠，寧可少而準。
- 非程式碼的機制（例如 GitHub 的 branch protection 設定）可以用一段「設定截錄」代替，`file` 寫清楚是設定不是檔案。

注入：

```bash
node $SK/scripts/build-snippets.mjs <workdir>/<topic>.html <workdir>/snippets.mjs
node $SK/scripts/check-steps.mjs <workdir>/<topic>.html     # 全部 ok 才往下
```

`build-snippets.mjs` 可重複執行，會先移除舊的面板。它靠 template 裡
`<div class="diagram-label">時序圖</div>\n<div class="seq">` 這個固定結構定位，改版面時要一起改。

### 4. 架構流程圖（選配）

主題有「整體架構 + 幾條走法」時才做。複製 `assets/flowviz.js`，替換 `nodes / edges / scenarios`，
格式見 `references/flowviz-data.md`。頁面放 `<div class="flow-viz" id="arch" tabindex="0"></div>`
並在 `SeqViz.mountAll` 之後呼叫 `FlowViz.mount(document.getElementById('arch'))`。

### 5. 驗證（發布前一定要做）

Artifact 檢視器是 iframe，瀏覽器自動化工具捲不動它，所以用本機靜態伺服器驗證：

```bash
cd <workdir>
(printf '<meta charset="utf-8">\n'; cat <topic>.html) > test.html   # python http.server 不帶 charset
python3 -m http.server 8765 --bind 127.0.0.1 &
```

用 Chrome 工具開 `http://127.0.0.1:8765/test.html#uc-01`，`find` 該案例的「下一步」按鈕，用**座標**點兩三次
（ref 點擊在重建過的控制列上不可靠），截圖確認：當前訊息變亮、參與者方塊點亮、右側對應片段亮起且其他片段壓淡；
`read_console_messages` 沒有錯誤。驗證完關掉 server 與分頁。

### 6. 發布

```
Artifact publish
  file_path: <workdir>/<topic>.html
  root: <workdir>
  files: {"seqviz.js": "seqviz.js"}            # 有流程圖再加 "flowviz.js"
  favicon: 一個 emoji（只在第一次）
  description: 一句話說這頁是什麼
```

同一對話內重新發布時用相同 file_path 就會更新同一個連結。

## 視覺硬性規則（使用者明確要求）

- 單一主題：低亮度墨綠底 `#33423a`，灰綠字，不做亮色版；tokens 全在 `theme.css` 的 `:root`。
- 無陰影、無圓角、無 emoji、無底色藥丸、無漸層；分隔只用實線，篩選用底線切換。
- 字體 IBM Plex Sans / IBM Plex Mono，中文回退 Noto Sans TC（Google Fonts 連結已在 template）。
- 圖表全部是自繪 SVG 且可逐步播放；時序圖裡的勾叉用「通過 / 失敗」文字，不用符號。

## 常見坑

- `seqviz.js` / `flowviz.js` 只能含 ASCII（非 ASCII 用 `\uXXXX`）。沒有 charset 的靜態伺服器會讓含中文的 regex 直接語法錯誤。
  改過腳本後用 `grep -P '[^\x00-\x7f]'` 檢查。
- 參與者超過 7 個或訊息很長時圖會很寬並出現水平捲軸，是預期行為；真的太寬就把訊息文字用 `<br/>` 斷行。
- 一個 Note 也算一步；alt/else 的分隔線不算。填錯 `steps` 時 `check-steps.mjs` 會報 OUT OF RANGE，但**填到錯的步驟不會報錯**，
  所以一定要對著 `--list` 的輸出填。
- 頁面的篩選狀態存在 localStorage，key 含 `document.title`；驗證時看到不是「全部」是正常的。
