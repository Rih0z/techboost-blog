---
title: "Monorepo 完全ガイド2026 — Turborepo で大規模プロジェクトを管理する"
description: "Monorepoアーキテクチャの基礎からTurborepoを使った実践的な構成まで完全解説。共有パッケージ、pnpm workspaces、CI/CD最適化の実装例も紹介します。"
pubDate: "2026-02-06"
category: "DevOps"
tags: ["Monorepo", "Turborepo", "pnpm", "ワークスペース", "CI/CD"]
---

大規模なプロジェクトや複数のアプリケーションを管理する際、Monorepo（モノレポ）アーキテクチャは強力な選択肢です。本記事では、Monorepoの基礎からTurborepoを使った実践的な実装まで、体系的に解説します。

## 目次

1. Monorepoとは何か
2. Monorepoのメリット・デメリット
3. Turborepoの概要
4. pnpm Workspaces の基礎
5. Turborepoのセットアップ
6. パッケージ構成とディレクトリ設計
7. 共有パッケージの作成
8. ビルドとキャッシュの最適化
9. CI/CDパイプラインの構築
10. 実践的なMonorepo構成例

## 1. Monorepoとは何か

### Monorepo vs Polyrepo

**Polyrepo（従来のアプローチ）**

```
frontend/         (リポジトリ1)
backend/          (リポジトリ2)
shared-lib/       (リポジトリ3)
mobile-app/       (リポジトリ4)
```

各プロジェクトが独立したリポジトリを持つ。

**Monorepo**

```
my-project/       (単一リポジトリ)
├── apps/
│   ├── frontend/
│   ├── backend/
│   └── mobile-app/
└── packages/
    └── shared-lib/
```

すべてのプロジェクトが1つのリポジトリで管理される。

### Monorepoを採用している企業

- Google（Bazel）
- Facebook/Meta（Buck）
- Microsoft（Rush）
- Vercel（Turborepo）
- Uber
- Twitter

## 2. Monorepoのメリット・デメリット

### メリット

**1. コードの共有が容易**

```typescript
// apps/web/src/components/Button.tsx
import { Button } from '@repo/ui';

// packages/ui/src/Button.tsx のコンポーネントを直接使用
<Button variant="primary">Click me</Button>
```

**2. アトミックなコミット**

```bash
# 1つのコミットで複数のプロジェクトを更新
git commit -m "Add new feature across web and mobile"
# 変更:
# - apps/web/src/features/new-feature.tsx
# - apps/mobile/src/features/new-feature.tsx
# - packages/shared/src/api/new-feature.ts
```

**3. 統一された開発環境**

```json
{
  "name": "monorepo",
  "scripts": {
    "dev": "turbo run dev",
    "build": "turbo run build",
    "test": "turbo run test",
    "lint": "turbo run lint"
  }
}
```

すべてのプロジェクトで同じコマンドを使用。

**4. 依存関係の管理が簡単**

```json
{
  "dependencies": {
    "react": "^18.0.0"
  }
}
```

Reactのバージョンを1箇所で管理。

**5. リファクタリングが容易**

全プロジェクトを一度に更新可能。依存関係の不整合が発生しない。

**6. CI/CDの効率化**

変更されたパッケージのみをビルド・テスト。

### デメリット

**1. リポジトリサイズの増大**

```bash
# クローンに時間がかかる
git clone https://github.com/org/monorepo.git
# サイズ: 数GB〜数十GB
```

**対策**: Git LFS、Sparse Checkout

**2. ビルド時間の増加**

複数プロジェクトのビルドが必要。

**対策**: Turborepoのキャッシュ、並列実行

**3. アクセス制御の複雑化**

全メンバーが全コードにアクセス可能。

**対策**: CODEOWNERSファイル、ブランチ保護

**4. 学習コストの増加**

新しいツールチェーンの習得が必要。

### Monorepoが適している場合

- 複数の関連アプリケーション（Web + モバイル）
- 共有ライブラリが多い
- チーム間のコラボレーションが頻繁
- マイクロフロントエンド
- デザインシステム + アプリケーション

### Polyrepoが適している場合

- 完全に独立したプロジェクト
- 異なるリリースサイクル
- 厳格なアクセス制御が必要
- チームが地理的に分散

## 3. Turborepoの概要

### Turborepoとは

Vercel製の高性能ビルドシステム。Monorepoの課題を解決。

**主な機能**

1. **インクリメンタルビルド**
   - 変更されたパッケージのみビルド

