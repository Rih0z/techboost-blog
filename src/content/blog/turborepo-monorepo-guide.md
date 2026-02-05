---
title: 'Turborepo完全ガイド - モノレポ管理の決定版'
description: 'TurborepoでモノレポをマスターTurborepoでモノレポを完全マスター。キャッシング、タスクパイプライン、リモートキャッシュ、CI最適化まで実践的に解説します。'
pubDate: 'Feb 05 2026'
tags: ['Turborepo', 'Monorepo', 'Build', 'Performance']
---

# Turborepo完全ガイド - モノレポ管理の決定版

モノレポ（Monorepo）は、複数のプロジェクトを単一のリポジトリで管理する手法です。Turborepoは、Vercelが開発した高速なビルドシステムで、モノレポの複雑さを解消し、圧倒的なパフォーマンスを実現します。

この記事では、Turborepoの基本から実践的な構築方法、最適化テクニックまで、実務で必要な知識を網羅的に解説します。

## Turborepoとは

Turborepoは、Vercelが買収・開発している高性能なビルドシステムです。元々はJared Palmerが個人プロジェクトとして開発し、2021年にVercelに買収されました。

### Turborepoの特徴

1. **インクリメンタルビルド**
   - 変更されたパッケージのみビルド
   - 過去のビルド結果をキャッシュ
   - リモートキャッシュで CI 実行を高速化

2. **タスクパイプライン**
   - 依存関係を考慮した並列実行
   - タスクの依存グラフを自動生成
   - 最適な実行順序を自動決定

3. **ゼロコンフィグ**
   - 最小限の設定で動作
   - 既存のモノレポに簡単に導入可能
   - npm/yarn/pnpm すべてに対応

4. **開発者体験**
   - 高速なビルド時間
   - 詳細なログ出力
   - VS Code 統合

### Lerna/Nx との比較

| 特徴 | Turborepo | Lerna | Nx |
|------|-----------|-------|-----|
| ビルドキャッシュ | 強力 | なし | あり |
| リモートキャッシュ | あり（標準） | なし | あり（有料） |
| タスク並列実行 | 自動最適化 | 基本的 | 高度 |
| 設定の複雑さ | シンプル | シンプル | 複雑 |
| パッケージマネージャー | すべて対応 | npm/yarn | すべて対応 |
| 学習コスト | 低い | 低い | 高い |

## インストールとセットアップ

### 新規モノレポの作成

```bash
# npm
npx create-turbo@latest

# pnpm（推奨）
pnpm dlx create-turbo@latest

# yarn
yarn dlx create-turbo@latest
```

対話式のプロンプトで以下を選択します。

```
? Where would you like to create your turborepo? my-turborepo
? Which package manager do you want to use? pnpm
```

生成されるディレクトリ構造:

```
my-turborepo/
├── apps/
│   ├── web/           # Next.js アプリ
│   └── docs/          # ドキュメントサイト
├── packages/
│   ├── ui/            # 共有UIコンポーネント
│   ├── config-eslint/ # ESLint設定
│   └── config-typescript/ # TypeScript設定
├── turbo.json         # Turborepo設定
├── package.json
└── pnpm-workspace.yaml # pnpm workspaces設定
```

### 既存プロジェクトへの導入

```bash
# Turborepoをインストール
npm install turbo --save-dev

# 設定ファイルを作成
touch turbo.json
```

## 基本的な設定

### turbo.json

Turborepoの中心的な設定ファイルです。

```json
{
  "$schema": "https://turbo.build/schema.json",
  "globalDependencies": [".env"],
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": [".next/**", "!.next/cache/**", "dist/**"]
    },
    "test": {
      "dependsOn": ["build"],
      "outputs": ["coverage/**"]
    },
    "lint": {
      "outputs": []
    },
    "dev": {
      "cache": false,
      "persistent": true
    }
  }
}
```

### pnpm workspaces（pnpm-workspace.yaml）

```yaml
packages:
  - "apps/*"
  - "packages/*"
```

### ルート package.json

