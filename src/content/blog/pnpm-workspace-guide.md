---
title: 'pnpm完全ガイド — 高速パッケージ管理・Workspace・モノレポ・npm/yarn移行'
description: 'pnpmで高速・効率的なパッケージ管理を実現する完全ガイド。Symlink node_modules・ハードリンク仕組み・Workspace設定・モノレポ管理・Catalog・npm/yarn移行手順・CI/CD最適化まで解説。'
pubDate: 'Feb 20 2026'
heroImage: '../../assets/blog-placeholder-2.jpg'
tags: ['pnpm', 'パッケージ管理', 'モノレポ', 'Node.js', 'JavaScript']
---

Node.js エコシステムには npm・yarn・pnpm という3つの主要パッケージマネージャーが存在する。その中で **pnpm（Performant npm）** は、ディスク使用量の削減と高速なインストールを両立することで急速に普及した。Next.js・Vite・Turborepo など主要フレームワークの公式テンプレートでも採用され、今やモノレポ開発の標準ツールとなっている。

本記事では pnpm の仕組みから実践的なモノレポ構築・CI/CD 最適化まで、設定ファイルのサンプルコードを交えながら体系的に解説する。

---

## 1. pnpm とは — npm/yarn とのパフォーマンス比較・仕組み

### なぜ pnpm が速いのか

npm や yarn がパッケージを `node_modules` にフラットにコピーするのに対して、pnpm は **コンテンツアドレッサブルストレージ（CAS）** と **ハードリンク** を組み合わせた独自アーキテクチャを採用している。

インストールの仕組みを比較すると以下のようになる。

| パッケージマネージャー | ストレージ方式 | node_modules 構造 |
|---|---|---|
| npm v7+ | プロジェクトごとにコピー | フラット |
| yarn v1 | プロジェクトごとにコピー | フラット |
| yarn Berry (v2+) | PnP（Plug'n'Play） | 仮想（.yarn/cache） |
| pnpm | グローバル CAS + ハードリンク | Symlink ベース |

### パフォーマンスベンチマーク

ベンチマーク（2024年、React+TypeScript プロジェクト相当）では以下の結果が一般的に報告されている。

- **初回インストール（キャッシュなし）**: pnpm が npm より 20〜30% 速い
- **2回目以降（ローカルキャッシュあり）**: pnpm が npm より 50〜60% 速い
- **CI 環境（ロックファイル固定）**: pnpm が npm より 40〜70% 速い
- **ディスク使用量**: 同一パッケージが複数プロジェクトにある場合、pnpm は最大 90% 削減

モノレポ環境ではこの差がさらに顕著になる。10 個のパッケージで `react@18.3.0` を使用する場合、npm はそれを 10 回コピーするが、pnpm は 1 回だけストアに保存してハードリンクで参照するため、ディスク IO も大幅に削減される。

---

## 2. インストール・設定

### pnpm のインストール方法

pnpm はいくつかの方法でインストールできる。

```bash
# Corepack（推奨）— Node.js 16.13+ に同梱
corepack enable
corepack prepare pnpm@latest --activate

# npm 経由でグローバルインストール
npm install -g pnpm

# curl を使ったスタンドアロンインストール（macOS/Linux）
curl -fsSL https://get.pnpm.io/install.sh | sh -

# Homebrew（macOS）
brew install pnpm

# Winget（Windows）
winget install pnpm.pnpm
```

Corepack を使う方法が最も推奨される。`package.json` の `packageManager` フィールドでバージョンを固定できるためチーム全体で同一バージョンを使用できる。

```json
{
  "packageManager": "pnpm@9.15.0"
}
```

### バージョン確認

```bash
pnpm --version
# 9.15.0

pnpm store path
# ~/.local/share/pnpm/store/v3 （Linux/macOS）
# %LOCALAPPDATA%\pnpm\store\v3 （Windows）
```

### .npmrc の基本設定

プロジェクトルートに `.npmrc` を作成して pnpm の動作をカスタマイズする。