2. **リモートキャッシュ**
   - ビルド結果をクラウドに保存
   - チーム全体で共有

3. **並列実行**
   - 依存関係を解析して並列実行

4. **タスクパイプライン**
   - タスクの実行順序を定義

### Turborepo vs 他のツール

| ツール | 速度 | キャッシュ | 学習コスト | 企業採用 |
|-------|------|----------|----------|---------|
| Turborepo | ⭐⭐⭐⭐⭐ | ローカル+リモート | 低 | Vercel, Netflix |
| Nx | ⭐⭐⭐⭐ | ローカル+リモート | 中 | Google, Microsoft |
| Lerna | ⭐⭐⭐ | なし | 低 | Babel, Jest |
| Rush | ⭐⭐⭐⭐ | ローカル | 高 | Microsoft |

### Turborepoの仕組み

```
1. タスク実行リクエスト
   ↓
2. 依存グラフ解析
   ↓
3. キャッシュチェック
   ↓
4. キャッシュヒット？
   Yes → キャッシュから復元（超高速）
   No → タスク実行 → キャッシュに保存
```

## 4. pnpm Workspaces の基礎

### pnpmとは

高速・効率的なパッケージマネージャー。ディスク容量を節約。

**npm vs pnpm**

```
npm:
node_modules/
├── react/
│   └── node_modules/
│       └── prop-types/  (重複)
└── react-dom/
    └── node_modules/
        └── prop-types/  (重複)

pnpm:
node_modules/
├── .pnpm/
│   ├── react@18.0.0/
│   └── prop-types@15.8.0/  (1つだけ)
└── react -> .pnpm/react@18.0.0/
```

### pnpm Workspaces 設定

```yaml
# pnpm-workspace.yaml
packages:
  - 'apps/*'
  - 'packages/*'
  - 'tools/*'
```

### ルートのpackage.json

```json
{
  "name": "monorepo",
  "private": true,
  "version": "0.0.0",
  "packageManager": "pnpm@8.15.0",
  "engines": {
    "node": ">=18.0.0",
    "pnpm": ">=8.0.0"
  },
  "scripts": {
    "dev": "turbo run dev",
    "build": "turbo run build",
    "test": "turbo run test",
    "lint": "turbo run lint",
    "format": "prettier --write \"**/*.{ts,tsx,md}\""
  },
  "devDependencies": {
    "turbo": "^1.12.0",
    "prettier": "^3.2.0",
    "typescript": "^5.3.0"
  }
}
```

### ワークスペース間の依存関係

```json
// apps/web/package.json
{
  "name": "@repo/web",
  "dependencies": {
    "@repo/ui": "workspace:*",
    "@repo/utils": "workspace:*",
    "react": "^18.0.0"
  }
}
```

`workspace:*` でローカルパッケージを参照。

## 5. Turborepoのセットアップ

### プロジェクト作成

```bash
# Turborepoテンプレートから作成
npx create-turbo@latest

# または手動セットアップ
mkdir my-monorepo
cd my-monorepo
pnpm init
```

### ディレクトリ構造

```
my-monorepo/
├── apps/
│   ├── web/              # Next.js アプリ
│   ├── docs/             # ドキュメントサイト
│   └── api/              # Express API
├── packages/
│   ├── ui/               # UIコンポーネント
│   ├── utils/            # ユーティリティ関数
│   ├── tsconfig/         # TypeScript設定
│   └── eslint-config/    # ESLint設定
├── turbo.json
├── package.json
├── pnpm-workspace.yaml
└── .gitignore
```

### Turborepo設定（turbo.json）

```json
{
  "$schema": "https://turbo.build/schema.json",
  "globalDependencies": [".env", "tsconfig.json"],
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": [".next/**", "dist/**", "build/**"],
      "env": ["NODE_ENV"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "test": {
      "dependsOn": ["build"],
      "outputs": ["coverage/**"],
      "inputs": ["src/**/*.tsx", "src/**/*.ts", "test/**/*.ts"]
    },
    "lint": {
      "dependsOn": ["^lint"]
    },
    "type-check": {
      "dependsOn": ["^type-check"]
    }
  }
}
```

**設定の説明**

- `dependsOn`: 依存タスク（`^` は依存パッケージのタスク）
- `outputs`: キャッシュ対象のファイル
- `cache`: キャッシュの有効化
- `inputs`: 入力ファイル（変更検出用）
- `persistent`: 継続実行タスク（dev サーバーなど）

### 基本コマンド

