---
title: 'macOS 開発環境構築 2026 完全ガイド — M4 Mac対応・最新ツール全収録'
description: 'M4 Mac対応のmacOS開発環境構築ガイド2026年版。Homebrew・Oh My Zsh・Git・Node.js・Python・Docker・VS Code・Cursor・Claude Codeまで、最速セットアップ手順を完全解説。'
pubDate: 'Feb 21 2026'
tags: ['macOS', 'DevTool', '開発環境', 'セットアップ']
---

# macOS 開発環境構築 2026 完全ガイド — M4 Mac対応・最新ツール全収録

2026年、Mac は開発者にとって引き続き最強のプラットフォームです。Apple Silicon（M1/M2/M3/M4）の登場以降、コンパイル速度・バッテリー持続時間ともに Intel 時代とは別次元の体験になりました。しかし、「新しい Mac を手に入れたけど、一から環境を作り直すのが面倒」「どのツールを入れれば最速で作業できるのか分からない」という声は相変わらず多く聞きます。

この記事では、2026年時点の**最新ベストプラクティス**に基づいて、ゼロから完全な開発環境を構築する手順を網羅します。Homebrew・ターミナル・Git・言語ランタイム・Docker・エディタ・AIコーディングツール・dotfiles 管理まで、コマンド一本ずつ丁寧に解説します。

---

## 1. はじめに — 2026年のmacOS開発環境トレンド

### Apple Silicon の完全成熟

M4 チップ搭載 Mac が 2025年に全ラインアップへ普及し、エコシステムがほぼ完全に ARM ネイティブ化しました。Rosetta 2 経由で x86 バイナリを動かす機会も減り、2026年時点では **Homebrew 経由でインストールするほぼ全ツールが Apple Silicon ネイティブ** で動作します。

```bash
# アーキテクチャを確認する
uname -m
# → arm64（Apple Silicon）または x86_64（Intel）

# Rosetta 2 のプロセスを確認する
arch
```

### 開発ツールの三大トレンド

**1. AIネイティブな開発フロー**: GitHub Copilot・Cursor・Claude Code が「あれば便利」から「ないと困る」レベルに定着。  
**2. ランタイム管理の標準化**: nvm・pyenv・mise（旧 rtx）がバージョン管理の定番として固まった。  
**3. ターミナル体験の刷新**: Warp・Starship・Zoxide などの次世代ツールが従来の bashrc カスタマイズを置き換えつつある。

---

## 2. Homebrew インストール・基本設定

Homebrew は macOS の事実上のパッケージマネージャです。GUI アプリから CLI ツールまで、ほぼあらゆるソフトウェアをコマンド一本で管理できます。

### 2-1. Xcode Command Line Tools のインストール

Homebrew は Xcode の CLI ツール（コンパイラ等）を前提とします。macOS を初期化した直後はインストールが必要です。

```bash
# Command Line Tools のインストール（約5〜10分）
xcode-select --install

# インストール確認
xcode-select -p
# → /Library/Developer/CommandLineTools
```

### 2-2. Homebrew 本体のインストール

```bash
# 公式インストールスクリプトを実行
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

Apple Silicon Mac では、Homebrew は `/opt/homebrew` にインストールされます。Intel Mac では `/usr/local` です。インストール完了後、スクリプトが表示する「Next steps」の指示に従い、`~/.zprofile` に PATH を追加します。

```bash
# Apple Silicon 用（M1/M2/M3/M4 共通）
echo 'eval "$(/opt/homebrew/bin/brew shellenv)"' >> ~/.zprofile
eval "$(/opt/homebrew/bin/brew shellenv)"

# 動作確認
brew --version
# → Homebrew 4.4.x
```

### 2-3. Homebrew の基本操作

```bash
# パッケージを検索する
brew search ripgrep

# パッケージをインストールする
brew install ripgrep

# GUI アプリ（Cask）をインストールする
brew install --cask visual-studio-code

# インストール済みパッケージ一覧
brew list

# パッケージを最新版に更新する
brew upgrade

