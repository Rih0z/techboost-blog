---
title: "Turborepo完全ガイド - 高速モノレポビルドシステムで開発効率を最大化する"
description: "Turborepoは複数パッケージの並列ビルド、インクリメンタルビルド、リモートキャッシュで開発を高速化。モノレポ構築、タスクパイプライン、キャッシュ戦略、CI/CD統合を完全網羅"
pubDate: "2025-02-06"
tags: ["Turborepo", "Monorepo", "Build System", "Vercel", "Developer Tools", "CI/CD"]
---

# Turborepo完全ガイド - 高速モノレポビルドシステムで開発効率を最大化する

## Turborepoとは

**Turborepo**はVercel製の**高速モノレポビルドシステム**として、複数パッケージを持つ大規模プロジェクトのビルド時間を劇的に短縮します。

### 従来のモノレポの課題

```bash
# 従来のLerna/npm workspaces
npm run build  # すべてのパッケージを直列ビルド

packages/ui → 30秒
packages/app → 45秒
packages/api → 20秒
合計: 95秒

# 問題点
- 直列実行による時間浪費
- 変更なしでも毎回フルビルド
- CI上でのキャッシュ再利用不可
- パッケージ間の依存関係を考慮しない実行順序
```

### Turborepoの解決策

```bash
# Turborepo
turbo run build

# 初回
packages/ui → 30秒 \
packages/app → 45秒  } 並列実行（最大45秒）
packages/api → 20秒 /

# 2回目（変更なし）
packages/ui → FULL TURBO (0ms)
packages/app → FULL TURBO (0ms)
packages/api → FULL TURBO (0ms)
合計: 0秒（キャッシュヒット）
```

**主要機能**:
- **並列実行** - 依存関係を解決しながら最大並列化
- **インクリメンタルビルド** - 変更されたパッケージのみ再ビルド
- **リモートキャッシュ** - チーム全体でビルド結果を共有
- **タスクパイプライン** - 複雑な依存関係を宣言的に管理

## インストールとセットアップ

### 既存プロジェクトへの導入

```bash
# 1. Turborepoをインストール
npm install turbo --save-dev

# 2. turbo.jsonを作成
npx turbo init
```

```json
// turbo.json（自動生成）
{
  "$schema": "https://turbo.build/schema.json",
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**", ".next/**"]
    },
    "test": {
      "dependsOn": ["build"]
    },
    "lint": {},
    "dev": {
      "cache": false
    }
  }
}
```

### 新規モノレポ作成

```bash
# Turborepoテンプレートから作成
npx create-turbo@latest

? Where would you like to create your turborepo? my-monorepo
? Which package manager do you want to use? pnpm

cd my-monorepo
pnpm install
pnpm dev
```

生成される構造:

```plaintext
my-monorepo/
├── apps/
│   ├── web/              # Next.jsアプリ
│   └── docs/             # ドキュメントサイト
├── packages/
│   ├── ui/               # 共有UIコンポーネント
│   ├── eslint-config/    # ESLint設定
│   └── typescript-config/ # TypeScript設定
├── turbo.json            # Turborepo設定
├── package.json
└── pnpm-workspace.yaml
```

## 基本構造

### ワークスペース設定

```yaml
# pnpm-workspace.yaml
packages:
  - 'apps/*'
  - 'packages/*'
```

```json
// package.json（ルート）
{
  "name": "my-monorepo",
  "private": true,
  "scripts": {
    "build": "turbo run build",
    "dev": "turbo run dev",
    "lint": "turbo run lint",
    "test": "turbo run test"
  },
  "devDependencies": {
    "turbo": "^1.13.0"
  },
  "packageManager": "pnpm@8.15.0"
}
```

### パッケージ構造

```json
// packages/ui/package.json
{
  "name": "@repo/ui",
  "version": "0.0.0",
  "main": "./src/index.tsx",
  "types": "./src/index.tsx",
  "scripts": {
    "build": "tsc",
    "dev": "tsc --watch",
    "lint": "eslint ."
  },
  "devDependencies": {
    "@types/react": "^18.2.0",
    "typescript": "^5.3.0"
  },
  "peerDependencies": {
    "react": "^18.2.0"
  }
}
```

