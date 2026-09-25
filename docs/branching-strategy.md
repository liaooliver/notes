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
| PR 到 `staging` | `build`、`white-box`（Semgrep + Trivy） | 輕量把關：功能分支能不能被接受進集成分支。merge 後的 push 不再重跑 |
| push 到 `main`（staging 的 promotion） | `build`、`white-box`、`docker`、`bump-production`、`release` | 完整發布流程：只有正式要發版時才跑 |

`bump-production`（Ops Handoff）與 `release` 這兩個 job 都用 `if: github.event_name == 'push' && github.ref == 'refs/heads/main'` 擋住，
確保它們只在 `staging → main` 的那次 push 觸發，不會因為功能分支進 `staging` 就跑一次。

## 日常流程

1. 從 `staging` 切功能分支（`feature/xxx`），開發完 PR 回 `staging`
2. `staging` 上的 PR 只跑 `build`（含 `npm test`）+ `white-box`，過了就能 merge
3. 累積到一個可以發版的節點，把 `staging` 開 PR 到 `main`
4. `main` 上的 push 觸發完整流程：build → 掃描 → 推 multi-arch image → **人工核准** → bump production manifest → `release` 自動算版號發布

`.github/workflows/llm-pr-assist.yml` 的三個 LLM job 沒有限制目標分支，所以無論 PR 開去 `staging` 還是
`main`，都會照樣跑（commit message 建議 / PR 摘要 / code review comment）。

## Promote 一定要 merge commit，不能 squash

`staging → main` 那個 PR，**按 merge 時一定要選 "Create a merge commit"**。功能分支進 `staging` 用 squash 沒問題，只有 promote 這一步不行。

原因是 parent。squash 產生的是一個全新的 commit，它只有一個 parent —— 舊的 `main`。git 因此完全不知道這份內容來自 `staging`：兩邊檔案一模一樣，但**沒有共同祖先**。下一次 promote，git 會拿 `staging` 的每一個 commit 重放一遍，**每個檔案都衝突**，而且內容看起來還一樣，非常難懂。

PR #30 踩過這個坑。修法是在 `staging` 上補一次「只認祖先、不動內容」的合併：

```bash
git checkout staging
git merge -s ours --no-ff origin/main -m "chore: record main's squashed history as an ancestor of staging"
# -s ours 的意思是「留下我這邊的檔案內容，但把對方記成 parent」
git push origin staging
```

修好之後檢查方向不要搞反：

```bash
git diff origin/main origin/staging --stat                      # 要是空的（內容一致）
git merge-base --is-ancestor origin/staging origin/main && echo OK   # staging 是 main 的祖先
```

反過來問（`main` 是不是 `staging` 的祖先）會得到「否」，**那是正常的** —— merge commit 本來就讓 `main` 多了一個 `staging` 沒有的節點。

## Branch protection

`main` 與 `staging` 都設了 classic branch protection：

- **Require a pull request before merging**：不能直接 push，一定要走 PR
- **Require status checks to pass**：`Build Application`、`White-box Security Scan`、`Validate Commit Messages` 三個 check 綠燈才能按 merge
- **不要求 review approval**：單人 repo 若要求 1 人 approve 會自己卡死（GitHub 不算 PR 作者自己的 approve）

LLM PR Assist 的三個 job 刻意**不列入** required checks，它們是輔助性質，Gemini 掛了不該擋 merge。

已知影響：`release` job 用 `GITHUB_TOKEN` push 版本 commit 到 `main`，會被「必須透過 PR」擋下，
詳見 `release-automation.md` 的「已知的坑」。

## 延伸閱讀

- [use-cases.md](use-cases.md)：每個開發者動作對應會觸發什麼，逐條情境 + Mermaid 時序圖
- [gitops-roadmap.md](gitops-roadmap.md)：把這條 pipeline 延伸到 Docker / GHCR / Argo CD / k3s 的設計
