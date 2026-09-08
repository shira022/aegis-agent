# Human-in-the-Loopカテゴリ

> パッケージ: `@aegis/hitl`
> コアフロー: ④育てる（進化）

## 概要

エラー発生時に人間の介入を管理し、デモ記録と差分学習を通じて
自動化精度を向上させるカテゴリです。

**核心思想**: すべての修正は人間の判断に基づきます。AIは「提案」し、
人間は「修正」し、その差分からパターンを学習します。このサイクルが
「育てる（進化）」の核です。

## 要件

### 機能要件

| ID | 要件 | 優先度 |
|----|------|--------|
| HITL-01 | 介入リクエストの管理 | Must |
| HITL-02 | デモ記録（ユーザーの修正操作を録画） | Must |
| HITL-03 | 差分学習（修正前後のコード差分からパターン抽出） | Must |
| HITL-04 | 介入オプションの提示（修正、中止、スキップ） | Must |
| HITL-05 | 学習パターンの蓄積と信頼度管理 | Should |
| HITL-06 | 介入履歴の管理 | Should |

### 非機能要件

| ID | 要件 | 基準値 |
|----|------|--------|
| HITL-NF01 | 介入レスポンス時間 | < 500ms |
| HITL-NF02 | 差分計算精度 | 100%（行レベル） |
| HITL-NF03 | 学習パターンの照合速度 | < 100ms |

## API/インターフェース

### メインクラス

- **`HumanLoopEngine`**: HITLフローのオーケストレーション
- **`InterventionManager`**: 介入リクエストの管理
- **`DemonstrationRecorder`**: デモ記録の管理
- **`DiffLearner`**: 差分学習エンジン

### 主要型定義

```typescript
type HitlState = 'idle' | 'waiting_for_human' | 'demonstrating'
  | 'learning' | 'applying';

interface InterventionRequest {
  id: string;
  context: ErrorContext;
  options: InterventionOption[];
  createdAt: Date;
}

interface InterventionOption {
  id: string;
  type: 'fix_code' | 'demonstrate' | 'abort' | 'skip';
  label: string;
  description: string;
}

interface Demonstration {
  id: string;
  requestId: string;
  actions: RecordedAction[];
  timestamp: Date;
  duration: number;
}

interface LearningPattern {
  id: string;
  errorType: string;
  fixPattern: string;
  codeTemplate: string;
  confidence: number;
  usageCount: number;
}
```

### HITLフロー

```
エラー検知 → InterventionRequest生成 → ユーザーに提示
     ↓
  ユーザー決定 → タイプ別処理:
  ├── demonstrate → DemonstrationRecorder → デモ記録
  ├── fix_code → DiffLearner → 差分学習
  └── abort → 終了
```

## 実装状況

| コンポーネント | 状態 | 備考 |
|---------------|------|------|
| `HumanLoopEngine` | ✅ 完成 | フロー管理 |
| `InterventionManager` | ✅ 完成 | 介入管理 |
| `DemonstrationRecorder` | ✅ 完成 | デモ記録 |
| `DiffLearner` | ✅ 完成 | 差分学習 |
| `types.ts` | ✅ 完成 | 全型定義 |

### 未実装

- デモ記録のビジュアルリプレイ
- 学習パターンの永続化
- 介入の優先度管理

## テストカバレッジ

| テストファイル | 対象 |
|--------------|------|
| `__tests__/human-loop-engine.test.ts` | HumanLoopEngine |
| `__tests__/intervention-manager.test.ts` | InterventionManager |
| `__tests__/demonstration-recorder.test.ts` | DemonstrationRecorder |
| `__tests__/diff-learner.test.ts` | DiffLearner |