```json
// apps/web/package.json
{
  "name": "web",
  "version": "0.0.0",
  "scripts": {
    "build": "next build",
    "dev": "next dev",
    "start": "next start"
  },
  "dependencies": {
    "@repo/ui": "workspace:*",  // ローカルパッケージを参照
    "next": "^14.1.0",
    "react": "^18.2.0"
  }
}
```

## タスクパイプライン

### 基本的な依存関係

```json
// turbo.json
{
  "pipeline": {
    "build": {
      // "^build": 依存パッケージのbuildが完了してから実行
      "dependsOn": ["^build"],
      "outputs": ["dist/**", ".next/**", "build/**"]
    },
    "test": {
      // 自パッケージのbuildが完了してから実行
      "dependsOn": ["build"]
    },
    "lint": {
      // 並列実行可（依存なし）
    }
  }
}
```

**実行順序**:

```plaintext
turbo run test

1. packages/ui:build      (依存なし、最初に実行)
2. apps/web:build         (ui:buildに依存)
3. packages/ui:test       (ui:buildに依存)
4. apps/web:test          (web:buildに依存)

ui:build と api:build は並列実行
```

### 複雑な依存関係

```json
// turbo.json
{
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**"]
    },
    "test": {
      "dependsOn": ["build"],
      "outputs": ["coverage/**"]
    },
    "test:e2e": {
      // 複数の依存関係
      "dependsOn": ["build", "test", "^build"]
    },
    "deploy": {
      "dependsOn": ["build", "test", "lint"],
      "outputs": []
    }
  }
}
```

### タスクフィルタリング

```bash
# 特定パッケージのみ実行
turbo run build --filter=web

# 複数パッケージ
turbo run build --filter=web --filter=api

# 依存関係も含めて実行
turbo run build --filter=web...

# 特定パッケージの依存先を実行
turbo run build --filter=...ui

# パターンマッチ
turbo run build --filter=@repo/*
```

## キャッシュ戦略

### ローカルキャッシュ

```json
// turbo.json
{
  "pipeline": {
    "build": {
      "outputs": ["dist/**", ".next/**"],
      "cache": true  // デフォルトでtrue
    },
    "dev": {
      "cache": false  // 開発サーバーはキャッシュ不要
    }
  }
}
```

キャッシュの仕組み:

```plaintext
1. タスク実行前
   - 入力ファイル（src/**）のハッシュ計算
   - ハッシュが一致するキャッシュを検索

2. キャッシュヒット
   - node_modules/.cache/turbo から復元
   - outputs に指定したファイルを展開

3. キャッシュミス
   - タスクを実行
   - outputs を圧縮してキャッシュに保存
```

### リモートキャッシュ（Vercel）

```bash
# Vercelにログイン
npx turbo login

# リモートキャッシュを有効化
npx turbo link
```

```json
// turbo.json
{
  "remoteCache": {
    "enabled": true
  }
}
```

**利点**:
- CI/CDでビルド時間を短縮
- チーム全体でキャッシュを共有
- ローカル環境でもCI結果を再利用

### セルフホストリモートキャッシュ

```bash
# turborepo-remote-cacheをセットアップ
npm install -g turborepo-remote-cache

# サーバー起動
turborepo-remote-cache --token YOUR_SECRET_TOKEN
```

```json
// turbo.json
{
  "remoteCache": {
    "signature": true,
    "teamId": "team_xxx",
    "apiUrl": "https://cache.example.com"
  }
}
```

### キャッシュ無効化

```bash
# キャッシュを無視して実行
turbo run build --force

# キャッシュをクリア
rm -rf node_modules/.cache/turbo
```

## 環境変数管理

### 自動検出

Turborepoは環境変数の変更を自動検出してキャッシュを無効化します。

```json
// turbo.json
{
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],
      "env": [
        "DATABASE_URL",   // この環境変数が変わるとキャッシュ無効化
        "API_KEY"
      ]
    }
  }
}
```

### グローバル環境変数

```json
// turbo.json
{
  "globalEnv": [
    "NODE_ENV",
    "CI"
  ],
  "pipeline": {
    "build": {
      "env": ["DATABASE_URL"]  // パッケージ固有
    }
  }
}
```

### .envファイル

```bash
# ルート .env
DATABASE_URL=postgres://localhost/db
API_KEY=secret

# apps/web/.env.local
NEXT_PUBLIC_API_URL=http://localhost:3000
```

