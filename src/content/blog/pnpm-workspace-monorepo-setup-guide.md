---
title: 'pnpm Workspaceでモノレポ構築ガイド: セットアップからCI/CDまで実践'
description: 'pnpm Workspaceを使ったモノレポの完全セットアップガイド。プロジェクト構成、依存関係管理、共有パッケージ作成、ビルド最適化、CI/CD統合まで実践的に解説'
pubDate: 2025-02-05
tags: ['pnpm', 'Workspace', 'Monorepo', 'CICD', 'DevOps']
---

# pnpm Workspaceでモノレポ構築ガイド: セットアップからCI/CDまで実践

pnpm Workspaceは、モノレポ管理に最適なパッケージマネージャーです。本記事では、プロジェクトのゼロからのセットアップ、効率的な依存関係管理、共有パッケージの作成、CI/CD統合まで、実践的な構築手順を解説します。

## pnpm Workspaceの利点

### 従来の問題点

```
複数リポジトリの課題:
├── app-web/
│   ├── node_modules/ (500MB)
│   └── package.json
├── app-mobile/
│   ├── node_modules/ (500MB)
│   └── package.json
└── shared-ui/
    ├── node_modules/ (500MB)
    └── package.json

問題:
❌ 同じパッケージを3回インストール（1.5GB）
❌ バージョン管理が煩雑
❌ コード共有が困難
❌ 依存関係の重複
❌ ビルド時間が長い
```

### pnpm Workspaceの解決策

```
モノレポの利点:
monorepo/
├── node_modules/        ← 共有依存関係（150MB）
├── pnpm-workspace.yaml
└── packages/
    ├── web/
    ├── mobile/
    └── ui/

メリット:
✅ ディスク容量90%削減（150MB）
✅ 一元的なバージョン管理
✅ 簡単なコード共有
✅ 高速なインストール
✅ 効率的なビルド
```

## プロジェクトセットアップ

### pnpmのインストール

```bash
# npm経由
npm install -g pnpm

# Homebrewの場合
brew install pnpm

# Voltaの場合
volta install pnpm

# バージョン確認
pnpm --version
```

### モノレポの初期化

```bash
# プロジェクトディレクトリ作成
mkdir my-monorepo
cd my-monorepo

# pnpm初期化
pnpm init

# Workspaceファイル作成
cat > pnpm-workspace.yaml << 'EOF'
packages:
  - 'apps/*'
  - 'packages/*'
  - 'services/*'
EOF

# .gitignore作成
cat > .gitignore << 'EOF'
node_modules/
dist/
.turbo/
.next/
.nuxt/
.output/
.vercel/
*.log
.env.local
.DS_Store
EOF
```

### ディレクトリ構造の作成

```bash
# 推奨ディレクトリ構造
mkdir -p apps/web apps/mobile
mkdir -p packages/ui packages/utils packages/config
mkdir -p services/api

# 各パッケージの初期化
cd apps/web && pnpm init && cd ../..
cd apps/mobile && pnpm init && cd ../..
cd packages/ui && pnpm init && cd ../..
cd packages/utils && pnpm init && cd ../..
cd packages/config && pnpm init && cd ../..
cd services/api && pnpm init && cd ../..
```

最終的なディレクトリ構造:

```
my-monorepo/
├── pnpm-workspace.yaml
├── package.json
├── turbo.json
├── .gitignore
├── apps/
│   ├── web/              ← Next.js アプリケーション
│   │   ├── package.json
│   │   ├── next.config.js
│   │   └── src/
│   └── mobile/           ← React Native アプリ
│       ├── package.json
│       └── src/
├── packages/
│   ├── ui/               ← 共有UIコンポーネント
│   │   ├── package.json
│   │   ├── src/
│   │   └── tsconfig.json
│   ├── utils/            ← ユーティリティ関数
│   │   ├── package.json
│   │   └── src/
│   └── config/           ← 共有設定（ESLint、TypeScript等）
│       ├── package.json
│       ├── eslint.js
│       └── tsconfig.json
└── services/
    └── api/              ← バックエンドAPI
        ├── package.json
        └── src/
```

## パッケージの設定

### ルートのpackage.json

