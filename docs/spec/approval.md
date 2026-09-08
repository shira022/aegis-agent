# 承認ワークフローカテゴリ

> パッケージ: `@aegis/approval`
> コアフロー: ②確認する（承認）

## 概要

AIが生成したコードをユーザーが安全にレビューし、承認するワークフローを管理するカテゴリです。

**核心思想**: 承認されたコードは「ロック（読み取り専用）」され、
その後のAI/システムによる改ざんを防止します。承認フローは安全分析とコード表示の
2つの柱で構成されます。

## 要件

### 機能要件

| ID | 要件 | 優先度 |
|----|------|--------|
| APR-01 | 生成コードのレビューUI表示 | Must |
| APR-02 | 安全分析（危険操作の検出） | Must |
| APR-03 | コード承認/却下操作 | Must |
| APR-04 | 承認済みコードのロック（読み取り専用化） | Must |
| APR-05 | 承認履歴の記録 | Must |
| APR-06 | 安全性スコアリング | Should |
| APR-07 | コード差分表示 | Should |

### 非機能要件

| ID | 要件 | 基準値 |
|----|------|--------|
| APR-NF01 | 安全分析レスポンス | < 5秒 |
| APR-NF02 | 承認状態の一貫性 | ACID準拠 |
| APR-NF03 | ロックの不可逆性 | ハッシュ検証 |

## API/インターフェース

### メインクラス

- **`ApprovalManager`**: 承認フローの管理（承認、却下、履歴）
- **`SafetyAnalyzer`**: コードの安全分析（危険操作検出、リスク評価）
- **`CodeDisplay`**: コード表示フォーマット（シンタックスハイライト、差分）

### 主要型定義

```typescript
interface ApprovalDecision {
  decision: 'approved' | 'rejected';
  reason: string;
  approvedAt: Date;
  approvedBy: string;
}

interface SafetyAnalysis {
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  findings: SafetyFinding[];
  score: number;
}

interface SafetyFinding {
  type: string;
  severity: 'info' | 'warning' | 'error';
  line: number;
  message: string;
}
```

### 承認フロー

```
AIコード生成 → 安全分析 → ユーザーレビュー → 承認/却下
     ↓                                        ↓
  コード表示 ←─────── 承認済みコードロック ←───┘
```

## 実装状況

| コンポーネント | 状態 | 備考 |
|---------------|------|------|
| `ApprovalManager` | ✅ 完成 | 承認、却下、履歴記録 |
| `SafetyAnalyzer` | ✅ 完成 | 危険操作検出、リスク評価 |
| `CodeDisplay` | ✅ 完成 | シンタックスハイライト |
| `types.ts` | ✅ 完成 | 全型定義 |

### 未実装

- チーム承認（複数人承認ワークフロー）
- 承認ルールのカスタマイズ
- 承認メール通知

## テストカバレッジ

| テストファイル | 対象 |
|--------------|------|
| `__tests__/approval-manager.test.ts` | ApprovalManager |
| `__tests__/safety-analyzer.test.ts` | SafetyAnalyzer |
| `__tests__/code-display.test.ts` | CodeDisplay |