# 不要なキャッシュを削除する
brew cleanup
```

### 2-4. Brewfile で環境を再現する

`Brewfile` を使うと、インストール済みパッケージを一括でバックアップ・復元できます。新しい Mac へ移行するときに非常に便利です。

```bash
# 現在のパッケージを Brewfile にエクスポートする
brew bundle dump --file=~/dotfiles/Brewfile

# Brewfile から一括インストールする
brew bundle install --file=~/dotfiles/Brewfile
```

```ruby
# ~/dotfiles/Brewfile の例
tap "homebrew/bundle"

# CLI ツール
brew "git"
brew "gh"
brew "ripgrep"
brew "fd"
brew "bat"
brew "eza"
brew "fzf"
brew "zoxide"
brew "starship"
brew "mise"
brew "jq"
brew "yq"
brew "httpie"
brew "tldr"

# 言語ランタイム
brew "node"
brew "python@3.13"
brew "go"
brew "rust"

# データベース
brew "postgresql@17"
brew "redis"

# GUI アプリ（Cask）
cask "visual-studio-code"
cask "cursor"
cask "docker"
cask "warp"
cask "rectangle"
cask "raycast"
cask "karabiner-elements"
cask "1password"
cask "tableplus"
```

---

## 3. ターミナル強化 — Oh My Zsh・Starship・Warp

### 3-1. Oh My Zsh のインストール

macOS のデフォルトシェルは Zsh です。Oh My Zsh を導入することで、プラグイン・テーマ・補完機能を大幅に強化できます。

```bash
# Oh My Zsh をインストールする
sh -c "$(curl -fsSL https://raw.githubusercontent.com/ohmyzsh/ohmyzsh/master/tools/install.sh)"
```

### 3-2. 必須プラグインの導入

```bash
# zsh-autosuggestions（過去コマンドをグレーで提案）
git clone https://github.com/zsh-users/zsh-autosuggestions \
  ${ZSH_CUSTOM:-~/.oh-my-zsh/custom}/plugins/zsh-autosuggestions

# zsh-syntax-highlighting（コマンドを色分け表示）
git clone https://github.com/zsh-users/zsh-syntax-highlighting.git \
  ${ZSH_CUSTOM:-~/.oh-my-zsh/custom}/plugins/zsh-syntax-highlighting

# ~/.zshrc のプラグイン設定に追加する
plugins=(
  git
  z
  fzf
  zsh-autosuggestions
  zsh-syntax-highlighting
  docker
  node
)
```

### 3-3. Starship — クロスシェル対応の高速プロンプト

Starship は Rust で書かれた高速なプロンプトカスタマイズツールです。Git ブランチ・言語バージョン・コマンド実行時間などを自動検出して表示します。

```bash
# Homebrew でインストールする
brew install starship

# ~/.zshrc の末尾に追加する
echo 'eval "$(starship init zsh)"' >> ~/.zshrc

# 設定ファイルを作成する
mkdir -p ~/.config
```

```toml
# ~/.config/starship.toml の推奨設定

# プロンプトの全体フォーマット
format = """
$username\
$hostname\
$directory\
$git_branch\
$git_status\
$nodejs\
$python\
$rust\
$golang\
$docker_context\
$cmd_duration\
$line_break\
$character"""

[directory]
truncation_length = 3
truncate_to_repo = true

[git_branch]
symbol = " "
style = "bold purple"

[git_status]
conflicted = "="
ahead = "↑${count}"
behind = "↓${count}"
diverged = "↕"
untracked = "?"
stashed = "$"
modified = "!"
staged = "+"
renamed = "»"
deleted = "✘"

[nodejs]
symbol = " "
style = "bold green"

[python]
symbol = " "
style = "bold yellow"

