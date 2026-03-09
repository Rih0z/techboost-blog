---
title: 'pnpm完全ガイド2026'
description: 'pnpmを徹底解説。コンテンツアドレッサブルストレージによる高速化、厳格な依存関係管理、ワークスペース機能、npm/yarnからの移行手順、モノレポ構築を実例付きで紹介します。'
pubDate: '2026-02-05'
tags: ['pnpm', 'npm', 'JavaScript', 'ツール']
heroImage: '../../assets/thumbnails/pnpm-complete-guide.jpg'
---

pnpmは、高速でディスクスペース効率が良いパッケージマネージャーです。本記事では、基本から応用までを網羅的に解説します。

## 目次

1. pnpmとは
2. インストールとセットアップ
3. 基本的なコマンド
4. コンテンツアドレッサブルストレージ
5. 厳格な依存関係管理
6. ワークスペース
7. npm/yarnからの移行
8. モノレポ構築
9. パフォーマンス最適化

## pnpmとは

### 特徴と強み

```typescript
/**
 * pnpm の特徴
 *
 * 1. 高速インストール
 *    - ハードリンクによる高速コピー
 *    - 並列インストール
 *    - キャッシュ効率
 *
 * 2. ディスクスペース効率
 *    - グローバルストアで一元管理
 *    - 同じパッケージを1回だけ保存
 *    - ハードリンクで参照
 *
 * 3. 厳格な依存関係
 *    - Phantom dependencies 防止
 *    - 宣言した依存のみアクセス可能
 *
 * 4. npm互換
 *    - package.json そのまま使用
 *    - npm scripts 互換
 *    - 既存プロジェクトに簡単導入
 */

// パッケージマネージャー比較
const comparison = {
  npm: {
    speed: '普通',
    diskSpace: '大きい（node_modules が独立）',
    strictness: '緩い',
  },
  yarn: {
    speed: '速い',
    diskSpace: '大きい（node_modules が独立）',
    strictness: '緩い',
  },
  pnpm: {
    speed: '最速',
    diskSpace: '最小（グローバルストアで共有）',
    strictness: '厳格',
  },
}
```

### アーキテクチャ

```bash
# pnpm のストレージ構造
~/.pnpm-store/           # グローバルストア
└── v3/
    └── files/
        └── 00/           # content-addressable
            └── abcd123...  # パッケージの実体

# プロジェクト内
node_modules/
├── .pnpm/               # 仮想ストア
│   ├── react@18.2.0/
│   │   └── node_modules/
│   │       └── react/   # ハードリンク
│   └── lodash@4.17.21/
└── react -> .pnpm/react@18.2.0/node_modules/react  # シンボリックリンク
```

## インストールとセットアップ

### pnpmのインストール

```bash
# npm でインストール
npm install -g pnpm

# Homebrew（macOS）
brew install pnpm

# スタンドアロンスクリプト
curl -fsSL https://get.pnpm.io/install.sh | sh -

# バージョン確認
pnpm --version
```

### グローバル設定

```bash
# ストアの場所を確認
pnpm store path

# ストアの場所を変更
pnpm config set store-dir /path/to/store

# ストアのサイズを確認
pnpm store status

# 未使用パッケージを削除
pnpm store prune

# 設定一覧
pnpm config list
```

### プロジェクト初期化

```bash
# 新規プロジェクト
pnpm init

# package.json 作成（詳細）
pnpm init -y

# TypeScript プロジェクト
pnpm create vite my-app --template react-ts
cd my-app
pnpm install
```

## 基本的なコマンド

### パッケージ管理

```bash
# インストール
pnpm install              # または pnpm i
pnpm install react        # パッケージ追加
pnpm add react            # 同上（エイリアス）

# 開発依存
pnpm add -D typescript
pnpm add --save-dev @types/node

# グローバルインストール
pnpm add -g typescript

# 特定バージョン
pnpm add react@18.2.0
pnpm add react@latest
pnpm add react@next

# 複数同時
pnpm add react react-dom

# アンインストール
pnpm remove react         # または pnpm rm, pnpm uninstall
pnpm remove -g typescript

# アップデート
pnpm update              # すべて更新
pnpm update react        # 特定パッケージ
pnpm update --latest     # 最新に更新（semverを無視）
pnpm update -i           # インタラクティブ更新
```