```bash
# 開発サーバー起動（全アプリ）
pnpm dev

# ビルド（全パッケージ）
pnpm build

# テスト（全パッケージ）
pnpm test

# 特定パッケージのみ実行
pnpm --filter @repo/web dev
pnpm --filter @repo/ui build

# 複数パッケージを指定
pnpm --filter "@repo/web" --filter "@repo/api" dev
```

## 6. パッケージ構成とディレクトリ設計

### Next.js アプリケーション（apps/web）

```
apps/web/
├── src/
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   └── api/
│   ├── components/
│   └── lib/
├── public/
├── package.json
├── tsconfig.json
└── next.config.js
```

```json
// apps/web/package.json
{
  "name": "@repo/web",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "type-check": "tsc --noEmit"
  },
  "dependencies": {
    "@repo/ui": "workspace:*",
    "@repo/utils": "workspace:*",
    "next": "14.1.0",
    "react": "^18.2.0",
    "react-dom": "^18.2.0"
  },
  "devDependencies": {
    "@repo/typescript-config": "workspace:*",
    "@repo/eslint-config": "workspace:*",
    "@types/node": "^20",
    "@types/react": "^18",
    "@types/react-dom": "^18",
    "typescript": "^5.3.0"
  }
}
```

### UIパッケージ（packages/ui）

```
packages/ui/
├── src/
│   ├── Button.tsx
│   ├── Input.tsx
│   ├── Card.tsx
│   └── index.ts
├── package.json
├── tsconfig.json
└── tailwind.config.ts
```

```typescript
// packages/ui/src/Button.tsx
import { ButtonHTMLAttributes, forwardRef } from 'react';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline';
  size?: 'sm' | 'md' | 'lg';
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', className, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={`btn btn-${variant} btn-${size} ${className}`}
        {...props}
      >
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';
```

```typescript
// packages/ui/src/index.ts
export * from './Button';
export * from './Input';
export * from './Card';
```

```json
// packages/ui/package.json
{
  "name": "@repo/ui",
  "version": "0.0.1",
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "exports": {
    ".": "./src/index.ts"
  },
  "scripts": {
    "lint": "eslint src/",
    "type-check": "tsc --noEmit"
  },
  "peerDependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0"
  },
  "devDependencies": {
    "@repo/typescript-config": "workspace:*",
    "@repo/eslint-config": "workspace:*",
    "@types/react": "^18",
    "@types/react-dom": "^18",
    "typescript": "^5.3.0"
  }
}
```

### ユーティリティパッケージ（packages/utils）

```typescript
// packages/utils/src/format.ts
export function formatCurrency(amount: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency
  }).format(amount);
}

export function formatDate(date: Date | string, format = 'long'): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('en-US', {
    dateStyle: format as 'long'
  }).format(d);
}
```

```typescript
// packages/utils/src/validation.ts
export function isEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export function isStrongPassword(password: string): boolean {
  // 8文字以上、大文字・小文字・数字・記号を含む
  const strongPasswordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
  return strongPasswordRegex.test(password);
}
```

```typescript
// packages/utils/src/index.ts
export * from './format';
export * from './validation';
```

### 共有TypeScript設定（packages/tsconfig）

```json
// packages/tsconfig/base.json
{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "resolveJsonModule": true,
    "allowJs": true,
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "incremental": true,
    "isolatedModules": true,
    "jsx": "preserve"
  },
  "exclude": ["node_modules"]
}
```

```json
// packages/tsconfig/nextjs.json
{
  "extends": "./base.json",
  "compilerOptions": {
    "plugins": [{ "name": "next" }],
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

### 共有ESLint設定（packages/eslint-config）

```javascript
// packages/eslint-config/next.js
module.exports = {
  extends: [
    'next/core-web-vitals',
    'plugin:@typescript-eslint/recommended',
    'prettier'
  ],
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint'],
  rules: {
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    '@typescript-eslint/no-explicit-any': 'warn'
  }
};
```

## 7. 共有パッケージの作成

### デザインシステムパッケージ

```
packages/design-system/
├── src/
│   ├── components/
│   │   ├── Button/
│   │   │   ├── Button.tsx
│   │   │   ├── Button.test.tsx
│   │   │   └── index.ts
│   │   ├── Input/
│   │   └── index.ts
│   ├── hooks/
│   │   ├── useMediaQuery.ts
│   │   └── index.ts
│   ├── utils/
│   │   ├── cn.ts
│   │   └── index.ts
│   └── index.ts
├── package.json
└── tsconfig.json
```

```typescript
// packages/design-system/src/utils/cn.ts
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

