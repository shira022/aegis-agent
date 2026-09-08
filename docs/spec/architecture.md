# 全体アーキテクチャカテゴリ

> パッケージ: システム全体
> コアフロー: 全フローの統合

## 概要

Aegis Agent全体のシステムアーキテクチャ、パッケージ間の関係、
データフローを定義するカテゴリです。

**核心思想**: フロントエンド/バックエンドはすべてローカルPC上で動作し、
AI処理のみクラウドに委譲します。すべてのデータはユーザーPC上に保存され、
外部送信されるデータはPIIマスキング済みです。

## 要件

### 機能要件

| ID | 要件 | 優先度 |
|----|------|--------|
| ARCH-01 | ローカルファーストアーキテクチャ | Must |
| ARCH-02 | クラウドAI連携（プロンプト/レスポンス） | Must |
| ARCH-03 | パッケージ間の明確な依存関係 | Must |
| ARCH-04 | データフローの可観測性 | Should |
| ARCH-05 | Tauriデスクトップアプリ統合 | Must |

### 非機能要件

| ID | 要件 | 基準値 |
|----|------|--------|
| ARCH-NF01 | 起動時間 | < 5秒 |
| ARCH-NF02 | メモリ使用量 | < 500MB |
| ARCH-NF03 | ディスク使用量 | < 1GB |
| ARCH-NF04 | クロスプラットフォーム | Windows, macOS |

## システム構成図

```
┌─────────────────────────────────────────────────────────┐
│                    Desktop App (Tauri)                   │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌────────┐ │
│  │ Recorder │  │ Approval │  │ Executor │  │  UI    │ │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────────┘ │
│       │              │              │                    │
│  ┌────┴─────┐  ┌────┴─────┐  ┌────┴─────┐  ┌────────┐ │
│  │ AI Engine│  │  Healer  │  │   HITL   │  │Security│ │
│  └──────────┘  └──────────┘  └──────────┘  └────────┘ │
│                                                         │
│  ┌──────────────────────────────────────────────────────┐│
│  │                  @aegis/shared                       ││
│  └──────────────────────────────────────────────────────┘│
└──────────────────────┬──────────────────────────────────┘
                       │ HTTPS (PIIマスク済み)
                       ▼
┌──────────────────────────────────────────────────────────┐
│                  Cloud AI Service                        │
│  (OpenAI / Anthropic / Local LLM)                       │
└──────────────────────────────────────────────────────────┘
```

## パッケージ依存関係

```
@aegis/shared         ← 全パッケージが依存
    ↑
@aegis/recorder       ← AI Engine, Approval, Security
    ↑
@aegis/ai-engine      ← Approval, Healer
    ↑
@aegis/approval       ← Executor, HITL
    ↑
@aegis/executor       ← Healer
    ↑
@aegis/healer         ← HITL
    ↑
@aegis/hitl           ← (循環依存なし)
    ↑
@aegis/security       ← 全パッケージが利用
```

## データフロー

### 1. 録画フロー

```
ユーザー操作 → Recorder → OperationLog (JSON)
    ↓
Security.PIIマスク → サニタイズ済みログ
    ↓
AI Engine → Pythonコード生成
```

### 2. 承認フロー

```
生成コード → SafetyAnalyzer → リスク評価
    ↓
UI.CodeReviewPanel → ユーザーレビュー
    ↓
ApprovalManager → 承認/却下
    ↓
承認済みコードロック（読み取り専用）
```

### 3. 実行フロー

```
承認済みコード → ScriptGenerator → Pythonスクリプト
    ↓
ProcessManager → サブプロセス起動
    ↓
LogCollector → ログ収集
    ↓
エラー検知 → Healer/HITL
```

### 4. 進化フロー

```
エラー検知 → ErrorClassifier → エラー分類
    ↓
VisionAnalyzer → 画面解析
    ↓
CodePatcher → 修正コード提案
    ↓
HumanLoopEngine → ユーザー承認
    ↓
DiffLearner → パターン学習
```

## 技術スタック

| レイヤー | 技術 |
|---------|------|
| デスクトップフレームワーク | Tauri (Rust + WebView) |
| フロントエンド | React + TypeScript |
| AIコード生成 | Python / Playwright / Selenium |
| ローカルデータ保存 | SQLite (予定) |
| クラウドAI | OpenAI / Anthropic / ローカルLLM |
| 暗号化 | OSキーチェーン (AES-256) |

## 実装状況

| コンポーネント | 状態 | 備考 |
|---------------|------|------|
| パッケージ構造 | ✅ 完成 | monorepo |
| `@aegis/shared` | ✅ 完成 | 共通型定義 |
| Tauriアプリ骨格 | ✅ 完成 | `apps/desktop` |
| Pythonランタイム | ⬜ テンプレートのみ | `engines/python-runtime` |
| SQLite永続化 | ⬜ 未実装 | |
| CI/CDパイプライン | ⬜ 未実装 | |

## テストカバレッジ

| テストファイル | 対象 |
|--------------|------|
| `packages/@aegis/shared/src/__tests__/types.test.ts` | 共通型定義 |
| `packages/@aegis/shared/src/__tests__/dependency-checker.test.ts` | 依存関係チェッカー |
