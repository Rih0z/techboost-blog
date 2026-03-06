---
title: "Zedエディタ完全ガイド2026 - Rust製の次世代高速コードエディタ"
description: "Zedエディタを徹底解説。Rust製の超高速レスポンス、AI統合（GPT-4/Claude）、コラボレーション機能、マルチカーソル、拡張機能、VS Codeからの移行方法まで完全網羅。最新の技術動向を踏まえた実践的なガイドです。開発者必見の内容を網羅しています。"
pubDate: "2025-02-06"
tags: ['zed', 'editor', 'Rust', 'AI', 'productivity', 'developer-tools', 'プログラミング']
---
Zedは、Atomエディタの元開発チームが作る**次世代コードエディタ**です。Rust製で驚異的な速度を実現し、AI統合、リアルタイムコラボレーション、洗練されたUIを備えています。

この記事では、Zedの特徴から実践的な使い方、VS Codeからの移行方法まで、すべてを網羅的に解説します。

## Zedとは

Zedは、**パフォーマンスとユーザー体験を最優先**に設計されたコードエディタです。

### 主な特徴

```text
✅ Rust製 - ネイティブレベルの高速起動・動作
✅ GPU レンダリング - 60fps以上の滑らかなスクロール
✅ AI統合 - GPT-4、Claude、Geminiをエディタ内で利用
✅ コラボレーション - リアルタイム共同編集
✅ LSP完全サポート - TypeScript、Rust、Python など
✅ マルチカーソル - 強力な複数行編集
✅ Vim モード - モーダル編集サポート
✅ 拡張機能 - Tree-sitter、言語サーバー対応
```

### VS Code との比較

| 機能 | Zed | VS Code |
|------|-----|---------|
| 起動速度 | < 100ms | 1-3秒 |
| メモリ使用量 | 50-200MB | 300-800MB |
| AI統合 | ネイティブ統合 | 拡張機能 |
| コラボ | 標準装備 | Live Share拡張 |
| 拡張性 | 成長中 | 非常に豊富 |
| エコシステム | 新興 | 成熟 |

## インストール

### macOS

```bash
# Homebrew
brew install zed

# 公式サイトからダウンロード
# https://zed.dev/download
```

### Linux

```bash
# Ubuntu/Debian
curl https://zed.dev/install.sh | sh

# Arch Linux
yay -S zed
```

### Windows

2026年2月現在、Windowsサポートはベータ版です。

```powershell
# Scoopでインストール
scoop install zed
```

## 初期設定

### 設定ファイル

Zedの設定は JSON 形式です。

```json
// ~/.config/zed/settings.json
{
  "theme": "One Dark",
  "buffer_font_family": "JetBrains Mono",
  "buffer_font_size": 14,
  "ui_font_size": 16,
  "tab_size": 2,
  "soft_wrap": "editor_width",
  "format_on_save": "on",
  "autosave": "on_focus_change",
  "vim_mode": false,
  "telemetry": {
    "metrics": false
  }
}
```

### おすすめフォント

```json
{
  "buffer_font_family": "JetBrains Mono",
  "buffer_font_features": {
    "calt": true,  // リガチャ有効化
    "liga": true
  }
}
```

## AI統合機能

Zedの最大の特徴は、**ネイティブAI統合**です。

### AI アシスタント設定

```json
{
  "assistant": {
    "enabled": true,
    "default_model": {
      "provider": "anthropic",
      "model": "claude-3-5-sonnet-20241022"
    },
    "version": "2"
  }
}
```

### サポートされるAIモデル

```json
{
  "assistant": {
    "default_model": {
      // Anthropic Claude
      "provider": "anthropic",
      "model": "claude-3-5-sonnet-20241022"

      // OpenAI GPT
      // "provider": "openai",
      // "model": "gpt-4-turbo-preview"

      // Google Gemini
      // "provider": "google",
      // "model": "gemini-pro"

      // Ollama (ローカルLLM)
      // "provider": "ollama",
      // "model": "codellama"
    }
  }
}
```

### AI機能の使い方

#### コード生成

```text
1. Cmd+Shift+A (macOS) / Ctrl+Shift+A (Linux) でアシスタントを開く
2. プロンプトを入力
   例: "React の useEffect でデータフェッチするカスタムフックを作って"
3. Enter で実行
```

#### インラインコード補完