```typescript
// packages/design-system/src/components/Button/Button.tsx
import { ButtonHTMLAttributes, forwardRef } from 'react';
import { cn } from '../../utils';

const buttonVariants = {
  variant: {
    primary: 'bg-blue-600 text-white hover:bg-blue-700',
    secondary: 'bg-gray-600 text-white hover:bg-gray-700',
    outline: 'border border-gray-300 hover:bg-gray-50'
  },
  size: {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg'
  }
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: keyof typeof buttonVariants.variant;
  size?: keyof typeof buttonVariants.size;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', className, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          'rounded-md font-medium transition-colors',
          buttonVariants.variant[variant],
          buttonVariants.size[size],
          className
        )}
        {...props}
      />
    );
  }
);

Button.displayName = 'Button';
```

### API クライアントパッケージ

```typescript
// packages/api-client/src/client.ts
export class APIClient {
  private baseUrl: string;
  private token: string | null = null;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  setToken(token: string) {
    this.token = token;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...(this.token && { Authorization: `Bearer ${this.token}` }),
      ...options.headers
    };

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.statusText}`);
    }

    return response.json();
  }

  async get<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'GET' });
  }

  async post<T>(endpoint: string, data: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async put<T>(endpoint: string, data: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }

  async delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }
}
```

```typescript
// packages/api-client/src/services/users.ts
import { APIClient } from '../client';

export interface User {
  id: string;
  name: string;
  email: string;
}

export class UsersService {
  constructor(private client: APIClient) {}

  async getUsers(): Promise<User[]> {
    return this.client.get<User[]>('/users');
  }

  async getUser(id: string): Promise<User> {
    return this.client.get<User>(`/users/${id}`);
  }