```json
{
  "name": "my-turborepo",
  "private": true,
  "scripts": {
    "build": "turbo build",
    "dev": "turbo dev",
    "lint": "turbo lint",
    "test": "turbo test"
  },
  "devDependencies": {
    "turbo": "^1.11.0"
  },
  "packageManager": "pnpm@8.15.0"
}
```

## パイプライン設定

パイプラインは、Turborepoの最も重要な概念です。タスクの依存関係と実行順序を定義します。

### 基本的なタスク定義

```json
{
  "pipeline": {
    "build": {
      "outputs": ["dist/**", ".next/**"]
    }
  }
}
```

- `"build"`: タスク名（package.jsonのscriptと対応）
- `"outputs"`: ビルド成果物のパス（キャッシュ対象）

### 依存関係の定義

#### `dependsOn`: 前提タスク

```json
{
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**"]
    },
    "test": {
      "dependsOn": ["build"],
      "outputs": ["coverage/**"]
    }
  }
}
```

- `"^build"`: 依存パッケージのbuildタスクが完了してから実行
- `"build"`: 同じパッケージ内のbuildタスクが完了してから実行

#### 複数の依存関係

```json
{
  "pipeline": {
    "deploy": {
      "dependsOn": ["build", "test", "lint"],
      "outputs": []
    }
  }
}
```

### キャッシュ設定

#### outputs: キャッシュ対象ファイル

```json
{
  "pipeline": {
    "build": {
      "outputs": [
        "dist/**",
        ".next/**",
        "!.next/cache/**"  // 除外パターン
      ]
    }
  }
}
```

#### cache: キャッシュの有効/無効

```json
{
  "pipeline": {
    "dev": {
      "cache": false,  // 開発サーバーはキャッシュしない
      "persistent": true
    }
  }
}
```

### 環境変数の管理

#### globalDependencies

すべてのタスクに影響する依存ファイルを指定します。

```json
{
  "globalDependencies": [
    ".env",
    ".env.local",
    "tsconfig.json"
  ]
}
```

これらのファイルが変更されると、すべてのキャッシュが無効になります。

#### タスク固有の環境変数

```json
{
  "pipeline": {
    "build": {
      "env": ["NODE_ENV", "API_URL"],
      "outputs": ["dist/**"]
    }
  }
}
```

指定した環境変数が変わると、そのタスクのキャッシュが無効になります。

## パッケージ構成

### 内部パッケージの作成

```bash
mkdir -p packages/shared-utils
cd packages/shared-utils
pnpm init
```

```json
// packages/shared-utils/package.json
{
  "name": "@repo/shared-utils",
  "version": "0.0.0",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "scripts": {
    "build": "tsc",
    "dev": "tsc --watch"
  }
}
```

```typescript
// packages/shared-utils/src/index.ts
export function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

export function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}
```

### アプリからの利用

```json
// apps/web/package.json
{
  "name": "web",
  "dependencies": {
    "@repo/shared-utils": "workspace:*"
  }
}
```

```typescript
// apps/web/src/app/page.tsx
import { formatDate, capitalize } from '@repo/shared-utils';

export default function Page() {
  return (
    <div>
      <p>{formatDate(new Date())}</p>
      <p>{capitalize('hello world')}</p>
    </div>
  );
}
```

### TypeScript設定の共有

```json
// packages/config-typescript/base.json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "lib": ["ES2020"],
    "moduleResolution": "bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true
  }
}
```

```json
// apps/web/tsconfig.json
{
  "extends": "@repo/config-typescript/base.json",
  "compilerOptions": {
    "lib": ["dom", "dom.iterable", "ES2020"],
    "jsx": "preserve"
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules"]
}
```

## タスクの実行

### すべてのパッケージでタスク実行

```bash
# すべてのパッケージでビルド
pnpm turbo build

# すべてのパッケージでテスト
pnpm turbo test

# すべてのパッケージでlint
pnpm turbo lint
```

### 特定のパッケージのみ

```bash
# --filter オプション
pnpm turbo build --filter=web

# 複数指定
pnpm turbo build --filter=web --filter=docs

# ワイルドカード
pnpm turbo build --filter=@repo/*
```

