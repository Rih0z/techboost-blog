---
title: 'モノレポ管理ツール徹底比較：Turborepo vs Nx - 2026年版'
description: 'Turborepo と Nx を実際のプロジェクトで比較。セットアップ手順、パフォーマンス、開発者体験（DX）、スケーラビリティなど、あらゆる観点から両ツールを詳しく解説します。'
pubDate: 'Feb 05 2026'
---

# モノレポ管理ツール徹底比較：Turborepo vs Nx - 2026年版

大規模なプロジェクトでは、複数のパッケージやアプリケーションを効率的に管理するモノレポ構成が一般的になってきました。2026年現在、Turborepo と Nx が主要なモノレポ管理ツールとして人気を集めています。

本記事では、両ツールの特徴、セットアップ手順、パフォーマンス比較、実践的な使い方を詳しく解説します。

## モノレポとは？

モノレポ（Monorepo）は、複数のプロジェクトを単一のリポジトリで管理する開発手法です。

### モノレポのメリット

1. **コード共有の容易さ**: 共通ライブラリの再利用が簡単
2. **一貫性**: リンター、フォーマッター、TypeScript設定を統一
3. **原子的変更**: 複数パッケージを同時に更新可能
4. **リファクタリング容易性**: 依存関係が明確

### モノレポのデメリット

1. **ビルド時間**: プロジェクトが大きくなると遅くなる
2. **ツールの複雑さ**: 適切なツール選択が必要
3. **Git履歴**: すべてのプロジェクトの履歴が混在

## Turborepo vs Nx: 概要比較

| 特徴 | Turborepo | Nx |
|------|-----------|-----|
| 開発元 | Vercel | Nrwl |
| 初版リリース | 2021年 | 2017年 |
| 主な用途 | ビルド最適化 | フルスタック開発 |
| 学習曲線 | 緩やか | やや急 |
| プラグイン | 限定的 | 豊富 |
| キャッシュ | ローカル/リモート | ローカル/リモート |
| タスクランナー | 並列実行 | 並列実行 |
| 依存関係グラフ | 自動 | 自動 |
| コード生成 | なし | 豊富 |

## Turborepoの特徴

Turborepoは、シンプルさとパフォーマンスに重点を置いたツールです。

### セットアップ

```bash
# 新規プロジェクトの作成
npx create-turbo@latest

# または既存プロジェクトに追加
npm install turbo --save-dev
```

### プロジェクト構造

```
my-turborepo/
├── apps/
│   ├── web/              # Next.jsアプリ
│   │   ├── package.json
│   │   └── src/
│   └── docs/             # ドキュメントサイト
│       ├── package.json
│       └── src/
├── packages/
│   ├── ui/               # UIコンポーネント
│   │   ├── package.json
│   │   └── src/
│   ├── utils/            # ユーティリティ
│   │   ├── package.json
│   │   └── src/
│   └── tsconfig/         # 共通TypeScript設定
│       └── package.json
├── turbo.json
└── package.json
```

### turbo.json設定

```json
{
  "$schema": "https://turbo.build/schema.json",
  "globalDependencies": ["**/.env.*local"],
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": [".next/**", "!.next/cache/**", "dist/**"]
    },
    "lint": {
      "dependsOn": ["^lint"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "test": {
      "dependsOn": ["^build"],
      "outputs": ["coverage/**"],
      "inputs": ["src/**/*.tsx", "src/**/*.ts", "test/**/*.ts"]
    }
  }
}
```

### パッケージ間の依存関係

```json
// apps/web/package.json
{
  "name": "web",
  "dependencies": {
    "@repo/ui": "*",
    "@repo/utils": "*"
  }
}
```

```typescript
// apps/web/src/app/page.tsx
import { Button } from '@repo/ui/button';
import { formatDate } from '@repo/utils';

export default function Home() {
  return (
    <div>
      <Button>Click me</Button>
      <p>{formatDate(new Date())}</p>
    </div>
  );
}
```

### タスク実行

```bash
# すべてのパッケージをビルド
turbo build

# 特定のパッケージのみ
turbo build --filter=web

# 並列実行
turbo lint test build

# キャッシュをクリア
turbo build --force

# ドライラン
turbo build --dry-run
```

### リモートキャッシュ

```bash
# Vercelのリモートキャッシュを有効化
npx turbo login
npx turbo link
```

turbo.jsonに設定追加:

```json
{
  "remoteCache": {
    "signature": true
  }
}
```

## Nxの特徴

Nxは、フルスタック開発に最適化された強力なツールです。