### パッケージ情報

```bash
# インストール済みパッケージ一覧
pnpm list                # または pnpm ls
pnpm list --depth 0      # トップレベルのみ
pnpm list --depth 1      # 1階層まで
pnpm list react          # 特定パッケージ

# グローバルパッケージ
pnpm list -g

# 依存関係ツリー
pnpm why react           # なぜこのパッケージが必要か

# 最新バージョン確認
pnpm outdated
pnpm outdated --depth 0
```

### スクリプト実行

```bash
# npm scripts 実行
pnpm run dev             # または pnpm dev
pnpm run build
pnpm run test

# スクリプト一覧
pnpm run

# 複数プロジェクトで実行（ワークスペース）
pnpm -r run build        # すべてで build
pnpm --filter web run dev  # 特定プロジェクトで dev
```

## コンテンツアドレッサブルストレージ

### 仕組みの理解

```typescript
/**
 * Content-Addressable Storage
 *
 * 1. ファイルハッシュで管理
 *    - SHA-512 でファイル内容をハッシュ化
 *    - 同じファイルは1つだけ保存
 *
 * 2. ハードリンク
 *    - グローバルストアから参照
 *    - ディスクスペース節約
 *    - コピー不要で高速
 *
 * 3. 整合性チェック
 *    - ファイル改ざん検知
 *    - 自動修復
 */

// 実際のストレージ構造
interface PnpmStore {
  version: string
  files: {
    [hash: string]: {
      path: string
      integrity: string
      size: number
    }
  }
}
```

### ストレージ管理

```bash
# ストア統計
pnpm store status
# ✔ Store path: /Users/user/.pnpm-store/v3
# ✔ Size: 2.5 GB
# ✔ Packages: 15432

# 未使用パッケージ削除
pnpm store prune

# ストア完全再構築
rm -rf ~/.pnpm-store
pnpm install --force

# ストレージパス変更（プロジェクト固有）
echo "store-dir=./.pnpm-store" > .npmrc
```

### パフォーマンスベンチマーク

```typescript
// インストール速度比較（実測例）
const installBenchmark = {
  npm: {
    cold: '45s',    // キャッシュなし
    warm: '12s',    // キャッシュあり
  },
  yarn: {
    cold: '35s',
    warm: '8s',
  },
  pnpm: {
    cold: '25s',
    warm: '3s',     // 最速
  },
}

// ディスクスペース比較
const diskUsage = {
  npm: '1.2 GB',    // プロジェクトごと
  yarn: '1.1 GB',
  pnpm: '150 MB',   // ハードリンクで共有
}
```

## 厳格な依存関係管理

### Phantom Dependencies防止

```typescript
// package.json
{
  "dependencies": {
    "react": "^18.2.0"
    // lodash は直接依存していない
  }
}

// ❌ npm/yarn では動作してしまう（Phantom dependency）
import _ from 'lodash'  // react の依存として間接的にインストールされている

// ✅ pnpm では エラー
// Error: Cannot find module 'lodash'
// → 明示的に追加する必要がある
```

### 厳格モードの設定

```bash
# .npmrc
# 厳格な依存関係チェック（デフォルト）
strict-peer-dependencies=true

# Hoisting を無効化（推奨）
shamefully-hoist=false
public-hoist-pattern[]=

# lockfile のみ使用（package.json 無視）
frozen-lockfile=true
```

### ピア依存関係の管理

```typescript
// package.json
{
  "peerDependencies": {
    "react": "^18.0.0"
  },
  "peerDependenciesMeta": {
    "react": {
      "optional": true  // オプショナルピア依存
    }
  }
}
```

