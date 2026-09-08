# AIエンジンカテゴリ

> パッケージ: `@aegis/ai-engine`
> コアフロー: ②確認する（承認）の核となる部分

## 概要

操作ログからAIが**決定論的**なPythonスクリプトと事前例外ハンドラを生成するエンジンです。

**核心思想**: AI幻覚を防止するため、プロンプト設計とバリデーションの2段階で
安全性を担保します。生成されるコードは常に`if __name__ == "__main__"`ブロックで
囲まれ、ユーザーの承認後にのみロック（読み取り専用）されます。

## 要件

### 機能要件

| ID | 要件 | 優先度 |
|----|------|--------|
| AI-01 | 操作ログ→Pythonスクリプト変換 | Must |
| AI-02 | Playwright/Seleniumコード生成 | Must |
| AI-03 | 例外ハンドラの自動注入 | Must |
| AI-04 | 入力バリデーション（危険なパターン検出） | Must |
| AI-05 | コードバリデーション（構文・構造チェック） | Must |
| AI-06 | プロンプトテンプレート管理 | Must |
| AI-07 | 複数AIプロバイダー対応 | Should |
| AI-08 | 例外予測パターンの学習 | Should |

### 非機能要件

| ID | 要件 | 基準値 |
|----|------|--------|
| AI-NF01 | コード生成レスポンス | < 30秒 |
| AI-NF02 | 生成コードの構文有効性 | 100% |
| AI-NF03 | プロンプト管理の一貫性 | バージョニング対応 |

## API/インターフェース

### メインクラス

- **`CodeGenerator`**: 操作ログからPythonコードを生成
- **`PromptBuilder`**: AIへのプロンプトを構築
- **`InputValidator`**: ユーザー入力の危険パターン検出
- **`CodeValidator`**: 生成コードの構文・構造検証

### 主要型定義

```typescript
interface AiEngineResult {
  success: boolean;
  code?: string;
  error?: string;
  warnings: string[];
}

interface ValidationIssue {
  severity: 'error' | 'warning' | 'info';
  message: string;
  line?: number;
}
```

### プロンプト設計

- **役割定義**: "あなたはRPA自動化コードの専門家です"
- **制約ルール**: 危険な関数（eval, exec, os.system）の禁止
- **出力形式**: JSONスキーマに準拠したコード生成
- **例外テンプレート**: タイムアウト、ネットワークエラー、要素未検出

## 実装状況

| コンポーネント | 状態 | 備考 |
|---------------|------|------|
| `CodeGenerator` | ✅ 完成 | Playwright/Selenium対応 |
| `PromptBuilder` | ✅ 完成 | プロンプトテンプレート管理 |
| `InputValidator` | ✅ 完成 | 危険パターン検出 |
| `CodeValidator` | ✅ 完成 | 構文・構造検証 |
| `types.ts` | ✅ 完成 | 全型定義 |

### 未実装

- 複数プロバイダー切り替え（現在は単一プロバイダー）
- 例外パターンの機械学習
- コード品質スコアリング

## テストカバレッジ

| テストファイル | 対象 |
|--------------|------|
| `__tests__/generator.test.ts` | CodeGenerator |
| `__tests__/prompt-builder.test.ts` | PromptBuilder |
| `__tests__/validators.test.ts` | InputValidator/CodeValidator |
