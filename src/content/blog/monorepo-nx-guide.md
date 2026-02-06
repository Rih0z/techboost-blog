---
title: "Nx完全ガイド - 大規模モノレポ構築とタスク実行の最適化"
description: "Nxによるモノレポ構築の実践ガイド。プロジェクト構造、キャッシング、分散実行、Next.js/Reactアプリの統合まで実例付きで解説します。"
pubDate: "2025-02-05"
tags: ["Nx", "モノレポ", "Next.js", "ビルド最適化", "開発環境"]
---

## はじめに

Nxは、Nrwl社が開発する**エンタープライズグレードのモノレポ管理ツール**です。

単なるパッケージマネージャーではなく、**スマートなタスク実行エンジン**、**分散キャッシング**、**依存関係グラフの可視化**を提供します。

### Nxの主な機能

- **高速なタスク実行** - 変更されたプロジェクトのみビルド
- **分散キャッシング** - ローカル & クラウドキャッシュ
- **依存関係グラフ** - プロジェクト間の依存を可視化
- **ジェネレーター** - 一貫性のあるコード生成
- **プラグインエコシステム** - Next.js、React、Node.js、Nestなど

この記事では、Nxを使った大規模モノレポの構築と運用方法を実践的に解説します。

## Nxのインストールとセットアップ

### 新規プロジェクトの作成

```bash
# Nxワークスペースの作成
npx create-nx-workspace@latest my-workspace

# 対話型プロンプト
? Which stack do you want to use? › Next.js
? Integrated monorepo or standalone project? › Integrated
? Application name › web
? Would you like to use the App Router? › Yes
? Default stylesheet format › Tailwind CSS
? Enable distributed caching? › Yes
```

### 既存プロジェクトへのNx導入

```bash
# 既存のNext.jsプロジェクトにNxを追加
npx nx@latest init

# package.jsonに自動的に追加される
{
  "scripts": {
    "build": "nx build",
    "test": "nx test",
    "lint": "nx lint"
  }
}
```

## モノレポの構造

### 典型的なNxワークスペース構造

```
my-workspace/
├── apps/
│   ├── web/                    # Next.jsアプリ（顧客向け）
│   ├── admin/                  # Next.jsアプリ（管理画面）
│   ├── mobile/                 # React Nativeアプリ
│   └── api/                    # NestJS API
├── libs/
│   ├── ui/                     # 共有UIコンポーネント
│   ├── data-access/            # API呼び出しロジック
│   ├── utils/                  # ユーティリティ関数
│   └── types/                  # TypeScript型定義
├── tools/
│   └── generators/             # カスタムジェネレーター
├── nx.json                     # Nx設定
├── tsconfig.base.json          # 共通TypeScript設定
└── package.json
```

### プロジェクトの作成

```bash
# Next.jsアプリの追加
nx g @nx/next:app admin --directory=apps/admin

# Reactライブラリの追加
nx g @nx/react:lib ui --directory=libs/ui --bundler=vite

# NestJSアプリの追加
nx g @nx/nest:app api --directory=apps/api
```

## 共有ライブラリの作成と使用

### UIライブラリの作成

```bash
# UIライブラリを作成
nx g @nx/react:lib ui --directory=libs/ui --bundler=vite

# コンポーネント生成
nx g @nx/react:component Button --project=ui --export
nx g @nx/react:component Card --project=ui --export
```

生成されるコンポーネント:

```typescript
// libs/ui/src/lib/Button/Button.tsx
import styles from './Button.module.css'

export interface ButtonProps {
  variant?: 'primary' | 'secondary'
  children: React.ReactNode
  onClick?: () => void
}

export function Button({ variant = 'primary', children, onClick }: ButtonProps) {
  return (
    <button className={`${styles.button} ${styles[variant]}`} onClick={onClick}>
      {children}
    </button>
  )
}

export default Button
```

### ライブラリの使用

```typescript
// apps/web/app/page.tsx
import { Button, Card } from '@my-workspace/ui'

export default function Home() {
  return (
    <div>
      <Card>
        <h1>Welcome</h1>
        <Button variant="primary" onClick={() => alert('Clicked!')}>
          Click me
        </Button>
      </Card>
    </div>
  )
}
```

### TypeScriptパスマッピング

```json
// tsconfig.base.json
{
  "compilerOptions": {
    "paths": {
      "@my-workspace/ui": ["libs/ui/src/index.ts"],
      "@my-workspace/utils": ["libs/utils/src/index.ts"],
      "@my-workspace/types": ["libs/types/src/index.ts"]
    }
  }
}
```