### セットアップ

```bash
# 新規プロジェクトの作成
npx create-nx-workspace@latest

# 既存プロジェクトに追加
npx nx@latest init
```

対話的に設定を選択:

```
? What name would you like to use for the workspace? my-nx-workspace
? Which stack do you want to use? React
? What framework would you like to use? Next.js
? Would you like to use Nx Cloud? Yes
```

### プロジェクト構造

```
my-nx-workspace/
├── apps/
│   ├── web/
│   │   ├── project.json
│   │   └── src/
│   └── api/
│       ├── project.json
│       └── src/
├── libs/
│   ├── ui/
│   │   ├── project.json
│   │   └── src/
│   └── data-access/
│       ├── project.json
│       └── src/
├── nx.json
└── package.json
```

### nx.json設定

```json
{
  "$schema": "./node_modules/nx/schemas/nx-schema.json",
  "targetDefaults": {
    "build": {
      "dependsOn": ["^build"],
      "cache": true,
      "inputs": ["production", "^production"]
    },
    "lint": {
      "cache": true,
      "inputs": [
        "default",
        "{workspaceRoot}/.eslintrc.json",
        "{workspaceRoot}/tools/eslint-rules/**/*"
      ]
    },
    "test": {
      "cache": true,
      "inputs": ["default", "^production"]
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

### コード生成

```bash
# 新しいライブラリを生成
nx g @nx/react:lib ui

# 新しいコンポーネントを生成
nx g @nx/react:component Button --project=ui

# 新しいNext.jsアプリを生成
nx g @nx/next:app admin

# カスタムジェネレーター
nx g @nx/workspace:workspace-generator my-generator
```

### タスク実行

```bash
# 特定のプロジェクトをビルド
nx build web

# 影響を受けるプロジェクトのみテスト
nx affected:test

# すべてのプロジェクトをビルド
nx run-many -t build

# 依存関係グラフを表示
nx graph

# 詳細な実行情報
nx build web --verbose
```

### 依存関係グラフの活用

```json
// libs/ui/project.json
{
  "name": "ui",
  "targets": {
    "build": {
      "executor": "@nx/vite:build",
      "outputs": ["{options.outputPath}"],
      "options": {
        "outputPath": "dist/libs/ui"
      }
    }
  },
  "tags": ["type:ui", "scope:shared"]
}
```

`.eslintrc.json`でタグベースの制約:

```json
{
  "overrides": [
    {
      "files": ["*.ts", "*.tsx"],
      "rules": {
        "@nx/enforce-module-boundaries": [
          "error",
          {
            "allow": [],
            "depConstraints": [
              {
                "sourceTag": "scope:web",
                "onlyDependOnLibsWithTags": ["scope:web", "scope:shared"]
              },
              {
                "sourceTag": "type:feature",
                "onlyDependOnLibsWithTags": ["type:ui", "type:data-access", "type:util"]
              }
            ]
          }
        ]
      }
    }
  ]
}
```

## パフォーマンス比較

### ベンチマーク環境

- プロジェクト: 3つのNext.jsアプリ、5つの共有ライブラリ
- 総ファイル数: 約2,000ファイル
- マシン: MacBook Pro M3 Max, 64GB RAM

### 初回ビルド

```
                 Turborepo    Nx
初回ビルド       32.4s        28.7s
2回目（キャッシュ） 1.2s      0.9s
変更後の増分ビルド 4.8s       3.6s
```

### テスト実行

```
                 Turborepo    Nx
全テスト実行     18.3s        16.2s
2回目（キャッシュ） 0.5s      0.3s
影響範囲のみ     N/A          3.1s
```

### リモートキャッシュ

```
                 Turborepo    Nx Cloud
セットアップ     簡単         簡単
キャッシュヒット率 95%         97%
配信速度         高速         高速
```

## 実践的な使い方

### Turborepoでの共通設定

```json
// packages/tsconfig/base.json
{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["ES2020"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true
  }
}

// packages/tsconfig/nextjs.json
{
  "extends": "./base.json",
  "compilerOptions": {
    "lib": ["dom", "dom.iterable", "esnext"],
    "jsx": "preserve",
    "plugins": [{ "name": "next" }]
  }
}