```bash
# ピア依存関係の自動インストール
pnpm install --strict-peer-dependencies

# ピア依存関係の警告を無視
pnpm install --no-strict-peer-dependencies
```

## ワークスペース

### ワークスペース設定

```yaml
# pnpm-workspace.yaml
packages:
  - 'apps/*'
  - 'packages/*'
  - '!**/test/**'
```

```json
// package.json（ルート）
{
  "name": "monorepo",
  "private": true,
  "scripts": {
    "dev": "pnpm -r --parallel run dev",
    "build": "pnpm -r run build",
    "test": "pnpm -r run test"
  }
}
```

### ワークスペースプロトコル

```json
// packages/web/package.json
{
  "name": "@myorg/web",
  "dependencies": {
    "@myorg/ui": "workspace:*",        // 最新バージョン
    "@myorg/utils": "workspace:^1.0.0", // semver範囲
    "@myorg/api": "workspace:~"         // 同じマイナーバージョン
  }
}
```

### フィルターコマンド

```bash
# 特定パッケージで実行
pnpm --filter @myorg/web run dev
pnpm --filter "./packages/ui" run build

# 複数パッケージ
pnpm --filter "@myorg/*" run test
pnpm --filter "web..." run build  # web とその依存

# 依存グラフを考慮
pnpm --filter ...web run build    # web が依存するすべて
pnpm --filter "web^..." run build # web を依存するすべて

# 並列実行
pnpm -r --parallel run dev

# 順次実行（依存順）
pnpm -r run build

# 変更されたパッケージのみ
pnpm --filter "[main]" run test   # main ブランチからの変更
```

### ワークスペース間の依存

```typescript
// packages/ui/package.json
{
  "name": "@myorg/ui",
  "version": "1.0.0",
  "main": "./dist/index.js",
  "exports": {
    ".": "./dist/index.js",
    "./button": "./dist/button.js"
  }
}

// packages/web/src/App.tsx
import { Button } from '@myorg/ui/button'

function App() {
  return <Button>Click me</Button>
}
```

## npm/yarnからの移行

### 移行手順

```bash
# 1. pnpm インストール
npm install -g pnpm

# 2. 既存の node_modules 削除
rm -rf node_modules

# 3. pnpm でインストール
pnpm install

# 4. lockfile 移行（オプション）
pnpm import  # package-lock.json または yarn.lock から変換

# 5. npm/yarn scripts はそのまま動作
pnpm run dev
pnpm test
```

### 互換性設定

```bash
# .npmrc
# npm と同じ挙動にする（非推奨）
shamefully-hoist=true

# yarn の Plug'n'Play と似た挙動
node-linker=pnp

# デフォルト（推奨）
node-linker=isolated
```

### CI/CD設定

```yaml
# GitHub Actions
name: CI
on: [push]
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      # pnpm セットアップ
      - uses: pnpm/action-setup@v2
        with:
          version: 8

      # Node.js セットアップ
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'pnpm'

      # インストール
      - run: pnpm install --frozen-lockfile

      # ビルド・テスト
      - run: pnpm run build
      - run: pnpm test
```

```dockerfile
# Dockerfile
FROM node:20-alpine

# pnpm インストール
RUN npm install -g pnpm

WORKDIR /app

# 依存関係のみコピー（キャッシュ効率化）
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile --prod

# ソースコードコピー
COPY . .

CMD ["pnpm", "start"]
```

## モノレポ構築

### 完全なモノレポ構成

```
my-monorepo/
├── pnpm-workspace.yaml
├── package.json
├── .npmrc
├── apps/
│   ├── web/              # Next.js アプリ
│   │   ├── package.json
│   │   └── src/
│   └── api/              # Express API
│       ├── package.json
│       └── src/
├── packages/
│   ├── ui/               # UI コンポーネント
│   │   ├── package.json
│   │   └── src/
│   ├── utils/            # ユーティリティ
│   │   ├── package.json
│   │   └── src/
│   └── config/           # 共通設定
│       ├── eslint-config/
│       └── tsconfig/
└── tooling/
    └── scripts/
```