```ini
# .npmrc — pnpm 基本設定

# 厳格なピア依存関係チェック（推奨）
strict-peer-dependencies=false

# 自動インストールピア依存関係
auto-install-peers=true

# シャローなsymlink（パフォーマンス向上）
node-linker=hoisted

# プライベートレジストリ設定（必要な場合）
# @myorg:registry=https://npm.mycompany.com
# //npm.mycompany.com/:_authToken=${NPM_TOKEN}

# ロックファイルのバージョン固定
lockfile-version=9.0

# ファントム依存関係を防ぐ（デフォルトで有効）
# shamefully-hoist=false

# Node.js バイナリのリンク
public-hoist-pattern[]=*types*
public-hoist-pattern[]=eslint*
public-hoist-pattern[]=prettier
```

---

## 3. 基本コマンド

### パッケージのインストール

```bash
# 全依存関係のインストール（package.json に従う）
pnpm install
pnpm i  # 短縮形

# フローズンロックファイル（CI 環境推奨）
pnpm install --frozen-lockfile

# 既存の node_modules を削除して再インストール
pnpm install --force
```

### パッケージの追加・削除

```bash
# 通常依存関係
pnpm add react react-dom
pnpm add react@18.3.0  # バージョン指定

# 開発依存関係
pnpm add -D typescript @types/node
pnpm add --save-dev vite

# オプション依存関係
pnpm add -O sharp

# グローバルインストール
pnpm add -g @antfu/ni

# パッケージの削除
pnpm remove react
pnpm rm lodash  # 短縮形
```

### パッケージの更新

```bash
# インタラクティブ更新（選択 UI あり）
pnpm update --interactive
pnpm up -i  # 短縮形

# すべてを最新に更新
pnpm update --latest
pnpm up -L

# 特定パッケージの更新
pnpm update react react-dom

# マイナーバージョンまで更新（メジャーは除く）
pnpm update
```

### スクリプトの実行

```bash
# package.json の scripts を実行
pnpm run build
pnpm build  # run を省略可能

# 環境変数を渡す
pnpm build --env-file .env.production

# 引数をスクリプトに渡す
pnpm test -- --watch

# pnpm の組み込みコマンドと区別する場合
pnpm run start
```

### 情報・診断コマンド

```bash
# インストール済みパッケージ一覧
pnpm list
pnpm ls --depth=2  # ネスト深さ指定

# 特定パッケージの詳細
pnpm info react

# 依存関係のライセンス確認
pnpm licenses list

# セキュリティ監査
pnpm audit

# 不要パッケージの確認
pnpm prune
```

---

## 4. Content-addressable storage（ハードリンク・ディスク節約）

### ストアの仕組み

pnpm の最大の特徴は **グローバルコンテンツアドレッサブルストレージ（CAS）** にある。パッケージをインストールすると、まずグローバルストア（`~/.pnpm-store/`）にファイルが保存される。次に、プロジェクトの `node_modules` からストア内のファイルへ **ハードリンク** が作成される。

```
グローバルストア
~/.pnpm-store/v3/files/
  00/
    a1b2c3...（ファイルハッシュ）
  01/
    d4e5f6...
  ...

プロジェクト A/node_modules/react/index.js  ←─ ハードリンク
プロジェクト B/node_modules/react/index.js  ←─ 同じファイルを参照
プロジェクト C/node_modules/react/index.js  ←─ 同じファイルを参照
```

ハードリンクとはディスク上の同一ファイルへの複数の参照（inode を共有）であり、ファイルの実体はストアに 1 つだけ存在する。`react@18.3.0` を 100 プロジェクトで使用しても、ディスク消費は 1 プロジェクト分と変わらない。

### ストア管理コマンド

```bash
# ストアのパスを確認
pnpm store path

# ストアの整合性チェック
pnpm store verify

# 孤立したパッケージを削除（ディスク解放）
pnpm store prune

# ストアの状態確認
pnpm store status
```

### ファイルシステムの注意点

ハードリンクはファイルシステムをまたいで作成できない。ストアとプロジェクトが別のドライブや Docker ボリュームにある場合、pnpm は自動的に **コピー** にフォールバックする。

```bash
# Docker 環境でのストアマウント例
# docker-compose.yml
services:
  app:
    volumes:
      - pnpm-store:/root/.local/share/pnpm/store

volumes:
  pnpm-store:
```

---

## 5. Symlink node_modules（幽霊依存関係の防止）

### フラット node_modules の問題点

npm と yarn v1 はすべての依存関係を `node_modules` 直下にフラット展開する。このアーキテクチャには「幽霊依存関係（Phantom Dependencies）」という深刻な問題がある。

