# セキュリティカテゴリ

> パッケージ: `@aegis/security`
> コアフロー: クロスカッティング（全フローに適用）

## 概要

PII（個人識別情報）マスキング、APIキー管理、サンドボックス実行、
承認必須ガードなど、セキュリティに関する全機能を管理するカテゴリです。

**核心思想**: データはすべてローカルに保存し、外部送信されるデータは
PIIマスキング済みであること。APIキーはOSキーチェーンで管理し、
コード実行は必ず人間の承認が必要であること。

## 要件

### 機能要件

| ID | 要件 | 優先度 |
|----|------|--------|
| SEC-01 | PII自動検出・マスキング | Must |
| SEC-02 | APIキーのOSキーチェーン管理 | Must |
| SEC-03 | コード実行のサンドボックス化 | Must |
| SEC-04 | 承認必須ガード（未承認コード実行防止） | Must |
| SEC-05 | カスタムPIIパターン対応 | Should |
| SEC-06 | ログの安全検証 | Must |

### 非機能要件

| ID | 要件 | 基準値 |
|----|------|--------|
| SEC-NF01 | PII検出精度 | 95%以上 |
| SEC-NF02 | マスキング処理速度 | < 100ms/1000行 |
| SEC-NF03 | キーチェーン暗号化 | AES-256 |
| SEC-NF04 | サンドボックス隔離度 | プロセスレベル |

## API/インターフェース

### メインクラス

- **`PIIMasker`**: PIIの検出・マスキング
- **`LogSanitizer`**: 操作ログのPIIサニタイズ
- **`PIIValidator`**: テキスト/ログのPII検証
- **`ApiKeyManager`**: APIキーのOSキーチェーン管理

### PII検出パターン

| カテゴリ | 検出パターン | 重要度 |
|---------|------------|--------|
| `email` | メールアドレス | High |
| `credit_card` | クレジットカード番号 | High |
| `ssn` | US社会保障番号 | High |
| `my_number` | 日本マイナンバー（12桁） | High |
| `password` | パスワードフィールド | High |
| `phone` | 電話番号 | High |
| `bank_account` | 銀行口座番号 | High |
| `ip_address` | IPv4/IPv6 | Medium |
| `name` | 日本語氏名パターン | Medium |
| `address` | 〒郵便番号 | Medium |

### 主要型定義

```typescript
interface PIIDetection {
  category: PIICategory;
  startIndex: number;
  endIndex: number;
  originalValue: string;
  maskedValue: string;
  confidence: number;
}

interface SanitizedLog extends OperationLog {
  sanitized: true;
  detections: PIIDetection[];
  stats: SanitizeStats;
}
```

## 実装状況

| コンポーネント | 状態 | 備考 |
|---------------|------|------|
| `PIIMasker` | ✅ 完成 | masker.ts |
| `LogSanitizer` | ✅ 完成 | sanitizer.ts |
| `PIIValidator` | ✅ 完成 | validator.ts |
| `ApiKeyManager` | ✅ 完成 | OSキーチェーン連携 |
| `Sandbox` | ✅ 完成 | プロセス分離 |
| `ApprovalGuard` | ✅ 完成 | 承認必須ガード |
| `pii-patterns.ts` | ✅ 完成 | 11カテゴリ対応 |

### 未実装

- カスタムPIIパターンのUI設定
- セキュリティ監査ログ
- リモートSSH接続のセキュリティ

## テストカバレッジ

| テストファイル | 対象 |
|--------------|------|
| `__tests__/masking.test.ts` | PIIMasker, LogSanitizer, PIIValidator |
