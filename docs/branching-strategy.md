# Branching Strategy

這個專案採用「集成分支收斂後才發布」的模式，而不是每個功能分支直接 merge 進 `main`。

```
feature/* ──PR──▶ staging ──PR/merge──▶ main
```

## 為什麼

`ci.yml` 裡的 `ops-handoff`（人工審核 production 環境）跟 `release`（semantic-release 正式發版）
是模擬「一次正式發布」的動作。如果每個小功能分支都直接 merge 進 `main`，就代表每次小改動都要走一次
正式發布流程、審核者要一直審、版本號也會跳得很碎。改成先進 `staging` 收斂，可以把「merge 頻率」跟
「發布頻率」解耦。

## 兩層 gate

| 分支 | 觸發的 job | 目的 |
| --- | --- | --- |
| PR / push 到 `staging` | `build`、`white-box`（Semgrep + Trivy） | 輕量把關：功能分支能不能被接受進集成分支 |
| push 到 `main`（staging 的 promotion） | `build`、`white-box`、`encryption`、`ops-handoff`、`release` | 完整發布流程：只有正式要發版時才跑 |

`encryption` / `ops-handoff` / `release` 這三個 job 都用 `if: github.event_name == 'push' && github.ref == 'refs/heads/main'` 擋住，
確保它們只在 `staging → main` 的那次 push 觸發，不會因為功能分支進 `staging` 就跑一次。

## 日常流程

1. 從 `staging` 切功能分支（`feature/xxx`），開發完 PR 回 `staging`
2. `staging` 上的 PR 只跑 `build` + `white-box`，過了就能 merge
3. 累積到一個可以發版的節點，把 `staging` merge（或開 PR）到 `main`
4. `main` 上的 push 觸發完整流程：build → 掃描 → 加密 → `ops-handoff` 人工核准 → `release` 自動算版號發布

`.github/workflows/llm-pr-assist.yml` 的三個 LLM job 沒有限制目標分支，所以無論 PR 開去 `staging` 還是
`main`，都會照樣跑（commit message 建議 / PR 摘要 / code review comment）。