例えば `package-a` が `lodash` に依存している場合、フラット展開によって `lodash` がプロジェクトのルート `node_modules` に展開される。すると、`package.json` に `lodash` を明示していないにも関わらず、コード内で `require('lodash')` が動いてしまう。

```javascript
// package.json に lodash の記載なし
// npm/yarn の場合は動いてしまう（幽霊依存関係）
const _ = require('lodash');  // 危険！

// pnpm の場合は適切にエラーになる
// Error: Cannot find module 'lodash'
```

この状態は `package-a` が `lodash` への依存を削除した瞬間にビルドが壊れる、という時限爆弾を抱えることになる。

### pnpm の Symlink 構造

pnpm は `node_modules` にシンボリックリンクを使った独自の構造を構築する。

```
プロジェクト/
  node_modules/
    .pnpm/
      react@18.3.0/
        node_modules/
          react/          ← 実体（ハードリンク先）
      lodash@4.17.21/
        node_modules/
          lodash/         ← 実体（ハードリンク先）
    react -> .pnpm/react@18.3.0/node_modules/react
    # lodash は package.json に未記載なら展開されない
```

`node_modules/.pnpm/` 内に実際のファイルが配置され、`node_modules/` 直下には `package.json` に明示したパッケージへの symlink のみが作成される。これにより幽霊依存関係が構造的に防止される。

### hoisted モードとの使い分け

一部のツール（Jest・ESLint 等）は `node_modules` のルートにパッケージが存在することを期待する。この場合は `.npmrc` で設定を調整する。

```ini
# .npmrc

# 一部パッケージをルートに hoisting（フラット化）
public-hoist-pattern[]=*eslint*
public-hoist-pattern[]=*prettier*
public-hoist-pattern[]=*jest*

# すべてをホイスト（npm 互換、非推奨だが互換性のため）
shamefully-hoist=true

# node-linker を hoisted に設定（完全フラット、npm 同等）
# node-linker=hoisted
```

---

## 6. Workspace 設定（モノレポ・フィルタリング）

### pnpm Workspace の概要

pnpm には npm workspaces や yarn workspaces と同様のモノレポサポートが組み込まれている。`pnpm-workspace.yaml` で Workspace の構成を定義する。

### プロジェクト構造の例

```
my-monorepo/
  package.json
  pnpm-workspace.yaml
  .npmrc
  apps/
    web/
      package.json
    api/
      package.json
    mobile/
      package.json
  packages/
    ui/
      package.json
    utils/
      package.json
    config/
      tsconfig/
        package.json
      eslint/
        package.json
```

### pnpm-workspace.yaml の設定

```yaml
# pnpm-workspace.yaml
packages:
  # apps ディレクトリ配下のすべてのパッケージ
  - 'apps/*'
  # packages ディレクトリ配下のすべてのパッケージ
  - 'packages/**'
  # 特定のパッケージを除外
  - '!**/test/**'
  - '!**/node_modules/**'
```

### ルートの package.json

```json
{
  "name": "my-monorepo",
  "private": true,
  "version": "0.0.0",
  "packageManager": "pnpm@9.15.0",
  "scripts": {
    "build": "pnpm -r run build",
    "test": "pnpm -r run test",
    "dev": "pnpm --parallel run dev",
    "lint": "pnpm -r run lint",
    "typecheck": "pnpm -r run typecheck",
    "clean": "pnpm -r exec rm -rf dist .turbo"
  },
  "devDependencies": {
    "typescript": "^5.7.0",
    "turbo": "^2.3.0"
  }
}
```

### 内部パッケージの参照

モノレポ内のパッケージを相互参照するには `workspace:` プロトコルを使用する。

```json
{
  "name": "@myapp/web",
  "dependencies": {
    "@myapp/ui": "workspace:*",
    "@myapp/utils": "workspace:^",
    "react": "^18.3.0"
  }
}
```

`workspace:*` は現在のバージョンをそのまま使用する。`workspace:^` は semver の `^` 範囲で解決する。npm publish 時には pnpm が自動的に実際のバージョン番号に置換する。

---

## 7. --filter フラグ（特定パッケージへのコマンド実行）

### フィルタリングの基本

`--filter`（短縮形 `-F`）フラグはモノレポで最も多用するオプションだ。特定のパッケージだけにコマンドを実行できる。

