# 筆記倉庫

個人筆記存放區，同時是一個 CI/CD 練習場：從 commit 規範、分支策略、安全掃描、人工審核到自動發版，
每一步都是真的跑過、真的踩過坑才寫下來的。

## 分支與流程

```
feature/* ──PR──▶ staging ──PR──▶ main ──(approve)──▶ release
```

- `staging`：輕量 gate（build / test / 白盒掃描），功能分支在這裡收斂
- `main`：完整 gate（加密 → production 環境人工審核 → semantic-release 發版）

## 文件索引

| 文件 | 內容 |
| --- | --- |
| [docs/use-cases.md](docs/use-cases.md) | 開發者每個動作會觸發什麼，逐條情境 + 時序圖 |
| [docs/branching-strategy.md](docs/branching-strategy.md) | 為什麼是 `feature → staging → main`、兩層 gate 的設計 |
| [docs/release-automation.md](docs/release-automation.md) | commitlint / husky / semantic-release 的演進與踩坑紀錄 |
| [docs/llm-pr-assist.md](docs/llm-pr-assist.md) | 用 Gemini 在 PR 上自動做 commit 建議、摘要、code review |
| [docs/gitops-roadmap.md](docs/gitops-roadmap.md) | 下一步：Docker → GHCR → Argo CD → k3s 的 GitOps 延伸設計 |

## Workflow 檔案

| 檔案 | 觸發 | 做什麼 |
| --- | --- | --- |
| `.github/workflows/ci.yml` | push / PR 到 `main`、`staging` | build → test → 白盒掃描 →（僅 main push）加密 → 審核 → 發版 |
| `.github/workflows/commitlint.yml` | 所有 PR、push 到 `main`、`staging` | 檢查 commit 訊息符合 Conventional Commits |
| `.github/workflows/llm-pr-assist.yml` | 所有 PR | Gemini 產生 commit 建議 / PR 摘要 / code review 留言 |

---

*最後更新：2026-09-17*
