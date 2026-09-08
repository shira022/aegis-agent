# Aegis Agent — 製品仕様書

> AIにプログラム（RPA）を作らせ、人間が承認したコードだけを安全に実行する、
> 非エンジニア向け次世代AIエージェント・デスクトップアプリ

## 製品概要

Aegis Agent（イージス・エージェント）は、Shield（盾）の意味を持つ名前の通り、
安全を最優先にしたAI駆動RPAデスクトップアプリケーションです。

### コアフロー

```
①見せる（学習）→ ②確認する（承認）→ ③任せる（実行）→ ④育てる（進化）
```

| フェーズ | 説明 | コア技術 |
|---------|------|---------|
| **見せる（学習）** | PC操作を1回録画し、軽量JSONメタデータとして保存 | Tauri IPC、Playwright、スクリーンショット |
| **確認する（承認）** | AIが決定論的Pythonスクリプト+事前例外ハンドラを生成、ユーザー承認後にロック | AI Code Generation、Static Analysis |
| **任せる（実行）** | サンドボックス化されたPythonサブプロセスで安全に実行 | Python Runtime、Resource Monitor |
| **育てる（進化）** | AIが障害を検知し修正案を提案、パターンを学習 | Error Classification、Vision Analysis |

### セキュリティ原則

- **承認必須**: 全コード実行に人間の承認が必要（自律実行なし）
- **AI幻覚防止**: 決定論的コード生成により予測可能な出力を保証
- **ローカルファースト**: データはすべてユーザーPC上に保存
- **OSキーチェーン**: APIキーはOS標準のキーチェーンで管理

## 仕様カテゴリ一覧

| # | カテゴリ | ファイル | 関連コアフロー |
|---|---------|---------|---------------|
| 1 | [録画・操作記録](recording.md) | `recording.md` | ①見せる（学習） |
| 2 | [AIエンジン](ai-engine.md) | `ai-engine.md` | ②確認する（承認） |
| 3 | [承認ワークフロー](approval.md) | `approval.md` | ②確認する（承認） |
| 4 | [実行エンジン](execution.md) | `execution.md` | ③任せる（実行） |
| 5 | [セルフヒーリング](self-healing.md) | `self-healing.md` | ④育てる（進化） |
| 6 | [Human-in-the-Loop](hitl.md) | `hitl.md` | ④育てる（進化） |
| 7 | [セキュリティ](security.md) | `security.md` | クロスカッティング |
| 8 | [UI/UX](ui.md) | `ui.md` | クロスカッティング |
| 9 | [全体アーキテクチャ](architecture.md) | `architecture.md` | システム全体 |

## パッケージ構成

```
packages/@aegis/
├── shared/       共通型定義・ユーティリティ
├── recorder/     録画・操作記録
├── ai-engine/    AIコード生成エンジン
├── approval/     承認ワークフロー
├── executor/     実行エンジン
├── healer/       セルフヒーリング
├── hitl/         Human-in-the-Loop
├── security/     セキュリティ（PIIマスキング等）
└── ui/           UIコンポーネント（未実装）
apps/
└── desktop/      Tauriデスクトップアプリ
engines/
└── python-runtime/  Python実行環境テンプレート
```

## 開発状況

| カテゴリ | 状態 |
|---------|------|
| shared, recorder, ai-engine, approval, executor | ✅ 実装済み |
| healer, hitl, security | ✅ 実装済み |
| ui | ⬜ 未実装 |
| desktop app | ⬜ 未実装（骨格のみ） |
| Python runtime | ⬜ テンプレートのみ |

最終更新: 2026-09-08