```json
// turbo.json
{
  "pipeline": {
    "build": {
      "env": ["NEXT_PUBLIC_*"],  // ワイルドカードサポート
      "dependsOn": ["^build"]
    }
  }
}
```

## 並列実行の最適化

### 同時実行数の制御

```bash
# 最大2タスクを並列実行
turbo run build --concurrency=2

# CPU数に合わせて自動調整
turbo run build --concurrency=50%
```

```json
// turbo.json
{
  "pipeline": {
    "build": {
      "dependsOn": ["^build"]
    }
  },
  "globalDependencies": ["**/.env.*"]
}
```

### タスクのプロファイリング

```bash
# プロファイル情報を出力
turbo run build --profile=profile.json

# Chromeでプロファイルを表示
# chrome://tracing にドラッグ&ドロップ
```

プロファイルで確認できる情報:
- 各タスクの実行時間
- 並列実行のタイムライン
- ボトルネックの特定
- キャッシュヒット率

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
      - uses: actions/checkout@v3

      - uses: pnpm/action-setup@v2
        with:
          version: 8

      - uses: actions/setup-node@v3
        with:
          node-version: 20
          cache: 'pnpm'

      - name: Install dependencies
        run: pnpm install

      - name: Build
        run: pnpm turbo run build
        env:
          TURBO_TOKEN: ${{ secrets.TURBO_TOKEN }}
          TURBO_TEAM: ${{ secrets.TURBO_TEAM }}

      - name: Test
        run: pnpm turbo run test

      - name: Lint
        run: pnpm turbo run lint
```

### Vercel

```json
// vercel.json
{
  "buildCommand": "turbo run build --filter=web",
  "installCommand": "pnpm install",
  "framework": "nextjs",
  "ignoreCommand": "npx turbo-ignore"
}
```

`turbo-ignore`の動作:
- 変更されたパッケージのみデプロイ
- 影響のないパッケージはスキップ

```bash
# apps/web に変更がある場合のみビルド
npx turbo-ignore web
# → 終了コード 0（ビルド実行）

# apps/web に変更がない場合
npx turbo-ignore web
# → 終了コード 1（ビルドスキップ）
```

### CircleCI

```yaml
# .circleci/config.yml
version: 2.1

jobs:
  build:
    docker:
      - image: node:20
    steps:
      - checkout

      - restore_cache:
          keys:
            - pnpm-{{ checksum "pnpm-lock.yaml" }}

      - run:
          name: Install dependencies
          command: |
            npm install -g pnpm
            pnpm install

      - save_cache:
          key: pnpm-{{ checksum "pnpm-lock.yaml" }}
          paths:
            - node_modules
            - ~/.pnpm-store

      - run:
          name: Build
          command: pnpm turbo run build
          environment:
            TURBO_TOKEN: $TURBO_TOKEN
            TURBO_TEAM: $TURBO_TEAM

workflows:
  version: 2
  build-and-test:
    jobs:
      - build
```

## 実践的なモノレポ構成

### 大規模アプリケーション

```plaintext
monorepo/
├── apps/
│   ├── web/              # Next.jsメインアプリ
│   ├── admin/            # 管理画面
│   ├── mobile/           # React Native
│   └── api/              # Express API
├── packages/
│   ├── ui/               # 共有UIコンポーネント
│   ├── utils/            # ユーティリティ関数
│   ├── config/           # 共通設定
│   ├── database/         # Prismaスキーマ
│   └── types/            # 共通型定義
├── tools/
│   ├── eslint-config/    # ESLint設定
│   ├── tsconfig/         # TypeScript設定
│   └── jest-config/      # Jest設定
├── turbo.json
└── package.json
```

```json
// turbo.json（大規模構成）
{
  "$schema": "https://turbo.build/schema.json",
  "globalDependencies": [
    "**/.env.*",
    "tsconfig.json"
  ],
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": [
        "dist/**",
        ".next/**",
        "build/**",
        "android/app/build/**"
      ]
    },
    "test": {
      "dependsOn": ["build"],
      "outputs": ["coverage/**"]
    },
    "test:e2e": {
      "dependsOn": ["build", "^build"]
    },
    "lint": {
      "outputs": []
    },
    "typecheck": {
      "dependsOn": ["^build"],
      "outputs": []
    },
    "dev": {
      "cache": false,
      "persistent": true
    }
  }
}
```

### マイクロフロントエンド

```plaintext
microfrontends/
├── apps/
│   ├── shell/            # メインシェル
│   ├── product/          # 商品ページ
│   ├── cart/             # カート
│   └── checkout/         # チェックアウト
├── packages/
│   ├── shared-components/
│   ├── shared-state/     # Zustand/Redux
│   └── design-tokens/    # デザイントークン
└── turbo.json
```

```json
// apps/shell/package.json
{
  "name": "shell",
  "dependencies": {
    "@repo/shared-components": "workspace:*",
    "@repo/design-tokens": "workspace:*",
    "next": "^14.1.0",
    "react": "^18.2.0"
  },
  "scripts": {
    "build": "next build",
    "dev": "next dev -p 3000"
  }
}
```

```tsx
// apps/shell/app/page.tsx
import { Button } from '@repo/shared-components';
import { colors } from '@repo/design-tokens';

