---
name: new-package
description: Scaffold a new @aegis package in the monorepo. Use when adding a new module or domain.
tags: [scaffold, package, monorepo, pnpm]
category: development
---

# new-package

Aegisモノレポに新しい `@aegis/*` パッケージを追加する手順。

## トリガー条件

- 新しいドメインモジュールを追加するとき
- 既存パッケージを分割するとき

## 実行手順

1. **ディレクトリ作成**
   ```bash
   mkdir -p packages/@aegis/<name>/src
   cd packages/@aegis/<name>
   ```

2. **package.json 作成**
   ```json
   {
     "name": "@aegis/<name>",
     "version": "0.1.0",
     "private": true,
     "main": "./src/index.ts",
     "types": "./src/index.ts",
     "scripts": {
       "build": "tsc",
       "test": "vitest run",
       "typecheck": "tsc --noEmit"
     },
     "devDependencies": {
       "typescript": "^5.8.0",
       "vitest": "^3.1.0"
     }
   }
   ```

3. **tsconfig.json 作成**（既存パッケージからコピー）
   ```bash
   cp ../shared/tsconfig.json .
   ```

4. **vitest.config.ts 作成**
   ```typescript
   import { defineConfig } from 'vitest/config';

   export default defineConfig({
     test: {
       globals: true,
       environment: 'node',
     },
   });
   ```

5. **src/index.ts 作成**
   ```typescript
   export {};
   ```

6. **ルート package.json にワークスペース追加確認**
   - pnpm-workspace.yaml に `packages/@aegis/*` が含まれているか確認

7. **依存パッケージがある場合**
   ```json
   "dependencies": {
     "@aegis/shared": "workspace:*"
   }
   ```

8. **ビルド・テスト確認**
   ```bash
   cd packages/@aegis/<name>
   pnpm typecheck && pnpm test && pnpm build
   ```

## ドキュメント

- 新パッケージが決まったら `docs/adr/` にADRを記録
- README.md をパッケージ内に追加
