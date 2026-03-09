---
title: "pnpm Workspace完全ガイド - 効率的なモノレポ管理とパッケージリンク"
description: "pnpm Workspaceを使った効率的なモノレポ構築の完全ガイド。パッケージ間の依存関係管理、ビルドパイプライン、CI/CD統合、実践的な設計パターンまで徹底解説します。"
pubDate: "2025-08-10"
updatedDate: "2025-08-10"
tags: ["pnpm", "Monorepo", "Workspace", "Package Management", "DevOps", "インフラ"]
heroImage: '../../assets/thumbnails/pnpm-workspace-monorepo.jpg'
---
## はじめに

pnpm Workspaceは、単一リポジトリ内で複数のパッケージを効率的に管理するための機能です。2026年現在、npmやYarnと比較して最も高速かつディスク効率的なモノレポソリューションとして、Vercel、Microsoft、ByteDanceなど大規模プロジェクトで採用されています。

### pnpm Workspaceとは

```
従来の複数リポジトリ:
app1/          app2/          shared/
├─ node_modules/ ├─ node_modules/ ├─ node_modules/
├─ package.json  ├─ package.json  ├─ package.json

pnpm Workspace（モノレポ）:
monorepo/
├─ node_modules/      ← 共有依存関係（シンボリックリンク）
├─ pnpm-workspace.yaml
├─ package.json
├─ apps/
│  ├─ web/           ← Next.js
│  └─ mobile/        ← React Native
├─ packages/
│  ├─ ui/            ← UIコンポーネント
│  ├─ utils/         ← ユーティリティ
│  └─ config/        ← 共通設定
└─ services/
   ├─ api/           ← バックエンド
   └─ worker/        ← ワーカー

メリット:
✅ 依存関係の一元管理
✅ コード共有が容易
✅ 一貫したバージョン管理
✅ ディスク容量削減（60-90%）
✅ インストール高速化（2-3倍）
```

### pnpmの特徴

```
npm vs Yarn vs pnpm（100個のパッケージ）:

インストール速度:
npm:  45秒
Yarn: 38秒
pnpm: 18秒 ← 最速

ディスク使用量:
npm:  500MB
Yarn: 480MB
pnpm: 250MB ← 最小

pnpmの仕組み:
- Content-addressable storage（グローバルストア）
- Hard linkでディスク節約
- Strict node_modules構造でゴースト依存回避
```

## セットアップ

### インストール

```bash
# pnpmインストール
npm install -g pnpm

# バージョン確認
pnpm --version

# シェル補完設定（任意）
pnpm completion bash >> ~/.bashrc
```

### プロジェクト初期化

```bash
# プロジェクト作成
mkdir my-monorepo
cd my-monorepo

# 初期化
pnpm init

# Workspace設定ファイル作成
touch pnpm-workspace.yaml
```

### pnpm-workspace.yaml

```yaml
# pnpm-workspace.yaml
packages:
  # すべてのパッケージを含む
  - 'apps/*'
  - 'packages/*'
  - 'services/*'
  # 除外パターン
  - '!**/test/**'
```

### ルートpackage.json

```json
{
  "name": "my-monorepo",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "pnpm --parallel --filter \"./apps/*\" dev",
    "build": "pnpm --filter \"./packages/*\" build && pnpm --filter \"./apps/*\" build",
    "test": "pnpm -r test",
    "lint": "pnpm -r lint",
    "clean": "pnpm -r clean && rm -rf node_modules"
  },
  "devDependencies": {
    "typescript": "^5.3.0",
    "prettier": "^3.2.0",
    "eslint": "^8.56.0"
  }
}
```

## パッケージ構成

### 基本的なディレクトリ構造

```bash
# ディレクトリ作成
mkdir -p apps/web apps/mobile
mkdir -p packages/ui packages/utils packages/config
mkdir -p services/api
```

### パッケージ1: UI Components

```bash
cd packages/ui
pnpm init
```

```json
{
  "name": "@myorg/ui",
  "version": "1.0.0",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "import": "./dist/index.js",
      "types": "./dist/index.d.ts"
    },
    "./button": {
      "import": "./dist/button.js",
      "types": "./dist/button.d.ts"
    }
  },
  "scripts": {
    "build": "tsup src/index.ts --format esm --dts",
    "dev": "tsup src/index.ts --format esm --dts --watch"
  },
  "dependencies": {
    "react": "^18.2.0"
  },
  "devDependencies": {
    "@types/react": "^18.2.0",
    "tsup": "^8.0.0",
    "typescript": "^5.3.0"
  }
}
```

```typescript
// packages/ui/src/button.tsx
import React from 'react';

export interface ButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
}

export function Button({ children, onClick }: ButtonProps) {
  return <button onClick={onClick}>{children}</button>;
}
```