```json
{
  "name": "my-monorepo",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "turbo run dev",
    "build": "turbo run build",
    "test": "turbo run test",
    "lint": "turbo run lint",
    "format": "prettier --write \"**/*.{ts,tsx,md}\"",
    "clean": "turbo run clean && rm -rf node_modules"
  },
  "devDependencies": {
    "turbo": "^1.13.0",
    "prettier": "^3.2.5",
    "typescript": "^5.4.0"
  }
}
```

### 共有UIパッケージ

```json
// packages/ui/package.json
{
  "name": "@my-org/ui",
  "version": "1.0.0",
  "main": "./dist/index.js",
  "module": "./dist/index.mjs",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "import": "./dist/index.mjs",
      "require": "./dist/index.js",
      "types": "./dist/index.d.ts"
    },
    "./button": {
      "import": "./dist/button.mjs",
      "require": "./dist/button.js",
      "types": "./dist/button.d.ts"
    }
  },
  "scripts": {
    "build": "tsup src/index.ts --format cjs,esm --dts",
    "dev": "tsup src/index.ts --format cjs,esm --dts --watch",
    "lint": "eslint src/",
    "clean": "rm -rf dist"
  },
  "dependencies": {
    "react": "^18.2.0"
  },
  "devDependencies": {
    "@types/react": "^18.2.0",
    "tsup": "^8.0.0",
    "typescript": "^5.4.0"
  }
}
```

```typescript
// packages/ui/src/button.tsx
export interface ButtonProps {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary';
  onClick?: () => void;
}

export function Button({ children, variant = 'primary', onClick }: ButtonProps) {
  return (
    <button
      className={`btn btn-${variant}`}
      onClick={onClick}
    >
      {children}
    </button>
  );
}
```

```typescript
// packages/ui/src/index.ts
export { Button } from './button';
export type { ButtonProps } from './button';
```

### Webアプリケーション

```json
// apps/web/package.json
{
  "name": "web",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint"
  },
  "dependencies": {
    "next": "14.1.0",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "@my-org/ui": "workspace:*",
    "@my-org/utils": "workspace:*"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "@types/react": "^18.2.0",
    "typescript": "^5.4.0"
  }
}
```

```tsx
// apps/web/src/app/page.tsx
import { Button } from '@my-org/ui';
import { formatDate } from '@my-org/utils';

export default function Home() {
  return (
    <div>
      <h1>My App</h1>
      <Button onClick={() => alert('Clicked!')}>
        Click me
      </Button>
      <p>Today: {formatDate(new Date())}</p>
    </div>
  );
}
```

## 依存関係の管理

### Workspace依存関係の追加

```bash
# ルートに開発依存関係を追加
pnpm add -D -w eslint prettier

# 特定のパッケージに依存関係を追加
pnpm --filter web add next react react-dom

# Workspace内パッケージを依存関係に追加
pnpm --filter web add @my-org/ui --workspace

# すべてのパッケージに追加
pnpm -r add lodash

# 特定のスコープのパッケージに追加
pnpm --filter "./packages/**" add zod
```

### バージョン管理戦略

```yaml
# .npmrc（ルートに配置）
# Workspaceプロトコルの設定
save-workspace-protocol=rolling

# ホイスト設定（依存関係の巻き上げ）
hoist=true
hoist-pattern[]=*eslint*
hoist-pattern[]=*prettier*

# シンボリックリンク設定
shamefully-hoist=false

# ストリクトモード
auto-install-peers=true
strict-peer-dependencies=true
```

### カタログ機能（pnpm 9.0+）

```yaml
# pnpm-workspace.yaml
packages:
  - 'apps/*'
  - 'packages/*'

# 共通依存関係のバージョン管理
catalog:
  react: ^18.2.0
  react-dom: ^18.2.0
  typescript: ^5.4.0
  next: ^14.1.0
  eslint: ^8.57.0
```

```json
// packages/ui/package.json
{
  "dependencies": {
    "react": "catalog:",
    "react-dom": "catalog:"
  }
}
```

## Turborepo統合（ビルド最適化）

### Turborepoのセットアップ

```bash
# Turborepoインストール
pnpm add -D -w turbo

# 初期化
pnpm dlx turbo init
```

