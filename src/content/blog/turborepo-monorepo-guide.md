---
title: 'Turborepo完全ガイド — モノレポ構築・共有パッケージ・CI/CD最適化'
description: 'Turborepoでモノレポを構築する実践ガイド。ワークスペース設定・共有UIコンポーネント・共有設定・タスクパイプライン・リモートキャッシュ・GitHub Actions統合まで実装例付きで解説。'
pubDate: 'Feb 20 2026'
heroImage: '../../assets/blog-placeholder-4.jpg'
---

モノレポは複数のアプリケーションやパッケージを単一リポジトリで管理するアーキテクチャだ。Vercel が開発した **Turborepo** は、このモノレポ運用を劇的に高速化するビルドシステムである。タスクの並列実行・インクリメンタルキャッシュ・リモートキャッシュを組み合わせ、大規模なコードベースでも CI ビルドを数分から数秒に短縮できる。

本記事では pnpm ワークスペースと Turborepo を組み合わせた実践的なモノレポ構築を、設定ファイルのサンプルコードを交えながら解説する。

---

## 1. モノレポとは — メリット・デメリット・採用事例

### ポリレポ vs モノレポ

従来の **ポリレポ（Multi-repo）** では、フロントエンド・バックエンド・共有ライブラリをそれぞれ別リポジトリで管理する。チームが小さく独立性が高い場合は問題ないが、規模が大きくなるにつれて課題が顕在化する。

- 共通コンポーネントを変更するたびに複数リポジトリでバージョンを上げる作業が発生する
- ライブラリの依存関係のバージョンがリポジトリ間でずれる
- 横断的なリファクタリングが困難になる
- CI/CD パイプラインが分散して管理コストが上がる

**モノレポ（Monorepo）** はこれらの課題を解決する。複数のプロジェクトを単一リポジトリに配置し、コードの共有・一貫したツールチェーン・アトミックなコミットを実現する。

### モノレポのメリット

**コードの共有が容易になる**
共有 UI コンポーネント・ユーティリティ関数・型定義を一箇所で管理し、すべてのアプリケーションから参照できる。npm に公開するまでもなく、ワークスペースプロトコルで内部参照が完結する。

**アトミックなコミット**
フロントエンドとバックエンドに影響するAPIの変更を、1つのコミットで表現できる。「`feat: add user profile endpoint`」というコミットが、サーバーの実装・クライアントの型定義・UIの更新をまとめて含む。

**統一されたツールチェーン**
TypeScript・ESLint・Prettier・テストフレームワークのバージョンとルールをリポジトリ全体で統一できる。設定ファイルのドリフトが起きない。

**依存関係の一元管理**
ルートの `package.json` と各パッケージの `package.json` が協調し、重複インストールを最小限に抑える。pnpm のハードリンク機能と相性が非常に良い。

**開発者体験の向上**
新しいチームメンバーはリポジトリを1つクローンするだけで全プロジェクトの開発環境が整う。環境構築の手順書が簡潔になる。

### モノレポのデメリット

**初期設定コストが高い**
ワークスペース設定・ビルドパイプライン・CI の調整に時間がかかる。小規模プロジェクトではオーバーエンジニアリングになる場合がある。

**リポジトリのサイズが大きくなる**
すべてのコードが1つのリポジトリに集まるため、クローン時間や Git 操作が遅くなる可能性がある。Git LFS や `--depth` オプションで緩和できる。

**権限管理が複雑になる**
外部の受託開発者に一部のプロジェクトだけアクセス権を与えたい場合、モノレポでは難しい。CODEOWNERS ファイルで一部対処できるが完全ではない。

**ビルド時間の増大リスク**
対策なしですべてのパッケージを毎回ビルドすると、CI 時間が爆発する。Turborepo のキャッシュが必須になる。

### 主要な採用事例

- **Google**: 世界最大のモノレポで Bazel を使用
- **Meta**: React・Jest・Yarn Berry などを単一リポジトリで管理
- **Vercel**: Next.js・Turbopack・Turborepo 自体をモノレポで開発
- **Microsoft**: VS Code・TypeScript をモノレポで管理
- **Shopify**: Node.js・React Native・CLI ツールを単一リポジトリに集約

