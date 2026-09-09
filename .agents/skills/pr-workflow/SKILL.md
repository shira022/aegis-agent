---
name: pr-workflow
description: Pull request workflow — branching, commits, verification, and PR creation for the Aegis monorepo. Use when creating or preparing a PR.
tags: [pr, git, workflow, conventional-commits, branching]
category: development
---

# pr-workflow

Aegis モノレポでの Pull Request ワークフロー。
**ブランチ作業 → コミット → 検証 → PR作成** の一連の手順。

## トリガー条件

- PRを作成するとき
- 変更を `develop` にマージするとき
- 作業を始める前にブランチを切るとき

## ブランチ戦略

| ブランチタイプ | 命名規則 | 用途 | マージ先 |
|---------------|---------|------|---------|
| feature | `feature/<descriptive-name>` | 新機能開発 | `develop` |
| fix | `fix/<issue-number>-<short-desc>` | バグ修正 | `develop` |
| docs | `docs/<topic>` | ドキュメント更新 | `develop` |
| refactor | `refactor/<scope>-<what>` | リファクタリング | `develop` |
| chore | `chore/<task>` | 雑務（依存更新、CI調整等） | `develop` |

**命名ルール**:
- kebab-case（小文字、ハイフン区切り）
- 短く具体的に（例: `feature/audio-recorder`, `fix/race-condition`）
- イssue番号があれば含める（例: `fix/42-timeout-on-large-workflow`）

## 実行手順

### 1. ブランチの作成

```bash
# develop を最新にする
git checkout develop
git pull origin develop

# 新しいブランチを作成
git checkout -b feature/my-new-feature
```

### 2. 作業とコミット

#### コミットメッセージ規則（Conventional Commits）

```
<type>(<scope>): <subject>

<body>

<footer>
```

**タイプ**:

| タイプ | 用途 | 例 |
|--------|------|-----|
| feat | 新機能 | `feat(ai-engine): add streaming response support` |
| fix | バグ修正 | `fix(executor): handle timeout on long workflows` |
| docs | ドキュメント | `docs(readme): add architecture overview` |
| style | コードスタイル（ロジック変更なし） | `style(ui): format button components` |
| refactor | リファクタリング（機能追加・修正なし） | `refactor(shared): extract common types` |
| test | テスト追加・修正 | `test(security): add PII detection edge cases` |
| chore | 雑務 | `chore(deps): update vitest to v2` |
| ci | CI/CD設定 | `ci(github): add security audit workflow` |

**スコープ**（省略可能 but 推奨）:
- パッケージ名: `ai-engine`, `executor`, `security`, `ui`, `shared`
- アプリ名: `desktop`
- 設定: `config`, `ci`, `deps`

**例**:
```bash
git commit -m "feat(recorder): add CSS selector generation for shadow DOM"
git commit -m "fix(security): prevent PII leak in error messages"
git commit -m "test(approval): cover all approval flow transitions"
```

### 3. 作業中のコミット戦略

- **小さなコミット**: 1つの論理的な変更ごとにコミット
- **わざと赤くする**: 途中でテストが赤でもOK（コミットメッセージに注釈）
- **rebase で整理**: PR作成前にrebaseしてコミット履歴を整理

```bash
# 最新のdevelopにrebase
git fetch origin
git rebase origin/develop

# コミットを整理（必要なら）
git rebase -i HEAD~3
```

### 4. PR作成前の検証

```bash
# 1. 依存関係インストール
pnpm install

# 2. リント
pnpm lint

# 3. 型チェック
pnpm typecheck

# 4. テスト
pnpm test

# 5. ビルド
pnpm build
```

**変更したパッケージのみ検証する場合**:
```bash
cd packages/@aegis/<changed-package>
pnpm test
pnpm typecheck
```

**CI相当のフルチェック**:
```bash
pnpm lint && pnpm typecheck && pnpm test && pnpm build
```

### 5. PRの作成

```bash
# ブランチをプッシュ
git push origin feature/my-new-feature

# PRを作成（GitHub CLI）
gh pr create \
  --base develop \
  --title "feat(ai-engine): add streaming response support" \
  --body-file .github/pr-template.md
```

**PR本文テンプレート**:
```markdown
## 概要

<!-- 何を変更したか、なぜ変更したか -->

## 変更内容

- [ ] 変更点1
- [ ] 変更点2

## テスト

<!-- どうテストしたか、新しいテストが含まれる場合 -->

## 確認事項

- [ ] `pnpm lint` が通る
- [ ] `pnpm typecheck` が通る
- [ ] `pnpm test` が通る
- [ ] `pnpm build` が通る
- [ ] ローカルで動作確認済み

## 関連Issue

Closes #<issue-number>
```

### 6. PR作成後の対応

- CIが失敗した場合、ローカルで再現して修正
- レビューコメントに対応
- 必要ならrebaseしてforce push

```bash
# レビュー対応後のpush
git add .
git commit -m "fix(address review): resolve type safety issue"
git push origin feature/my-new-feature
```

## ワークツリーを使った並列開発

複数の機能を並列に開発する場合:

```bash
# 1つ目の機能
git worktree add ../worktree-feature-a feature/a

# 2つ目の機能
git worktree add ../worktree-feature-b feature/b

# 各ワークツリーで作業
cd ../worktree-feature-a
pnpm install
pnpm test

cd ../worktree-feature-b
pnpm install
pnpm test

# 完了後、ワークツリーを削除
git worktree remove ../worktree-feature-a
git worktree remove ../worktree-feature-b
```

## マージ戦略

| シナリオ | 推奨アクション |
|---------|--------------|
| コンフリクトなし | Squash merge or merge commit |
| コンフリクトあり | ローカルでrebase → 解決 → force push |
| 大規模なリファクタリング | 先に `develop` にrebase |

**マージ方法**:
- **S squash merge**（推奨）: PR全体を1つのコミットにまとめてマージ
- **Merge commit**: すべてのコミットを保持してマージ
- **Rebase**: 個々のコミットを `develop` の先頭にリベース

## 検証チェックリスト

PR作成前に以下がすべて通ることを確認:

- [ ] `pnpm lint` — リントエラーなし
- [ ] `pnpm typecheck` — TypeScript型エラーなし
- [ ] `pnpm test` — テスト全パス
- [ ] `pnpm build` — ビルド成功
- [ ] コードレビュー完了
- [ ] コミット履歴が整理されている
- [ ] PR本文に変更内容が書かれている

## 注意事項

- `main` ブランチへの直接マージは禁止（PR必须）
- コードレビューなしでのマージは禁止
- CIが失敗しているPRはマージしない
- 大きなPR（500行以上）は分割を検討
- セキュリティに関する変更には `security-audit` スキルを実行