```bash
# パッケージ名で指定
pnpm --filter @myapp/web build
pnpm -F @myapp/web build

# glob パターン
pnpm --filter "@myapp/*" build

# ディレクトリで指定
pnpm --filter ./apps/web build

# すべてのパッケージ（-r / --recursive）
pnpm -r run build
```

### 依存関係を含むフィルタリング

```bash
# @myapp/web とその依存パッケージをすべてビルド
pnpm --filter @myapp/web... build

# @myapp/ui に依存するすべてのパッケージをビルド
pnpm --filter ...*@myapp/ui build

# @myapp/utils に依存するパッケージを、utils 自身も含めて
pnpm --filter @myapp/utils^... build
```

### 変更されたパッケージのみ実行

```bash
# main ブランチとの差分があるパッケージのみ
pnpm --filter "[main]" build

# 特定コミット以降に変更されたパッケージ
pnpm --filter "[HEAD~3]" test

# 変更されたパッケージとその依存元も含む
pnpm --filter "[main]..." build
```

### 並列実行

```bash
# 並列実行（--parallel は依存関係を無視して並行実行）
pnpm --parallel -r run dev

# 依存グラフを考慮した並列実行（Turborepo 使用時は turbo run dev）
pnpm -r run build
```

---

## 8. Catalog 機能（共有バージョン管理）

### Catalog とは

pnpm v9.0 から追加された **Catalog** 機能は、モノレポ全体で依存パッケージのバージョンを一元管理する仕組みだ。複数パッケージで同じライブラリを使う際のバージョンの一貫性を保証する。

### pnpm-workspace.yaml での Catalog 定義

```yaml
# pnpm-workspace.yaml
packages:
  - 'apps/*'
  - 'packages/*'

# デフォルトカタログ（catalog: で参照）
catalog:
  react: ^18.3.0
  react-dom: ^18.3.0
  typescript: ^5.7.0
  vite: ^6.0.0
  vitest: ^2.1.0

# 名前付きカタログ（catalog:<name> で参照）
catalogs:
  react18:
    react: ^18.3.0
    react-dom: ^18.3.0

  react19:
    react: ^19.0.0
    react-dom: ^19.0.0

  testing:
    vitest: ^2.1.0
    '@testing-library/react': ^16.0.0
    '@testing-library/user-event': ^14.5.0
```

### package.json での Catalog 参照

```json
{
  "name": "@myapp/web",
  "dependencies": {
    "react": "catalog:",
    "react-dom": "catalog:"
  },
  "devDependencies": {
    "typescript": "catalog:",
    "vite": "catalog:",
    "vitest": "catalog:testing"
  }
}
```

### Catalog のメリット

バージョン番号を `pnpm-workspace.yaml` で一元管理することで、「あるパッケージは React 18.2、別のパッケージは React 18.3」という状況が構造的に防止される。バージョンを上げたいときは `pnpm-workspace.yaml` の 1 行を変更するだけでよい。

```bash
# Catalog のバージョン更新後に一括インストール
pnpm install

# catalog の依存関係を確認
pnpm list --filter @myapp/web
```

---

## 9. Patch 機能（パッケージパッチ適用）

### パッチとは

サードパーティパッケージにバグがあるが公式修正を待てない場合、pnpm の **patch** 機能でローカルパッチを当てることができる。`patch-package` ライブラリの代替として機能する。

### パッチの作成手順

```bash
# パッチ編集モードで起動（一時ディレクトリが作成される）
pnpm patch lodash@4.17.21

# 出力例:
# You can now edit the package at:
#   /tmp/pnpm-patch-lodash@4.17.21-xxx
# Once you're done, run:
#   pnpm patch-commit '/tmp/pnpm-patch-lodash@4.17.21-xxx'

# 一時ディレクトリでファイルを編集後、パッチをコミット
pnpm patch-commit '/tmp/pnpm-patch-lodash@4.17.21-xxx'
```

### 生成される設定

パッチコミット後、`package.json` と `patches/` ディレクトリが自動更新される。

```json
{
  "pnpm": {
    "patchedDependencies": {
      "lodash@4.17.21": "patches/lodash@4.17.21.patch"
    }
  }
}
```

```diff
# patches/lodash@4.17.21.patch
diff --git a/src/some-file.js b/src/some-file.js
index abc123..def456 100644
--- a/src/some-file.js
+++ b/src/some-file.js
@@ -10,7 +10,7 @@
-  return oldBehavior();
+  return fixedBehavior();
```

### パッチの管理