```typescript
// コメントを書くと、AIが次の行を提案
// TODO: ユーザー認証用のミドルウェアを実装

// ↓ Tabキーで受け入れ
export async function authMiddleware(req: Request) {
  const token = req.headers.get('Authorization')?.replace('Bearer ', '');
  if (!token) throw new Error('Unauthorized');
  // ... AI生成されたコード
}
```

#### コードレビュー

```text
1. コードを選択
2. Cmd+Shift+A
3. "このコードをレビューして、改善点を教えて"
```

### Ollama でローカルLLM

```bash
# Ollama インストール
brew install ollama

# モデルダウンロード
ollama pull codellama
ollama pull deepseek-coder

# Zed 設定
{
  "assistant": {
    "default_model": {
      "provider": "ollama",
      "model": "codellama:7b"
    }
  }
}
```

## コラボレーション機能

Zedは、**リアルタイム共同編集**を標準でサポートしています。

### プロジェクト共有

```text
1. Cmd+Shift+P → "Share Project" を実行
2. 表示されたリンクを共有
3. 相手がリンクをクリックして参加
```

### 通話機能

```json
{
  "collaboration": {
    "voice_enabled": true,
    "video_enabled": false
  }
}
```

### フォロー機能

```text
- Cmd+Shift+F で他の参加者をフォロー
- カーソル位置が自動で同期される
```

## キーボードショートカット

### 基本操作

```text
Cmd+P          ファイル検索（Quick Open）
Cmd+Shift+P    コマンドパレット
Cmd+T          シンボル検索
Cmd+/          コメント切り替え
Cmd+D          次の一致を選択（マルチカーソル）
Cmd+Shift+L    すべての一致を選択
Cmd+Shift+A    AI アシスタント
```

### ナビゲーション

```text
Cmd+1/2/3      パネル切り替え
Cmd+K Cmd+B    サイドバー表示/非表示
Cmd+\          エディタ分割
Cmd+W          タブを閉じる
Cmd+Option+→   次のタブ
Cmd+Option+←   前のタブ
```

### 編集

```text
Option+↑/↓     行を移動
Cmd+Shift+D    行を複製
Cmd+Shift+K    行を削除
Cmd+Enter      下に行を挿入
Cmd+Shift+Enter 上に行を挿入
```

## マルチカーソル機能

Zedのマルチカーソルは非常に強力です。

### 基本的な使い方

```typescript
// 例: 複数の変数名を一度に変更

const userName = "Alice";
const userId = 123;
const userEmail = "alice@example.com";

// ステップ:
// 1. "user" を選択
// 2. Cmd+D を3回押す
// 3. すべての "user" が選択される
// 4. "account" と入力

// 結果:
const accountName = "Alice";
const accountId = 123;
const accountEmail = "alice@example.com";
```

### 縦方向のマルチカーソル

```typescript
// Option+Shift+↑/↓ で縦方向にカーソル追加

const colors = [
  'red',
  'blue',
  'green',
  'yellow'
];

// 各行の先頭に "#" を追加したい場合:
// 1. 'red' の行の先頭にカーソル
// 2. Option+Shift+↓ を3回
// 3. "#" を入力
```

## 拡張機能（Extensions）

### 言語サポートの追加

```text
Cmd+Shift+P → "zed: extensions" → 言語を検索してインストール
```

### 人気の拡張機能

```text
- Rust
- Go
- Python
- Java
- C/C++
- PHP
- Ruby
- Elixir
- Zig
```

### カスタムテーマ

```json
{
  "theme": {
    "mode": "dark",
    "light": "One Light",
    "dark": "One Dark"
  }
}
```

利用可能なテーマ:
- One Dark / One Light
- Solarized Dark / Light
- Gruvbox
- Nord
- Dracula
- Tokyo Night

## Vim モード

```json
{
  "vim_mode": true,
  "vim": {
    "use_system_clipboard": "always",
    "use_multiline_find": true
  }
}
```

### Vim バインディング

```text
基本的なVimコマンドがサポートされています:
- h/j/k/l      移動
- i/a/o        挿入モード
- v/V          ビジュアルモード
- d/y/p        削除/コピー/ペースト
- :/           検索
- :w/:q        保存/終了
```

## LSP（Language Server Protocol）

Zedは、主要な言語サーバーを自動で検出・起動します。

### TypeScript/JavaScript

