---
name: code-review
description: Review PRs and code changes against Aegis quality standards. Use before merging or during code review.
tags: [review, quality, security, pr]
category: development
---

# code-review

Aegisプロジェクトのコードレビューチェックリスト。

## トリガー条件

- PRレビュー時
- マージ前の確認
- 自分自身のコードレビュー

## レビューチェックリスト

### 型安全性
- [ ] TypeScript strict mode で型エラーなし
- [ ] `any` の使用がない（正当な理由がある場合はコメント付き）
- [ ] `workspace:*` 参照先の型が正しくimportされている

### テスト
- [ ] 新機能・バグ修正にテストが含まれている
- [ ] テストが実際に失敗→成功するか確認（GREEN保証）
- [ ] エッジケース・エラーパスがカバーされている

### セキュリティ
- [ ] APIキー・シークレットがハードコードされていない
- [ ] ユーザー入力のサニタイズがある
- [ ] PII検出ロジックに影響を与える変更ではないか
- [ ] SSRF防护に影響を与える変更ではないか

### パッケージ設計
- [ ] 循環参照が発生していない
- [ ] 既存パッケージの职责を超えていない
- [ ] workspace:* で適切に参照している

### ドキュメント
- [ ] 変更内容がPR説明に書かれている
- [ ] 重要な設計判断がある場合、ADRを追加している

### CI
- [ ] ローカルで `pnpm lint && pnpm typecheck && pnpm test` が通る
- [ ] ビルドが成功する