## タスク実行と依存関係

### プロジェクトのビルド

```bash
# 特定プロジェクトをビルド
nx build web

# 依存するすべてのライブラリも自動的にビルドされる
# web → ui → utils の順番で実行
```

### 並列実行

```bash
# すべてのプロジェクトをビルド（並列）
nx run-many -t build --all

# 特定のプロジェクトのみ
nx run-many -t build --projects=web,admin,api

# 並列実行数を指定
nx run-many -t build --all --parallel=3
```

### 影響を受けたプロジェクトのみ実行

```bash
# mainブランチからの変更を検出して、影響を受けたプロジェクトのみビルド
nx affected -t build --base=main

# テストも同様
nx affected -t test --base=main

# lintも
nx affected -t lint --base=main
```

### タスクの依存関係設定

```json
// apps/web/project.json
{
  "targets": {
    "build": {
      "dependsOn": ["^build"], // 依存ライブラリを先にビルド
      "executor": "@nx/next:build",
      "outputs": ["{projectRoot}/.next"]
    },
    "test": {
      "dependsOn": ["build"],
      "executor": "@nx/jest:jest"
    }
  }
}
```

## キャッシング機能

### ローカルキャッシュ

Nxは実行結果を自動的にキャッシュします。

```bash
# 初回実行
nx build web
# ✔ nx run web:build (15s)

# 2回目（変更なし）
nx build web
# ✔ nx run web:build [existing outputs match the cache, left as is]
#   Cache hit! (0.2s)
```

### キャッシュの設定

```json
// nx.json
{
  "targetDefaults": {
    "build": {
      "cache": true,
      "inputs": [
        "{projectRoot}/**/*",
        "!{projectRoot}/**/*.spec.ts"
      ],
      "outputs": ["{projectRoot}/dist", "{projectRoot}/.next"]
    }
  }
}
```

### Nx Cloudでの分散キャッシング

```bash
# Nx Cloudを有効化
nx connect

# チーム全体でキャッシュを共有
# CIで誰かがビルドした結果を、ローカルでも利用可能
```

```json
// nx.json
{
  "nxCloudAccessToken": "your-token-here",
  "parallel": 5,
  "cacheDirectory": ".nx/cache"
}
```

## 依存関係グラフの可視化

### プロジェクトグラフの表示

```bash
# ブラウザでインタラクティブなグラフを表示
nx graph

# 特定プロジェクトの依存関係のみ
nx graph --focus=web

# 影響を受けたプロジェクトを可視化
nx affected:graph --base=main
```

生成されるグラフの例:

```
        ┌────────┐
        │  web   │
        └────┬───┘
             │
        ┌────▼───┐
        │   ui   │
        └────┬───┘
             │
        ┌────▼────┐
        │  utils  │
        └─────────┘
```

### 循環依存の検出

```bash
# 循環依存をチェック
nx lint --fix

# ESLintで自動検出
# @nx/enforce-module-boundaries ルールが循環依存を警告
```

## Next.jsとの統合

### Next.jsアプリの構成

```typescript
// apps/web/next.config.js
const { composePlugins, withNx } = require('@nx/next')

const nextConfig = {
  nx: {
    svgr: false, // SVGRを有効化するかどうか
  },
}

const plugins = [withNx]

module.exports = composePlugins(...plugins)(nextConfig)
```

### 環境変数の管理

```bash
# apps/web/.env.local
NEXT_PUBLIC_API_URL=http://localhost:3001
DATABASE_URL=postgresql://localhost:5432/db
```

```typescript
// libs/config/src/lib/env.ts
export const env = {
  apiUrl: process.env.NEXT_PUBLIC_API_URL!,
  databaseUrl: process.env.DATABASE_URL!,
}
```

### 複数のNext.jsアプリで設定を共有

```typescript
// tools/next-config/base.js
module.exports = {
  reactStrictMode: true,
  swcMinify: true,
  images: {
    domains: ['cdn.example.com'],
  },
}

// apps/web/next.config.js
const baseConfig = require('../../tools/next-config/base')
const { withNx } = require('@nx/next')

module.exports = withNx({
  ...baseConfig,
  // アプリ固有の設定
  basePath: '/web',
})

// apps/admin/next.config.js
const baseConfig = require('../../tools/next-config/base')
const { withNx } = require('@nx/next')

module.exports = withNx({
  ...baseConfig,
  basePath: '/admin',
})
```