```json
{
  "lsp": {
    "typescript-language-server": {
      "initialization_options": {
        "preferences": {
          "includeInlayParameterNameHints": "all",
          "includeInlayFunctionParameterTypeHints": true
        }
      }
    }
  }
}
```

### Rust

```bash
# rust-analyzer は自動でインストールされる
rustup component add rust-analyzer
```

### Python

```bash
# Pyright をインストール
npm install -g pyright
```

```json
{
  "lsp": {
    "pyright": {
      "settings": {
        "python.analysis.typeCheckingMode": "basic"
      }
    }
  }
}
```

## パフォーマンス最適化

### 大規模ファイルの扱い

```json
{
  "file_scan_exclusions": [
    "**/.git",
    "**/node_modules",
    "**/target",
    "**/.next",
    "**/dist",
    "**/build"
  ]
}
```

### Git統合の最適化

```json
{
  "git": {
    "git_gutter": "tracked_files",
    "inline_blame": {
      "enabled": true
    }
  }
}
```

## VS Codeからの移行

### 設定の移行

```json
// VS Code の settings.json から対応する設定をコピー

{
  // VS Code
  "editor.fontSize": 14,
  "editor.fontFamily": "JetBrains Mono",
  "editor.tabSize": 2,
  "editor.formatOnSave": true

  // Zed
  "buffer_font_size": 14,
  "buffer_font_family": "JetBrains Mono",
  "tab_size": 2,
  "format_on_save": "on"
}
```

### キーバインドの移行

```json
// ~/.config/zed/keymap.json
[
  {
    "context": "Editor",
    "bindings": {
      "cmd-shift-f": "workspace::DeploySearch",
      "cmd-b": "workspace::ToggleLeftDock"
    }
  }
]
```

### 拡張機能の代替

| VS Code拡張 | Zed代替 |
|-------------|---------|
| GitHub Copilot | AI Assistant (内蔵) |
| Prettier | 言語サーバーフォーマッタ |
| ESLint | typescript-language-server |
| GitLens | Git blame (内蔵) |
| Live Share | Collaboration (内蔵) |

## トラブルシューティング

### LSPが動作しない

```bash
# ログを確認
tail -f ~/Library/Logs/Zed/Zed.log
```

### パフォーマンスが遅い

```json
{
  "file_scan_exclusions": [
    "**/node_modules",
    "**/.git"
  ],
  "git": {
    "git_gutter": "hide"
  }
}
```

### AI アシスタントが動かない

```bash
# API キーを設定
export ANTHROPIC_API_KEY=your_api_key_here
export OPENAI_API_KEY=your_api_key_here
```

## 実践的なワークフロー

### 1. プロジェクトのセットアップ

```bash
cd ~/projects/my-app
zed .
```

### 2. AI でボイラープレート生成

```text
Cmd+Shift+A
プロンプト: "Next.js 15 + TypeScript + TailwindのAPIルートを作って"
```

### 3. マルチカーソルでリファクタリング

```typescript
// 変数名を一括変更
// Cmd+D で次の一致を選択
// すべて選択したら新しい名前を入力
```

### 4. AI にコードレビュー依頼

```text
コードを選択 → Cmd+Shift+A
"このコードのパフォーマンス改善案を提案して"
```

### 5. リアルタイムコラボ

```text
Cmd+Shift+P → "Share Project"
チームメンバーにリンクを共有
```

## まとめ

Zedは、**次世代のコードエディタ**として大きな可能性を秘めています。

### 主な利点

1. **圧倒的な速度** - Rust製で起動・動作が超高速
2. **AI統合** - エディタ内でGPT-4/Claudeを直接利用
3. **コラボレーション** - リアルタイム共同編集が標準装備
4. **シンプルなUI** - 洗練されたデザインと直感的な操作
5. **モダンな設計** - GPU レンダリング、LSP完全サポート

### こんな人におすすめ

- **パフォーマンス重視** - 高速なエディタを求める
- **AI活用** - コーディング時にAIを多用する
- **ペアプログラミング** - リモートでのコラボが多い
- **ミニマリスト** - シンプルで美しいツールが好き

Zedは現在も活発に開発が進んでおり、今後さらなる進化が期待されます。ぜひ試してみてください。

## 参考リンク

- [Zed公式サイト](https://zed.dev/)
- [GitHub リポジトリ](https://github.com/zed-industries/zed)
- [ドキュメント](https://zed.dev/docs)
- [コミュニティフォーラム](https://github.com/zed-industries/zed/discussions)
