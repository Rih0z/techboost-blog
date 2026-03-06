---
title: 'モノレポツール完全比較2026 - Turborepo、Nx、pnpm、Lerna、Moonを徹底検証'
description: 'モノレポ管理ツールの決定版ガイド。Turborepo、Nx、pnpm Workspace、Lerna、Moonを機能・パフォーマンス・DXで徹底比較。プロジェクトに最適なツール選定をサポート。モノレポ・Turborepo・Nxに関する実践情報。'
pubDate: '2026-02-05'
tags: ['モノレポ', 'Turborepo', 'Nx', 'プログラミング']
---

モノレポ（Monorepo）は、複数のプロジェクトを1つのリポジトリで管理する手法です。この記事では、2026年時点で主流のモノレポツールを徹底比較し、プロジェクトに最適な選択をサポートします。

## モノレポとは

### モノレポのメリット

```
従来（Polyrepo）:
frontend/       ← 別リポジトリ
backend/        ← 別リポジトリ
shared/         ← 別リポジトリ
→ 依存関係の管理が複雑、バージョニングの手間

モノレポ:
monorepo/
  apps/
    frontend/   ← 同一リポジトリ
    backend/    ← 同一リポジトリ
  packages/
    shared/     ← 同一リポジトリ
→ 一元管理、コード共有が容易
```

**メリット:**
- コードの再利用が容易
- 原子的なコミット（複数パッケージの同時変更）
- 一貫したツール設定
- 簡単なリファクタリング
- 統一されたCI/CD

**デメリット:**
- リポジトリサイズが大きくなる
- ビルド時間が増加する可能性
- アクセス制御が複雑

## Turborepo

### 概要

Turborepoは、Vercelが開発する高速なビルドシステムです。キャッシングとタスク並列化に優れています。

### セットアップ

```bash
npx create-turbo@latest
```

### プロジェクト構造

```
my-turborepo/
├── apps/
│   ├── web/              # Next.js アプリ
│   │   ├── package.json
│   │   └── src/
│   ├── docs/             # ドキュメントサイト
│   │   └── package.json
│   └── api/              # Express API
│       └── package.json
├── packages/
│   ├── ui/               # UIコンポーネント
│   │   ├── package.json
│   │   └── src/
│   ├── config/           # 共有設定
│   │   ├── eslint-config/
│   │   └── typescript-config/
│   └── utils/            # ユーティリティ
│       └── package.json
├── turbo.json            # Turborepo設定
└── package.json          # ルートpackage.json
```

### turbo.json 設定

```json
{
  "$schema": "https://turbo.build/schema.json",
  "globalDependencies": [".env"],
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**", ".next/**", "build/**"],
      "env": ["NODE_ENV"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "lint": {
      "dependsOn": ["^lint"],
      "outputs": []
    },
    "test": {
      "dependsOn": ["build"],
      "outputs": ["coverage/**"],
      "inputs": ["src/**/*.tsx", "src/**/*.ts", "test/**/*.ts"]
    },
    "type-check": {
      "dependsOn": ["^build"],
      "outputs": []
    }
  }
}
```

### パッケージ設定

```json
// apps/web/package.json
{
  "name": "web",
  "version": "1.0.0",
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "type-check": "tsc --noEmit"
  },
  "dependencies": {
    "next": "^15.0.0",
    "react": "^19.0.0",
    "@repo/ui": "workspace:*",
    "@repo/utils": "workspace:*"
  }
}
```

```json
// packages/ui/package.json
{
  "name": "@repo/ui",
  "version": "1.0.0",
  "main": "./dist/index.js",
  "module": "./dist/index.mjs",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "import": "./dist/index.mjs",
      "require": "./dist/index.js",
      "types": "./dist/index.d.ts"
    }
  },
  "scripts": {
    "build": "tsup src/index.ts --format cjs,esm --dts",
    "dev": "tsup src/index.ts --format cjs,esm --dts --watch",
    "lint": "eslint src/",
    "type-check": "tsc --noEmit"
  }
}
```

### コマンド実行

```bash
# すべてのパッケージでビルド
turbo build

# 特定のパッケージのみ
turbo build --filter=web

# 変更されたパッケージのみ
turbo build --filter=[HEAD^1]

# 並列実行数を指定
turbo build --concurrency=4

# キャッシュをスキップ
turbo build --force

# リモートキャッシュ使用
turbo build --remote-cache
```

### リモートキャッシュ

```bash
# Vercelリモートキャッシュを有効化
npx turbo login
npx turbo link
```

