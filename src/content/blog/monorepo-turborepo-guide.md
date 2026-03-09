---
title: "Turborepo完全ガイド — モノレポ開発を10倍高速化する"
description: "Turborepoを使ったモノレポ開発の完全ガイド。パイプライン設計、キャッシング戦略、リモートキャッシュ、pnpm workspaces連携まで実践的に解説。ビルド時間を劇的に短縮できます。"
pubDate: "2026-02-05"
tags: ["Turborepo", "Monorepo", "ビルドツール", "開発効率化", "プログラミング"]
heroImage: '../../assets/thumbnails/monorepo-turborepo-guide.jpg'
---
## Turborepoとは

Turborepoは、Vercelが開発するモノレポ向けビルドシステムです。複数のパッケージやアプリケーションを含むリポジトリにおいて、タスクの実行を劇的に高速化します。

従来のモノレポツール（Lerna、Nx）と比較して、Turborepoは設定がシンプルで、インクリメンタルビルドとリモートキャッシュによって圧倒的なパフォーマンスを実現します。

## なぜTurborepoなのか

### 1. インクリメンタルビルド

変更されたパッケージのみをビルドし、未変更のパッケージはキャッシュから復元します。これにより、CIでのビルド時間を数分から数秒に短縮できます。

### 2. リモートキャッシュ

チーム全体でビルド結果を共有。他の開発者やCIが既にビルドしたパッケージは、再ビルドせずにキャッシュから取得します。

### 3. タスクパイプライン

依存関係を自動解決し、並列実行可能なタスクを最大限に活用します。

### 4. ゼロコンフィグ

最小限の設定で始められ、段階的に最適化できます。

## 基本的なセットアップ

### プロジェクト構造

```
my-monorepo/
├── package.json
├── turbo.json
├── pnpm-workspace.yaml
├── apps/
│   ├── web/          # Next.jsアプリ
│   ├── admin/        # 管理画面
│   └── api/          # APIサーバー
├── packages/
│   ├── ui/           # 共通UIコンポーネント
│   ├── utils/        # ユーティリティ
│   ├── config/       # 共通設定
│   └── tsconfig/     # TypeScript設定
└── tooling/
    ├── eslint-config/
    └── typescript-config/
```

### pnpm-workspace.yaml

```yaml
packages:
  - 'apps/*'
  - 'packages/*'
  - 'tooling/*'
```

### ルートのpackage.json

```json
{
  "name": "monorepo",
  "private": true,
  "scripts": {
    "build": "turbo run build",
    "dev": "turbo run dev",
    "test": "turbo run test",
    "lint": "turbo run lint",
    "clean": "turbo run clean"
  },
  "devDependencies": {
    "turbo": "^2.0.0",
    "typescript": "^5.3.0"
  },
  "packageManager": "pnpm@9.0.0"
}
```

## turbo.jsonの設計

`turbo.json`はTurborepoの心臓部です。タスクの依存関係、キャッシュ戦略、入出力を定義します。

```json
{
  "$schema": "https://turbo.build/schema.json",
  "globalDependencies": [".env", "tsconfig.json"],
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**", ".next/**", "build/**"],
      "cache": true
    },
    "test": {
      "dependsOn": ["build"],
      "outputs": ["coverage/**"],
      "cache": true
    },
    "lint": {
      "cache": true
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "clean": {
      "cache": false
    }
  }
}
```

### 重要な設定項目

#### dependsOn

タスクの依存関係を定義します。

- `^build`: 依存パッケージの`build`タスクを先に実行
- `build`: 同一パッケージ内の`build`タスクを先に実行

```json
{
  "test": {
    "dependsOn": ["^build", "build"]
  }
}
```

#### outputs

キャッシュ対象となる出力ファイルを指定します。

```json
{
  "build": {
    "outputs": [
      "dist/**",
      ".next/**",
      "!.next/cache/**"
    ]
  }
}
```

#### inputs

入力ファイルを明示的に指定することで、不要なキャッシュ無効化を防ぎます。

```json
{
  "build": {
    "inputs": ["src/**", "package.json"]
  }
}
```

## パッケージ間の依存関係

### 内部パッケージの利用

```json
// apps/web/package.json
{
  "name": "web",
  "dependencies": {
    "@repo/ui": "workspace:*",
    "@repo/utils": "workspace:*"
  }
}
```

```typescript
// apps/web/src/app/page.tsx
import { Button } from '@repo/ui'
import { formatDate } from '@repo/utils'

export default function Home() {
  return <Button>{formatDate(new Date())}</Button>
}
```

