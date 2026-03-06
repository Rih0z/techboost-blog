---
title: "mise（旧rtx）開発環境管理ガイド: asdfを超える次世代ツール"
description: "mise（旧rtx）による統合開発環境管理。ランタイムバージョン管理、タスクランナー、環境変数管理を1つのツールで。Node.js、Python、Go、Rustなど複数言語対応。asdfからの移行も解説。mise・rtx・asdfに関する実践情報。"
pubDate: "2025-02-05"
tags: ["mise", "rtx", "asdf", "開発環境", "バージョン管理"]
---
**mise**（旧rtx）は、複数のプログラミング言語のバージョン管理、タスクランナー、環境変数管理を1つのツールで実現する次世代の開発環境管理ツールです。

asdfの代替として登場し、高速性と使いやすさで注目されています。

## miseとは

miseは、Rustで書かれた高速な開発環境管理ツールです。Node.js、Python、Ruby、Go、Java、PHP、Rustなど、数百のツールをサポートします。

### 特徴

- **asdfより高速**: Rustで書かれており、並列インストール可能
- **互換性**: `.tool-versions`（asdf）をそのまま読める
- **統合管理**: バージョン管理 + タスクランナー + 環境変数
- **直感的な設定**: TOML形式の設定ファイル
- **豊富なプラグイン**: 500以上のツールをサポート

### インストール

```bash
# macOS/Linux
curl https://mise.run | sh

# Homebrew
brew install mise

# Cargo (Rust)
cargo install mise

# インストール確認
mise --version
```

### シェル設定

```bash
# Bash
echo 'eval "$(mise activate bash)"' >> ~/.bashrc

# Zsh
echo 'eval "$(mise activate zsh)"' >> ~/.zshrc

# Fish
echo 'mise activate fish | source' >> ~/.config/fish/config.fish

# 設定を反映
exec $SHELL
```

## 基本的な使い方

### ランタイムのインストール

```bash
# 利用可能なバージョンを確認
mise ls-remote node

# 最新版をインストール
mise install node@latest

# 特定バージョンをインストール
mise install node@20.11.0
mise install python@3.12.1
mise install go@1.21.5

# 複数のランタイムを一度にインストール
mise install node@20 python@3.12 go@1.21
```

### グローバル設定

```bash
# グローバルバージョンを設定
mise use -g node@20
mise use -g python@3.12
mise use -g go@1.21

# 設定確認
mise ls

# ~/.config/mise/config.toml に保存される
cat ~/.config/mise/config.toml
```

### プロジェクトごとの設定

```bash
# プロジェクトディレクトリに移動
cd ~/projects/my-app

# ローカルバージョンを設定
mise use node@20.11.0
mise use python@3.12.1

# .mise.toml が作成される
cat .mise.toml
```

```toml
# .mise.toml
[tools]
node = "20.11.0"
python = "3.12.1"
```

### .tool-versions形式（asdf互換）

```bash
# .tool-versions ファイルでも管理可能
echo "node 20.11.0" >> .tool-versions
echo "python 3.12.1" >> .tool-versions

# 自動的にインストール
cd ~/projects/my-app  # ディレクトリに入ると自動的に有効化
```

## 高度なバージョン管理

### セマンティックバージョニング

```bash
# メジャーバージョンのみ指定（最新マイナー・パッチを使用）
mise use node@20
mise use python@3.12

# プレフィックスマッチ
mise use node@20.11  # 20.11.x の最新を使用

# ref: を使ってタグやブランチを指定
mise use node@ref:v20.11.0
```

### 複数バージョンの管理

```bash
# 複数バージョンをインストール
mise install node@18 node@20 node@21

# プロジェクトごとに切り替え
cd ~/project-a
mise use node@18

cd ~/project-b
mise use node@20

# 手動切り替え
mise shell node@21
node --version  # v21.x.x
```

### カスタムビルド

```bash
# ビルドオプションを指定
mise install python@3.12.1 --opts="--enable-optimizations"

# 環境変数でビルド設定
PYTHON_CONFIGURE_OPTS="--enable-optimizations" mise install python@3.12.1
```

## タスクランナー機能

### タスクの定義

