# UI/UXカテゴリ

> パッケージ: `apps/desktop`（`@aegis/ui`は未実装）
> コアフロー: クロスカッティング（全フローを視覚化）

## 概要

Aegis Agentのユーザーインターフェースを定義するカテゴリです。
ダッシュボード、タスク一覧、コードレビュー、操作フロービューなどの
UIコンポーネントを含みます。

**核心思想**: 非エンジニアでも直感的に操作できるUIを実現し、
AIの判断を「見える化」して信頼性を確保します。

## 要件

### 機能要件

| ID | 要件 | 優先度 |
|----|------|--------|
| UI-01 | ダッシュボード（タスク状況の一覧表示） | Must |
| UI-02 | タスク一覧（実行中/完了/エラーの管理） | Must |
| UI-03 | コードレビューUI（シンタックスハイライト付き） | Must |
| UI-04 | 操作フロービュー（記録操作の時系列表示） | Must |
| UI-05 | 承認/却下ボタン | Must |
| UI-06 | セットアップウィザード | Should |
| UI-07 | Toast通知 | Should |
| UI-08 | モーダルダイアログ | Should |

### 非機能要件

| ID | 要件 | 基準値 |
|----|------|--------|
| UI-NF01 | 初回表示時間 | < 2秒 |
| UI-NF02 | レスポンシブデザイン | 1024x768以上 |
| UI-NF03 | アクセシビリティ | WCAG 2.1 AA |
| UI-NF04 | ダークテーマ対応 | 必須 |

## API/インターフェース

### 実装済みコンポーネント

| コンポーネント | パス | 状態 |
|---------------|------|------|
| `Dashboard` | `components/Dashboard/` | ✅ |
| `TaskList` | `components/TaskList/` | ✅ |
| `CodeReviewPanel` | `components/CodeReviewPanel/` | ✅ |
| `TimelineView` | `components/TimelineView/` | ✅ |
| `SetupWizard` | `components/SetupWizard/` | ✅ |
| `Button` | `components/ui/Button.tsx` | ✅ |
| `Card` | `components/ui/Card.tsx` | ✅ |
| `Modal` | `components/ui/Modal.tsx` | ✅ |
| `Badge` | `components/ui/Badge.tsx` | ✅ |
| `Toast` | `components/ui/Toast.tsx` | ✅ |

### UIフロー

```
アプリ起動 → SetupWizard → Dashboard
                    ↓
            TaskList → CodeReviewPanel → TimelineView
                    ↓
            承認/却下 → 実行結果表示
```

## 実装状況

| コンポーネント | 状態 | 備考 |
|---------------|------|------|
| `Dashboard` | ✅ 完成 | タスク状況表示 |
| `TaskList` | ✅ 完成 | タスク一覧 |
| `CodeReviewPanel` | ✅ 完成 | コードレビュー |
| `TimelineView` | ✅ 完成 | 操作フロー表示 |
| `SetupWizard` | ✅ 完成 | 初期設定 |
| UI基盤コンポーネント | ✅ 完成 | Button, Card, Modal, Badge, Toast |

### 未実装

- `@aegis/ui` パッケージ（共有コンポーネントライブラリ）
- リアルタイム更新
- ドラッグ＆ドロップ操作

## テストカバレッジ

| テストファイル | 対象 |
|--------------|------|
| `components/Dashboard/__tests__/Dashboard.test.tsx` | Dashboard |
| `components/TaskList/__tests__/TaskList.test.tsx` | TaskList |
| `components/CodeReviewPanel/__tests__/CodeReviewPanel.test.tsx` | CodeReviewPanel |
| `components/TimelineView/__tests__/TimelineView.test.tsx` | TimelineView |
| `components/ui/__tests__/Button.test.tsx` | Button |
| `components/ui/__tests__/Card.test.tsx` | Card |
| `components/ui/__tests__/Modal.test.tsx` | Modal |
| `components/ui/__tests__/Badge.test.tsx` | Badge |
| `components/ui/__tests__/Toast.test.tsx` | Toast |
| `__tests__/SetupWizard.test.tsx` | SetupWizard |
