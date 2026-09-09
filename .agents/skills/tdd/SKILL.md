---
name: tdd
description: Test-Driven Development workflow — red-green-refactor cycle for TypeScript/Vitest. Use when adding new features or fixing bugs.
tags: [tdd, testing, vitest, typescript, red-green-refactor]
category: development
---

# tdd

Aegis モノレポでの Test-Driven Development（TDD）ワークフロー。
**RED → GREEN → REFACTOR** のサイクルを厳密に守る。

## トリガー条件

- 新機能を実装するとき
- バグを修正するとき
- 既存コードの挙動を変更するとき

## 基本原則

1. **RED**: 失敗するテストを先に書く
2. **GREEN**: テストを通す最小限の実装を書く
3. **REFACTOR**: テストが緑のままリファクタリングする
4. **検証**: 各サイクルのたびに `pnpm test` を実行する

## 実行手順

### 1. RED — 失敗するテストを書く

```bash
# テスト対象パッケージに移動
cd packages/@aegis/<package-name>

# テストファイルを作成（既存ならスキップ）
# 例: src/__tests__/myFeature.test.ts
```

テストを書いたら、**必ず失敗することを確認**:
```bash
pnpm test
# Expected: テストが FAIL する
```

**重要**: テストが最初から通ってしまう場合、
- 既にその機能が実装されていないか確認
- テストの期待値が正しいか確認
- 実装が正しくて既に動いている場合は TDD サイクル不要（REFATORのみ）

### 2. GREEN — 最小限の実装でテストを通す

```bash
# 実装を書く
# 例: src/myFeature.ts

# テストを通す
pnpm test
# Expected: テストが PASS する
```

**この段階でのルール**:
- テストを通すための **最小限のコードだけ** を書く
- 未来の機能は考慮しない
- 仮実装（return hard-coded value）でもOK
- 複雑なリファクタリングは後の REFACTOR で行う

### 3. REFACTOR — テストが緑のまま改善する

```bash
# リファクタリング
# - 型定義の改善
# - 関数の抽出
# - 重複の排除
# - 命名の改善

# テストがまだ通ることを確認
pnpm test
# Expected: すべて PASS
```

**リファクタリング中のルール**:
- テストが赤になるリファクタリングは禁止
- 動作を変更するリファクタリングは禁止
- 型安全性の向上は自由に

### 4. 次のサイクルへ

RED → GREEN → REFACTOR を繰り返し、
小さく段階的に機能を構築する。

## テストの書き方（Vitest + TypeScript）

### 基本パターン

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { myFunction } from '../myModule';

describe('myFunction', () => {
  beforeEach(() => {
    // テストごとのセットアップ
  });

  it('should handle normal case', () => {
    const result = myFunction('input');
    expect(result).toBe('expected-output');
  });

  it('should throw on invalid input', () => {
    expect(() => myFunction('')).toThrow('Input cannot be empty');
  });
});
```

### モックパターン

```typescript
import { vi, describe, it, expect } from 'vitest';

// 外部依存のモック
vi.mock('@aegis/ai-engine', () => ({
  createAIEngine: vi.fn().mockResolvedValue({
    generate: vi.fn().mockResolvedValue('mocked response'),
  }),
}));

// 関数のモック
const mockLogger = {
  info: vi.fn(),
  error: vi.fn(),
};
```

### 非同期テスト

```typescript
describe('async operations', () => {
  it('should resolve successfully', async () => {
    const result = await asyncFunction();
    expect(result).toEqual({ status: 'ok' });
  });

  it('should reject on failure', async () => {
    await expect(failingFunction()).rejects.toThrow('Error message');
  });
});
```

## モノレポ固有の考慮事項

### パッケージ間のテスト

```bash
# パッケージ固有のテスト
cd packages/@aegis/ai-engine && pnpm test

# 全パッケージのテスト
pnpm test

# 特定のテストファイルだけ
cd packages/@aegis/security && pnpm test -- pii.test.ts
```

### テストの場所

```
packages/@aegis/<package>/
├── src/
│   ├── __tests__/          ← 推奨: テストをソースの近くに
│   │   ├── feature.test.ts
│   │   └── helpers.test.ts
│   └── feature.ts
├── src/feature.ts          ← テスト対象
└── vitest.config.ts        ← パッケージ個別の設定（あれば）
```

### エッジケースの網羅

| ケース | 例 |
|--------|-----|
| 空の入力 | `''`, `[]`, `{}` |
| null/undefined | `null`, `undefined` |
| 境界値 | `0`, `MAX_SAFE_INTEGER`, 空文字列 |
| エラーパス | ネットワークエラー、タイムアウト、DB接続失敗 |
| 型の境界 | `any` を渡した場合、不正な型を渡した場合 |

## 反復パターン

### バグ修正の場合

1. まずバグを再現するテストを書く（RED）
2. テストが赤になることを確認（バグの再現）
3. バグを修正（GREEN）
4. 修正が他のテストに影響を与えないか確認（REFACTOR）

### リファクタリング-only の場合

1. 既存のテストが通ることを確認
2. リファクタリングを実行
3. テストがまだ通ることを確認
4. 必要ならリファクタリングに合わせてテストもリファクタリング

## 注意事項

- テストの RED 階段をスキップしない（最も重要なルール）
- GREEN 階段では「最小限」を守る（過剰実装はリファクタリングを困難にする）
- REFACTOR 階段ではテストが赤にならない限り安心
- ets ファイルと実装ファイルの比率が極端に偏っていないか確認（適切な粒度）
- `pnpm test` が通らないままコミットしない