```toml
# .mise.toml
[tools]
node = "20"

[tasks.dev]
run = "npm run dev"
description = "Start development server"

[tasks.build]
run = "npm run build"
description = "Build for production"

[tasks.test]
run = "npm test"
description = "Run tests"

[tasks.lint]
run = "npm run lint"
description = "Lint code"

[tasks.format]
run = "npm run format"
description = "Format code"
```

### タスクの実行

```bash
# タスク一覧を表示
mise tasks

# タスクを実行
mise run dev
mise run build
mise run test

# 短縮形
mise run dev
# または
mise dev  # タスク名が直接使える
```

### 依存関係のあるタスク

```toml
# .mise.toml
[tasks.clean]
run = "rm -rf dist"

[tasks.build]
depends = ["clean"]
run = "npm run build"

[tasks.deploy]
depends = ["build", "test"]
run = "./deploy.sh"
```

```bash
# deploy を実行すると自動的に build と test も実行される
mise run deploy
```

### 並列実行

```toml
# .mise.toml
[tasks.lint]
run = "npm run lint"

[tasks.typecheck]
run = "npm run typecheck"

[tasks.check]
depends = ["lint", "typecheck"]
# 依存タスクは並列実行される
```

### 環境変数付きタスク

```toml
# .mise.toml
[tasks.dev]
run = "npm run dev"
env = { NODE_ENV = "development", PORT = "3000" }

[tasks.prod]
run = "npm start"
env = { NODE_ENV = "production", PORT = "8080" }
```

## 環境変数管理

### 基本的な環境変数

```toml
# .mise.toml
[env]
NODE_ENV = "development"
DATABASE_URL = "postgresql://localhost/mydb"
API_KEY = "secret-key"
```

### ファイルからの読み込み

```toml
# .mise.toml
[env]
_.file = ".env"  # .env ファイルを読み込む
```

```bash
# .env
NODE_ENV=development
DATABASE_URL=postgresql://localhost/mydb
API_KEY=secret-key
```

### テンプレート変数

```toml
# .mise.toml
[env]
PROJECT_ROOT = "{{ config_root }}"
DATA_DIR = "{{ config_root }}/data"
LOG_FILE = "{{ config_root }}/logs/app.log"
```

### 条件付き環境変数

```toml
# .mise.toml
[env]
NODE_ENV = "development"

[env.production]
NODE_ENV = "production"
API_URL = "https://api.example.com"

[env.staging]
NODE_ENV = "staging"
API_URL = "https://staging-api.example.com"
```

```bash
# 環境を切り替え
MISE_ENV=production mise run dev
MISE_ENV=staging mise run dev
```

## プロジェクト構成例

### フロントエンドプロジェクト

```toml
# .mise.toml
[tools]
node = "20.11.0"
pnpm = "8.15.0"

[tasks.install]
run = "pnpm install"

[tasks.dev]
run = "pnpm dev"
env = { PORT = "3000" }

[tasks.build]
run = "pnpm build"

[tasks.preview]
depends = ["build"]
run = "pnpm preview"

[tasks.lint]
run = "pnpm run lint"

[tasks.format]
run = "pnpm run format"

[tasks.typecheck]
run = "pnpm run typecheck"

[tasks.test]
run = "pnpm test"

[tasks.check]
depends = ["lint", "typecheck", "test"]

[env]
NODE_ENV = "development"
VITE_API_URL = "http://localhost:8080"
```

### バックエンドプロジェクト

```toml
# .mise.toml
[tools]
node = "20.11.0"
go = "1.21.5"
postgres = "16"

[tasks.install]
run = "go mod download"

[tasks.dev]
run = "air"  # ホットリロード
env = { PORT = "8080", ENV = "development" }

[tasks.build]
run = "go build -o bin/app cmd/main.go"

[tasks.test]
run = "go test ./..."

[tasks.migration]
run = "goose -dir migrations up"

[tasks.seed]
run = "go run cmd/seed/main.go"

[tasks.db-reset]
depends = ["migration", "seed"]

[env]
DATABASE_URL = "postgresql://localhost/mydb"
REDIS_URL = "redis://localhost:6379"
JWT_SECRET = "dev-secret"
```

### モノレポ

```toml
# .mise.toml (ルート)
[tools]
node = "20"
pnpm = "8"

[tasks.install]
run = "pnpm install"

[tasks.dev]
run = "pnpm run dev"

[tasks.build]
run = "pnpm run build"

[tasks."dev:web"]
run = "pnpm --filter web dev"

[tasks."dev:api"]
run = "pnpm --filter api dev"

[tasks."build:all"]
run = "pnpm -r build"

[tasks.test]
run = "pnpm -r test"

[env]
PNPM_HOME = "{{ config_root }}/.pnpm"
```

