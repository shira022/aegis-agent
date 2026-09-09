---
name: build-and-test
description: Build, test, and type-check the Aegis monorepo. Use when verifying changes or debugging CI failures.
tags: [build, test, typecheck, turbo, monorepo]
category: development
---

# build-and-test

Aegis monorepo のビルド・テスト・型チェック手順。

## トリガー条件

- 変更後の検証時
- CI失敗のデバッグ時
- PR作成前の確認時

## 実行手順

1. **依存関係インストール**
   ```bash
   pnpm install
   ```

2. **変更箇所に応じたテスト**
   ```bash
   # 全体テスト
   pnpm test

   # 個別パッケージ
   cd packages/@aegis/ai-engine && pnpm test
   cd packages/@aegis/security && pnpm test

   # デスクトップアプリ
   cd apps/desktop && pnpm test
   ```

3. **型チェック**
   ```bash
   pnpm typecheck
   # or 個別: cd packages/@aegis/shared && pnpm typecheck
   ```

4. **ビルド確認**
   ```bash
   pnpm build
   # dist/ が生成されたか確認
   ls packages/@aegis/*/dist/
   ```

5. **CI相当のチェック**
   ```bash
   pnpm lint && pnpm typecheck && pnpm test && pnpm build
   ```

## パッケージ一覧

| パッケージ | パス | 役割 |
|-----------|------|------|
| shared | packages/@aegis/shared | 共有型・ユーティリティ |
| ai-engine | packages/@aegis/ai-engine | AI推論（Vercel AI SDK v6） |
| executor | packages/@aegis/executor | RPA実行 |
| approval | packages/@aegis/approval | 承認フロー |
| hitl | packages/@aegis/hitl | ヒューマンインザループ |
| healer | packages/@aegis/healer | 自己修復 |
| recorder | packages/@aegis/recorder | アクション記録 |
| security | packages/@aegis/security | セキュリティ |
| ui | packages/@aegis/ui | 共有UI |

## 注意事項

- Pythonパッケージ（python-runtime）は venv が必要: `cd packages/@aegis/python-runtime && python -m venv .venv && .venv/bin/pip install -r requirements.txt`
- Tauriビルド（apps/desktop/src-tauri）はRust Toolchainが必要
- turbo で依存関係を解決して並列実行するため、ルートで `pnpm test` すれば良い