```bash
# パッチ一覧の確認
pnpm patch-list

# パッチの削除（package.json から patchedDependencies を手動削除後）
pnpm install
```

パッチファイルは Git でコミットして管理する。チームメンバーが `pnpm install` を実行すると自動的にパッチが適用される。

---

## 10. npm/yarn 移行手順（lock file 変換・CI 設定変更）

### 事前準備

```bash
# pnpm のインストール
npm install -g pnpm
# または
corepack enable && corepack prepare pnpm@latest --activate
```

### npm からの移行

```bash
# プロジェクトルートで実行
cd my-project

# 既存の lock ファイルから pnpm-lock.yaml を生成
pnpm import

# 古い lock ファイルと node_modules を削除
rm -rf node_modules package-lock.json

# pnpm でインストール
pnpm install

# 動作確認
pnpm run build
pnpm run test
```

### yarn v1 からの移行

```bash
cd my-project

# yarn.lock から pnpm-lock.yaml を生成
pnpm import

# 古いファイルを削除
rm -rf node_modules yarn.lock .yarn

# pnpm でインストール
pnpm install
```

### yarn Berry（v2+）からの移行

yarn Berry の PnP モードからの移行は少し手順が増える。

```bash
# .yarnrc.yml を確認してレジストリ設定を .npmrc に移行
cat .yarnrc.yml

# pnpm-workspace.yaml に workspaces を移行（yarn の workspaces フィールドから）
# package.json の workspaces:
#   - apps/*
#   - packages/*
# を pnpm-workspace.yaml に変換

# pnpm import は yarn Berry の lock ファイルもサポート
pnpm import

rm -rf node_modules .yarn .yarnrc.yml
pnpm install
```

### package.json の scripts 更新

```json
{
  "scripts": {
    "prepare": "pnpm run build",
    "prepublishOnly": "pnpm run test && pnpm run build"
  },
  "engines": {
    "node": ">=18.0.0",
    "pnpm": ">=9.0.0"
  }
}
```

### .gitignore の更新

```gitignore
# .gitignore

# pnpm
node_modules/
.pnpm-debug.log

# pnpm-lock.yaml はコミットする（削除しない）
# !pnpm-lock.yaml

# yarn/npm の残骸を除外
package-lock.json
yarn.lock
.yarn/
```

---

## 11. GitHub Actions 統合（キャッシュ・setup-node）

### 基本的な CI ワークフロー

```yaml
# .github/workflows/ci.yml
name: CI

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest

    strategy:
      matrix:
        node-version: [20, 22]

    steps:
      - uses: actions/checkout@v4

      - name: Install pnpm
        uses: pnpm/action-setup@v4
        with:
          version: 9

      - name: Setup Node.js ${{ matrix.node-version }}
        uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node-version }}
          cache: 'pnpm'

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Type check
        run: pnpm typecheck

      - name: Lint
        run: pnpm lint

      - name: Test
        run: pnpm test

      - name: Build
        run: pnpm build
```

### pnpm/action-setup の詳細設定

```yaml
- name: Install pnpm
  uses: pnpm/action-setup@v4
  with:
    version: 9.15.0           # バージョンを固定
    run_install: false         # 後で明示的に install する場合

# または package.json の packageManager から自動検出
- name: Install pnpm
  uses: pnpm/action-setup@v4  # version 省略で packageManager を参照
```

### キャッシュの最適化

```yaml
- name: Get pnpm store directory
  shell: bash
  run: |
    echo "STORE_PATH=$(pnpm store path --silent)" >> $GITHUB_ENV

- name: Setup pnpm cache
  uses: actions/cache@v4
  with:
    path: ${{ env.STORE_PATH }}
    key: ${{ runner.os }}-pnpm-store-${{ hashFiles('**/pnpm-lock.yaml') }}
    restore-keys: |
      ${{ runner.os }}-pnpm-store-

- name: Install dependencies
  run: pnpm install --frozen-lockfile
```

### モノレポでの CI 最適化（変更パッケージのみテスト）