[cmd_duration]
min_time = 500
format = "took [$duration](bold yellow) "
```

### 3-4. Warp — AI 搭載の次世代ターミナル

Warp は 2025年に無料プランが大幅に拡充され、個人利用では事実上フリーで使えるようになりました。Rust で書かれており、起動速度・レスポンスともに従来のターミナルより高速です。

```bash
# Homebrew でインストールする
brew install --cask warp
```

Warp の主要機能:

- **Warp AI**: コマンドを自然言語で検索できる（例: 「過去7日間で変更されたファイルを表示」）
- **ブロック型出力**: コマンドとその出力がブロックとして区切られ、スクロールが快適
- **Workflows**: よく使うコマンドをスニペット化して再利用
- **SSH セッション**: リモートサーバーへの接続も統一 UI で管理

### 3-5. 便利な Zsh エイリアスの設定

```bash
# ~/.zshrc に追加する

# eza（ls の現代版）
alias ls='eza --icons'
alias ll='eza -la --icons --git'
alias lt='eza --tree --icons -L 3'

# bat（cat の現代版。シンタックスハイライト付き）
alias cat='bat'

# zoxide（スマートな cd コマンド）
eval "$(zoxide init zsh)"
alias cd='z'

# Git 短縮エイリアス
alias g='git'
alias gs='git status'
alias ga='git add'
alias gc='git commit'
alias gp='git push'
alias gl='git pull'
alias gd='git diff'
alias glog='git log --oneline --graph --decorate'

# Docker
alias d='docker'
alias dc='docker compose'
alias dps='docker ps'
alias dimg='docker images'
```

---

## 4. Git セットアップ — SSH鍵・GPG署名・エイリアス

### 4-1. Git の初期設定

```bash
# ユーザー情報を設定する
git config --global user.name "Your Name"
git config --global user.email "your@email.com"

# デフォルトブランチ名を main に設定する
git config --global init.defaultBranch main

# プッシュ先を現在のブランチに固定する
git config --global push.default current

# pull のデフォルト動作を rebase に設定する
git config --global pull.rebase true

# 大文字小文字を区別する（macOS はデフォルトで区別しない）
git config --global core.ignorecase false

# ファイルモードの変更を無視する
git config --global core.fileMode false
```

### 4-2. SSH 鍵の生成と GitHub への登録

```bash
# Ed25519 方式で SSH 鍵を生成する（最新の推奨方式）
ssh-keygen -t ed25519 -C "your@email.com" -f ~/.ssh/id_ed25519

# SSH エージェントを起動する
eval "$(ssh-agent -s)"

# 鍵を SSH エージェントに追加する（macOS キーチェーン連携）
ssh-add --apple-use-keychain ~/.ssh/id_ed25519

# ~/.ssh/config に設定を追加する
cat >> ~/.ssh/config << 'EOF'
Host github.com
  AddKeysToAgent yes
  UseKeychain yes
  IdentityFile ~/.ssh/id_ed25519
EOF

# 公開鍵をクリップボードにコピーする
pbcopy < ~/.ssh/id_ed25519.pub
echo "公開鍵をクリップボードにコピーしました。GitHub の Settings > SSH Keys に登録してください。"

# 接続テスト
ssh -T git@github.com
# → Hi username! You've successfully authenticated...
```

### 4-3. GPG 署名でコミットを保護する

GPG 署名を有効にすると、GitHub 上でコミットに「Verified」バッジが表示され、なりすましを防止できます。

```bash
# GnuPG をインストールする
brew install gnupg pinentry-mac

# GPG キーを生成する
gpg --full-generate-key
# → RSA、4096 ビット、有効期限なし（0）を選択

# 生成したキーの ID を確認する
gpg --list-secret-keys --keyid-format=long
# → sec   rsa4096/XXXXXXXXXXXXXXXXX の XXXXXXXXXXXXXXXXX が Key ID

# 公開鍵を GitHub にエクスポートする
gpg --armor --export XXXXXXXXXXXXXXXXX | pbcopy

# Git に署名設定を追加する
git config --global user.signingkey XXXXXXXXXXXXXXXXX
git config --global commit.gpgsign true
git config --global tag.gpgsign true