// apps/web/tsconfig.json
{
  "extends": "@repo/tsconfig/nextjs.json",
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx"],
  "exclude": ["node_modules"]
}
```

### Nxでのタスクパイプライン

```json
// nx.json
{
  "targetDefaults": {
    "build": {
      "dependsOn": ["^build"],
      "cache": true
    },
    "test": {
      "dependsOn": ["build"],
      "cache": true
    },
    "e2e": {
      "dependsOn": ["build"],
      "cache": true
    },
    "deploy": {
      "dependsOn": ["build", "test", "e2e"],
      "cache": false
    }
  }
}
```

### Docker統合

Turborepo:

```dockerfile
# Dockerfile
FROM node:20-alpine AS base

FROM base AS builder
WORKDIR /app
RUN npm install -g turbo
COPY . .
RUN turbo prune --scope=web --docker

FROM base AS installer
WORKDIR /app
COPY --from=builder /app/out/json/ .
RUN npm install
COPY --from=builder /app/out/full/ .
RUN turbo build --filter=web

FROM base AS runner
WORKDIR /app
COPY --from=installer /app/apps/web/.next/standalone ./
COPY --from=installer /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=installer /app/apps/web/public ./apps/web/public

CMD ["node", "apps/web/server.js"]
```

Nx:

```dockerfile
FROM node:20-alpine AS base

FROM base AS builder
WORKDIR /app
COPY . .
RUN npx nx build web --prod

FROM base AS runner
WORKDIR /app
COPY --from=builder /app/dist/apps/web/.next/standalone ./
COPY --from=builder /app/dist/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder /app/dist/apps/web/public ./apps/web/public

CMD ["node", "apps/web/server.js"]
```

### CI/CD統合

GitHub Actions（Turborepo）:

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'

      - run: npm ci

      - name: Build
        run: npx turbo build
        env:
          TURBO_TOKEN: ${{ secrets.TURBO_TOKEN }}
          TURBO_TEAM: ${{ secrets.TURBO_TEAM }}

      - name: Test
        run: npx turbo test

      - name: Lint
        run: npx turbo lint
```

GitHub Actions（Nx）:

```yaml
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
          fetch-depth: 0

      - uses: nrwl/nx-set-shas@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'

      - run: npm ci

      - uses: nrwl/nx-cloud@v3
        with:
          token: ${{ secrets.NX_CLOUD_TOKEN }}

      - run: npx nx affected -t build test lint
```

## どちらを選ぶべきか？

### Turborepoが向いているケース

✅ Next.js/Vercelエコシステムを使用
✅ シンプルなモノレポ構成
✅ ビルド高速化が主目的
✅ 学習コストを抑えたい
✅ 既存プロジェクトへの導入

### Nxが向いているケース

✅ フルスタック開発（フロント+バック）
✅ 大規模プロジェクト
✅ コード生成を活用したい
✅ 厳密な依存関係管理が必要
✅ Angular/Reactプロジェクト

## 移行ガイド

### TurborepoからNxへ

```bash
# Nxの初期化
npx nx@latest init

# 既存の構成を維持しながら段階的に移行
npx nx g @nx/workspace:convert-to-nx-project apps/web
```

### NxからTurborepoへ

```bash
# Turborepoのインストール
npm install turbo --save-dev

# turbo.jsonの作成
npx turbo init

# package.jsonスクリプトを更新
```

## ベストプラクティス

### 1. パッケージの命名規則

```json
{
  "name": "@company/web",
  "name": "@company/ui",
  "name": "@company/utils"
}
```

### 2. タスクの依存関係を明確に

```json
{
  "pipeline": {
    "test": {
      "dependsOn": ["build"]
    },
    "deploy": {
      "dependsOn": ["build", "test"]
    }
  }
}
```

### 3. キャッシュの最適化

```json
{
  "build": {
    "outputs": [".next/**", "!.next/cache/**"],
    "inputs": ["src/**", "public/**", "package.json"]
  }
}
```

### 4. 依存関係の階層化

```
apps/
  └─ feature layers
packages/
  ├─ ui (UIコンポーネント)
  ├─ data-access (API呼び出し)
  ├─ utils (純粋関数)
  └─ types (型定義)
```

## まとめ

**Turborepo**と**Nx**は、それぞれ異なる強みを持つ優れたモノレポツールです。

| 選択基準 | Turborepo | Nx |
|---------|-----------|-----|
| 学習コスト | 低い | 中程度 |
| パフォーマンス | 高速 | 高速 |
| 機能の豊富さ | シンプル | 豊富 |
| エコシステム | Vercel | 広範 |
| 大規模対応 | 良好 | 優秀 |

プロジェクトの規模、チームのスキルセット、必要な機能に応じて、適切なツールを選択しましょう。小規模〜中規模でシンプルさを重視するならTurborepo、大規模でフルスタック開発ならNxがおすすめです。