## カスタムジェネレーターの作成

### ジェネレーターの雛形作成

```bash
nx g @nx/plugin:generator feature --project=tools
```

```typescript
// tools/generators/feature/generator.ts
import { Tree, formatFiles, installPackagesTask } from '@nx/devkit'

export default async function (tree: Tree, schema: any) {
  const { name, project } = schema

  // ファイル生成
  tree.write(
    `apps/${project}/app/features/${name}/page.tsx`,
    `export default function ${name}Page() {
  return <div>${name} Feature</div>
}`
  )

  // テストファイル生成
  tree.write(
    `apps/${project}/app/features/${name}/page.spec.tsx`,
    `import { render } from '@testing-library/react'
import ${name}Page from './page'

describe('${name}Page', () => {
  it('should render', () => {
    const { getByText } = render(<${name}Page />)
    expect(getByText('${name} Feature')).toBeInTheDocument()
  })
})`
  )

  await formatFiles(tree)
  return () => {
    installPackagesTask(tree)
  }
}
```

### ジェネレーターの使用

```bash
# カスタムジェネレーターを実行
nx g @my-workspace/tools:feature dashboard --project=web

# 生成される:
# apps/web/app/features/dashboard/page.tsx
# apps/web/app/features/dashboard/page.spec.tsx
```

## CI/CDでのNx活用

### GitHub Actionsの設定

```yaml
# .github/workflows/ci.yml
name: CI

on:
  push:
    branches: [main]
  pull_request:

jobs:
  main:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0 # 全履歴を取得（affected検出のため）

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'

      - run: npm ci

      # 影響を受けたプロジェクトのみlint/test/build
      - run: npx nx affected -t lint test build --base=origin/main --parallel=3

      # Nx Cloudで結果をキャッシュ
      - run: npx nx-cloud record -- npx nx affected -t build
```

### 分散タスク実行（Nx Cloud）

```yaml
# .github/workflows/ci.yml
jobs:
  main:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        agent: [1, 2, 3, 4, 5] # 5つのエージェントで並列実行
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npx nx-cloud start-ci-run
      - run: npx nx affected -t build test --parallel=1
```

実行時間の短縮:

```
従来（直列実行）: 45分
Nx（並列実行）: 15分
Nx + Cloud Cache: 3分
```

## パフォーマンス最適化のベストプラクティス

### 1. タスクのinput/output設定を最適化

```json
// nx.json
{
  "targetDefaults": {
    "build": {
      "inputs": [
        "production",
        "^production",
        { "externalDependencies": ["next"] }
      ],
      "outputs": ["{projectRoot}/.next", "{projectRoot}/dist"]
    }
  },
  "namedInputs": {
    "production": [
      "!{projectRoot}/**/*.spec.tsx",
      "!{projectRoot}/jest.config.ts"
    ]
  }
}
```

### 2. 並列実行数を調整

```bash
# CPUコア数に合わせて並列数を調整
nx run-many -t build --all --parallel=$(nproc)

# メモリ不足を防ぐため上限を設定
nx run-many -t build --all --parallel=3
```

### 3. プロジェクトの適切な分割

```
【良い例】機能別に分割
libs/
├── ui/              # 再利用可能なUIコンポーネント
├── feature-auth/    # 認証機能
├── feature-dashboard/ # ダッシュボード機能
└── data-access-api/ # API呼び出し

【悪い例】レイヤー別に巨大化
libs/
├── components/      # すべてのコンポーネント（肥大化）
├── hooks/           # すべてのフック
└── utils/           # すべてのユーティリティ
```

## まとめ

Nxは、大規模モノレポ開発を効率化する強力なツールです。

### 主な利点

- **高速なビルド** - 変更部分のみ実行 + キャッシング
- **一貫性のある構造** - ジェネレーターで統一されたコード
- **依存関係の可視化** - プロジェクト間の関係を明確化
- **スケーラビリティ** - 数百のプロジェクトでも高速

### 導入チェックリスト

- [ ] Nxワークスペースを作成
- [ ] apps/とlibs/にプロジェクトを適切に配置
- [ ] 共有ライブラリを作成してDRYに
- [ ] nx.jsonでキャッシング設定を最適化
- [ ] カスタムジェネレーターで開発効率化
- [ ] CIでaffectedコマンドを活用
- [ ] Nx Cloudで分散キャッシングを有効化

Nxを活用すれば、数十〜数百のプロジェクトを含む大規模モノレポでも、高速で保守性の高い開発が実現できます。