# pinentry-mac を設定する（macOS キーチェーン連携）
echo "pinentry-program $(which pinentry-mac)" >> ~/.gnupg/gpg-agent.conf
gpgconf --kill gpg-agent
```

### 4-4. 便利な Git エイリアス

```bash
# ~/.gitconfig に追加する
git config --global alias.st 'status'
git config --global alias.co 'checkout'
git config --global alias.br 'branch'
git config --global alias.lg 'log --oneline --graph --decorate --all'
git config --global alias.undo 'reset HEAD~1 --mixed'
git config --global alias.unstage 'reset HEAD --'
git config --global alias.last 'log -1 HEAD'
git config --global alias.aliases 'config --get-regexp alias'
```

---

## 5. 言語環境 — Node.js/nvm・Python/pyenv・Go・Rust

### 5-1. mise — 統合ランタイムバージョン管理

2026年時点では、**mise**（旧 rtx）が nvm・pyenv・rbenv の代替として急速に普及しています。一つのツールで複数言語のバージョンを統一管理できます。

```bash
# mise をインストールする
brew install mise

# ~/.zshrc に追加する
echo 'eval "$(mise activate zsh)"' >> ~/.zshrc
source ~/.zshrc

# Node.js の最新 LTS をインストールする
mise use --global node@lts

# Python の最新版をインストールする
mise use --global python@3.13

# バージョン確認
node --version   # → v22.x.x
python --version # → Python 3.13.x
```

### 5-2. Node.js と npm 周辺の設定

```bash
# グローバルパッケージをインストールする
npm install -g pnpm     # 高速な npm 互換パッケージマネージャ
npm install -g yarn     # Facebook 製パッケージマネージャ
npm install -g typescript
npm install -g tsx      # TypeScript を直接実行するランナー
npm install -g @anthropic-ai/claude-code  # Claude Code CLI

# pnpm のセットアップ
pnpm setup
source ~/.zshrc

# Node.js のバージョンをプロジェクト単位で管理する
echo "22" > .node-version  # プロジェクトルートに配置
```

### 5-3. Python 開発環境

```bash
# pip を最新版に更新する
pip install --upgrade pip

# uv — Rust 製の超高速 Python パッケージマネージャ（2025年推奨）
pip install uv

# uv で仮想環境を作成する（従来の virtualenv より 10〜100倍高速）
uv venv .venv
source .venv/bin/activate

# uv でパッケージをインストールする
uv pip install fastapi uvicorn httpx pytest

# pyproject.toml ベースのプロジェクト管理
uv init my-project
cd my-project
uv add requests pandas numpy

# Jupyter Notebook 環境
uv pip install jupyter notebook ipykernel
```

### 5-4. Go のインストールと設定

```bash
# Go をインストールする
brew install go

# バージョン確認
go version  # → go version go1.23.x darwin/arm64

# GOPATH の設定（~/.zshrc に追加）
export GOPATH="$HOME/go"
export PATH="$PATH:$GOPATH/bin"

# よく使う Go ツールをインストールする
go install golang.org/x/tools/gopls@latest        # 公式 LSP
go install github.com/go-delve/delve/cmd/dlv@latest # デバッガ
go install honnef.co/go/tools/cmd/staticcheck@latest # 静的解析
```

### 5-5. Rust のインストールと設定

```bash
# rustup 経由で Rust をインストールする
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# 最新の stable ツールチェーンをインストールする
rustup update stable

# バージョン確認
rustc --version  # → rustc 1.84.x
cargo --version  # → cargo 1.84.x

# rust-analyzer（LSP）のインストール
rustup component add rust-analyzer

# よく使う Cargo ツール
cargo install cargo-edit    # Cargo.toml の依存関係管理
cargo install cargo-watch   # ファイル変更時に自動ビルド
cargo install tokei         # コード行数カウント
```

---

## 6. Docker Desktop セットアップ

### 6-1. Docker Desktop のインストール

```bash
# Homebrew でインストールする
brew install --cask docker