### TypeScriptの設定

```json
// packages/ui/tsconfig.json
{
  "extends": "@repo/typescript-config/react-library.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src"
  },
  "include": ["src"],
  "exclude": ["node_modules", "dist"]
}
```

```json
// apps/web/tsconfig.json
{
  "extends": "@repo/typescript-config/nextjs.json",
  "compilerOptions": {
    "paths": {
      "@repo/ui": ["../../packages/ui/src/index.ts"]
    }
  }
}
```

## キャッシング戦略

### ローカルキャッシュ

Turborepoは自動的に`.turbo/cache`にビルド結果をキャッシュします。

```bash
# 初回ビルド
pnpm build  # 20秒

# キャッシュからの復元
pnpm build  # 0.5秒
```

### リモートキャッシュ（Vercel）

```bash
# Vercelにログイン
npx turbo login

# リモートキャッシュを有効化
npx turbo link
```

これにより、チームメンバーやCIがビルド結果を共有できます。

### カスタムリモートキャッシュ

自前のキャッシュサーバーを使うことも可能です。

```json
{
  "remoteCache": {
    "signature": true,
    "preflight": true
  }
}
```

## 実行戦略

### フィルタリング

特定のパッケージのみを対象にする。

```bash
# webアプリのみビルド
turbo run build --filter=web

# uiパッケージとそれに依存するすべてをビルド
turbo run build --filter=...@repo/ui

# webとその依存をビルド
turbo run build --filter=web...

# 変更のあったパッケージのみテスト
turbo run test --filter=[HEAD^1]
```

### 並列実行

```bash
# 最大4プロセスで並列実行
turbo run build --concurrency=4

# 最大限の並列実行
turbo run build --concurrency=100%
```

### Force実行

```bash
# キャッシュを無視して実行
turbo run build --force
```

## CI/CDでの活用

### GitHub Actions

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
      - uses: pnpm/action-setup@v3
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'pnpm'

      - run: pnpm install --frozen-lockfile

      - name: Build
        run: pnpm turbo build
        env:
          TURBO_TOKEN: ${{ secrets.TURBO_TOKEN }}
          TURBO_TEAM: ${{ secrets.TURBO_TEAM }}

      - name: Test
        run: pnpm turbo test
```

### 変更検知デプロイ

```yaml
- name: Check for changes
  id: changes
  run: |
    if turbo run build --filter=web...[HEAD^1] --dry-run | grep -q "web:build"; then
      echo "web_changed=true" >> $GITHUB_OUTPUT
    fi

- name: Deploy Web
  if: steps.changes.outputs.web_changed == 'true'
  run: vercel deploy
```

## パフォーマンス最適化

### 1. 適切なoutputs指定

```json
{
  "build": {
    "outputs": [
      "dist/**",
      "!dist/**/*.map"
    ]
  }
}
```

### 2. globalDependenciesの最小化

```json
{
  "globalDependencies": [
    ".env.production",
    "tsconfig.base.json"
  ]
}
```

### 3. 環境変数の管理

```json
{
  "pipeline": {
    "build": {
      "env": [
        "NODE_ENV",
        "NEXT_PUBLIC_API_URL"
      ]
    }
  }
}
```

環境変数が変わった時だけキャッシュを無効化します。

## よくあるパターン

### 共通UIライブラリ

```typescript
// packages/ui/src/button.tsx
export function Button({ children }: { children: React.ReactNode }) {
  return <button className="btn">{children}</button>
}

// packages/ui/package.json
{
  "name": "@repo/ui",
  "exports": {
    "./button": "./src/button.tsx",
    "./input": "./src/input.tsx"
  }
}
```

### 共通設定の共有

```typescript
// packages/config/eslint-preset.js
module.exports = {
  extends: ['next', 'turbo', 'prettier'],
  rules: {
    '@next/next/no-html-link-for-pages': 'off',
  },
}

// apps/web/.eslintrc.js
module.exports = {
  extends: ['@repo/config/eslint-preset'],
}
```

## まとめ

Turborepoは、モノレポ開発を次のレベルに引き上げるツールです。

- インクリメンタルビルドで圧倒的な高速化
- リモートキャッシュでチーム全体の効率向上
- シンプルな設定で段階的な導入が可能
- pnpm workspacesと完璧に統合

特に、複数のアプリケーションと共通ライブラリを持つプロジェクトにおいて、開発体験とCI時間の大幅な改善が期待できます。まずは既存のモノレポにTurborepoを導入し、ビルド時間の変化を体感してみてください。