```yaml
jobs:
  changed:
    runs-on: ubuntu-latest
    outputs:
      packages: ${{ steps.filter.outputs.changes }}
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
      
      - name: Detect changed packages
        id: filter
        uses: dorny/paths-filter@v3
        with:
          filters: |
            web: apps/web/**
            api: apps/api/**
            ui: packages/ui/**

  test:
    needs: changed
    runs-on: ubuntu-latest
    if: needs.changed.outputs.packages != '[]'
    steps:
      - uses: actions/checkout@v4
      
      - uses: pnpm/action-setup@v4
        with:
          version: 9
      
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'pnpm'
      
      - run: pnpm install --frozen-lockfile
      
      - name: Test changed packages
        run: pnpm --filter "[main]" test
```

### Turborepo とのキャッシュ統合

```yaml
- name: Build with Turbo (remote cache)
  run: pnpm turbo run build
  env:
    TURBO_TOKEN: ${{ secrets.TURBO_TOKEN }}
    TURBO_TEAM: ${{ vars.TURBO_TEAM }}
```

---

## 12. .npmrc 設定チートシート

### 完全な .npmrc サンプル

```ini
# .npmrc — pnpm 完全設定チートシート

# ===== 依存関係の解決 =====

# ピア依存関係を自動インストール（pnpm v8+）
auto-install-peers=true

# 厳格なピア依存チェック（不一致時にエラー）
strict-peer-dependencies=false

# 存在しないピア依存を警告のみにする
# peer-dependency-rules.ignoreMissing[]=@types/*

# ===== node_modules の構造 =====

# デフォルト: isolated（symlink ベース）
# hoisted: npm 互換のフラット構造
# pnp: Plug'n'Play
node-linker=isolated

# ルートに hoisting するパッケージのパターン
public-hoist-pattern[]=*types*
public-hoist-pattern[]=*eslint*
public-hoist-pattern[]=prettier
public-hoist-pattern[]=*jest*
public-hoist-pattern[]=*babel*

# フラット展開（互換性が必要な場合のみ）
# shamefully-hoist=true

# ===== ストア設定 =====

# グローバルストアのパス（デフォルト: ~/.pnpm-store）
# store-dir=/custom/path/pnpm-store

# パッケージの整合性検証
verify-store-integrity=true

# ===== レジストリ設定 =====

# デフォルトレジストリ
registry=https://registry.npmjs.org/

# スコープ別レジストリ
# @myorg:registry=https://npm.mycompany.com/
# //npm.mycompany.com/:_authToken=${NPM_TOKEN}

# ===== パフォーマンス =====

# 並列ダウンロード数
# fetch-concurrency=16

# ネットワークタイムアウト（ms）
# fetch-timeout=60000

# ===== セキュリティ =====

# ライフサイクルスクリプトの実行を許可するパッケージ
# onlyBuiltDependencies[]=esbuild
# onlyBuiltDependencies[]=sharp

# ライフサイクルスクリプトを一切実行しない
# ignore-scripts=true

# ===== その他 =====

# ロックファイルの自動更新を禁止（CI 推奨）
# frozen-lockfile=true

# 詳細ログ
# reporter=append-only

# カラー出力
color=true
```

### よく使う設定のユースケース別まとめ

```ini
# ===== ケース1: 厳格なモノレポ設定 =====
strict-peer-dependencies=true
auto-install-peers=false
node-linker=isolated
verify-store-integrity=true

# ===== ケース2: npm 互換モード（移行期間中） =====
shamefully-hoist=true
strict-peer-dependencies=false
auto-install-peers=true

# ===== ケース3: CI/CD 最適化 =====
prefer-offline=true
verify-store-integrity=false
reporter=silent

# ===== ケース4: プライベートレジストリ =====
@company:registry=https://verdaccio.company.com/
//verdaccio.company.com/:_authToken=${VERDACCIO_TOKEN}
strict-peer-dependencies=false
```

---

## 13. pnpm + Turborepo/Nx モノレポ最適化

### pnpm + Turborepo の組み合わせ

Turborepo は pnpm workspace を完全サポートしており、タスクの依存グラフ・インクリメンタルキャッシュ・リモートキャッシュを提供する。この組み合わせがモノレポの標準構成となっている。

#### 初期セットアップ

```bash
# 新規モノレポを作成
pnpm dlx create-turbo@latest my-monorepo --package-manager pnpm

# 既存の pnpm workspace に Turborepo を追加
pnpm add -D turbo -w
```

#### turbo.json の設定

