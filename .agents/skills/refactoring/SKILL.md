---
name: refactoring
description: Systematic code refactoring with test safety — detect smells, refactor, verify. Use when improving existing code.
tags: [refactoring, code-quality, cleanup, typescript]
category: development
---

# refactoring

Aegis モノレポでの体系的なリファクタリング手順。
**テストが通ることを確認 → リファクタリング → テストが通ることを再確認**。

## トリガー条件

- コードの可読性・保守性を改善したいとき
- 重複コードを排除したいとき
- 型安全性を向上させたいとき
- パッケージ間の境界を整理したいとき

## 基本原則

1. **リファクタリング前にテストを実行**（既存テストが緑であることを確認）
2. **リファクタリング後にテストを実行**（すべてのテストがまだ緑であることを確認）
3. **動作を変更しない**（リファクタリングは構造のみの変更）
4. **小さく段階的に進める**（一度に大きく変えない）

## 実行手順

### 1. リファクタリング前の準備

```bash
# 現在のテストが通ることを確認
cd packages/@aegis/<package-name>
pnpm test
pnpm typecheck

# 必要ならカバレッジ確認（レポートがどこに出るか確認）
pnpm test -- --coverage
```

### 2. コードスメルの検出

以下のパターンをチェック:

| コードスメル | 検出方法 | 対処 |
|-------------|---------|------|
| 長い関数 | 30行以上の関数 | 関数の抽出 |
| 重複コード | 類似パターンの繰り返し | 関数/ユーティリティ化 |
| 複雑な条件分岐 | ネストが3段以上 | 関数の抽出、早期リターン |
| より大きなオブジェクト | 多数のプロパティ/メソッド | 責務の分離 |
| 大きいクラス | 500行以上 | 関心事の分離 |
| 決まった値の繰り返し | ハードコードされた値 | 定数化 |
| 引数が多い関数 | 4個以上の引数 | オプションオブジェクト化 |

### 3. リファクタリングの実行

#### 3a. 関数の抽出

```typescript
// BEFORE
async function processWorkflow(workflow: Workflow) {
  // 1. バリデーション（20行）
  if (!workflow.name) throw new Error('Name required');
  if (workflow.steps.length === 0) throw new Error('No steps');
  // ...さらにバリデーションロジック

  // 2. 実行準備（15行）
  const context = { userId: workflow.owner, timestamp: Date.now() };
  const steps = workflow.steps.map(s => ({ ...s, context }));
  // ...

  // 3. 実行（25行）
  for (const step of steps) {
    await executor.run(step);
  }
}

// AFTER
function validateWorkflow(workflow: Workflow): void {
  if (!workflow.name) throw new Error('Name required');
  if (workflow.steps.length === 0) throw new Error('No steps');
  // ...バリデーションロジック
}

function prepareExecutionContext(workflow: Workflow): ExecutionContext {
  return { userId: workflow.owner, timestamp: Date.now() };
}

async function processWorkflow(workflow: Workflow) {
  validateWorkflow(workflow);
  const context = prepareExecutionContext(workflow);
  const steps = workflow.steps.map(s => ({ ...s, context }));
  await executeSteps(steps, executor);
}
```

#### 3b. 型定義の改善

```typescript
// BEFORE
function createUser(name: string, email: string, role: string) {
  return { name, email, role };
}

// AFTER
type UserRole = 'admin' | 'editor' | 'viewer';

interface CreateUserInput {
  name: string;
  email: string;
  role: UserRole;
}

function createUser(input: CreateUserInput): User {
  return { ...input, id: generateId() };
}
```

#### 3c. 重複の排除

```typescript
// BEFORE
const formatUserDisplay = (user: User) => `${user.name} <${user.email}>`;
const formatAdminDisplay = (admin: Admin) => `${admin.name} <${admin.email}> [Admin]`;

// AFTER
type Displayable = { name: string; email: string };

function formatDisplay(entity: Displayable, role?: string): string {
  const base = `${entity.name} <${entity.email}>`;
  return role ? `${base} [${role}]` : base;
}
```

#### 3d. 早期リターンとガードクローズ

```typescript
// BEFORE
function processApproval(approval: Approval) {
  if (approval.status !== 'pending') {
    if (approval.status === 'approved') {
      if (approval.approver) {
        // ...ネストが深い
      }
    }
  }
}

// AFTER
function processApproval(approval: Approval) {
  if (approval.status !== 'pending') return;
  if (!approval.approver) return;

  // メインロジック（フラット）
}
```

### 4. テストの更新

リファクタリングに合わせてテストを更新:
- テストの可読性向上
- 新しい関数のエクスポートにテストを追加
- モックの整理

### 5. リファクタリング後の検証

```bash
# テストが通ることを確認
pnpm test

# 型チェックが通ることを確認
pnpm typecheck

# リントが通ることを確認
pnpm lint
```

## TypeScript 固有のリファクタリング

### ユーティリティ型の活用

```typescript
// BEFORE
type UserInput = {
  name: string;
  email: string;
  role: string;
  createdAt: Date;
};

type UserUpdate = {
  name?: string;
  email?: string;
  role?: string;
};

// AFTER
type UserInput = {
  name: string;
  email: string;
  role: UserRole;
  createdAt: Date;
};

// 既存型から派生
type UserUpdate = Partial<Omit<UserInput, 'createdAt'>>;
```

### ジェネリクスによる汎用化

```typescript
// BEFORE
function getActiveUsers(users: User[]): User[] {
  return users.filter(u => u.status === 'active');
}

function getActiveWorkflows(workflows: Workflow[]): Workflow[] {
  return workflows.filter(w => w.status === 'active');
}

// AFTER
interface Activatable {
  status: 'active' | 'inactive' | 'archived';
}

function getActive<T extends Activatable>(items: T[]): T[] {
  return items.filter(item => item.status === 'active');
}
```

### Discriminated Union の改善

```typescript
// BEFORE
type Result = {
  success: boolean;
  data?: any;
  error?: string;
};

// AFTER
type Result<T> =
  | { success: true; data: T }
  | { success: false; error: string };
```

## パッケージ境界の尊重

### やってはいけないこと

```typescript
// @aegis/ai-engine から @aegis/security の内部実装に直接依存
import { internalPIIDetector } from '@aegis/security/src/internal/pii-detector';
// ↑ 内部パスは絶対にimportしない
```

### 正しい依存関係

```typescript
// 公開APIのみ経由
import { detectPII } from '@aegis/security';

// workspace:* を使った参照
// package.json: { "dependencies": { "@aegis/security": "workspace:*" } }
```

### パッケージ間の型共有

```typescript
// @aegis/shared に共通型を定義
// packages/@aegis/shared/src/types/workflow.ts

export interface Workflow {
  id: string;
  name: string;
  steps: WorkflowStep[];
}

// 他のパッケージからインポート
import type { Workflow } from '@aegis/shared';
```

## リファクタリングの完了チェック

- [ ] すべてのテストが通る
- [ ] 型チェックが通る
- [ ] リントが通る
- [ ] パッケージ境界を侵害していない
- [ ] `any` を追加していない
- [ ] パブリックAPIに破壊的変更がない（ある場合はバージョンを更新）
- [ ] READMEやドキュメントの更新が必要か確認
