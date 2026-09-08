# 実行エンジンカテゴリ

> パッケージ: `@aegis/executor`
> コアフロー: ③任せる（実行）

## 概要

承認されたPythonスクリプトを安全に実行し、リソースを監視し、ログを収集するエンジンです。

**核心思想**: すべてのコード実行は**人間の承認後にのみ**実行され、
サブプロセスとして分離実行されます。リソース監視により、無限ループや
メモリリークを検出し、自動的にプロセスを終了します。

## 要件

### 機能要件

| ID | 要件 | 優先度 |
|----|------|--------|
| EXE-01 | Pythonサブプロセスの起動・管理 | Must |
| EXE-02 | リソース監視（CPU、メモリ、ディスク） | Must |
| EXE-03 | ログ収集（標準出力、エラー出力） | Must |
| EXE-04 | スクリプト生成（テンプレート注入） | Must |
| EXE-05 | タイムアウト管理 | Must |
| EXE-06 | プロセス強制終了 | Must |
| EXE-07 | requirements.txt自動生成 | Should |

### 非機能要件

| ID | 要件 | 基準値 |
|----|------|--------|
| EXE-NF01 | プロセス起動時間 | < 2秒 |
| EXE-NF02 | リソース監視間隔 | 1秒 |
| EXE-NF03 | ログバッファサイズ | < 10MB |
| EXE-NF04 | プロセス分離度 | 完全サンドボックス |

## API/インターフェース

### メインクラス

- **`ProcessManager`**: Pythonサブプロセスの起動・管理・監視
- **`ExecutionEngine`**: 実行エンジンのオーケストレーション
- **`LogCollector`**: ログ収集・フォーマット・エクスポート
- **`ScriptGenerator`**: スクリプト生成・テンプレート注入

### 主要型定義

```typescript
interface ProcessInfo {
  pid: number;
  status: 'running' | 'completed' | 'failed' | 'timeout' | 'killed';
  startTime: Date;
  endTime?: Date;
  resourceUsage: ResourceUsage;
}

interface ResourceUsage {
  cpu: number;      // パーセント
  memory: number;   // MB
  disk: number;     // MB
}
```

### 実行フロー

```
承認済みコード → ScriptGenerator → Pythonサブプロセス起動
     ↓                                     ↓
  LogCollector ←──── リソース監視 ←─── 実行中
     ↓
  結果/ログ → エラーハイリング（如有）
```

## 実装状況

| コンポーネント | 状態 | 備考 |
|---------------|------|------|
| `ProcessManager` | ✅ 完成 | サブプロセス管理 |
| `ExecutionEngine` | ✅ 完成 | オーケストレーション |
| `LogCollector` | ✅ 完成 | ログ収集・フォーマット |
| `ScriptGenerator` | ✅ 完成 | スクリプト生成 |
| `types.ts` | ✅ 完成 | 全型定義 |

### 未実装

- プロセスプール（同時実行管理）
- 実行キューイング
- 実行結果の永続化

## テストカバレッジ

| テストファイル | 対象 |
|--------------|------|
| `__tests__/process-manager.test.ts` | ProcessManager |
| `__tests__/execution-engine.test.ts` | ExecutionEngine |
| `__tests__/log-collector.test.ts` | LogCollector |
| `__tests__/script-generator.test.ts` | ScriptGenerator |