---

## 2. Turborepo セットアップ（pnpm workspace）

### 前提条件

```bash
# Node.js 18以上 + pnpm をインストール
node --version   # v20.x.x
npm install -g pnpm
pnpm --version   # 9.x.x
```

### 新規プロジェクトの作成

Turborepo の公式 CLI を使うと雛形が一発で生成される。

```bash
pnpm dlx create-turbo@latest my-monorepo
cd my-monorepo
```

対話式プロンプトでパッケージマネージャーに `pnpm` を選択する。生成されたディレクトリ構成を確認しよう。

```
my-monorepo/
├── apps/
│   ├── web/          # Next.js アプリ
│   └── docs/         # Nextra ドキュメント
├── packages/
│   ├── ui/           # 共有 UI コンポーネント
│   ├── eslint-config/
│   └── typescript-config/
├── turbo.json
├── package.json
└── pnpm-workspace.yaml
```

### pnpm ワークスペースの設定

**`pnpm-workspace.yaml`**

```yaml
packages:
  - 'apps/*'
  - 'packages/*'
```

このファイルが pnpm にワークスペースのパターンを伝える。`apps/` 以下のすべてのディレクトリと `packages/` 以下のすべてのディレクトリがワークスペースメンバーになる。

**ルートの `package.json`**

```json
{
  "name": "my-monorepo",
  "private": true,
  "packageManager": "pnpm@9.0.0",
  "scripts": {
    "build": "turbo build",
    "dev": "turbo dev",
    "lint": "turbo lint",
    "test": "turbo test",
    "format": "prettier --write \"**/*.{ts,tsx,md}\""
  },
  "devDependencies": {
    "turbo": "^2.3.0",
    "prettier": "^3.3.0"
  },
  "engines": {
    "node": ">=18"
  }
}
```

### Turborepo のインストール

```bash
# 依存関係を一括インストール
pnpm install

# Turborepo バージョン確認
pnpm turbo --version
```

---

## 3. ディレクトリ構成（apps/ と packages/）

### 推奨ディレクトリ構成

より実践的なプロジェクトでは以下のような構成になる。

```
my-monorepo/
├── apps/
│   ├── web/                # Next.js フロントエンド
│   │   ├── src/
│   │   ├── package.json
│   │   ├── next.config.ts
│   │   └── tsconfig.json
│   ├── api/                # Express.js バックエンド
│   │   ├── src/
│   │   ├── package.json
│   │   └── tsconfig.json
│   └── admin/              # 管理画面（Next.js）
│       ├── src/
│       ├── package.json
│       └── tsconfig.json
├── packages/
│   ├── ui/                 # 共有 UI コンポーネント
│   │   ├── src/
│   │   ├── package.json
│   │   └── tsconfig.json
│   ├── types/              # 共有型定義
│   │   ├── src/
│   │   └── package.json
│   ├── utils/              # 共有ユーティリティ
│   │   ├── src/
│   │   └── package.json
│   ├── eslint-config/      # 共有 ESLint 設定
│   │   ├── index.js
│   │   └── package.json
│   └── typescript-config/  # 共有 TypeScript 設定
│       ├── base.json
│       ├── nextjs.json
│       ├── node.json
│       └── package.json
├── turbo.json
├── package.json
├── pnpm-workspace.yaml
└── .gitignore
```

### 命名規則

パッケージ名にはスコープを使うと衝突を防げる。

```json
// packages/ui/package.json
{ "name": "@my-org/ui" }

// packages/types/package.json
{ "name": "@my-org/types" }

// apps/web/package.json
{ "name": "@my-org/web" }
```

アプリケーションから共有パッケージを参照する際は `workspace:*` プロトコルを使う。

```json
// apps/web/package.json
{
  "dependencies": {
    "@my-org/ui": "workspace:*",
    "@my-org/types": "workspace:*",
    "@my-org/utils": "workspace:*"
  }
}
```

`workspace:*` は pnpm がローカルのパッケージを直接リンクすることを意味する。npm に公開しなくても他のパッケージから参照できる。

---

## 4. 共有 UI コンポーネントパッケージ

### packages/ui のセットアップ

**`packages/ui/package.json`**

