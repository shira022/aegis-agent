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