### 依存関係を含めて実行

```bash
# webとその依存パッケージをビルド
pnpm turbo build --filter=web...

# webに依存するパッケージをビルド
pnpm turbo build --filter=...web
```

### 並列実行の制御

```bash
# 並列数を指定
pnpm turbo build --concurrency=3

# 逐次実行
pnpm turbo build --concurrency=1

# CPUコア数に応じて自動調整（デフォルト）
pnpm turbo build
```

### キャッシュの制御

```bash
# キャッシュを無視して実行
pnpm turbo build --force

# キャッシュを使わずに実行（書き込みはする）
pnpm turbo build --no-cache
```

## キャッシング

Turborepoの最大の特徴は、高度なキャッシングシステムです。

### ローカルキャッシュ

デフォルトで、Turborepoはビルド結果を `.turbo/cache/` に保存します。

```bash
# 初回ビルド
pnpm turbo build
# >>> FULL TURBO

# 2回目（キャッシュヒット）
pnpm turbo build
# >>> cache hit, replaying output
```

### キャッシュキーの仕組み

Turborepoは以下の要素からキャッシュキーを生成します。

1. **タスク名**
2. **パッケージのソースコード**（gitのハッシュを利用）
3. **依存パッケージのハッシュ**
4. **環境変数**（`env`で指定したもの）
5. **グローバル依存ファイル**（`globalDependencies`）

いずれかが変更されると、キャッシュが無効になります。

### キャッシュの確認

```bash
# 詳細ログでキャッシュ状態を確認
pnpm turbo build --verbosity=2

# 出力例:
# • Packages in scope: @repo/ui, web
# • Running build in 2 packages
# • Remote caching disabled
#
# @repo/ui:build: cache hit, replaying output
# web:build: cache miss, executing
```

### キャッシュのクリア

```bash
# ローカルキャッシュをクリア
rm -rf .turbo/cache

# または
pnpm turbo build --force
```

## リモートキャッシュ

リモートキャッシュを使うと、チーム全体でキャッシュを共有できます。CI環境でのビルド時間を劇的に短縮できます。

### Vercelリモートキャッシュ（無料）

```bash
# Vercelにログイン
pnpm dlx turbo login

# リンク
pnpm dlx turbo link

# リモートキャッシュを有効化
pnpm turbo build
```

設定後、チーム全体でキャッシュが共有されます。

### セルフホストリモートキャッシュ

自前のサーバーでリモートキャッシュを運用することも可能です。

```json
// turbo.json
{
  "remoteCache": {
    "enabled": true,
    "url": "https://my-cache-server.com",
    "token": "your-token"
  }
}
```

### 環境変数での設定

```bash
# .env
TURBO_API="https://my-cache-server.com"
TURBO_TOKEN="your-token"
TURBO_TEAM="my-team"
```

## 実践的なモノレポ構成

### Next.js + Express + 共有ライブラリ

```
my-monorepo/
├── apps/
│   ├── web/               # Next.js フロントエンド
│   │   ├── src/
│   │   ├── package.json
│   │   └── next.config.js
│   └── api/               # Express バックエンド
│       ├── src/
│       ├── package.json
│       └── tsconfig.json
├── packages/
│   ├── ui/                # 共有UIコンポーネント
│   │   ├── src/
│   │   │   ├── Button.tsx
│   │   │   ├── Input.tsx
│   │   │   └── index.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   ├── database/          # Prismaスキーマ
│   │   ├── prisma/
│   │   │   └── schema.prisma
│   │   ├── package.json
│   │   └── tsconfig.json
│   ├── shared-types/      # 共有型定義
│   │   ├── src/
│   │   │   └── index.ts
│   │   └── package.json
│   └── config/            # 共有設定
│       ├── eslint/
│       └── typescript/
├── turbo.json
├── package.json
└── pnpm-workspace.yaml
```

### turbo.json の設定例