# または公式サイトからダウンロード
# https://www.docker.com/products/docker-desktop
```

インストール後に Docker Desktop を起動し、利用規約に同意します。Apple Silicon Mac では自動的に ARM64 ネイティブイメージが使用されます。

### 6-2. Docker の基本設定

Docker Desktop の設定でパフォーマンスを最適化します。

- **Resources > Memory**: 8 GB 以上を割り当て（マシンの 50% 程度が目安）
- **Resources > CPU**: 4〜8 コアを割り当て
- **General > Use Rosetta for x86/amd64 emulation**: 有効にする（Intel 向けイメージを動かす場合）

```bash
# 動作確認
docker run hello-world

# Docker Compose V2 の確認
docker compose version  # → Docker Compose version v2.x.x

# Apple Silicon で動作しているかを確認する
docker info | grep Architecture
# → Architecture: aarch64
```

### 6-3. Colima — 軽量な Docker 代替（省メモリ重視の方向け）

Docker Desktop のメモリ消費が気になる場合、**Colima** が優れた代替になります。

```bash
# Colima をインストールする
brew install colima docker docker-compose

# Colima を起動する（スペック指定あり）
colima start --cpu 4 --memory 8 --disk 60

# 起動確認
colima status
docker ps

# 自動起動の設定
colima start --runtime docker
```

### 6-4. 実用的な Docker Compose の設定例

```yaml
# docker-compose.yml — Web 開発での典型的な構成
services:
  app:
    build:
      context: .
      platform: linux/arm64  # Apple Silicon でネイティブ動作
    ports:
      - "3000:3000"
    volumes:
      - .:/app
      - /app/node_modules  # node_modules はコンテナ内に分離
    environment:
      - NODE_ENV=development
    depends_on:
      - db
      - redis

  db:
    image: postgres:17-alpine
    platform: linux/arm64
    environment:
      POSTGRES_DB: myapp
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
    volumes:
      - pgdata:/var/lib/postgresql/data
    ports:
      - "5432:5432"

  redis:
    image: redis:7-alpine
    platform: linux/arm64
    ports:
      - "6379:6379"

volumes:
  pgdata:
```

---

## 7. エディタ — VS Code・Cursor・設定同期

### 7-1. VS Code のインストールと基本設定

```bash
# Homebrew でインストールする
brew install --cask visual-studio-code

# CLI（code コマンド）を有効にする
# VS Code を開き、Cmd+Shift+P → "Shell Command: Install 'code' command in PATH"

# コマンドラインから開く
code .
code /path/to/project
```

### 7-2. 必須 VS Code 拡張機能

```bash
# 拡張機能をコマンドラインでインストールする

# 基本開発ツール
code --install-extension dbaeumer.vscode-eslint
code --install-extension esbenp.prettier-vscode
code --install-extension biomejs.biome
code --install-extension ms-vscode.vscode-typescript-next

# Git 関連
code --install-extension eamodio.gitlens
code --install-extension mhutchie.git-graph

# Docker・インフラ
code --install-extension ms-azuretools.vscode-docker
code --install-extension ms-vscode-remote.remote-ssh

# AI コーディング
code --install-extension GitHub.copilot
code --install-extension GitHub.copilot-chat

# 言語サポート
code --install-extension rust-lang.rust-analyzer
code --install-extension golang.go
code --install-extension ms-python.python
code --install-extension bradlc.vscode-tailwindcss

