# Artifact Kit：「情境圖鑑」型知識頁的可重用套件

「Notes CI 情境圖鑑」（https://claude.ai/artifact/9q6a6Bs7uWDND4WBYasWLC）與「Notes GitOps Roadmap」
（https://claude.ai/artifact/9EbPRiqXcJY8ZrqcJXputd）用的版面、色系、互動圖表都抽在這個目錄，
下次要用同一套介面做別的主題（例如「Kubernetes 排程情境圖鑑」「OAuth 授權流程圖鑑」），把下面的提示詞
貼給 Claude Code 即可。

## 目錄內容

| 檔案 | 用途 |
| --- | --- |
| `theme.css` | 全部樣式：墨綠單一主題 tokens、版面、總覽表、案例卡、時序圖 / 流程圖 SVG、右側程式碼面板 |
| `seqviz.js` | 把 Mermaid `sequenceDiagram` 子集解析成 SVG 並提供逐步播放（重來 / 上一步 / 下一步 / 播放 / 全部 / 進度條 / 方向鍵） |
| `flowviz.js` | 手繪 SVG 流程圖 + 情境逐步點亮；`nodes` / `edges` / `scenarios` 三個陣列是資料，換主題時整段替換 |
| `template.html` | 頁面骨架：頂欄篩選、左側目錄、導言、總覽表、案例卡（情境 / 觸發 / 依序 / 結果 / 時序圖）、已知問題、對應檔案，以及所有互動的 JS |
| `build-snippets.mjs` | 把「對照程式碼」注入每個案例的時序圖右側 |
| `snippets.example.mjs` | 對照程式碼的資料格式範例（來自 CI 情境圖鑑） |

## 產出流程（給 Claude 的工作步驟）

1. 複製 `template.html` 為 `<主題>.html`，把 `theme.css` 整段貼進 `<style>`（Artifact 的 CSP 不允許外部 stylesheet）。
2. 填內容：每個案例一個 `<article class="case" id="uc-NN" data-stage="...">`，時序圖用 Mermaid `sequenceDiagram` 語法寫在
   `<div class="seq"><script type="text/plain">` 裡；支援 `participant/actor`、`->>`、`-->>`、`--x`、`Note over`、`alt/else`、`opt`、`loop`、`par/and`、`<br/>`。
3. 寫 `snippets.mjs`：`{ 'uc-01': [{ file, steps: [..], why, code }] }`，`steps` 是該圖的步驟索引（0 起算，每則訊息或 Note 算一步，
   block 標頭不算），`code` 裡以 `>>` 開頭的行會標亮。
4. `node build-snippets.mjs <主題>.html snippets.mjs`，注入右側面板（可重複執行）。
5. 驗證：用 Node 載入 `seqviz.js` 解析每張圖，確認每個 snippet 的 `steps` 不超出該圖步數；再起本機 `python3 -m http.server`，
   用瀏覽器按幾次「下一步」確認圖與程式碼面板同步點亮，且 console 沒有錯誤。
6. 發布：`Artifact` publish 時 `files` 附上 `seqviz.js`（有流程圖再加 `flowviz.js`）；favicon 一個 emoji，`<title>` 兩到四個字的專名。

## 提示詞範本

把 `＜＞` 換掉後整段貼上：

```
請用 repo 裡 docs/artifact-kit/ 這套元件，做一份「＜主題名稱＞」的知識 Artifact，
介面、色系、圖表互動要跟「Notes CI 情境圖鑑」完全一致。先讀 docs/artifact-kit/README.md，照它的流程做，不要自創版面。

主題與範圍：
- 這份文件回答的問題：＜一句話，例如「開發者做了什麼，整條流程會怎麼反應」＞
- 參與者（時序圖 participant，固定名稱）：＜A、B、C…＞
- 主流程：＜起點 → 關卡 → 終點＞
- 內容以 ＜日期／版本＞ 的 ＜repo／系統＞ 為準

案例清單（每條都要有 情境 / 觸發 / 依序 / 結果 四段 + 一張 sequenceDiagram + 右側對照程式碼）：
- UC-01 ＜開發者／使用者做了什麼＞ → ＜結果＞
- UC-02 …
（階段分類 data-stage：＜stage-a、stage-b…＞，頂欄篩選用）

對照程式碼來源（右側面板只能引用這些檔案的真實內容，不要編）：
- ＜path/to/file＞：＜負責什麼＞
- …

如果有真的發生過的事（錯誤訊息、PR 編號、run 編號），放進對應案例的「實際發生過」區塊。

視覺與互動硬性要求：
- 單一主題墨綠底（theme.css 的 tokens），無陰影、無圓角、無 emoji、無底色藥丸；結果標籤用小方塊 + 文字
- 字體 IBM Plex Sans / IBM Plex Mono，中文回退 Noto Sans TC
- 所有圖表都用 seqviz.js（時序）或 flowviz.js（流程）畫成 SVG，可逐步播放，不用 Mermaid 原生渲染
- 時序圖右側的程式碼片段要跟步驟連動：當前步驟相關的片段亮起、重點行加底色、其他片段壓淡；點片段可跳到對應步驟
- 頂欄可依階段篩選，左側目錄捲動時標記目前位置

完成前：用 node 檢查每個 snippet 的 steps 是否在該圖範圍內，本機起 http server 用瀏覽器實際按「下一步」驗證過再發布。
發布時 files 附上 seqviz.js（有流程圖再加 flowviz.js）。
```

有流程圖需求時再加一段：

```
另外做一張架構流程圖（flowviz.js）：節點＜…＞、邊＜…＞，情境按鈕：
- ＜情境一＞：＜步驟 1 → 2 → …，每步一句說明＞
- ＜情境二＞：…
```

## 注意事項

- `seqviz.js` / `flowviz.js` 內只能有 ASCII（非 ASCII 一律 `\uXXXX`），否則沒有 charset 的靜態伺服器會讓 regex 解析失敗。
- `<script type="text/plain">` 裡的 Mermaid 文字不會被 HTML 解析，`<br/>` 直接寫即可；但 `</script>` 不能出現在裡面。
- 時序圖欄距上限 250px，參與者太多（7 個以上）會很寬，會出現水平捲軸，屬預期行為。
- `build-snippets.mjs` 靠 `<div class="diagram-label">時序圖</div>\n<div class="seq">` 這個固定結構定位，改版面時要一起改。
- 頁面在 Artifact 檢視器裡是 iframe，瀏覽器自動化工具無法捲動它；驗證時改用本機 http server 開 `test-*.html`（前面加 `<meta charset="utf-8">`）。
