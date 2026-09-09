# Aegis Agent — AI-Powered RPA Desktop App

このリポジトリは **Aegis Agent** のモノレポ（pnpm + Turborepo）です。
非エンジニア向けのAI駆動RPAデスクトップアプリを構築しています。

## プロジェクト構成

```
aegis-agent/
├── apps/desktop/          ← Tauri v2 デスクトップアプリ（React + TypeScript）
├── packages/@aegis/
│   ├── shared/            ← 共有型・ユーティリティ
│   ├── ai-engine/         ← Vercel AI SDK v6 ベースのAI推論エンジン
│   ├── executor/          ← RPAスクリプト実行エンジン
│   ├── approval/          ← HITL承認フロー
│   ├── hitl/              ← ヒューマンインザループ管理
│   ├── healer/            ← 自己修復ロジック
│   ├── recorder/          ← アクション記録・CSSセレクタ生成
│   ├── security/          ← PII検出・SSRF防护
│   └── ui/                ← 共有UIコンポーネント
├── engines/python-runtime ← Pythonサブプロセス実行ランタイム
├── docs/                  ← スペック・ADR
└── learnings/             ← 開発での学び
```

## ブランチ戦略（Git Flow）

| ブランチ | 目的 | マージ先 |
|----------|------|----------|
| `main` | リリースのみ（PR必須） | — |
| `develop` | 開発統合ブランチ | `main`（PR） |
| `feature/*`, `fix/*`, `docs/*`, `refactor/*`, `chore/*` | 隔離作業 | `develop`（PR） |

- ブランチ命名: kebab-case (`feature/audio-recorder`, `fix/race-condition`)
- コミット: [Conventional Commits](https://www.conventionalcommits.org/)（`feat:`, `fix:`, `docs:` etc.）
- PRは `develop` へ向ける。`main` への直接マージ禁止

## ビルド・テストコマンド

```bash
pnpm install           # 依存関係インストール
pnpm dev               # 開発サーバー起動（Turborepo並列）
pnpm build             # 全パッケージビルド
pnpm test              # 全テスト実行
pnpm lint              # リント
pnpm typecheck         # TypeScript型チェック
```

個別パッケージの操作:
```bash
cd packages/@aegis/ai-engine && pnpm test
cd apps/desktop && pnpm typecheck
```

## CI/CD

GitHub Actions（`.github/workflows/ci.yml`）が自動実行:
- **Lint & Type Check** → pnpm lint + tsc --noEmit
- **Test** → vitest（カバレッジ付き）
- **Build** → turbo build + dist確認
- **Security Audit** → pnpm audit + TruffleHog

## ルール

- **型安全**: strict TypeScript。any の使用は原則禁止
- **テスト必須**: 新機能・バグ修正にはテストを添える
- **セキュリティ**: APIキー等の機密情報はコミットしない（.env, OS keychain）
- **共有UI**: `@aegis/ui` に集約。Web/Desktopの共通部分は共有コードで維持
- **AI SDK**: Vercel AI SDK v6系（`ai@6.x`, `@ai-sdk/*@3.x`）を使用。v4/v5とは非互換
- **パッケージ間参照**: `workspace:*` で相互参照。循環参照禁止

## 開発時の注意

- TauriビルドにはRust Toolchain + Windows SDK（ホスト側）が必要
- Pythonサブプロセスは `engines/python-runtime` 経由
- モデルプロバイダー設定はOSキーチェーンに保存（.env非推奨）

## Autonomous Agent Workflow

### Skill Loading
- **Always load relevant skills first** before starting work. Skills live in `.agents/skills/` and encode domain-specific procedures.
- At minimum, load `build-and-test` before any verification task and `code-review` before PRs.
- If a skill is missing steps or has wrong commands, update it via `skill_manage(action='patch')` before finishing.

### Self-Improvement Loop
1. Execute task → encounter friction → identify root cause
2. If the pattern recurs (3+ times), extract it into a new skill via `skill_crafter`
3. After complex tasks, run `knowledge-harvest` to extract structured learnings
4. Record significant architectural decisions as ADRs via the `adr` skill

### ADR Creation Triggers
Create an ADR (using `.agents/skills/adr`) when:
- Introducing a new technology choice or framework
- Changing an established architectural pattern
- Reversing a previous decision
- The decision affects multiple packages or the overall system architecture

### Verification Loops
1. **Local first**: `pnpm typecheck && pnpm test && pnpm lint` on changed packages
2. **Hook-driven**: Git hooks (`pre-commit`, `post-commit`) validate incrementally
3. **PR gate**: CI runs full build + security audit before merge to `develop`
4. **Post-merge**: Verify `develop` builds cleanly; fix regressions immediately

## Skills Overview

| Skill | When to Use |
|-------|-------------|
| `adr` | Recording Architecture Decision Records for non-trivial design choices |
| `build-and-test` | Running builds, tests, type-checks — pre-PR verification |
| `code-review` | PR review, pre-merge quality gate, self-review before push |
| `new-package` | Scaffolding a new `@aegis/*` package in the monorepo |
| `security-audit` | Auditing for PII leaks, SSRF, secrets, command injection — before releases |

## Agent Delegation Patterns

### Use `delegate_task` when:
- The task decomposes into 2+ **independent** subtasks (e.g., audit package A and package B in parallel)
- A subtask is **reasoning-heavy** and would flood the context (e.g., full code review across 5 packages)
- You need to **compare or synthesize** results from multiple parallel investigations

### Do NOT delegate when:
- The work is **single-step mechanical** (run a command, read a file)
- It can be completed in 1–2 tool calls
- The task requires **user interaction** (subagents cannot ask questions)

### Worktree Conventions for Parallel Work
- Use `git worktree` branches for isolated parallel features (`worktree-parallel-dev` skill)
- Each worktree gets its own branch — never share uncommitted state across worktrees
- Run `pnpm install` in each worktree before building
- After parallel work merges, run a full `pnpm build` on `develop` to verify integration

### Delegation Hierarchy
- **Orchestrator role** (`role='orchestrator'`): spawns further sub-decompositions (depth ≤ 3)
- **Leaf role** (default): executes focused tasks and returns results
- Always pass **full context** to subagents — they have no shared history with you
- Verify subagent results yourself before claiming success to the user