# テーマ・外観
code --install-extension GitHub.github-vscode-theme
code --install-extension PKief.material-icon-theme
```

### 7-3. VS Code の推奨設定

```json
// ~/.config/Code/User/settings.json
{
  "editor.fontFamily": "'JetBrains Mono', 'Fira Code', monospace",
  "editor.fontSize": 14,
  "editor.lineHeight": 1.6,
  "editor.fontLigatures": true,
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.tabSize": 2,
  "editor.minimap.enabled": false,
  "editor.suggest.snippetsPreventQuickSuggestions": false,
  "editor.inlineSuggest.enabled": true,
  "editor.wordWrap": "off",

  "terminal.integrated.fontFamily": "'JetBrains Mono', monospace",
  "terminal.integrated.fontSize": 13,
  "terminal.integrated.defaultProfile.osx": "zsh",

  "workbench.colorTheme": "GitHub Dark Default",
  "workbench.iconTheme": "material-icon-theme",
  "workbench.startupEditor": "none",

  "git.autofetch": true,
  "git.confirmSync": false,
  "git.enableSmartCommit": true,

  "files.trimTrailingWhitespace": true,
  "files.insertFinalNewline": true,
  "files.exclude": {
    "**/.git": true,
    "**/node_modules": true,
    "**/.DS_Store": true
  },

  "[typescript]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode"
  },
  "[python]": {
    "editor.defaultFormatter": "ms-python.python"
  }
}
```

### 7-4. Cursor — AI ファーストエディタ

Cursor は VS Code フォークをベースにした AI 特化エディタです。マルチファイル編集・コードベース全体の理解・エージェントモードが強みです。

```bash
# Homebrew でインストールする
brew install --cask cursor
```

Cursor の主要機能:

- **Tab 補完**: GitHub Copilot より高度な補完。複数行・複数ファイルにまたがる変更を一括提案
- **Cmd+K**: 選択範囲のインラインエディット。「このループを最適化して」など自然言語で指示
- **Cmd+I（Composer）**: 複数ファイルにまたがる大規模変更を一度の指示で実行
- **@コードベース**: プロジェクト全体を参照しながら回答を生成

---

## 8. AIコーディングアシスタント — Claude Code・GitHub Copilot

### 8-1. Claude Code のインストールと設定

Claude Code は Anthropic が提供する CLI 型の AIコーディングエージェントです。ターミナルから自律的にファイルを読み書き・テストの実行・Git 操作まで行います。

```bash
# npm でグローバルインストールする
npm install -g @anthropic-ai/claude-code

# バージョン確認
claude --version

# 初期設定（API キーの設定）
claude config set apiKey sk-ant-XXXXXXXXXXXXXXXX

# 対話セッションを開始する
claude

# コマンドライン引数でタスクを指定する
claude "このリポジトリの README.md を日本語で書き直して"

# 特定のファイルを参照して指示する
claude --file src/app.ts "このコードのテストを vitest で書いて"
```

### 8-2. Claude Code の実践的な使い方

```bash
# プロジェクトルートに CLAUDE.md を作成することで、コンテキストを常時注入できる
cat > CLAUDE.md << 'EOF'
# プロジェクト概要
このリポジトリは Next.js 15 + TypeScript + Prisma で構成されたECサイトです。

## 技術スタック
- フレームワーク: Next.js 15 (App Router)
- スタイリング: Tailwind CSS v4
- データベース: PostgreSQL + Prisma ORM
- テスト: Vitest + React Testing Library
- パッケージマネージャ: pnpm

## コーディング規約
- コンポーネントは Server Component を優先する
- データ取得は fetch キャッシュを明示的に設定する
- エラーハンドリングは Result 型で統一する
EOF

# 実際のタスク例
claude "src/components/ 以下の全コンポーネントに単体テストを追加して。テストファイルは同じディレクトリに配置してください"

# --permission-mode bypassPermissions でファイル操作の確認ダイアログをスキップ
claude --permission-mode bypassPermissions "依存関係を最新版に更新して package.json を更新してください"
```

### 8-3. GitHub Copilot の設定

```bash
# VS Code で GitHub Copilot を有効にする（拡張機能インストール済みの前提）
# 1. GitHub にサインインする
# 2. Cmd+Shift+P → "GitHub Copilot: Sign In"

# GitHub CLI 経由でも認証できる
brew install gh
gh auth login
gh extension install github/gh-copilot

# GitHub Copilot CLI（コマンドラインで AI 補助）
gh copilot suggest "git の特定コミットを別ブランチに適用する方法"
gh copilot explain "docker run -it --rm -v $(pwd):/app node:22 bash"
```

---

## 9. 便利ツール一覧

### 9-1. Raycast — Spotlight の完全上位互換

```bash
brew install --cask raycast
```

Raycast は Spotlight（Cmd+Space）の代替として最もおすすめのランチャーです。

**主な機能:**
- ファイル検索・アプリ起動（Spotlight の完全代替）
- クリップボード履歴（Cmd+Shift+V で過去のコピーを参照）
- スニペット管理（テキスト展開機能）
- ウィンドウ管理（後述の Rectangle が不要になる）
- 計算機・単位変換・カラーピッカー
- GitHub・Jira・Notion などの統合拡張機能

### 9-2. Rectangle / Raycast Window Manager — ウィンドウ管理

```bash
# Rectangle（シンプルなウィンドウ管理）
brew install --cask rectangle

