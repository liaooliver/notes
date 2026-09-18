# seqviz.js 支援的 sequenceDiagram 語法子集

寫在 `<div class="seq"><script type="text/plain">` 裡，第一行 `sequenceDiagram`。

| 語法 | 意思 | 算不算一步 |
| --- | --- | --- |
| `participant D as Developer` / `actor Dev as Developer` | 宣告參與者，順序決定欄位順序；沒宣告但出現在訊息裡的 id 會自動補上 | 否 |
| `A->>B: 文字` | 實線、實心箭頭 | 是 |
| `A-->>B: 文字` | 虛線回覆 | 是 |
| `A--xB: 文字` / `A-xB: 文字` | 末端打叉（例如「不觸發」） | 是 |
| `A->B:` / `A-->B:` | 開放箭頭 | 是 |
| `A->>A: 文字` | 自我訊息，畫在生命線右側 | 是 |
| `Note over A: 文字` / `Note over A,B: 文字` | 註解框；`left of` / `right of` 也接受，位置一律當 over 處理 | 是 |
| `alt 標籤` … `else 標籤` … `end` | 分支框 | 否（框內的訊息才算） |
| `opt` / `loop` / `par` … `and` … / `critical` / `break` | 同上 | 否 |
| `<br/>` | 訊息或 Note 內強制換行 | — |
| `autonumber`、`%%` 註解 | 忽略 | — |

不支援：`activate/deactivate`、`rect`、`box`、`links`、訊息末尾的 `+`/`-`。

## 步驟索引怎麼算

從 0 起算，依文字出現順序，只數上表「是」的那幾種。例如：

```
sequenceDiagram
    participant D as Developer
    participant L as Local (husky)
    D->>L: git commit -m "update stuff"      # 0
    L->>L: commitlint --edit                # 1
    alt 訊息符合 Conventional Commits
        L-->>D: commit 成功                  # 2
    else 不符合
        L-->>D: exit 1，commit 被中止        # 3
    end
```

用 `node scripts/check-steps.mjs page.html --list` 印出來對照，不要手算。

## 版面規則（了解即可，不用調）

- 欄距依最長訊息自動算，上限 250px；訊息會自動換行到 280px 內。
- 參與者標籤含括號要用 `as` 別名：`participant L as Local (husky)`。
- 逐步播放時：當前步驟亮色加粗，已發生的變淡到 0.55，未發生的 0.14；alt/par 框在第一個內部步驟出現時亮起。
- 播放器會對容器發 `seqstep` 事件（`detail.step`），頁面靠它連動右側程式碼面板；`container.seqviz` 是播放器物件（`set(k)`、`stop()`、`get()`）。