```json
{
  "$schema": "https://turbo.build/schema.json",
  "globalDependencies": [".env"],
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": [
        "dist/**",
        ".next/**",
        "!.next/cache/**"
      ]
    },
    "db:generate": {
      "cache": false
    },
    "db:push": {
      "cache": false
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "lint": {
      "dependsOn": ["^build"],
      "outputs": []
    },
    "test": {
      "dependsOn": ["^build"],
      "outputs": ["coverage/**"]
    },
    "type-check": {
      "dependsOn": ["^build"],
      "outputs": []
    }
  }
}
```

### ルート package.json

```json
{
  "name": "my-monorepo",
  "private": true,
  "scripts": {
    "build": "turbo build",
    "dev": "turbo dev",
    "lint": "turbo lint",
    "test": "turbo test",
    "type-check": "turbo type-check",
    "db:generate": "turbo db:generate",
    "db:push": "turbo db:push",
    "clean": "turbo clean && rm -rf node_modules"
  },
  "devDependencies": {
    "@repo/config-eslint": "workspace:*",
    "@repo/config-typescript": "workspace:*",
    "turbo": "^1.11.0"
  },
  "packageManager": "pnpm@8.15.0",
  "engines": {
    "node": ">=18"
  }
}
```

## 共有パッケージの実装例

### UIコンポーネントライブラリ

```typescript
// packages/ui/src/Button.tsx
import { ReactNode } from 'react';

export interface ButtonProps {
  children: ReactNode;
  variant?: 'primary' | 'secondary';
  onClick?: () => void;
}

export function Button({ children, variant = 'primary', onClick }: ButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`btn btn-${variant}`}
    >
      {children}
    </button>
  );
}
```

```typescript
// packages/ui/src/index.ts
export { Button } from './Button';
export type { ButtonProps } from './Button';
export { Input } from './Input';
export type { InputProps } from './Input';
```

```json
// packages/ui/package.json
{
  "name": "@repo/ui",
  "version": "0.0.0",
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "scripts": {
    "lint": "eslint .",
    "type-check": "tsc --noEmit"
  },
  "devDependencies": {
    "@repo/config-eslint": "workspace:*",
    "@repo/config-typescript": "workspace:*",
    "@types/react": "^18.2.0",
    "react": "^18.2.0"
  },
  "peerDependencies": {
    "react": "^18.2.0"
  }
}
```

### 共有型定義

```typescript
// packages/shared-types/src/index.ts
export interface User {
  id: string;
  name: string;
  email: string;
  createdAt: Date;
}

export interface Post {
  id: string;
  title: string;
  content: string;
  authorId: string;
  createdAt: Date;
}

export type ApiResponse<T> = {
  success: true;
  data: T;
} | {
  success: false;
  error: string;
};
```

### データベースパッケージ

```typescript
// packages/database/src/index.ts
import { PrismaClient } from '@prisma/client';

const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: ['query'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
```

```json
// packages/database/package.json
{
  "name": "@repo/database",
  "version": "0.0.0",
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "scripts": {
    "db:generate": "prisma generate",
    "db:push": "prisma db push",
    "db:studio": "prisma studio"
  },
  "dependencies": {
    "@prisma/client": "^5.8.0"
  },
  "devDependencies": {
    "prisma": "^5.8.0"
  }
}
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
  build:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v2
        with:
          version: 8

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'pnpm'

      - name: Install dependencies
        run: pnpm install

      - name: Build
        run: pnpm turbo build
        env:
          TURBO_TOKEN: ${{ secrets.TURBO_TOKEN }}
          TURBO_TEAM: ${{ vars.TURBO_TEAM }}

      - name: Lint
        run: pnpm turbo lint

      - name: Test
        run: pnpm turbo test

      - name: Type check
        run: pnpm turbo type-check
```

### リモートキャッシュの設定

```yaml
- name: Build
  run: pnpm turbo build
  env:
    TURBO_TOKEN: ${{ secrets.TURBO_TOKEN }}
    TURBO_TEAM: ${{ vars.TURBO_TEAM }}
    TURBO_REMOTE_ONLY: true  # ローカルキャッシュを使わない
```

### 変更されたパッケージのみビルド

```yaml
- name: Build affected packages
  run: pnpm turbo build --filter=[HEAD^1]
```

## パフォーマンス最適化