# 主要なショートカット
# Cmd+Option+Left  → 左半分
# Cmd+Option+Right → 右半分
# Cmd+Option+F     → フルスクリーン
# Cmd+Option+C     → 中央に配置
```

### 9-3. Karabiner-Elements — キーマッピング

```bash
brew install --cask karabiner-elements
```

`~/.config/karabiner/karabiner.json` で高度なキーマッピングを設定できます。代表的なカスタマイズ:

- **Caps Lock → Control**（JIS キーボードでの定番設定）
- **英数/かな キー** に IME 切り替えを割り当て
- **右 Command** 単押しで英数、**右 Option** 単押しでかな

### 9-4. その他の推奨ツール

```bash
# 1Password — パスワードマネージャ
brew install --cask 1password
brew install --cask 1password-cli  # CLI 版。シェルスクリプトからシークレット取得可

# TablePlus — データベース GUI クライアント
brew install --cask tableplus

# Proxyman — HTTP/HTTPS プロキシデバッガ
brew install --cask proxyman

# Paw / RapidAPI — API クライアント（Postman 代替）
brew install --cask rapidapi

# CleanMyMac X — システムクリーナー
brew install --cask cleanmymac

# MonitorControl — 外部ディスプレイの輝度・音量を Mac から制御
brew install --cask monitorcontrol

# AltTab — Windows 風のアプリ切り替え
brew install --cask alt-tab

# Numi — テキスト計算機
brew install --cask numi

# プログラミングフォント（JetBrains Mono 推奨）
brew tap homebrew/cask-fonts
brew install --cask font-jetbrains-mono
brew install --cask font-fira-code
```

---

## 10. dotfiles 管理 — Git管理・GNU Stow

開発環境の設定ファイル（dotfiles）を Git で管理することで、新しい Mac への移行が数分で完了します。

### 10-1. dotfiles リポジトリの作成

```bash
# dotfiles ディレクトリを作成する
mkdir -p ~/dotfiles

# 主要な設定ファイルを移動する
mv ~/.zshrc ~/dotfiles/zshrc
mv ~/.gitconfig ~/dotfiles/gitconfig
mv ~/.ssh/config ~/dotfiles/ssh/config
mv ~/.config/starship.toml ~/dotfiles/config/starship.toml

# Git リポジトリとして初期化する
cd ~/dotfiles
git init
git remote add origin git@github.com:yourusername/dotfiles.git
```

### 10-2. GNU Stow でシンボリックリンクを管理する

GNU Stow は dotfiles の各ファイルをホームディレクトリへシンボリックリンクとして自動展開するツールです。

```bash
# Stow をインストールする
brew install stow

# dotfiles のディレクトリ構造をホームディレクトリと一致させる
# 例: ~/dotfiles/zsh/.zshrc → ~/.zshrc
mkdir -p ~/dotfiles/zsh
mv ~/dotfiles/zshrc ~/dotfiles/zsh/.zshrc

mkdir -p ~/dotfiles/git
mv ~/dotfiles/gitconfig ~/dotfiles/git/.gitconfig

mkdir -p ~/dotfiles/starship/.config
mv ~/dotfiles/config/starship.toml ~/dotfiles/starship/.config/starship.toml

# シンボリックリンクを一括作成する（dotfiles ディレクトリ内から実行）
cd ~/dotfiles
stow zsh git starship

# 確認する
ls -la ~ | grep "\->"
# → .zshrc -> dotfiles/zsh/.zshrc
```

### 10-3. 新しい Mac へのセットアップスクリプト

```bash
# ~/dotfiles/setup.sh — 新 Mac で最初に実行するスクリプト