```json
{
  "name": "@my-org/ui",
  "version": "0.0.1",
  "private": true,
  "exports": {
    "./button": {
      "import": "./src/button.tsx",
      "require": "./src/button.tsx"
    },
    "./card": {
      "import": "./src/card.tsx",
      "require": "./src/card.tsx"
    },
    "./input": {
      "import": "./src/input.tsx",
      "require": "./src/input.tsx"
    }
  },
  "scripts": {
    "lint": "eslint . --max-warnings 0",
    "generate:component": "turbo gen react-component"
  },
  "devDependencies": {
    "@my-org/eslint-config": "workspace:*",
    "@my-org/typescript-config": "workspace:*",
    "@types/react": "^19.0.0",
    "react": "^19.0.0",
    "typescript": "^5.7.0"
  },
  "peerDependencies": {
    "react": "^18.0.0 || ^19.0.0"
  }
}
```

### Button コンポーネントの実装

**`packages/ui/src/button.tsx`**

```tsx
import * as React from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary: 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500',
  secondary: 'bg-gray-100 text-gray-900 hover:bg-gray-200 focus:ring-gray-400',
  danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500',
  ghost: 'bg-transparent text-gray-700 hover:bg-gray-100 focus:ring-gray-400',
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2 text-base',
  lg: 'px-6 py-3 text-lg',
};

export function Button({
  variant = 'primary',
  size = 'md',
  isLoading = false,
  leftIcon,
  rightIcon,
  disabled,
  children,
  className = '',
  ...props
}: ButtonProps): JSX.Element {
  const baseClasses =
    'inline-flex items-center justify-center gap-2 rounded-md font-medium ' +
    'transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 ' +
    'disabled:opacity-50 disabled:cursor-not-allowed';

  return (
    <button
      className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <svg
          className="animate-spin h-4 w-4"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
          />
        </svg>
      ) : (
        leftIcon
      )}
      {children}
      {!isLoading && rightIcon}
    </button>
  );
}
```

### アプリから UI パッケージを使う

```tsx
// apps/web/src/app/page.tsx
import { Button } from '@my-org/ui/button';

export default function HomePage() {
  return (
    <main>
      <Button variant="primary" size="lg">
        はじめる
      </Button>
      <Button variant="secondary" isLoading>
        送信中...
      </Button>
    </main>
  );
}
```

---

## 5. 共有 TypeScript 設定パッケージ

TypeScript の設定を共有することで、すべてのパッケージで一貫したコンパイルオプションが保証される。

**`packages/typescript-config/base.json`**

```json
{
  "$schema": "https://json.schemastore.org/tsconfig",
  "compilerOptions": {
    "declaration": true,
    "declarationMap": true,
    "esModuleInterop": true,
    "incremental": false,
    "isolatedModules": true,
    "lib": ["es2022"],
    "module": "NodeNext",
    "moduleDetection": "force",
    "moduleResolution": "NodeNext",
    "noUncheckedIndexedAccess": true,
    "resolveJsonModule": true,
    "skipLibCheck": true,
    "strict": true,
    "target": "ES2022"
  }
}
```

**`packages/typescript-config/nextjs.json`**