### 1. 並列実行の最大化

```json
{
  "pipeline": {
    "lint": {
      "outputs": []  // dependsOnを指定しない → 並列実行
    },
    "type-check": {
      "outputs": []  // 並列実行
    },
    "test": {
      "outputs": ["coverage/**"]  // 並列実行
    }
  }
}
```

### 2. outputs の適切な指定

```json
{
  "pipeline": {
    "build": {
      "outputs": [
        "dist/**",
        ".next/**",
        "!.next/cache/**",  // キャッシュディレクトリは除外
        "!**/*.map"          // ソースマップも除外可能
      ]
    }
  }
}
```

### 3. 環境変数の適切な管理

```json
{
  "pipeline": {
    "build": {
      "env": [
        "NEXT_PUBLIC_API_URL",  // ビルドに影響する環境変数のみ指定
        "NODE_ENV"
      ],
      "outputs": ["dist/**"]
    }
  }
}
```

### 4. タスクの分割

```json
{
  "pipeline": {
    "build:lib": {
      "outputs": ["dist/**"]
    },
    "build:app": {
      "dependsOn": ["^build:lib"],
      "outputs": [".next/**"]
    }
  }
}
```

## ベストプラクティス

### 1. パッケージ命名規則

```
@repo/ui
@repo/database
@repo/shared-types
@repo/config-eslint
@repo/config-typescript
```

- `@repo/` プレフィックスで統一
- 内部パッケージであることを明示

### 2. 依存関係の管理

```json
// packages/ui/package.json
{
  "dependencies": {
    // 実際に使う依存
  },
  "devDependencies": {
    "@repo/config-eslint": "workspace:*",
    "@repo/config-typescript": "workspace:*"
  },
  "peerDependencies": {
    "react": "^18.2.0"  // ホストアプリが提供すべき依存
  }
}
```

### 3. エクスポートの整理

```typescript
// packages/ui/src/index.ts
// 明示的にエクスポート
export { Button } from './Button';
export type { ButtonProps } from './Button';
export { Input } from './Input';
export type { InputProps } from './Input';

// 内部実装は非公開
```

### 4. ビルド成果物の配置

```
packages/ui/
├── src/           # ソースコード
├── dist/          # ビルド成果物（gitignore）
├── package.json
└── tsconfig.json
```

### 5. changesets による バージョン管理

```bash
pnpm add -Dw @changesets/cli
pnpm changeset init
```

```bash
# 変更を追加
pnpm changeset

# バージョンを更新
pnpm changeset version

# 公開
pnpm changeset publish
```

## トラブルシューティング

### キャッシュが効かない

```bash
# デバッグモードで実行
pnpm turbo build --verbosity=2

# キャッシュキーを確認
# 変更されている要素を特定
```

### ビルドが遅い

```bash
# ボトルネックを特定
pnpm turbo build --profile=profile.json

# Chrome DevToolsで分析
# chrome://tracing/ で profile.json を開く
```

### 依存関係のエラー

```bash
# 依存関係を再インストール
pnpm install --frozen-lockfile=false

# キャッシュをクリア
pnpm store prune
```

### TypeScript の型エラー

```bash
# 型定義を再生成
pnpm turbo db:generate --force

# 型チェック
pnpm turbo type-check
```

## まとめ

Turborepoは、モノレポ管理を劇的に効率化する強力なツールです。

### Turborepoの主な利点

1. **圧倒的な高速化**: キャッシングとインクリメンタルビルド
2. **シンプルな設定**: 最小限の設定で強力な機能
3. **チーム協業**: リモートキャッシュでCI時間を短縮
4. **柔軟性**: npm/yarn/pnpm すべてに対応
5. **スケーラビリティ**: 小規模から大規模まで対応

### 採用事例

- **Vercel**: 自社プロダクトで使用
- **Netflix**: モノレポ管理に採用
- **Disney+**: ビルドシステムとして利用
- **その他多数の企業**: Next.js、React プロジェクトで広く採用

Turborepoをマスターすることで、モノレポの複雑さを解消し、開発者体験と生産性を大幅に向上させることができます。