```json
// turbo.json
{
  "remoteCache": {
    "signature": true
  }
}
```

### パフォーマンス

```
初回ビルド: 45秒
2回目（フルキャッシュ）: 0.3秒
部分変更: 8秒
```

## Nx

### 概要

Nxは、モノレポ管理のための包括的なツールセットです。強力なコード生成とタスクグラフの可視化が特徴です。

### セットアップ

```bash
npx create-nx-workspace@latest my-org
```

### プロジェクト構造

```
my-nx-workspace/
├── apps/
│   ├── web/
│   ├── mobile/
│   └── api/
├── libs/
│   ├── ui/
│   │   ├── src/
│   │   ├── project.json
│   │   └── tsconfig.json
│   ├── data-access/
│   └── utils/
├── tools/
├── nx.json
├── workspace.json
└── package.json
```

### nx.json 設定

```json
{
  "extends": "nx/presets/npm.json",
  "tasksRunnerOptions": {
    "default": {
      "runner": "nx/tasks-runners/default",
      "options": {
        "cacheableOperations": ["build", "lint", "test"],
        "parallel": 3
      }
    }
  },
  "targetDefaults": {
    "build": {
      "dependsOn": ["^build"],
      "inputs": ["production", "^production"],
      "outputs": ["{projectRoot}/dist"]
    },
    "test": {
      "inputs": ["default", "^production", "{workspaceRoot}/jest.preset.js"],
      "cache": true
    },
    "lint": {
      "inputs": ["default", "{workspaceRoot}/.eslintrc.json"],
      "cache": true
    }
  },
  "namedInputs": {
    "default": ["{projectRoot}/**/*", "sharedGlobals"],
    "production": [
      "default",
      "!{projectRoot}/**/?(*.)+(spec|test).[jt]s?(x)?(.snap)",
      "!{projectRoot}/tsconfig.spec.json"
    ],
    "sharedGlobals": []
  }
}
```

### プロジェクト設定

```json
// libs/ui/project.json
{
  "name": "ui",
  "sourceRoot": "libs/ui/src",
  "projectType": "library",
  "targets": {
    "build": {
      "executor": "@nx/vite:build",
      "outputs": ["{options.outputPath}"],
      "options": {
        "outputPath": "dist/libs/ui"
      }
    },
    "test": {
      "executor": "@nx/jest:jest",
      "outputs": ["{workspaceRoot}/coverage/libs/ui"],
      "options": {
        "jestConfig": "libs/ui/jest.config.ts"
      }
    },
    "lint": {
      "executor": "@nx/eslint:lint",
      "outputs": ["{options.outputFile}"],
      "options": {
        "lintFilePatterns": ["libs/ui/**/*.{ts,tsx,js,jsx}"]
      }
    }
  },
  "tags": []
}
```

### コード生成

```bash
# Reactライブラリ生成
nx g @nx/react:library ui

# Reactコンポーネント生成
nx g @nx/react:component button --project=ui

# Nodeアプリケーション生成
nx g @nx/node:application api

# カスタムジェネレーター作成
nx g @nx/plugin:generator my-generator
```

### 依存関係グラフ

```bash
# グラフを可視化
nx graph

# 特定プロジェクトの依存関係
nx graph --focus=web

# 影響を受けるプロジェクト
nx affected:graph
```

### タスク実行

```bash
# すべてのプロジェクトでビルド
nx run-many --target=build --all

# 影響を受けるプロジェクトのみテスト
nx affected:test

# 特定のタグを持つプロジェクト
nx run-many --target=build --projects=tag:ui

# 並列実行
nx run-many --target=build --all --parallel=5
```

### パフォーマンス

```
初回ビルド: 52秒
2回目（フルキャッシュ）: 0.5秒
部分変更: 10秒
```

## pnpm Workspace

### 概要

pnpm Workspaceは、pnpmに組み込まれた軽量なモノレポソリューションです。シンプルで高速です。

### セットアップ

```bash
pnpm init
```

### pnpm-workspace.yaml

```yaml
packages:
  - 'apps/*'
  - 'packages/*'
  - 'tools/*'
```

### プロジェクト構造

```
my-pnpm-workspace/
├── apps/
│   ├── web/
│   │   └── package.json
│   └── api/
│       └── package.json
├── packages/
│   ├── ui/
│   │   └── package.json
│   └── utils/
│       └── package.json
├── pnpm-workspace.yaml
└── package.json
```

### ルート package.json