#!/bin/bash
set -euo pipefail

echo "--- macOS 開発環境セットアップ開始 ---"

# 1. Xcode Command Line Tools
if ! xcode-select -p &>/dev/null; then
  echo "Xcode Command Line Tools をインストールしています..."
  xcode-select --install
  read -p "インストールが完了したら Enter を押してください..."
fi

# 2. Homebrew のインストール
if ! command -v brew &>/dev/null; then
  echo "Homebrew をインストールしています..."
  /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
  eval "$(/opt/homebrew/bin/brew shellenv)"
fi

# 3. Brewfile から一括インストール
echo "Brewfile からパッケージをインストールしています..."
brew bundle install --file="$(dirname "$0")/Brewfile"

# 4. Oh My Zsh のインストール
if [ ! -d "$HOME/.oh-my-zsh" ]; then
  echo "Oh My Zsh をインストールしています..."
  sh -c "$(curl -fsSL https://raw.githubusercontent.com/ohmyzsh/ohmyzsh/master/tools/install.sh)" "" --unattended
fi

# 5. Zsh プラグインのインストール
ZSH_CUSTOM="${ZSH_CUSTOM:-$HOME/.oh-my-zsh/custom}"
if [ ! -d "$ZSH_CUSTOM/plugins/zsh-autosuggestions" ]; then
  git clone https://github.com/zsh-users/zsh-autosuggestions "$ZSH_CUSTOM/plugins/zsh-autosuggestions"
fi
if [ ! -d "$ZSH_CUSTOM/plugins/zsh-syntax-highlighting" ]; then
  git clone https://github.com/zsh-users/zsh-syntax-highlighting "$ZSH_CUSTOM/plugins/zsh-syntax-highlighting"
fi

# 6. Stow でシンボリックリンクを展開する
DOTFILES_DIR="$(dirname "$0")"
cd "$DOTFILES_DIR"
stow zsh git starship ssh

# 7. mise で言語ランタイムをインストールする
mise install

echo "--- セットアップ完了 ---"
echo "シェルを再起動してください: exec zsh"
```

### 10-4. .mise.toml でランタイムをバージョン固定する

```toml
# ~/dotfiles/.mise.toml — 全プロジェクト共通のランタイムバージョン
[tools]
node = "lts"
python = "3.13"
go = "latest"
```

---

## まとめ — 2026年のMac開発環境チェックリスト

この記事で紹介した内容を、セットアップ完了チェックリストとしてまとめます。

```
[ ] Xcode Command Line Tools インストール済み
[ ] Homebrew インストール済み・Brewfile 作成済み
[ ] Oh My Zsh + zsh-autosuggestions + zsh-syntax-highlighting
[ ] Starship プロンプト設定済み
[ ] Warp ターミナルインストール済み
[ ] Git: user.name / user.email / defaultBranch 設定済み
[ ] SSH 鍵（Ed25519）生成済み・GitHub 登録済み
[ ] GPG 署名設定済み（コミット Verified バッジ）
[ ] mise インストール済み・Node.js LTS + Python 3.13 導入済み
[ ] uv インストール済み（Python パッケージ管理）
[ ] Go + Rust インストール済み
[ ] Docker Desktop または Colima 起動済み
[ ] VS Code + 必須拡張機能インストール済み
[ ] JetBrains Mono フォント設定済み
[ ] Cursor インストール済み
[ ] Claude Code インストール済み
[ ] GitHub Copilot 設定済み
[ ] Raycast インストール・Spotlight 代替設定済み
[ ] Karabiner-Elements キーマッピング設定済み
[ ] dotfiles を Git リポジトリで管理中
[ ] setup.sh でワンコマンド復元できる状態
```

M4 Mac の処理能力を最大限に活かした開発環境は、Intel 時代と比べて作業効率が別次元です。特に Docker コンテナのビルドやコンパイルは体感で 3〜5倍速くなります。この記事の設定を一度整えておけば、次の Mac 移行も Brewfile と dotfiles で数十分で完了します。

快適な Mac ライフと開発体験を。