export default function Home() {
  return (
    <div>
      <h1 style={{ color: colors.primary }}>Shell App</h1>
      <Button>Click me</Button>

      <iframe src="http://localhost:3001/product" />
      <iframe src="http://localhost:3002/cart" />
    </div>
  );
}
```

## デザインシステム構築

### UIライブラリパッケージ

```plaintext
packages/ui/
├── src/
│   ├── components/
│   │   ├── Button/
│   │   │   ├── Button.tsx
│   │   │   ├── Button.test.tsx
│   │   │   └── Button.stories.tsx
│   │   ├── Input/
│   │   └── Card/
│   ├── hooks/
│   └── index.tsx
├── package.json
└── tsconfig.json
```

```json
// packages/ui/package.json
{
  "name": "@repo/ui",
  "version": "0.0.0",
  "main": "./src/index.tsx",
  "types": "./src/index.tsx",
  "exports": {
    ".": "./src/index.tsx",
    "./button": "./src/components/Button/Button.tsx"
  },
  "scripts": {
    "build": "tsc",
    "dev": "tsc --watch",
    "test": "jest",
    "storybook": "storybook dev -p 6006",
    "build-storybook": "storybook build"
  },
  "devDependencies": {
    "@storybook/react": "^7.6.0",
    "@types/react": "^18.2.0",
    "jest": "^29.7.0",
    "typescript": "^5.3.0"
  },
  "peerDependencies": {
    "react": "^18.2.0"
  }
}
```

```tsx
// packages/ui/src/components/Button/Button.tsx
export interface ButtonProps {
  variant?: 'primary' | 'secondary';
  size?: 'small' | 'medium' | 'large';
  children: React.ReactNode;
  onClick?: () => void;
}

export const Button = ({
  variant = 'primary',
  size = 'medium',
  children,
  onClick
}: ButtonProps) => {
  return (
    <button
      className={`btn btn-${variant} btn-${size}`}
      onClick={onClick}
    >
      {children}
    </button>
  );
};
```

### Storybookの統合

```json
// turbo.json
{
  "pipeline": {
    "storybook": {
      "cache": false,
      "persistent": true
    },
    "build-storybook": {
      "dependsOn": ["^build"],
      "outputs": ["storybook-static/**"]
    }
  }
}
```

```bash
# すべてのStorybookを起動
turbo run storybook