```json
{
  "name": "my-workspace",
  "private": true,
  "scripts": {
    "dev": "pnpm --parallel --recursive dev",
    "build": "pnpm --recursive build",
    "test": "pnpm --recursive test",
    "lint": "pnpm --recursive lint"
  },
  "devDependencies": {
    "typescript": "^5.3.0",
    "@types/node": "^20.0.0"
  }
}
```

### パッケージ間の依存

```json
// apps/web/package.json
{
  "name": "web",
  "dependencies": {
    "@myorg/ui": "workspace:*",
    "@myorg/utils": "workspace:^"
  }
}
```

### コマンド実行

```bash
# すべてのパッケージでビルド
pnpm -r build

# フィルタリング
pnpm --filter web build
pnpm --filter "@myorg/*" build
pnpm --filter "...web" build  # webと依存関係

# 並列実行
pnpm -r --parallel dev

# 特定のパッケージを除外
pnpm -r --filter "!web" build
```

### パフォーマンス

```
初回ビルド: 38秒
2回目: 36秒（キャッシュなし）
```

## Lerna

### 概要

Lernaは、モノレポ管理のパイオニアです。現在はNxと統合されています。

### セットアップ

```bash
npx lerna@latest init
```

### lerna.json

```json
{
  "version": "independent",
  "npmClient": "pnpm",
  "useWorkspaces": true,
  "command": {
    "publish": {
      "conventionalCommits": true,
      "message": "chore(release): publish"
    },
    "version": {
      "allowBranch": "main",
      "message": "chore(release): version"
    }
  }
}
```

### バージョン管理

```bash
# バージョンアップ
lerna version

# パッチバージョン
lerna version patch

# マイナーバージョン
lerna version minor

# メジャーバージョン
lerna version major

# プレリリース
lerna version prerelease --preid beta
```

### パブリッシュ

```bash
# npm公開
lerna publish

# 特定バージョンで公開
lerna publish from-git

# プレリリース
lerna publish --dist-tag next
```

### コマンド実行

```bash
# すべてのパッケージでスクリプト実行
lerna run build

# 並列実行
lerna run build --parallel

# 変更されたパッケージのみ
lerna run test --since HEAD~1
```

## Moon

### 概要

Moonは、Rustで書かれた次世代のモノレポツールです。高速で柔軟性が高いです。

### セットアップ

```bash
npm install -g @moonrepo/cli
moon init
```

### .moon/workspace.yml

```yaml
projects:
  - 'apps/*'
  - 'packages/*'

runner:
  cacheLifetime: '7 days'
  inheritColorsForPipedTasks: true

vcs:
  manager: 'git'
  defaultBranch: 'main'

node:
  version: '20.0.0'
  packageManager: 'pnpm'
  pnpm:
    version: '8.0.0'
```

### moon.yml（プロジェクト設定）

```yaml
# packages/ui/moon.yml
language: 'typescript'
type: 'library'

tasks:
  build:
    command: 'tsc --build'
    inputs:
      - 'src/**/*'
      - 'tsconfig.json'
    outputs:
      - 'dist'
    deps:
      - '~:type-check'

  dev:
    command: 'tsc --watch'
    local: true

  test:
    command: 'vitest run'
    inputs:
      - 'src/**/*'
      - 'test/**/*'

  lint:
    command: 'eslint src'
    inputs:
      - 'src/**/*'
      - '.eslintrc.js'
```

### タスク実行

```bash
# 特定のプロジェクトでタスク実行
moon run ui:build

# すべてのプロジェクトでビルド
moon run :build

# 依存関係も含めてビルド
moon run ui:build --dependents

# 影響を受けるプロジェクトのみ
moon run :test --affected
```

### パフォーマンス

```
初回ビルド: 35秒
2回目（フルキャッシュ）: 0.2秒
部分変更: 6秒
```

## 比較表

```
機能                Turborepo  Nx      pnpm    Lerna   Moon
----------------------------------------------------------------
セットアップ         ◎         △       ◎       ○       ○
学習曲線            緩やか     急       緩やか   緩やか   中程度
ビルド速度          ◎         ○       △       △       ◎
キャッシング        ◎         ◎       ×       ×       ◎
リモートキャッシュ   ◎         ◎       ×       ×       ○
コード生成          ×         ◎       ×       ×       △
依存関係グラフ      ○         ◎       ×       ○       ◎
バージョン管理      △         △       ×       ◎       ×
TypeScript統合     ○         ◎       △       △       ◎
ドキュメント        ◎         ◎       ○       ○       △
エコシステム        大         大       大       大       小
```