### turbo.jsonの設定

```json
{
  "$schema": "https://turbo.build/schema.json",
  "globalDependencies": ["**/.env.*local"],
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**", ".next/**", "!.next/cache/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "lint": {
      "dependsOn": ["^build"]
    },
    "test": {
      "dependsOn": ["^build"],
      "outputs": ["coverage/**"]
    },
    "clean": {
      "cache": false
    }
  }
}
```

### ビルドの実行

```bash
# すべてのパッケージをビルド
pnpm build

# 特定のパッケージのみビルド
pnpm --filter web build

# 並列実行
pnpm -r --parallel build

# 依存関係を含めてビルド
pnpm --filter web... build

# キャッシュをクリア
pnpm turbo run build --force
```

## スクリプトとタスク管理

### 便利なスクリプト

```json
// package.json（ルート）
{
  "scripts": {
    // 開発
    "dev": "turbo run dev --parallel",
    "dev:web": "pnpm --filter web dev",
    "dev:api": "pnpm --filter api dev",

    // ビルド
    "build": "turbo run build",
    "build:web": "pnpm --filter web build",

    // テスト
    "test": "turbo run test",
    "test:watch": "turbo run test:watch",

    // リント・フォーマット
    "lint": "turbo run lint",
    "format": "prettier --write \"**/*.{ts,tsx,js,jsx,json,md}\"",
    "format:check": "prettier --check \"**/*.{ts,tsx,js,jsx,json,md}\"",

    // 依存関係
    "update": "pnpm -r update",
    "outdated": "pnpm -r outdated",

    // クリーンアップ
    "clean": "turbo run clean && rm -rf node_modules .turbo",
    "clean:cache": "rm -rf .turbo"
  }
}
```

## TypeScript設定の共有

### ベース設定

```json
// packages/config/tsconfig.json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "incremental": true
  }
}
```

### 各パッケージで継承

```json
// apps/web/tsconfig.json
{
  "extends": "@my-org/config/tsconfig.json",
  "compilerOptions": {
    "jsx": "preserve",
    "lib": ["dom", "dom.iterable", "esnext"],
    "plugins": [
      {
        "name": "next"
      }
    ]
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

## CI/CDの設定

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
  build:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v3
        with:
          version: 8

      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Lint
        run: pnpm lint

      - name: Type check
        run: pnpm type-check

      - name: Test
        run: pnpm test

      - name: Build
        run: pnpm build

      - name: Cache Turbo
        uses: actions/cache@v4
        with:
          path: .turbo
          key: turbo-${{ runner.os }}-${{ github.sha }}
          restore-keys: |
            turbo-${{ runner.os }}-
```

### デプロイ（Vercel）

```yaml
# .github/workflows/deploy.yml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v3
        with:
          version: 8

      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.ORG_ID }}
          vercel-project-id: ${{ secrets.PROJECT_ID }}
          working-directory: ./apps/web
```

## デバッグとトラブルシューティング

### よくある問題と解決策

```bash
# 依存関係の不整合
pnpm install --force

# キャッシュクリア
pnpm store prune
rm -rf node_modules .pnpm-store

# リンク再構築
pnpm -r exec pnpm rebuild

# 依存関係グラフの確認
pnpm list --depth=2

# なぜこのパッケージがインストールされているか
pnpm why lodash

# 重複パッケージの検出
pnpm dedupe
```

## まとめ

pnpm Workspaceでのモノレポ構築手法を解説しました。

### キーポイント

- **pnpm-workspace.yaml**: Workspaceの定義
- **workspace:***: Workspace内パッケージの参照
- **Turborepo**: 高速なビルド管理
- **共有設定**: TypeScript、ESLint等の統一
- **CI/CD**: 自動化されたワークフロー

### ベストプラクティス

1. **依存関係の管理**: カタログ機能で統一
2. **タスクの並列化**: Turborepoで高速化
3. **キャッシュ活用**: ビルド時間の短縮
4. **型安全性**: TypeScriptの厳格な設定
5. **自動化**: CI/CDパイプラインの構築

pnpm Workspaceで、効率的で保守しやすいモノレポを構築しましょう。