```typescript
// packages/ui/src/index.ts
export { Button } from './button';
export type { ButtonProps } from './button';
```

### パッケージ2: Utils

```json
{
  "name": "@myorg/utils",
  "version": "1.0.0",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "scripts": {
    "build": "tsup src/index.ts --format esm,cjs --dts",
    "test": "vitest"
  },
  "devDependencies": {
    "tsup": "^8.0.0",
    "vitest": "^1.2.0"
  }
}
```

```typescript
// packages/utils/src/format.ts
export function formatCurrency(amount: number, currency: string = 'JPY'): string {
  return new Intl.NumberFormat('ja-JP', {
    style: 'currency',
    currency,
  }).format(amount);
}

export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('ja-JP').format(date);
}
```

### アプリ: Next.js Web App

```json
{
  "name": "@myorg/web",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start"
  },
  "dependencies": {
    "@myorg/ui": "workspace:*",
    "@myorg/utils": "workspace:*",
    "next": "^14.1.0",
    "react": "^18.2.0",
    "react-dom": "^18.2.0"
  }
}
```

```typescript
// apps/web/app/page.tsx
import { Button } from '@myorg/ui';
import { formatCurrency } from '@myorg/utils';

export default function Home() {
  return (
    <main>
      <h1>My App</h1>
      <Button onClick={() => alert('Clicked!')}>
        Click me
      </Button>
      <p>Price: {formatCurrency(1000)}</p>
    </main>
  );
}
```

## 依存関係管理

### workspace: プロトコル

```json
{
  "dependencies": {
    "@myorg/ui": "workspace:*",      // 最新バージョン
    "@myorg/utils": "workspace:^",   // SemVerと互換
    "@myorg/config": "workspace:~1.0.0" // 範囲指定
  }
}
```

### 依存関係の追加

```bash
# ルートに追加（すべてのパッケージで共有）
pnpm add -w typescript

# 特定のパッケージに追加
pnpm --filter @myorg/web add react

# 開発依存関係
pnpm --filter @myorg/ui add -D @types/react

# Workspace内パッケージをリンク
pnpm --filter @myorg/web add @myorg/ui --workspace
```

### 依存関係の削除

```bash
# 特定のパッケージから削除
pnpm --filter @myorg/web remove react

# 全パッケージから削除
pnpm -r remove lodash
```

### バージョンアップデート

```bash
# 対話的アップデート
pnpm -r update --interactive

# 最新版に更新
pnpm -r update --latest

# 特定パッケージのみ
pnpm --filter @myorg/web update next@latest
```

## ビルドパイプライン

### 依存関係順のビルド

```json
{
  "scripts": {
    "build": "pnpm -r --workspace-concurrency 4 build"
  }
}
```

```bash
# 依存関係を考慮して並列実行
pnpm -r build

# 実行順序:
# 1. packages/config（依存なし）
# 2. packages/utils（依存なし）
# 3. packages/ui（依存なし）
# 4. apps/web（ui, utils に依存）← 3が終わってから
```

### フィルタリング

```bash
# apps配下のみビルド
pnpm --filter "./apps/*" build

# 特定パッケージとその依存先
pnpm --filter @myorg/web... build

# 特定パッケージとその依存元
pnpm --filter ...@myorg/ui build

# 変更されたパッケージのみ（Git）
pnpm --filter "[HEAD^]" build
```

### Turbopack統合

```bash
pnpm add -w turbo
```

```json
// turbo.json
{
  "$schema": "https://turbo.build/schema.json",
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**", ".next/**"]
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
{
  "scripts": {
    "dev": "turbo run dev",
    "build": "turbo run build",
    "test": "turbo run test"
  }
}
```

## スクリプト実行

### 再帰実行

```bash
# すべてのパッケージで実行
pnpm -r test

# 並列実行
pnpm -r --parallel dev

# トポロジカルソート順（依存関係順）
pnpm -r --sort build
```

### エラーハンドリング

```bash
# エラーがあっても続行
pnpm -r --no-bail test

# 失敗したパッケージのみ再実行
pnpm -r --resume-from @myorg/web test
```

### ログ管理

```bash
# ログを集約
pnpm -r --aggregate-output test

# ストリーム出力
pnpm -r --stream dev
```

## TypeScript設定

### ルートtsconfig.json

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "skipLibCheck": true,
    "resolveJsonModule": true,
    "paths": {
      "@myorg/ui": ["./packages/ui/src"],
      "@myorg/utils": ["./packages/utils/src"]
    }
  }
}
```

### パッケージごとのtsconfig.json

```json
// packages/ui/tsconfig.json
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src",
    "jsx": "react-jsx"
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

### Project References

```json
// apps/web/tsconfig.json
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "composite": true
  },
  "references": [
    { "path": "../../packages/ui" },
    { "path": "../../packages/utils" }
  ],
  "include": ["**/*"]
}
```