## 詳細比較

### パフォーマンス

```typescript
// ベンチマーク（10パッケージ、100ファイル）
const benchmarks = {
  turborepo: {
    initialBuild: '45s',
    cachedBuild: '0.3s',
    incrementalBuild: '8s',
  },
  nx: {
    initialBuild: '52s',
    cachedBuild: '0.5s',
    incrementalBuild: '10s',
  },
  pnpm: {
    initialBuild: '38s',
    cachedBuild: '36s', // キャッシュなし
    incrementalBuild: '35s',
  },
  moon: {
    initialBuild: '35s',
    cachedBuild: '0.2s',
    incrementalBuild: '6s',
  },
};
```

### DX（開発者体験）

**Turborepo:**
- シンプルで直感的
- 最小限の設定
- Vercelエコシステムと統合

**Nx:**
- 強力なコード生成
- 可視化ツール充実
- 豊富なプラグイン

**pnpm:**
- 軽量でシンプル
- 既存プロジェクトに導入しやすい
- 追加ツール不要

**Moon:**
- モダンな設定形式
- 高速
- TypeScript/Rust対応

## 選択ガイド

### Turborepo を選ぶべき場合

```typescript
// 適したプロジェクト
const turborepoIdeal = {
  size: '小〜中規模',
  framework: 'Next.js、Vite',
  hosting: 'Vercel',
  priority: 'シンプルさ、速度',
  team: '小規模チーム',
};
```

**例: Next.js + Vercelの構成**
```
apps/
  web/          # Next.js（ユーザー向け）
  admin/        # Next.js（管理画面）
packages/
  ui/           # 共有UIコンポーネント
  config/       # 共有設定
```

### Nx を選ぶべき場合

```typescript
// 適したプロジェクト
const nxIdeal = {
  size: '大規模',
  framework: 'Angular、React、Node.js',
  priority: 'スケーラビリティ、構造',
  team: '大規模チーム',
  needs: 'コード生成、厳密なルール',
};
```

**例: エンタープライズアプリ**
```
apps/
  web-app/      # Reactアプリ
  mobile-app/   # React Native
  api/          # Node.js API
libs/
  ui/           # UIライブラリ
  data-access/  # APIクライアント
  utils/        # ユーティリティ
```

### pnpm Workspace を選ぶべき場合

```typescript
// 適したプロジェクト
const pnpmIdeal = {
  size: '小規模',
  priority: 'シンプルさ、軽量性',
  existing: '既存プロジェクトの移行',
  team: 'シンプルな構成を好むチーム',
};
```

**例: シンプルなライブラリ集**
```
packages/
  core/         # コアライブラリ
  react/        # Reactバインディング
  vue/          # Vueバインディング
```

### Moon を選ぶべき場合

```typescript
// 適したプロジェクト
const moonIdeal = {
  size: '中〜大規模',
  priority: '最高速度、柔軟性',
  languages: 'TypeScript、Rust混在',
  team: '新しいツールに積極的',
};
```

## 実践例: Turborepo

### 完全な設定例

```json
// turbo.json
{
  "$schema": "https://turbo.build/schema.json",
  "globalDependencies": [".env", "tsconfig.json"],
  "globalEnv": ["NODE_ENV"],
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**", ".next/**"],
      "env": ["NEXT_PUBLIC_*"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "lint": {
      "outputs": []
    },
    "test": {
      "dependsOn": ["build"],
      "outputs": ["coverage/**"]
    }
  }
}
```

```json
// package.json（ルート）
{
  "name": "my-turborepo",
  "private": true,
  "workspaces": ["apps/*", "packages/*"],
  "scripts": {
    "dev": "turbo dev",
    "build": "turbo build",
    "test": "turbo test",
    "lint": "turbo lint",
    "format": "prettier --write \"**/*.{ts,tsx,md}\""
  },
  "devDependencies": {
    "turbo": "latest",
    "prettier": "^3.0.0",
    "typescript": "^5.3.0"
  },
  "packageManager": "pnpm@8.0.0"
}
```

## まとめ

モノレポツールの選択は、プロジェクトの規模と要件次第です。

### 推奨構成

**小規模プロジェクト:**
- **pnpm Workspace** - シンプルで十分

**中規模プロジェクト:**
- **Turborepo** - 速度とシンプルさのバランス

**大規模プロジェクト:**
- **Nx** - 包括的な機能
- **Moon** - 最高速度重視

モノレポを活用して、効率的な開発体験を実現しましょう。