```json
{
  "$schema": "https://turbo.build/schema.json",
  "ui": "tui",
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "inputs": ["$TURBO_DEFAULT$", ".env*"],
      "outputs": [".next/**", "dist/**", "!dist/**/*.map"]
    },
    "test": {
      "dependsOn": ["^build"],
      "inputs": ["src/**", "tests/**", "*.config.ts"],
      "outputs": ["coverage/**"],
      "cache": true
    },
    "lint": {
      "dependsOn": [],
      "inputs": ["src/**", "*.config.*", ".eslintrc*"],
      "cache": true
    },
    "typecheck": {
      "dependsOn": ["^build"],
      "inputs": ["src/**", "tsconfig*.json"],
      "cache": true
    },
    "dev": {
      "cache": false,
      "persistent": true
    }
  },
  "globalEnv": [
    "NODE_ENV",
    "DATABASE_URL"
  ]
}
```

#### Turborepo + pnpm の実行コマンド

```bash
# すべてビルド（依存グラフ順に実行）
pnpm turbo run build

# 並列実行（依存関係を無視）
pnpm turbo run lint typecheck --parallel

# 特定パッケージのみ
pnpm turbo run build --filter=@myapp/web

# キャッシュを無効化して再実行
pnpm turbo run build --force

# 実行グラフの可視化
pnpm turbo run build --graph
```

### pnpm + Nx の組み合わせ

Nx は Turborepo と同様のキャッシュ機能に加えて、コードジェネレーターや依存グラフの可視化 UI を提供する。

#### Nx のセットアップ

```bash
# 新規 Nx ワークスペース（pnpm 指定）
pnpm dlx create-nx-workspace@latest my-nx-app --packageManager=pnpm

# 既存プロジェクトに Nx を追加
pnpm add -D nx @nx/js -w
pnpm dlx nx@latest init
```

#### nx.json の設定

```json
{
  "$schema": "./node_modules/nx/schemas/nx-schema.json",
  "defaultBase": "main",
  "namedInputs": {
    "default": ["{projectRoot}/**/*", "sharedGlobals"],
    "production": [
      "default",
      "!{projectRoot}/**/?(*.)+(spec|test).[jt]s?(x)",
      "!{projectRoot}/src/test-setup.[jt]s"
    ],
    "sharedGlobals": []
  },
  "targetDefaults": {
    "build": {
      "dependsOn": ["^build"],
      "inputs": ["production", "^production"],
      "cache": true
    },
    "test": {
      "inputs": ["default", "^production"],
      "cache": true
    },
    "lint": {
      "inputs": ["default"],
      "cache": true
    }
  },
  "plugins": [
    {
      "plugin": "@nx/vite/plugin",
      "options": {
        "buildTargetName": "build",
        "testTargetName": "test",
        "serveTargetName": "serve"
      }
    }
  ]
}
```

#### Nx の便利コマンド

```bash
# 影響を受けるプロジェクトのみビルド（CI 最適化）
pnpm nx affected -t build

# 依存グラフの可視化
pnpm nx graph

# コードジェネレーター（React コンポーネント生成例）
pnpm nx g @nx/react:component Button --project=ui

# Nx Cloud（リモートキャッシュ）の設定
pnpm nx connect
```

### Turborepo vs Nx の選択基準

| 観点 | Turborepo | Nx |
|---|---|---|
| 学習コスト | 低い | 中〜高い |
| 設定ファイル | `turbo.json` のみ | `nx.json` + プロジェクト設定 |
| コードジェネレーター | なし | 豊富（プラグイン多数） |
| 依存グラフ UI | CLI のみ | ブラウザ UI あり |
| リモートキャッシュ | Vercel（有料） | Nx Cloud（無料枠あり） |
| 向いているケース | シンプルな構成 | 大規模・複雑な構成 |

小〜中規模のモノレポは **Turborepo + pnpm** の組み合わせが導入コストが低くておすすめだ。大規模で多数のチームが関わるプロジェクトは **Nx + pnpm** が管理機能の充実さで有利になる。

---

## 実践：完全なモノレポ設定例

### ディレクトリ構造

```
my-monorepo/
  package.json
  pnpm-workspace.yaml
  .npmrc
  turbo.json
  tsconfig.base.json
  .eslintrc.base.js
  apps/
    web/
      package.json
      tsconfig.json
      vite.config.ts
    api/
      package.json
      tsconfig.json
  packages/
    ui/
      package.json
      tsconfig.json
      src/
        index.ts
    utils/
      package.json
      src/
        index.ts
    config/
      eslint/
        package.json
        index.js
      tsconfig/
        package.json
        base.json
        nextjs.json
        react-library.json
```

