# 録画・操作記録カテゴリ

> パッケージ: `@aegis/recorder`
> コアフロー: ①見せる（学習）

## 概要

ユーザーのPC操作（ブラウザ・デスクトップアプリ）を軽量JSONメタデータとして記録し、
後工程のAIコード生成に必要な操作ログを構築するカテゴリです。

**核心思想**: ボタンのテキスト、ラベル、HTML構造、スクリーンショットを
「�わしいメタデータ」として保持し、AIが安全なPlaywrightコードを生成できる
十分な文脈を提供します。

## 要件

### 機能要件

| ID | 要件 | 優先度 |
|----|------|--------|
| REC-01 | ブラウザ操作の記録（クリック、入力、スクロール、ナビゲーション） | Must |
| REC-02 | デスクトップアプリ操作の記録（Tauri IPC経由） | Must |
| REC-03 | CSSセレクタ・XPathの自動解決 | Must |
| REC-04 | スクリーンショットの自動キャプチャ | Should |
| REC-05 | 操作セッションの一時停止/再開 | Should |
| REC-06 | 操作ログのエクスポート（@aegis/shared形式） | Must |
| REC-07 | 感情データのフィルタリング | Must |

### 非機能要件

| ID | 要件 | 基準値 |
|----|------|--------|
| REC-NF01 | 記録時のCPU使用率 | < 5% |
| REC-NF02 | メタデータ保存サイズ | < 1MB/セッション |
| REC-NF03 | スクリーンショット圧縮品質 | 80% JPEG |
| REC-NF04 | セレクタ解決レスポンス | < 100ms |

## API/インターフェース

### メインクラス

- **`OperationLogger`**: 記録操作の追跡とエクスポート
- **`SelectorResolver`**: CSSセレクタ/XPathの自動解決
- **`ScreenshotManager`**: スクリーンショットのキャプチャ管理

### 主要型定義

```typescript
type ActionType = 'click' | 'type' | 'scroll' | 'navigate' | 'wait'
  | 'screenshot' | 'keypress' | 'select' | 'hover' | 'drag';

interface RecordedAction {
  id: string;
  type: ActionType;
  selector: SelectorInfo;
  metadata: ActionMetadata;
  timestamp: number;
  screenshot?: string;
}
```

### Tauriコマンド

- `start_recording(name?)` → セッション開始
- `stop_recording()` → セッション停止
- `pause_recording()` / `resume_recording()` → 一時停止/再開
- `get_recording_state()` → 現在状態取得
- `take_screenshot(region?)` → スクリーンショット

## 実装状況

| コンポーネント | 状態 | 備考 |
|---------------|------|------|
| `OperationLogger` | ✅ 完成 | logAction, exportLog, filterSensitiveData |
| `SelectorResolver` | ✅ 完成 | CSS/XPath/テキストベース解決 |
| `ScreenshotManager` | ✅ 完成 | キャプチャ・圧縮 |
| `tauri-commands.ts` | ✅ 完成 | Tauri IPCブリッジ |
| `types.ts` | ✅ 完成 | 全型定義 |

### 未実装

- デスクトップ操作のネイティブ記録（現状はブラウザ中心）
- マウス追跡・ジェスチャー記録
- 複数モニター対応

## テストカバレッジ

| テストファイル | 対象 |
|--------------|------|
| `__tests__/selector-resolver.test.ts` | SelectorResolver |
| `__tests__/operation-logger.test.ts` | OperationLogger |
| `__tests__/screenshot-manager.test.ts` | ScreenshotManager |
| `__tests__/tauri-commands.test.ts` | Tauriコマンド |
| `__tests__/recorder-integration.test.ts` | 統合テスト |