```bash
# Project References ビルド
pnpm tsc --build --verbose
```

## CI/CD統合

### GitHub Actions

```yaml
# .github/workflows/ci.yml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  build-and-test:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - name: Setup pnpm
        uses: pnpm/action-setup@v2
        with:
          version: 8

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Lint
        run: pnpm -r lint

      - name: Type check
        run: pnpm -r type-check

      - name: Test
        run: pnpm -r test

      - name: Build
        run: pnpm -r build

      # 変更されたパッケージのみデプロイ
      - name: Deploy changed apps
        run: |
          pnpm --filter "[HEAD^]" deploy
```

### Docker統合

```dockerfile
# Dockerfile
FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@8.15.0 --activate

FROM base AS deps
WORKDIR /app
COPY pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/web/package.json ./apps/web/
COPY packages/*/package.json ./packages/
RUN pnpm install --frozen-lockfile --prod

FROM base AS builder
WORKDIR /app
COPY . .
COPY --from=deps /app/node_modules ./node_modules
RUN pnpm -r build
RUN pnpm --filter @myorg/web --prod deploy /prod/web

FROM base AS runner
WORKDIR /app
ENV NODE_ENV production
COPY --from=builder /prod/web ./
EXPOSE 3000
CMD ["pnpm", "start"]
```

### デプロイコマンド

```bash
# 本番ビルド + プルーン
pnpm --filter @myorg/web deploy /dist/web

# 内容:
# 1. パッケージをビルド
# 2. 必要な依存のみコピー
# 3. devDependencies削除
```

## 実践的なパターン

### パターン1: Shared Configuration

```typescript
// packages/config/eslint.js
module.exports = {
  extends: ['next/core-web-vitals', 'prettier'],
  rules: {
    '@typescript-eslint/no-unused-vars': 'error',
  },
};
```

```json
// apps/web/.eslintrc.js
module.exports = {
  extends: ['@myorg/config/eslint'],
};
```

### パターン2: Code Generation

```json
// packages/api-client/package.json
{
  "scripts": {
    "generate": "openapi-typescript ../api/openapi.yaml -o ./src/types.ts"
  }
}
```

```json
// ルート package.json
{
  "scripts": {
    "codegen": "pnpm --filter @myorg/api-client generate"
  }
}
```

### パターン3: Version Management

```bash
# Changesets導入
pnpm add -Dw @changesets/cli
pnpm changeset init
```

```bash
# 変更セット作成
pnpm changeset

# バージョンバンプ
pnpm changeset version

# パブリッシュ
pnpm changeset publish
```

```yaml
# .changeset/config.json
{
  "changelog": "@changesets/changelog-github",
  "commit": false,
  "linked": [],
  "access": "public",
  "baseBranch": "main",
  "updateInternalDependencies": "patch",
  "ignore": ["@myorg/web"]
}
```

## トラブルシューティング

### エラー1: Hoisting Issues

```
エラー: Cannot find module 'package'

解決策: .npmrc設定
```

```ini
# .npmrc
public-hoist-pattern[]=*eslint*
public-hoist-pattern[]=*prettier*
shamefully-hoist=false
```

### エラー2: 循環依存

```
エラー: Cyclic dependency detected

解決策: 依存グラフ確認
```

```bash
# 依存関係可視化
pnpm list --depth 99 --json | jq '.dependencies'

# 循環依存チェック
pnpm -r exec madge --circular --extensions ts,tsx src/
```

### エラー3: Phantom Dependencies

```
エラー: Module not found (開発時は動くが本番で失敗)

解決策: package.jsonに明示的追加
```

```bash
# 依存関係チェック
pnpm -r exec depcheck
```

## まとめ

### pnpm Workspaceの強み

1. **高速**: npm/Yarnの2-3倍速いインストール
2. **省スペース**: 60-90%のディスク節約
3. **厳密性**: Phantom dependency回避
4. **スケーラビリティ**: 大規模モノレポに対応

### ベストプラクティス

- workspace:プロトコルでパッケージリンク
- Turboでビルドキャッシュ
- Changesetsでバージョン管理
- Project Referencesで型チェック高速化
- CIでfrozen-lockfile使用

### いつ使うべきか

**最適な用途**:
- マルチパッケージプロジェクト
- モノレポ構成
- コード共有が多いプロジェクト
- 一貫したバージョン管理が必要

**不向きな用途**:
- 単一パッケージプロジェクト
- npm/Yarn固有の機能に依存

### 次のステップ

- pnpm公式: https://pnpm.io/
- Turborepo: https://turbo.build/
- Changesets: https://github.com/changesets/changesets
- Nx: https://nx.dev/

pnpm Workspaceで、効率的なモノレポ開発を始めましょう。