# 特定パッケージのみ
turbo run storybook --filter=@repo/ui
```

## TypeScript設定の共有

### 共通TypeScript設定

```plaintext
packages/typescript-config/
├── base.json
├── nextjs.json
├── react-library.json
└── package.json
```

```json
// packages/typescript-config/base.json
{
  "$schema": "https://json.schemastore.org/tsconfig",
  "compilerOptions": {
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "moduleResolution": "Bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "incremental": true
  },
  "exclude": ["node_modules"]
}
```

```json
// packages/typescript-config/nextjs.json
{
  "extends": "./base.json",
  "compilerOptions": {
    "lib": ["dom", "dom.iterable", "esnext"],
    "jsx": "preserve",
    "module": "esnext",
    "target": "es5",
    "plugins": [{ "name": "next" }]
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

```json
// apps/web/tsconfig.json
{
  "extends": "@repo/typescript-config/nextjs.json",
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

## ESLint/Prettier設定の共有

```plaintext
packages/eslint-config/
├── next.js
├── react-internal.js
└── package.json
```

```js
// packages/eslint-config/next.js
module.exports = {
  extends: ['next', 'turbo', 'prettier'],
  rules: {
    '@next/next/no-html-link-for-pages': 'off',
    'react/jsx-key': 'off'
  },
  parserOptions: {
    babelOptions: {
      presets: [require.resolve('next/babel')]
    }
  }
};
```

```json
// apps/web/.eslintrc.json
{
  "extends": ["@repo/eslint-config/next"]
}
```

```bash
# すべてのパッケージをLint
turbo run lint

# 自動修正
turbo run lint -- --fix
```

## パフォーマンスベンチマーク

### 実測データ（中規模モノレポ）

```plaintext
構成:
- apps: 3個（web, admin, api）
- packages: 10個

【従来（Lerna）】
初回ビルド: 3分20秒
2回目（変更なし）: 3分18秒
CI（クリーン環境）: 3分45秒

【Turborepo導入後】
初回ビルド: 1分10秒（並列化）
2回目（変更なし）: 0秒（ローカルキャッシュ）
CI（リモートキャッシュ）: 15秒（キャッシュヒット）

改善率: 93%削減（CI環境）
```

### 大規模プロジェクト（Vercel公式データ）

```plaintext
Vercel社内モノレポ:
- 50以上のパッケージ
- 20万行以上のTypeScript

従来: 15分
Turborepo: 2分（87%削減）
キャッシュヒット時: 10秒（99%削減）
```

## トラブルシューティング

### キャッシュが効かない

```bash
# 問題: キャッシュヒットしない

# 原因1: outputs設定漏れ
# turbo.jsonでoutputsを正しく指定

# 原因2: 環境変数の影響
# 不要な環境変数をglobalEnvから除外

# 原因3: タイムスタンプの変動
# .gitignoreに一時ファイルを追加
```

### 依存関係のエラー

```bash
# 問題: "Cannot find module '@repo/ui'"

# 解決策1: ワークスペース再インストール
pnpm install

# 解決策2: ビルド順序の確認
turbo run build --filter=@repo/ui...

# 解決策3: package.jsonの確認
# "workspace:*" が正しく設定されているか
```

### 並列実行の競合

```json
// 問題: 並列実行でファイル競合

// 解決策: 依存関係を明示
{
  "pipeline": {
    "db:migrate": {
      "cache": false
    },
    "db:seed": {
      "dependsOn": ["db:migrate"]  // 直列実行を強制
    }
  }
}
```

## ベストプラクティス

### 1. パッケージの粒度

```plaintext
良い例（適切な粒度）
packages/
├── ui/              # UIコンポーネント
├── utils/           # ユーティリティ
├── api-client/      # APIクライアント
└── types/           # 共通型定義

悪い例（細かすぎ）
packages/
├── button/          # 1コンポーネントで1パッケージ
├── input/
├── select/
└── ...
```

### 2. 共通設定の集約

```plaintext
良い例
tools/
├── eslint-config/
├── tsconfig/
├── jest-config/
└── prettier-config/

悪い例
各パッケージに個別の設定ファイル散在
```

### 3. ビルド出力の管理

```json
// 良い例: outputs明示
{
  "pipeline": {
    "build": {
      "outputs": ["dist/**", "build/**", ".next/**"]
    }
  }
}

// 悪い例: outputs未指定
{
  "pipeline": {
    "build": {}  // キャッシュが効かない
  }
}
```

## まとめ

Turborepoは**高速モノレポビルドシステム**として、以下の価値を提供します。

### 主要な利点

1. **劇的な高速化** - 並列実行とキャッシュで最大99%のビルド時間削減
2. **インクリメンタルビルド** - 変更されたパッケージのみ再ビルド
3. **リモートキャッシュ** - チーム全体でビルド結果を共有
4. **宣言的パイプライン** - 複雑な依存関係を簡潔に管理
5. **優れた開発者体験** - プロファイリング、フィルタリング、並列制御

### 採用判断基準

**Turborepoを選ぶべき場合**:
- 複数パッケージを持つモノレポ
- ビルド時間が課題（3分以上）
- CI/CDコスト削減が必要
- チーム開発での効率化

**他の選択肢を検討すべき場合**:
- 単一パッケージのプロジェクト
- ビルド時間が十分短い（1分未満）
- 既存Lernaで問題なし

Turborepoは現代的なモノレポ開発において、パフォーマンスと開発者体験の両立を実現する最良の選択肢です。