### 各設定ファイル

```yaml
# pnpm-workspace.yaml
packages:
  - 'apps/*'
  - 'packages/**'

catalog:
  react: ^18.3.0
  react-dom: ^18.3.0
  typescript: ^5.7.0
  vite: ^6.0.0
  vitest: ^2.1.0
  eslint: ^9.0.0
```

```json
// packages/ui/package.json
{
  "name": "@myapp/ui",
  "version": "0.1.0",
  "private": true,
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "scripts": {
    "build": "tsc --build",
    "typecheck": "tsc --noEmit",
    "lint": "eslint src/"
  },
  "peerDependencies": {
    "react": "catalog:",
    "react-dom": "catalog:"
  },
  "devDependencies": {
    "typescript": "catalog:",
    "@myapp/eslint-config": "workspace:*",
    "@myapp/tsconfig": "workspace:*"
  }
}
```

```json
// apps/web/package.json
{
  "name": "@myapp/web",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "typecheck": "tsc --noEmit",
    "lint": "eslint src/"
  },
  "dependencies": {
    "@myapp/ui": "workspace:*",
    "@myapp/utils": "workspace:*",
    "react": "catalog:",
    "react-dom": "catalog:"
  },
  "devDependencies": {
    "typescript": "catalog:",
    "vite": "catalog:",
    "vitest": "catalog:",
    "@myapp/eslint-config": "workspace:*",
    "@myapp/tsconfig": "workspace:*"
  }
}
```

---

## よくあるトラブルシューティング

### エラー: ERR_PNPM_PEER_DEP_ISSUES

```bash
# ピア依存関係の問題を確認
pnpm install --reporter=append-only 2>&1 | grep -i peer

# 解決方法1: .npmrc でピア依存を自動インストール
# auto-install-peers=true

# 解決方法2: peerDependenciesMeta で optional に設定
# package.json
{
  "peerDependenciesMeta": {
    "react": { "optional": true }
  }
}
```

### エラー: Cannot find module 'xxx'

```bash
# 幽霊依存関係を使っている可能性がある
# package.json に明示的に追加する
pnpm add xxx

# または public-hoist-pattern で hoisting
# .npmrc に追記:
public-hoist-pattern[]=xxx
```

### ロックファイルの競合解消

```bash
# pnpm-lock.yaml のコンフリクトを解消する場合
# コンフリクトを修正後に再インストール
pnpm install

# どうしても解消できない場合は再生成
rm pnpm-lock.yaml
pnpm install
```

### Windows での symlink 問題

```ini
# .npmrc（Windows 環境）
# 管理者権限なしで symlink を作成できない場合
node-linker=hoisted
```

---

## package.json の検証に DevToolBox を活用

モノレポを運用していると、複数の `package.json` のバージョン整合性や依存関係の確認が煩雑になる。**[DevToolBox](https://usedevtools.com/)** の JSON バリデーターを使えば、`package.json` の構文エラーや不正なフィールドを即座にブラウザ上で検証できる。

pnpm-workspace.yaml の設定を確認したり、Catalog で管理するバージョン文字列（`^18.3.0` など）が正しい semver フォーマットかどうかをチェックする際に便利だ。インストール不要でブラウザだけで動作するため、チームメンバーへの共有も簡単にできる。

---

## まとめ

pnpm は単なる「npm の高速版」ではなく、モノレポ開発に必要な機能をすべて備えたパッケージマネージャーだ。本記事で解説したポイントを改めて整理する。

| 機能 | ポイント |
|---|---|
| CAS + ハードリンク | ディスク使用量を大幅削減・高速インストール |
| Symlink node_modules | 幽霊依存関係を構造的に防止 |
| Workspace | `pnpm-workspace.yaml` でモノレポを一元管理 |
| --filter | 特定パッケージへの精密なコマンド実行 |
| Catalog | バージョンの一元管理でドリフトを防止 |
| Patch | サードパーティの修正をローカルで適用 |
| CI/CD | `--frozen-lockfile` とストアキャッシュで高速ビルド |
| Turborepo/Nx | タスクのインクリメンタルキャッシュでさらに高速化 |

npm から pnpm への移行は `pnpm import` で lock ファイルを変換するだけで始められる。まず既存プロジェクトの 1 つに適用して効果を体感してみることを強くおすすめする。