## asdfからの移行

### 既存の.tool-versionsを使用

```bash
# asdfの設定をそのまま読み込める
cat .tool-versions
# node 20.11.0
# python 3.12.1

# miseで自動的にインストール
cd ~/project
mise install  # .tool-versions を読んでインストール
```

### mise形式に移行

```bash
# .tool-versions を .mise.toml に変換
mise use node@20.11.0 python@3.12.1

# .mise.toml が作成される
cat .mise.toml
```

### プラグインの確認

```bash
# asdfプラグイン一覧
asdf plugin list

# miseでサポート状況を確認
mise ls-remote <tool-name>

# ほとんどのasdfプラグインはmiseでも動作
```

## プラグインとカスタムツール

### 利用可能なツール一覧

```bash
# すべてのツールを表示
mise registry

# インストール済みツール
mise ls

# 検索
mise registry | grep python
```

### カスタムツールの定義

```toml
# .mise.toml
[tools]
"my-cli" = "1.0.0"

[plugins.my-cli]
uri = "https://github.com/username/mise-my-cli"
```

## ベストプラクティス

### グローバル vs ローカル

```bash
# ✅ Good: プロジェクトごとに明示的にバージョン指定
cd ~/project
mise use node@20.11.0

# ✅ Good: グローバルは安定版
mise use -g node@20

# ❌ Bad: グローバルで特定マイナーバージョン
mise use -g node@20.11.0  # 他のプロジェクトで困る
```

### タスクの分割

```toml
# ✅ Good: 小さいタスクに分割
[tasks.lint:js]
run = "eslint ."

[tasks.lint:css]
run = "stylelint **/*.css"

[tasks.lint]
depends = ["lint:js", "lint:css"]

# ❌ Bad: 1つのタスクにまとめすぎ
[tasks.check]
run = "eslint . && stylelint **/*.css && tsc && jest"
```

### セキュリティ

```toml
# ❌ Bad: 秘密情報を .mise.toml に直接書く
[env]
API_KEY = "secret-123"

# ✅ Good: .env ファイルから読み込む
[env]
_.file = ".env"  # .env を .gitignore に追加

# ✅ Good: テンプレート変数を使う
[env]
CONFIG_FILE = "{{ config_root }}/config.json"
```

## パフォーマンス最適化

### 並列インストール

```bash
# 複数のツールを並列でインストール
mise install node@20 python@3.12 go@1.21 --jobs 4
```

### キャッシュの活用

```bash
# キャッシュディレクトリの確認
mise cache

# キャッシュクリア
mise cache clear
```

## トラブルシューティング

### デバッグモード

```bash
# デバッグ情報を表示
MISE_DEBUG=1 mise install node@20

# より詳細なログ
MISE_LOG_LEVEL=trace mise install node@20
```

### 環境の確認

```bash
# mise の状態を確認
mise doctor

# インストール済みツール
mise ls

# 現在有効な設定
mise current
```

## まとめ

miseは、開発環境管理を統合的に行える強力なツールです。asdfの代替として、さらに高速で使いやすくなっています。

### 重要なポイント

1. **統合管理**: バージョン管理 + タスクランナー + 環境変数
2. **asdf互換**: `.tool-versions` をそのまま使える
3. **高速**: Rust製で並列インストール可能
4. **TOML設定**: `.mise.toml` で直感的に設定
5. **豊富なプラグイン**: 500以上のツールをサポート

### ユースケース

- **マルチ言語プロジェクト**: Node.js + Python + Go
- **モノレポ**: 統一されたツールバージョン
- **チーム開発**: `.mise.toml` をgit管理
- **CI/CD**: GitHub Actionsでも同じ設定を使える
- **開発環境の再現**: 新メンバーのオンボーディング

miseを使えば、`nvm`、`pyenv`、`rbenv`、`gvm`などを個別にインストールする必要がなくなります。

### 参考リンク

- [mise公式サイト](https://mise.jdx.dev/)
- [mise GitHub](https://github.com/jdx/mise)
- [mise Registry](https://mise.jdx.dev/registry.html)
