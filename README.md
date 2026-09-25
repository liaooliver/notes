# 筆記倉庫

個人筆記存放區，同時是一個 CI/CD 練習場：從 commit 規範、分支策略、安全掃描、人工審核、自動發版，
一路做到 Docker image、Argo CD 與 k3s 的 GitOps 部署，每一步都是真的跑過、真的踩過坑才寫下來的。

## 分支與流程

```
feature/* ──PR──▶ staging ──PR──▶ main ──(approve)──▶ release
                    │                                    │
                    ▼                                    ▼
             k3s / notes-staging                 k3s / notes-production
```

- `staging`：輕量 gate（build / test / 白盒掃描），功能分支在這裡收斂；merge 後自動部署到 `notes-staging`
- `main`：完整 gate（build image → production 環境人工審核 → 更新 manifest → semantic-release 發版），部署到 `notes-production`
- 兩個 namespace 都跑 `notes`（Vue 3 前端）+ `notes-api`（Express）兩個服務，Ingress 用路徑分流
- k8s manifest 不在這個 repo，在 [`liaooliver/notes-deploy`](https://github.com/liaooliver/notes-deploy)；Argo CD 只讀那一個 repo

## 文件索引

| 文件 | 內容 |
| --- | --- |
| [docs/use-cases.md](docs/use-cases.md) | 開發者每個動作會觸發什麼，逐條情境 + 時序圖 |
| [docs/branching-strategy.md](docs/branching-strategy.md) | 為什麼是 `feature → staging → main`、兩層 gate 的設計 |
| [docs/release-automation.md](docs/release-automation.md) | commitlint / husky / semantic-release 的演進與踩坑紀錄 |
| [docs/llm-pr-assist.md](docs/llm-pr-assist.md) | 用 Gemini 在 PR 上自動做 commit 建議、摘要、code review |
| [docs/gitops-roadmap.md](docs/gitops-roadmap.md) | 已上線的 GitOps 鏈路：Docker → GHCR → Argo CD → k3s（M4 + Multipass 環境），Phase 0 ~ 9 的實作與踩坑紀錄 |
| [導讀 Artifact](https://claude.ai/artifact/5tohUUhm9qZzQZPJgjTWca) | 互動式導讀頁：把上面幾份文件整理成可逐步播放的情境圖鑑 |

## Workflow 檔案

| 檔案 | 觸發 | 做什麼 |
| --- | --- | --- |
| `.github/workflows/ci.yml` | PR 到 `main`、`staging`；push 到 `main`、`staging` | build → test → 白盒掃描 → build & push 兩個 image 到 GHCR → 更新 `notes-deploy` 的 image tag（`main` 需人工審核）→（僅 `main`）發版 |
| `.github/workflows/commitlint.yml` | 所有 PR、push 到 `main`、`staging` | 檢查 commit 訊息符合 Conventional Commits |
| `.github/workflows/llm-pr-assist.yml` | 所有 PR | Gemini 產生 commit 建議 / PR 摘要 / code review 留言 |

---

*最後更新：2026-09-26*