```json
{
  "$schema": "https://json.schemastore.org/tsconfig",
  "extends": "./base.json",
  "compilerOptions": {
    "lib": ["dom", "dom.iterable", "esnext"],
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "noEmit": true,
    "plugins": [{ "name": "next" }],
    "jsx": "preserve",
    "target": "ES2017"
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

**`packages/typescript-config/node.json`**

```json
{
  "$schema": "https://json.schemastore.org/tsconfig",
  "extends": "./base.json",
  "compilerOptions": {
    "lib": ["es2022"],
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "target": "ES2022"
  }
}
```

**`packages/typescript-config/package.json`**

```json
{
  "name": "@my-org/typescript-config",
  "version": "0.0.1",
  "private": true,
  "exports": {
    "./base": "./base.json",
    "./nextjs": "./nextjs.json",
    "./node": "./node.json"
  }
}
```

各アプリの `tsconfig.json` では継承するだけで済む。

```json
// apps/web/tsconfig.json
{
  "extends": "@my-org/typescript-config/nextjs",
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx"],
  "exclude": ["node_modules"]
}
```

```json
// apps/api/tsconfig.json
{
  "extends": "@my-org/typescript-config/node",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

---

## 6. 共有 ESLint 設定パッケージ

**`packages/eslint-config/index.js`**

```javascript
/** @type {import("eslint").Linter.Config} */
module.exports = {
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:@typescript-eslint/recommended-requiring-type-checking',
    'prettier',
  ],
  plugins: ['@typescript-eslint', 'import'],
  parser: '@typescript-eslint/parser',
  rules: {
    // 型安全性
    '@typescript-eslint/no-explicit-any': 'error',
    '@typescript-eslint/no-unsafe-assignment': 'error',
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],

    // インポート順序
    'import/order': [
      'error',
      {
        groups: ['builtin', 'external', 'internal', 'parent', 'sibling', 'index'],
        'newlines-between': 'always',
        alphabetize: { order: 'asc', caseInsensitive: true },
      },
    ],

    // コードスタイル
    'no-console': ['warn', { allow: ['warn', 'error'] }],
    eqeqeq: ['error', 'always'],
  },
  ignorePatterns: ['node_modules/', 'dist/', '.next/', 'coverage/'],
};
```

**`packages/eslint-config/next.js`**（Next.js 専用の追加ルール）

```javascript
const base = require('./index.js');

/** @type {import("eslint").Linter.Config} */
module.exports = {
  ...base,
  extends: [...base.extends, 'next/core-web-vitals'],
  rules: {
    ...base.rules,
    '@next/next/no-html-link-for-pages': 'error',
  },
};
```

**`packages/eslint-config/package.json`**

```json
{
  "name": "@my-org/eslint-config",
  "version": "0.0.1",
  "private": true,
  "main": "index.js",
  "exports": {
    ".": "./index.js",
    "./next": "./next.js"
  },
  "dependencies": {
    "@typescript-eslint/eslint-plugin": "^8.0.0",
    "@typescript-eslint/parser": "^8.0.0",
    "eslint-config-prettier": "^9.0.0",
    "eslint-plugin-import": "^2.29.0"
  },
  "peerDependencies": {
    "eslint": ">=9.0.0",
    "typescript": ">=5.0.0"
  }
}
```

各アプリの `.eslintrc.js` はシンプルになる。

```javascript
// apps/web/.eslintrc.js
/** @type {import("eslint").Linter.Config} */
module.exports = {
  root: true,
  extends: ['@my-org/eslint-config/next'],
  parserOptions: {
    project: './tsconfig.json',
    tsconfigRootDir: __dirname,
  },
};
```

---

## 7. タスクパイプライン（turbo.json）

Turborepo の核心がタスクパイプラインだ。タスク間の依存関係を定義することで、並列実行と正しい実行順序を両立できる。

**`turbo.json`**

```json
{
  "$schema": "https://turbo.build/schema.json",
  "ui": "tui",
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "inputs": ["$TURBO_DEFAULT$", ".env*"],
      "outputs": [".next/**", "!.next/cache/**", "dist/**", "build/**"]
    },
    "test": {
      "dependsOn": ["^build"],
      "inputs": ["src/**/*.ts", "src/**/*.tsx", "test/**/*.ts", "vitest.config.ts"],
      "outputs": ["coverage/**"],
      "cache": true
    },
    "lint": {
      "dependsOn": ["^lint"],
      "inputs": ["src/**/*.ts", "src/**/*.tsx", ".eslintrc.*", "eslint.config.*"]
    },
    "typecheck": {
      "dependsOn": ["^typecheck"],
      "inputs": ["src/**/*.ts", "src/**/*.tsx", "tsconfig.json"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "clean": {
      "cache": false
    },
    "deploy": {
      "dependsOn": ["build", "test", "lint", "typecheck"],
      "outputs": []
    }
  }
}
```

### `dependsOn` の `^` プレフィックスの意味

- **`"dependsOn": ["^build"]`**: このタスクを実行する前に、依存パッケージの `build` タスクを先に実行する
  - `apps/web` の `build` は `packages/ui` の `build` が完了してから始まる
- **`"dependsOn": ["build"]`**: 同じパッケージの `build` タスクに依存する
  - `deploy` は同じパッケージの `build`・`test`・`lint`・`typecheck` が完了してから始まる

### タスクの並列実行

依存関係がないタスクは自動的に並列実行される。

```
pnpm turbo build の実行順序:

[並列] packages/ui:build
[並列] packages/utils:build
[並列] packages/types:build
        ↓（上記が完了後）
[並列] apps/web:build
[並列] apps/api:build
[並列] apps/admin:build
```

`packages/` 内のパッケージが互いに依存していない場合、すべて同時に実行される。

---

## 8. キャッシュ戦略（ローカルキャッシュ・リモートキャッシュ）

### ローカルキャッシュの仕組み

Turborepo はタスクの入力（ソースファイルのハッシュ・環境変数）と出力（ビルド成果物・ログ）をキャッシュする。同じ入力でタスクを再実行すると、キャッシュから即座に結果を復元する。

```bash
# 初回実行（キャッシュなし）
pnpm turbo build
# >>> Finished! 45.2s

# 2回目実行（変更なし）
pnpm turbo build
# >>> FULL TURBO
# >>> Finished! 0.8s  ← キャッシュヒット
```

ローカルキャッシュは `node_modules/.cache/turbo` に保存される。

### キャッシュのデバッグ

```bash
# キャッシュヒットの詳細を確認
pnpm turbo build --verbosity=2

# キャッシュを無効化して強制再実行
pnpm turbo build --force

# 特定のパッケージのみビルド
pnpm turbo build --filter=@my-org/web

# 依存パッケージも含めてビルド
pnpm turbo build --filter=@my-org/web...
```

### リモートキャッシュ

チームで開発する場合、**Vercel Remote Cache** を使うとメンバー間・CI 間でキャッシュを共有できる。あるメンバーがビルドした成果物を、別のメンバーや CI が再利用できる。

**Vercel Remote Cache の設定**

```bash
# Vercel にログイン
pnpm dlx turbo login

# リポジトリをリモートキャッシュにリンク
pnpm dlx turbo link
```

成功すると `turbo.json` にリモートキャッシュの設定が追加される。

**CI 環境でのリモートキャッシュ**

```bash
# 環境変数を設定
export TURBO_TEAM="your-team-slug"
export TURBO_TOKEN="your-vercel-token"

# CI でのビルド（リモートキャッシュ利用）
pnpm turbo build
```

### Turborepo 独自のリモートキャッシュサーバー（セルフホスト）

Vercel 以外のサービスもリモートキャッシュとして使える。`turbo-remote-cache`（オープンソース実装）を使うと、S3・R2・GCS をバックエンドにしたキャッシュサーバーを構築できる。

```json
// turbo.json にリモートキャッシュサーバーを指定
{
  "remoteCache": {
    "apiUrl": "https://your-cache-server.example.com"
  }
}
```

---

## 9. 環境変数管理（パッケージ間共有）

### Turborepo での環境変数の扱い

Turborepo はデフォルトでほとんどの環境変数をキャッシュキーに含めない。意図的に宣言した変数だけがキャッシュに影響する。

**`turbo.json` での環境変数宣言**

```json
{
  "tasks": {
    "build": {
      "env": [
        "NODE_ENV",
        "NEXT_PUBLIC_API_URL",
        "NEXT_PUBLIC_ANALYTICS_ID"
      ],
      "passThroughEnv": [
        "CI",
        "VERCEL",
        "VERCEL_ENV"
      ]
    }
  }
}
```

- **`env`**: これらの変数の値がキャッシュキーに含まれる。値が変わると再ビルドされる
- **`passThroughEnv`**: キャッシュキーに含めず、ビルドプロセスに透過的に渡す

### `.env` ファイルの管理

```bash
# ルートの .env.example（コミット対象）
DATABASE_URL=postgresql://localhost:5432/myapp
REDIS_URL=redis://localhost:6379
NEXT_PUBLIC_API_URL=http://localhost:3001

# ルートの .env（.gitignore で除外）
DATABASE_URL=postgresql://user:pass@prod.example.com/myapp
REDIS_URL=redis://prod.example.com:6379
NEXT_PUBLIC_API_URL=https://api.example.com
```

### パッケージ固有の環境変数

各パッケージが自分の `.env` ファイルを持ち、ルートの `.env` を継承する構成も取れる。`dotenv-cli` や `turbo` の `inputs` 設定で制御する。

```json
// apps/web/turbo.json（パッケージレベルのオーバーライド）
{
  "extends": ["//"]
}
```

`//` はルートの `turbo.json` を指す。パッケージレベルで特定タスクのみ設定を変えたい場合に使う。

---

## 10. Next.js + Express.js モノレポ実例

### フロントエンド（apps/web）

**`apps/web/package.json`**

```json
{
  "name": "@my-org/web",
  "version": "0.0.1",
  "private": true,
  "scripts": {
    "build": "next build",
    "dev": "next dev --port 3000",
    "lint": "next lint",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "@my-org/types": "workspace:*",
    "@my-org/ui": "workspace:*",
    "@my-org/utils": "workspace:*",
    "next": "^15.1.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0"
  },
  "devDependencies": {
    "@my-org/eslint-config": "workspace:*",
    "@my-org/typescript-config": "workspace:*",
    "@types/node": "^22.0.0",
    "@types/react": "^19.0.0",
    "eslint": "^9.0.0",
    "typescript": "^5.7.0"
  }
}
```

**`apps/web/src/app/layout.tsx`**

```tsx
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'My App',
  description: 'Turborepo モノレポで構築したアプリ',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body className={inter.className}>{children}</body>
    </html>
  );
}
```

### バックエンド（apps/api）

**`apps/api/package.json`**

```json
{
  "name": "@my-org/api",
  "version": "0.0.1",
  "private": true,
  "scripts": {
    "build": "tsc",
    "dev": "tsx watch src/index.ts",
    "start": "node dist/index.js",
    "lint": "eslint .",
    "typecheck": "tsc --noEmit",
    "test": "vitest run"
  },
  "dependencies": {
    "@my-org/types": "workspace:*",
    "@my-org/utils": "workspace:*",
    "cors": "^2.8.5",
    "express": "^4.21.0",
    "zod": "^3.24.0"
  },
  "devDependencies": {
    "@my-org/eslint-config": "workspace:*",
    "@my-org/typescript-config": "workspace:*",
    "@types/cors": "^2.8.17",
    "@types/express": "^5.0.0",
    "@types/node": "^22.0.0",
    "tsx": "^4.19.0",
    "typescript": "^5.7.0",
    "vitest": "^2.0.0"
  }
}
```

**`apps/api/src/index.ts`**

```typescript
import cors from 'cors';
import express from 'express';

import { userRouter } from './routes/user.js';
import { healthRouter } from './routes/health.js';

const app = express();
const PORT = process.env.PORT ?? 3001;

app.use(cors({ origin: process.env.CORS_ORIGIN ?? 'http://localhost:3000' }));
app.use(express.json());

app.use('/health', healthRouter);
app.use('/api/users', userRouter);

app.listen(PORT, () => {
  console.warn(`API server running on port ${PORT}`);
});

export { app };
```

### 共有型定義（packages/types）

フロントエンドとバックエンドが同じ型を使うことで型安全な API 通信が実現する。

**`packages/types/src/user.ts`**

```typescript
export interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'user';
  createdAt: Date;
}

export interface CreateUserRequest {
  email: string;
  name: string;
  password: string;
}

export interface ApiResponse<T> {
  data: T;
  success: boolean;
  message?: string;
}
```

### 開発サーバーの同時起動

```bash
# すべてのアプリを同時に開発モードで起動
pnpm turbo dev

# 特定のアプリのみ起動
pnpm turbo dev --filter=@my-org/web

# web と api だけ起動
pnpm turbo dev --filter=@my-org/web --filter=@my-org/api
```

---

## 11. GitHub Actions CI/CD（並列ビルド・キャッシュ活用）

**`.github/workflows/ci.yml`**

```yaml
name: CI

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

env:
  TURBO_TOKEN: ${{ secrets.TURBO_TOKEN }}
  TURBO_TEAM: ${{ vars.TURBO_TEAM }}

jobs:
  ci:
    name: Build, Lint, Test
    runs-on: ubuntu-latest
    timeout-minutes: 30

    steps:
      - name: Checkout
        uses: actions/checkout@v4
        with:
          fetch-depth: 2

      - name: Setup pnpm
        uses: pnpm/action-setup@v4
        with:
          version: 9

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: 'pnpm'

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Lint
        run: pnpm turbo lint typecheck

      - name: Build
        run: pnpm turbo build
        env:
          NEXT_PUBLIC_API_URL: ${{ vars.NEXT_PUBLIC_API_URL }}

      - name: Test
        run: pnpm turbo test
        env:
          CI: true

  deploy-preview:
    name: Deploy Preview
    runs-on: ubuntu-latest
    needs: ci
    if: github.event_name == 'pull_request'

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup pnpm
        uses: pnpm/action-setup@v4
        with:
          version: 9

      - name: Deploy to Vercel (Preview)
        run: pnpm vercel deploy --token=${{ secrets.VERCEL_TOKEN }}
        env:
          VERCEL_ORG_ID: ${{ secrets.VERCEL_ORG_ID }}
          VERCEL_PROJECT_ID: ${{ secrets.VERCEL_PROJECT_ID }}
```

### Turbo 差分ビルド（変更されたパッケージのみ実行）

```yaml
- name: Build affected packages only
  run: |
    pnpm turbo build --filter="...[HEAD^1]"
```

`...[HEAD^1]` は「前のコミットから変更されたパッケージとそれに依存するパッケージ」を意味する。PR の変更に関係しないパッケージは完全にスキップされ、CI 時間が大幅に短縮される。

### マトリックスビルド

```yaml
strategy:
  matrix:
    node-version: [20, 22]
    os: [ubuntu-latest, macos-latest]

runs-on: ${{ matrix.os }}
steps:
  - uses: actions/setup-node@v4
    with:
      node-version: ${{ matrix.node-version }}
```

---

## 12. Vercel デプロイ（モノレポ対応）

### Vercel のモノレポ設定

Vercel はモノレポをネイティブサポートしている。プロジェクト作成時に「Root Directory」を指定するだけで、対象アプリのみビルド・デプロイされる。

**`apps/web/vercel.json`**

```json
{
  "buildCommand": "cd ../.. && pnpm turbo build --filter=@my-org/web",
  "installCommand": "pnpm install",
  "outputDirectory": ".next",
  "framework": "nextjs"
}
```

### Vercel Dashboard での設定

1. Vercel にログインして「Add New Project」
2. GitHub リポジトリを選択
3. 「Root Directory」に `apps/web` を指定
4. 「Build Command」を `cd ../.. && pnpm turbo build --filter=@my-org/web` に変更
5. 環境変数を設定
6. デプロイ実行

### 複数アプリのデプロイ

モノレポ内の複数アプリをそれぞれ別の Vercel プロジェクトとしてデプロイできる。

```bash
# web アプリのデプロイ
vercel --cwd apps/web

# admin アプリのデプロイ
vercel --cwd apps/admin
```

それぞれの Vercel プロジェクトが独立したドメインを持ち、独立してデプロイされる。リモートキャッシュを使えば、共通パッケージのビルド結果は両方のデプロイで再利用される。

---

## 13. パッケージバージョン管理（Changesets）

### Changesets とは

モノレポで外部公開パッケージを持つ場合、バージョン管理が複雑になる。**Changesets** は変更内容のドキュメント化・バージョンバンプ・CHANGELOGの自動生成を担うツールだ。

### セットアップ

```bash
pnpm add -Dw @changesets/cli

# 初期化
pnpm changeset init
```

`.changeset/config.json` が生成される。

```json
{
  "$schema": "https://unpkg.com/@changesets/config@3.0.0/schema.json",
  "changelog": "@changesets/cli/changelog",
  "commit": false,
  "fixed": [],
  "linked": [],
  "access": "restricted",
  "baseBranch": "main",
  "updateInternalDependencies": "patch",
  "ignore": []
}
```

### 変更の記録

```bash
# 変更を記録（対話式）
pnpm changeset

# バージョンをバンプ
pnpm changeset version

# npm に公開（内部パッケージは access: restricted のため公開されない）
pnpm changeset publish
```

### GitHub Actions でのリリース自動化

```yaml
name: Release

on:
  push:
    branches: [main]

jobs:
  release:
    name: Release
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: 'pnpm'

      - run: pnpm install --frozen-lockfile

      - name: Create Release PR or Publish
        uses: changesets/action@v1
        with:
          publish: pnpm changeset publish
          version: pnpm changeset version
          commit: 'chore: release packages'
          title: 'chore: release packages'
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          NPM_TOKEN: ${{ secrets.NPM_TOKEN }}
```

このワークフローは変更セットが存在する場合にリリース PR を自動作成し、PR をマージするとパッケージを自動公開する。

---

## 実践的なトラブルシューティング

### キャッシュが効かない場合

```bash
# キャッシュ情報を詳細表示
pnpm turbo build --verbosity=2 2>&1 | grep -E "FULL TURBO|CACHE MISS|hash"

# ローカルキャッシュを削除してクリーンビルド
pnpm turbo clean && pnpm turbo build
```

キャッシュミスの主な原因:
- `turbo.json` の `inputs` に含まれていないファイルを変更している
- 環境変数の値が変わっている（`env` に宣言されている場合）
- `turbo.json` 自体が変わった

### 循環依存の検出

```bash
# 循環依存を確認
pnpm turbo build --graph
```

ブラウザでタスクグラフが表示され、循環依存があればエラーとして示される。

### `workspace:*` で参照しているパッケージが見つからない

```bash
# ワークスペースのリンクを再生成
pnpm install

# 特定のパッケージのリンクを確認
ls node_modules/@my-org/
```

`pnpm-workspace.yaml` のパターンが正しいかを確認し、`pnpm install` を再実行する。

---

## パフォーマンス計測と最適化

### ビルド時間の計測

```bash
# タイミング情報付きで実行
pnpm turbo build --timing

# 生成されるレポートを確認
cat node_modules/.cache/turbo/timing.json
```

### 並列度の調整

```bash
# 並列実行数を CPU コア数に合わせる
pnpm turbo build --concurrency=50%

# 最大並列数を指定
pnpm turbo build --concurrency=4
```

CI 環境では `--concurrency=100%` で全コアを使い切ることが推奨される。ローカルでは `50%` 程度にして他の作業への影響を抑える。

### `outputs` の最適化

```json
{
  "tasks": {
    "build": {
      "outputs": [
        ".next/**",
        "!.next/cache/**",
        "dist/**",
        "!dist/**/*.map"
      ]
    }
  }
}
```

`!` プレフィックスで除外パターンを指定できる。`.map` ファイルや Next.js のビルドキャッシュをキャッシュから除外することで、キャッシュのサイズと復元時間を削減できる。

---

## まとめ

Turborepo は現代のモノレポ開発に必要な機能をシンプルな設定で提供するビルドシステムだ。

**重要なポイントを振り返る:**

1. **pnpm ワークスペース** + **`workspace:*` プロトコル** でパッケージ間の依存を管理する
2. **`turbo.json` のタスクパイプライン** で実行順序と並列化を最適化する
3. **ローカルキャッシュ** で変更がないタスクをスキップし、開発サイクルを高速化する
4. **リモートキャッシュ** でチームメンバー間・CI 間でキャッシュを共有する
5. **`--filter` オプション** で変更されたパッケージのみを対象にし、CI コストを削減する
6. **Changesets** でパッケージのバージョン管理とリリースを自動化する

特に `^build` の依存関係宣言とリモートキャッシュの組み合わせは、大規模プロジェクトでの CI 時間を劇的に短縮する。まずはシンプルな構成から始め、チームの規模とコードベースの成長に合わせて段階的に最適化していくのが現実的なアプローチだ。

---

## 関連ツールのご紹介

モノレポ開発を進めると、複数のツールやスクリプトを管理する機会が増える。正規表現デバッガー・JSON フォーマッター・Base64 エンコーダーなど、開発作業で頻繁に使うユーティリティを一か所にまとめた **DevToolBox**（[usedevtools.com](https://usedevtools.com/)）もぜひ活用してほしい。ブラウザ上でシンプルに動作する開発ツール集で、Turborepo のビルド設定を確認しながら環境変数を整理したり、API レスポンスの JSON を整形したりする場面で役立つはずだ。

