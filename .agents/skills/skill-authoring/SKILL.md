---
name: skill-authoring
description: "Autonomously create and modify agent skills from reusable patterns. Use when a task pattern repeats 3+ times or a new domain emerges."
tags: [skill, meta, learning, agentskills]
category: development
---

# skill-authoring

エージェントが自律的にスキルを作成・修正するためのメタスキル。
Hermes Agentのスキル作成パターンを参考に、プロジェクト固有のスキルを自律的に生み出す。

## トリガー条件

- 同じパターンのタスクを3回以上実行したとき
- 新しいドメイン・技術領域に着手するとき
- 既存スキルの手順が間違っている・不足していると発見したとき
- レビューで「もっと良い方法がある」とわかったとき

## スキル作成手順

### 1. パターンの特定

```
// 同じ操作を繰り返していないか？
// 例: pnpm test → typecheck → build を毎回手動でやっている
// → build-and-test スキルに追加する価値がある
```

### 2. スキルフォーマット（agentskills.io準拠）

```yaml
---
name: <skill-name>           # 小文字ハイフン区切り、最大64文字
description: "<trigger>"     # 57文字以内。"Use when <条件>. <一言で何をするか>."
tags: [tag1, tag2]           # 検索用タグ
category: <development|documentation|security>
---
# <skill-name>

<markdown本文>
```

### 3. 必須セクション

1. **トリガー条件** — いつこのスキルを読むか
2. **実行手順** — ステップバイステップ（コマンド付き）
3. **例** — 具体的な入出力例
4. **注意事項** — パイトラップ・よくあるミス

### 4. ファイル構成

```
.agents/skills/<skill-name>/
├── SKILL.md              ← 必須（スキル本文）
└── references/           ← オプション（補足資料）
    └── api.md
```

## スキル修正手順

1. **既存スキルを必ず読む** — `skill_view` または `read_file` で現状を確認
2. **対象を特定** — 修正箇所の `old_string` を正確に抽出
3. **パッチ適用** — `patch` ツールで最小限の変更
4. **検証** — 修正後のスキルが正しく読み込めるか確認

## スキル検証チェックリスト

- [ ] YAML frontmatter に `name`, `description`, `tags`, `category` がある
- [ ] `description` は57文字以内で、`Use when` で始まる
- [ ] 実行手順に具体的なコマンドが含まれている
- [ ] エラーパス・注意事項が記載されている
- [ ] 既存スキルと重複していない

## タグ規約

| カテゴリ | 例 |
|----------|-----|
| development | build, test, typecheck, monorepo, tdd, refactor |
| documentation | adr, readme, spec, changelog |
| security | audit, secret, pii, ssrf |

## 自律的なスキル進化

1. **複雑なタスク完了後** — self-improvement スキルを参照
2. **パターン発見** — 同じ操作を3回以上繰り返したら記録
3. **スキル化** — 上記手順でSKILL.mdを作成
4. **検証** - 次回同じタスクで試す
5. **改善** — 問題があればパッチ修正
