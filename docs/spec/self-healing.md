# セルフヒーリングカテゴリ

> パッケージ: `@aegis/healer`
> コアフロー: ④育てる（進化）

## 概要

実行中のエラーを自動検知し、原因を分類し、AIが修正コードを提案し、
学習パターンとして蓄積するカテゴリです。

**核心思想**: すべての修正はユーザーの承認が必要です。AIは「提案」のみ行い、
実際のコード変更はユーザーの判断で行われます。修正パターンは学習データとして
蓄積され、類似エラーの自動修正精度が向上します。

## 要件

### 機能要件

| ID | 要件 | 優先度 |
|----|------|--------|
| HL-01 | エラー分類（タイムアウト、要素未検出、ネットワーク等） | Must |
| HL-02 | 画面キャプチャからのエラー原因分析（ビジョン解析） | Should |
| HL-03 | AIによるコード修正提案 | Must |
| HL-04 | 学習パターンの蓄積と照合 | Must |
| HL-05 | 修正コードの差分表示 | Must |
| HL-06 | エラーヒストリー管理 | Should |

### 非機能要件

| ID | 要件 | 基準値 |
|----|------|--------|
| HL-NF01 | エラー分類レスポンス | < 3秒 |
| HL-NF02 | 修正提案精度 | 70%以上（目標） |
| HL-NF03 | 学習パターン照合速度 | < 100ms |

## API/インターフェース

### メインクラス

- **`HealingEngine`**: ヒーリングフローのオーケストレーション
- **`ErrorClassifier`**: エラーの自動分類
- **`VisionAnalyzer`**: 画面キャプチャからのエラー原因分析
- **`CodePatcher`**: 修正コードの生成と適用

### 主要型定義

```typescript
interface HealingResult {
  success: boolean;
  originalError: string;
  classifiedType: ErrorType;
  proposedFix?: CodePatch;
  confidence: number;
}

interface ErrorContext {
  taskId: string;
  error: string;
  stackTrace?: string;
  timestamp: Date;
  screenshot?: string;
}

interface CodePatch {
  line: number;
  oldCode: string;
  newCode: string;
  reason: string;
}
```

### エラー分類タイプ

```typescript
type ErrorType =
  | 'timeout'
  | 'element_not_found'
  | 'network_error'
  | 'permission_denied'
  | 'selector_changed'
  | 'page_structure_changed'
  | 'unknown';
```

## 実装状況

| コンポーネント | 状態 | 備考 |
|---------------|------|------|
| `HealingEngine` | ✅ 完成 | フロー管理 |
| `ErrorClassifier` | ✅ 完成 | エラー分類 |
| `VisionAnalyzer` | ✅ 完成 | 画面解析 |
| `CodePatcher` | ✅ 完成 | 修正コード生成 |
| `types.ts` | ✅ 完成 | 全型定義 |

### 未実装

- パターンの永続化ストレージ
- 修正精度の統計ダッシュボード
- 複数修正候補のランク付け

## テストカバレッジ

| テストファイル | 対象 |
|--------------|------|
| `__tests__/healing-engine.test.ts` | HealingEngine |
| `__tests__/error-classifier.test.ts` | ErrorClassifier |
| `__tests__/vision-analyzer.test.ts` | VisionAnalyzer |
| `__tests__/code-patcher.test.ts` | CodePatcher |