  async createUser(data: Omit<User, 'id'>): Promise<User> {
    return this.client.post<User>('/users', data);
  }
}
```

## 8. ビルドとキャッシュの最適化

### キャッシュ戦略

```json
// turbo.json
{
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": [".next/**", "dist/**"],
      "env": ["NODE_ENV", "NEXT_PUBLIC_API_URL"]
    }
  }
}
```

**キャッシュのヒット条件**

1. タスク名が同じ
2. 入力ファイルのハッシュが同じ
3. 環境変数が同じ
4. 依存タスクのハッシュが同じ

### リモートキャッシュの設定

```bash
# Vercel Remote Cache（無料）
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

### 並列実行の最適化

```json
// turbo.json
{
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": [".next/**"]
    },
    "test": {
      "dependsOn": ["build"],
      "cache": true
    },
    "lint": {
      "cache": true
    }
  }
}
```

実行順序:
```
1. lint + ui:build（並列）
2. web:build（ui:buildの後）
3. test（buildの後）
```

### ビルド高速化のTips

**1. 増分ビルドの活用**

```json
{
  "compilerOptions": {
    "incremental": true,
    "tsBuildInfoFile": ".tsbuildinfo"
  }
}
```

**2. SWCの使用（Next.js）**

```javascript
// next.config.js
module.exports = {
  swcMinify: true
};
```

**3. pnpm の並列インストール**

```bash
pnpm install --parallel
```

## 9. CI/CDパイプラインの構築

### GitHub Actions の設定

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
        with:
          fetch-depth: 2

      - uses: pnpm/action-setup@v2
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
        run: pnpm lint

      - name: Type check
        run: pnpm type-check

      - name: Test
        run: pnpm test

      - name: Build
        run: pnpm build
        env:
          TURBO_TOKEN: ${{ secrets.TURBO_TOKEN }}
          TURBO_TEAM: ${{ vars.TURBO_TEAM }}
```

### 変更検出によるスキップ

```yaml
# 変更されたパッケージのみビルド
- name: Build
  run: pnpm turbo run build --filter="...[HEAD^]"
```

### マトリックスビルド

```yaml
jobs:
  build:
    strategy:
      matrix:
        node-version: [18, 20, 21]
        os: [ubuntu-latest, windows-latest, macos-latest]

    runs-on: ${{ matrix.os }}

    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
      - name: Setup Node ${{ matrix.node-version }}
        uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node-version }}
```

### デプロイパイプライン

```yaml
# .github/workflows/deploy.yml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  deploy-web:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'

      - run: pnpm install --frozen-lockfile

      - name: Build
        run: pnpm turbo run build --filter=@repo/web
        env:
          TURBO_TOKEN: ${{ secrets.TURBO_TOKEN }}
          TURBO_TEAM: ${{ vars.TURBO_TEAM }}

      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          working-directory: ./apps/web
```

## 10. 実践的なMonorepo構成例

### フルスタックアプリケーション

```
my-monorepo/
├── apps/
│   ├── web/                    # Next.js (顧客向け)
│   ├── admin/                  # Next.js (管理画面)
│   ├── mobile/                 # React Native
│   └── api/                    # Express.js API
├── packages/
│   ├── ui/                     # UIコンポーネント
│   ├── design-system/          # デザインシステム
│   ├── api-client/             # API クライアント
│   ├── database/               # Prismaスキーマ
│   ├── auth/                   # 認証ロジック
│   ├── utils/                  # ユーティリティ
│   ├── types/                  # 型定義
│   ├── tsconfig/               # TypeScript設定
│   └── eslint-config/          # ESLint設定
├── turbo.json
├── package.json
└── pnpm-workspace.yaml
```

### マイクロフロントエンド

```
ecommerce-monorepo/
├── apps/
│   ├── shell/                  # シェルアプリ（Next.js）
│   ├── product-catalog/        # 商品カタログMFE
│   ├── shopping-cart/          # カートMFE
│   ├── checkout/               # チェックアウトMFE
│   └── user-profile/           # ユーザープロフィールMFE
├── packages/
│   ├── shared-ui/              # 共通UI
│   ├── router/                 # ルーティング
│   └── mfe-utils/              # MFEユーティリティ
└── turbo.json
```

### 完全な設定例

```json
// turbo.json
{
  "$schema": "https://turbo.build/schema.json",
  "globalDependencies": [
    ".env",
    "tsconfig.json",
    "turbo.json"
  ],
  "globalEnv": [
    "NODE_ENV",
    "CI"
  ],
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": [
        ".next/**",
        "!.next/cache/**",
        "dist/**",
        "build/**"
      ],
      "env": [
        "NEXT_PUBLIC_API_URL",
        "DATABASE_URL"
      ]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "test": {
      "dependsOn": ["^build"],
      "outputs": ["coverage/**"],
      "cache": true
    },
    "lint": {
      "cache": true,
      "outputs": []
    },
    "type-check": {
      "dependsOn": ["^build"],
      "cache": true,
      "outputs": []
    },
    "clean": {
      "cache": false
    }
  }
}
```

```yaml
# pnpm-workspace.yaml
packages:
  - 'apps/*'
  - 'packages/*'
  - 'tools/*'
```

```json
// package.json (root)
{
  "name": "my-monorepo",
  "private": true,
  "version": "0.0.0",
  "packageManager": "pnpm@8.15.0",
  "engines": {
    "node": ">=18.0.0",
    "pnpm": ">=8.0.0"
  },
  "scripts": {
    "dev": "turbo run dev",
    "build": "turbo run build",
    "test": "turbo run test",
    "lint": "turbo run lint",
    "type-check": "turbo run type-check",
    "format": "prettier --write \"**/*.{ts,tsx,md,json}\"",
    "clean": "turbo run clean && rm -rf node_modules"
  },
  "devDependencies": {
    "@turbo/gen": "^1.12.0",
    "prettier": "^3.2.0",
    "turbo": "^1.12.0",
    "typescript": "^5.3.0"
  }
}
```

## まとめ

Monorepo + Turborepoによるプロジェクト管理の要点。

**成功のポイント**

1. **適切なパッケージ分割**
   - 責務を明確に
   - 再利用可能な単位で分ける

2. **効果的なキャッシュ活用**
   - リモートキャッシュの設定
   - 適切な outputs 定義

3. **CI/CDの最適化**
   - 変更検出による部分ビルド
   - 並列実行の活用

4. **チーム規約の整備**
   - コード規約の共有
   - コミットルール
   - リリースフロー

**よくある落とし穴**

- パッケージ分割しすぎ
- 循環依存の発生
- キャッシュ設定のミス
- 過度な共有化

Turborepo + pnpm の組み合わせで、大規模プロジェクトを効率的に管理できます。本記事のベストプラクティスを参考に、最適なMonorepo環境を構築してください。

## 参考リンク

- [Turborepo Documentation](https://turbo.build/repo/docs)
- [pnpm Workspaces](https://pnpm.io/workspaces)
- [Monorepo Tools Comparison](https://monorepo.tools/)
- [Vercel Remote Cache](https://vercel.com/docs/concepts/monorepos/remote-caching)