### 共通設定の共有

```json
// packages/config/tsconfig/base.json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "skipLibCheck": true
  }
}

// apps/web/tsconfig.json
{
  "extends": "@myorg/tsconfig/base.json",
  "compilerOptions": {
    "jsx": "preserve",
    "lib": ["DOM", "DOM.Iterable", "ES2022"]
  }
}
```

```javascript
// packages/config/eslint-config/index.js
module.exports = {
  extends: ['next', 'prettier'],
  rules: {
    'no-console': 'warn',
  },
}

// apps/web/.eslintrc.js
module.exports = {
  extends: ['@myorg/eslint-config'],
}
```

### ビルドパイプライン

```json
// package.json（ルート）
{
  "scripts": {
    // 並列ビルド
    "build": "pnpm -r run build",

    // 依存順ビルド
    "build:deps": "pnpm -r --workspace-concurrency=1 run build",

    // 特定アプリとその依存のみ
    "build:web": "pnpm --filter ...@myorg/web run build",

    // 開発モード（並列）
    "dev": "pnpm -r --parallel run dev",

    // テスト
    "test": "pnpm -r run test",
    "test:changed": "pnpm --filter \"[origin/main]\" run test",

    // Lint
    "lint": "pnpm -r run lint",
    "lint:fix": "pnpm -r run lint -- --fix"
  }
}
```

### カタログ機能（pnpm 9.0+）

```yaml
# pnpm-workspace.yaml
packages:
  - 'apps/*'
  - 'packages/*'

catalog:
  react: ^18.2.0
  typescript: ^5.3.0
  '@types/node': ^20.0.0
  eslint: ^8.56.0
```

```json
// packages/ui/package.json
{
  "dependencies": {
    "react": "catalog:"  // カタログから取得
  },
  "devDependencies": {
    "typescript": "catalog:",
    "@types/node": "catalog:"
  }
}
```

## パフォーマンス最適化

### キャッシュ戦略

```bash
# .npmrc
# ネットワークキャッシュ
fetch-retries=3
fetch-retry-mintimeout=10000

# ストアキャッシュ
package-import-method=auto  # ハードリンク自動選択

# ロックファイル設定
lockfile=true
prefer-frozen-lockfile=true

# 並列処理
network-concurrency=16
```

### CI最適化

```yaml
# .github/workflows/ci.yml
- name: Get pnpm store directory
  id: pnpm-cache
  run: echo "pnpm_cache_dir=$(pnpm store path)" >> $GITHUB_OUTPUT

- name: Setup pnpm cache
  uses: actions/cache@v3
  with:
    path: ${{ steps.pnpm-cache.outputs.pnpm_cache_dir }}
    key: ${{ runner.os }}-pnpm-store-${{ hashFiles('**/pnpm-lock.yaml') }}
    restore-keys: |
      ${{ runner.os }}-pnpm-store-

- name: Install dependencies
  run: pnpm install --frozen-lockfile
```

### 部分インストール

```bash
# 本番依存のみ
pnpm install --prod

# 開発依存のみ
pnpm install --dev

# オプショナル依存をスキップ
pnpm install --no-optional

# ワークスペースの特定パッケージのみ
pnpm --filter @myorg/web install
```

## まとめ

pnpmは、高速でディスクスペース効率が良く、厳格な依存関係管理を実現するパッケージマネージャーです。

**主要ポイント**:

1. **コンテンツアドレッサブルストレージ**: ディスクスペース大幅削減
2. **厳格な依存関係**: Phantom dependencies を防止
3. **ワークスペース**: モノレポに最適
4. **npm互換**: 既存プロジェクトに簡単導入
5. **高速**: npm/yarnより高速なインストール

**2026年のベストプラクティス**:

- 新規プロジェクトは pnpm を採用
- モノレポ構築に pnpm workspace
- CI/CD でキャッシュ活用
- カタログ機能で依存バージョン統一
- 厳格モードで品質向上

pnpmを活用して、効率的で堅牢な開発環境を構築しましょう。
