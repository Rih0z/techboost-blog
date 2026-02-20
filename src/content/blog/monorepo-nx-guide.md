---
title: 'Nx完全ガイド — モノレポ管理・コード生成・テスト最適化・CI/CD'
description: 'NxでモダンなモノレポをTypeScriptで構築する完全ガイド。ワークスペース設定・コードジェネレーター・affected commands・分散キャッシュ・Nx Cloud・GitHub Actions統合まで実装例付きで解説。'
pubDate: 'Feb 20 2026'
heroImage: '../../assets/blog-placeholder-4.jpg'
tags: ['Nx', 'モノレポ', 'TypeScript', 'CI/CD', '開発環境']
---

モノレポ（Monorepo）は、複数のプロジェクトやパッケージを単一のリポジトリで管理するアーキテクチャだ。Google、Meta、Microsoftといった大企業が長年採用してきたこの手法は、近年フロントエンド・バックエンド開発の世界でも急速に普及している。その中心にいるのが **Nx** — Narwhal Technologiesが開発した、TypeScript/JavaScript エコシステム向けの高機能ビルドシステムだ。

本記事では、Nxの基礎から高度な設定まで、実際のコード例を交えながら徹底的に解説する。

---

## 1. Nxとは — Turborepoとの比較・採用事例

### Nxの概要

Nxは単なるモノレポ管理ツールを超えた、フルスタックな**スマートビルドシステム**だ。主な特徴は以下の通り：

- **インクリメンタルビルド**: 変更されたプロジェクトとその依存関係のみをビルド
- **コンピュテーションキャッシュ**: タスクの結果をローカル・リモートでキャッシュ
- **コードジェネレーター**: プロジェクト・コンポーネント・サービスを一貫したテンプレートから生成
- **依存グラフ可視化**: プロジェクト間の依存関係を視覚的に確認
- **モジュール境界強制**: ESLintルールでアーキテクチャ制約を自動チェック

```bash
# Nxが管理できる技術スタック
- React / Next.js / Angular / Vue
- Node.js / Express / Fastify / NestJS
- React Native / Expo
- Storybook / Playwright / Cypress
- Python / Rust（プラグイン経由）
```

### Turborepoとの比較

2021年にVercelが公開したTurborepoはNxの強力なライバルだ。両者を正確に比較してみよう。

| 比較項目 | Nx | Turborepo |
|---|---|---|
| **開発元** | Narwhal Technologies（Nrwl） | Vercel |
| **初期リリース** | 2018年 | 2021年 |
| **設定方式** | `project.json` / `nx.json` | `turbo.json` |
| **コードジェネレーター** | 豊富（プラグインエコシステム） | なし（別途設定が必要） |
| **依存グラフ可視化** | 内蔵（`nx graph`） | なし |
| **分散キャッシュ** | Nx Cloud（有料プランあり） | Vercel Remote Cache |
| **モジュール境界ルール** | ESLintプラグインで強制 | なし |
| **プラグインエコシステム** | 非常に豊富 | 限定的 |
| **学習コスト** | やや高い | 低い |
| **設定の複雑さ** | 高機能だが複雑 | シンプル |

**結論**: 小〜中規模のプロジェクトやVercelデプロイが中心なら**Turborepo**、エンタープライズ規模・複数フレームワーク混在・厳格なアーキテクチャ制約が必要なら**Nx**が適している。

### 主要な採用事例

- **Miro**: デザインコラボレーションツール。フロントエンド/バックエンドをNxで統合管理
- **Cisco**: エンタープライズソフトウェアの大規模モノレポ
- **SAP**: クラウドプラットフォームのマイクロサービス群
- **EPAM Systems**: グローバルITサービス企業のプロジェクト管理
- **Narwhal（開発元自身）**: Nxエコシステム自体がNxで管理されている

---

## 2. ワークスペース初期化（create-nx-workspace）

### 新規ワークスペースの作成

```bash
# 対話式セットアップ
npx create-nx-workspace@latest my-monorepo

# オプションを直接指定
npx create-nx-workspace@latest my-monorepo \
  --preset=ts \
  --packageManager=pnpm \
  --nxCloud=skip

# React + TypeScript プリセット
npx create-nx-workspace@latest my-monorepo \
  --preset=react-monorepo \
  --appName=web-app \
  --style=css \
  --bundler=vite \
  --e2eTestRunner=playwright

# Next.js プリセット
npx create-nx-workspace@latest my-monorepo \
  --preset=next \
  --appName=nextjs-app \
  --style=css
```

### 生成されるディレクトリ構造

```
my-monorepo/
├── apps/                    # アプリケーション
│   └── web-app/
│       ├── src/
│       ├── project.json     # プロジェクト設定
│       └── vite.config.ts
├── libs/                    # 共有ライブラリ
├── tools/                   # カスタムスクリプト・ジェネレーター
├── nx.json                  # Nxグローバル設定
├── package.json
├── tsconfig.base.json       # 共通TypeScript設定
└── .eslintrc.json           # 共通ESLint設定
```

### nx.json の基本設定

```json
{
  "$schema": "./node_modules/nx/schemas/nx-schema.json",
  "namedInputs": {
    "default": ["{projectRoot}/**/*", "sharedGlobals"],
    "production": [
      "default",
      "!{projectRoot}/**/?(*.)+(spec|test).[jt]s?(x)?(.snap)",
      "!{projectRoot}/tsconfig.spec.json",
      "!{projectRoot}/.eslintrc.json",
      "!{projectRoot}/jest.config.[jt]s",
      "!{projectRoot}/src/test-setup.[jt]s",
      "!{projectRoot}/test-setup.[jt]s"
    ],
    "sharedGlobals": []
  },
  "targetDefaults": {
    "build": {
      "dependsOn": ["^build"],
      "inputs": ["production", "^production"],
      "cache": true
    },
    "test": {
      "inputs": ["default", "^production", "{workspaceRoot}/jest.preset.js"],
      "cache": true
    },
    "lint": {
      "inputs": ["default", "{workspaceRoot}/.eslintrc.json"],
      "cache": true
    },
    "e2e": {
      "cache": true
    }
  },
  "defaultBase": "main"
}
```

### 既存プロジェクトへのNx追加

既存のnpmワークスペースにNxを後から追加することも可能だ。

```bash
# 既存プロジェクトにNxを追加
npx nx@latest init

# package.jsonのworkspaces設定を自動検出してnx.jsonを生成
npx nx@latest init --integrated
```

---

## 3. アプリケーション・ライブラリ追加（generators）

### プラグインのインストール

Nxは用途に応じたプラグインを追加してジェネレーターを拡張する。

```bash
# Reactアプリ用プラグイン
npm install -D @nx/react

# Node.jsアプリ用プラグイン
npm install -D @nx/node

# Next.jsアプリ用プラグイン
npm install -D @nx/next

# NestJSアプリ用プラグイン
npm install -D @nx/nest

# 共有TypeScriptライブラリ用
npm install -D @nx/js
```

### アプリケーションの追加

```bash
# Reactアプリを追加
nx generate @nx/react:application \
  --name=admin-portal \
  --directory=apps/admin-portal \
  --style=scss \
  --bundler=vite \
  --unitTestRunner=vitest \
  --e2eTestRunner=playwright

# Next.jsアプリを追加
nx generate @nx/next:application \
  --name=marketing-site \
  --directory=apps/marketing-site \
  --style=css

# NestJSアプリを追加
nx generate @nx/nest:application \
  --name=api-server \
  --directory=apps/api-server
```

### ライブラリの追加

ライブラリはアプリ間で共有するコードを格納する。**4種類のライブラリタイプ**を使い分けるのが推奨パターンだ。

```bash
# feature ライブラリ（スマートコンポーネント + 状態管理）
nx generate @nx/react:library \
  --name=feature-auth \
  --directory=libs/feature-auth \
  --style=scss \
  --unitTestRunner=vitest

# UI ライブラリ（プレゼンテーションコンポーネントのみ）
nx generate @nx/react:library \
  --name=ui-components \
  --directory=libs/ui-components \
  --style=scss \
  --unitTestRunner=vitest

# データアクセスライブラリ（API呼び出し・状態管理）
nx generate @nx/js:library \
  --name=data-access-users \
  --directory=libs/data-access-users \
  --unitTestRunner=jest

# ユーティリティライブラリ（純粋な関数・型定義）
nx generate @nx/js:library \
  --name=utils-validation \
  --directory=libs/utils-validation \
  --unitTestRunner=jest
```

### tsconfig.base.jsonのパスエイリアス

ライブラリ生成時、`tsconfig.base.json`にパスエイリアスが自動追加される。

```json
{
  "compilerOptions": {
    "paths": {
      "@my-monorepo/feature-auth": ["libs/feature-auth/src/index.ts"],
      "@my-monorepo/ui-components": ["libs/ui-components/src/index.ts"],
      "@my-monorepo/data-access-users": ["libs/data-access-users/src/index.ts"],
      "@my-monorepo/utils-validation": ["libs/utils-validation/src/index.ts"]
    }
  }
}
```

アプリからはシンプルなimportでライブラリを利用できる。

```typescript
// apps/admin-portal/src/app/login/login.tsx
import { LoginForm } from '@my-monorepo/feature-auth';
import { Button, Input } from '@my-monorepo/ui-components';
import { validateEmail } from '@my-monorepo/utils-validation';
```

---

## 4. project.json設定（targets・executor）

`project.json`は各プロジェクトのビルド・テスト・リント等のタスクを定義するファイルだ。

### 基本構造

```json
{
  "name": "admin-portal",
  "$schema": "../../node_modules/nx/schemas/project-schema.json",
  "sourceRoot": "apps/admin-portal/src",
  "projectType": "application",
  "tags": ["scope:admin", "type:app"],
  "targets": {
    "build": {
      "executor": "@nx/vite:build",
      "outputs": ["{options.outputPath}"],
      "defaultConfiguration": "production",
      "options": {
        "outputPath": "dist/apps/admin-portal"
      },
      "configurations": {
        "development": {
          "mode": "development"
        },
        "production": {
          "mode": "production"
        }
      }
    },
    "serve": {
      "executor": "@nx/vite:dev-server",
      "defaultConfiguration": "development",
      "options": {
        "buildTarget": "admin-portal:build"
      },
      "configurations": {
        "development": {
          "buildTarget": "admin-portal:build:development",
          "hmr": true
        },
        "production": {
          "buildTarget": "admin-portal:build:production",
          "hmr": false
        }
      }
    },
    "test": {
      "executor": "@nx/vite:test",
      "outputs": ["{workspaceRoot}/coverage/{projectRoot}"],
      "options": {
        "passWithNoTests": true,
        "reportsDirectory": "../../coverage/apps/admin-portal"
      }
    },
    "lint": {
      "executor": "@nx/eslint:lint",
      "outputs": ["{options.outputFile}"],
      "options": {
        "lintFilePatterns": ["apps/admin-portal/**/*.{ts,tsx,js,jsx}"]
      }
    },
    "type-check": {
      "executor": "nx:run-commands",
      "options": {
        "command": "tsc --noEmit -p tsconfig.app.json",
        "cwd": "{projectRoot}"
      }
    },
    "docker-build": {
      "executor": "nx:run-commands",
      "options": {
        "command": "docker build -f apps/admin-portal/Dockerfile -t admin-portal:latest .",
        "cwd": "{workspaceRoot}"
      },
      "dependsOn": ["build"]
    }
  }
}
```

### カスタムexecutorの作成

プロジェクト固有の処理が必要な場合、カスタムexecutorを作成できる。

```bash
# executorの雛形を生成
nx generate @nx/plugin:executor \
  --name=deploy-s3 \
  --project=tools-executors \
  --directory=tools/executors/deploy-s3
```

```typescript
// tools/executors/deploy-s3/executor.ts
import { ExecutorContext } from '@nx/devkit';
import { execSync } from 'child_process';

export interface DeployS3ExecutorSchema {
  bucket: string;
  region: string;
  distPath: string;
  profile?: string;
}

export default async function deployS3Executor(
  options: DeployS3ExecutorSchema,
  context: ExecutorContext
): Promise<{ success: boolean }> {
  const { bucket, region, distPath, profile } = options;
  const profileFlag = profile ? `--profile ${profile}` : '';

  try {
    console.log(`Deploying to S3 bucket: ${bucket}`);
    execSync(
      `aws s3 sync ${distPath} s3://${bucket} --region ${region} ${profileFlag} --delete`,
      { stdio: 'inherit' }
    );
    execSync(
      `aws cloudfront create-invalidation --distribution-id ${process.env.CF_DISTRIBUTION_ID} --paths "/*"`,
      { stdio: 'inherit' }
    );
    console.log('Deployment successful!');
    return { success: true };
  } catch (error) {
    console.error('Deployment failed:', error);
    return { success: false };
  }
}
```

```json
// project.json に追加
{
  "targets": {
    "deploy": {
      "executor": "tools-executors:deploy-s3",
      "options": {
        "bucket": "my-app-production",
        "region": "ap-northeast-1",
        "distPath": "dist/apps/admin-portal"
      },
      "dependsOn": ["build"]
    }
  }
}
```

---

## 5. コードジェネレーター（nx generate）カスタマイズ

### カスタムジェネレーターの作成

プロジェクト固有のコード規約に合わせたジェネレーターを作成することで、チーム全体のコード品質を統一できる。

```bash
# ジェネレータープラグインを生成
nx generate @nx/plugin:plugin my-generators --directory=tools/generators

# 個別のジェネレーターを生成
nx generate @nx/plugin:generator \
  --name=react-feature \
  --project=my-generators \
  --directory=tools/generators/react-feature
```

```typescript
// tools/generators/react-feature/generator.ts
import {
  Tree,
  formatFiles,
  generateFiles,
  getProjects,
  joinPathFragments,
  names,
  offsetFromRoot,
} from '@nx/devkit';

export interface ReactFeatureGeneratorSchema {
  name: string;
  project: string;
  directory?: string;
}

export default async function (
  tree: Tree,
  options: ReactFeatureGeneratorSchema
) {
  const project = getProjects(tree).get(options.project);
  if (!project) {
    throw new Error(`Project "${options.project}" not found`);
  }

  const normalizedNames = names(options.name);
  const directory = options.directory
    ? joinPathFragments(project.sourceRoot!, options.directory)
    : joinPathFragments(project.sourceRoot!, 'features', normalizedNames.fileName);

  // テンプレートファイルからコードを生成
  generateFiles(
    tree,
    joinPathFragments(__dirname, 'files'),
    directory,
    {
      ...normalizedNames,
      offsetFromRoot: offsetFromRoot(project.root),
      template: '',
    }
  );

  await formatFiles(tree);
}
```

```typescript
// tools/generators/react-feature/files/__name__/__name__.tsx__template__
import { useState } from 'react';
import styles from './<%= fileName %>.module.scss';

export interface <%= className %>Props {
  title?: string;
}

export function <%= className %>({ title = '<%= className %>' }: <%= className %>Props) {
  const [isLoading, setIsLoading] = useState(false);

  return (
    <div className={styles.container}>
      <h2>{title}</h2>
    </div>
  );
}

export default <%= className %>;
```

```typescript
// tools/generators/react-feature/files/__name__/__name__.spec.tsx__template__
import { render, screen } from '@testing-library/react';
import { <%= className %> } from './<%= fileName %>';

describe('<%= className %>', () => {
  it('should render successfully', () => {
    const { baseElement } = render(<<%= className %> />);
    expect(baseElement).toBeTruthy();
  });

  it('should display default title', () => {
    render(<<%= className %> />);
    expect(screen.getByText('<%= className %>')).toBeInTheDocument();
  });

  it('should display custom title', () => {
    render(<<%= className %> title="Custom Title" />);
    expect(screen.getByText('Custom Title')).toBeInTheDocument();
  });
});
```

### ジェネレーターの実行

```bash
# カスタムジェネレーターでfeatureを生成
nx generate my-generators:react-feature \
  --name=user-dashboard \
  --project=admin-portal \
  --directory=features

# ドライランで確認してから実行
nx generate my-generators:react-feature \
  --name=user-settings \
  --project=admin-portal \
  --dry-run
```

---

## 6. affected commands（変更されたプロジェクトのみビルド/テスト）

### affectedの仕組み

Nxは依存グラフを解析して、変更されたファイルが影響するプロジェクトを特定する。`libs/ui-components`を変更した場合、それを依存するすべてのアプリとライブラリが「affected」となる。

```
変更: libs/ui-components
↓
affected: libs/ui-components, apps/admin-portal, apps/marketing-site
NOT affected: apps/api-server, libs/data-access-users
```

### 基本的なaffectedコマンド

```bash
# 変更されたプロジェクトのみビルド
nx affected --target=build

# 変更されたプロジェクトのみテスト
nx affected --target=test

# 変更されたプロジェクトのみリント
nx affected --target=lint

# 並列実行（デフォルト3、最大16）
nx affected --target=test --parallel=8

# 変更されたプロジェクト一覧を表示
nx show projects --affected

# 依存グラフをブラウザで確認
nx affected:graph
```

### ベースブランチの設定

```bash
# mainブランチとの差分でaffectedを計算
nx affected --target=test --base=main --head=HEAD

# 特定コミット間の差分
nx affected --target=test --base=abc123 --head=def456

# nx.jsonで永続的に設定
```

```json
// nx.json
{
  "defaultBase": "main",
  "affected": {
    "defaultBase": "main"
  }
}
```

### affectedを活用したCI最適化

```bash
# PRのCIでは変更分のみテスト
nx affected --target=test --base=origin/main --head=HEAD --parallel=4

# mainへのマージ後は全テスト
nx run-many --target=test --all --parallel=8
```

---

## 7. タスクパイプライン（dependsOn・キャッシュ設定）

### タスクの依存関係定義

`dependsOn`でタスク間の実行順序を制御する。`^`プレフィックスは依存ライブラリのタスクを指す。

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
    "deploy": {
      "dependsOn": ["build", "test", "lint"],
      "cache": false
    },
    "serve": {
      "dependsOn": ["^build"]
    }
  }
}
```

実行フロー例：
```
nx build admin-portal
  ↓ 依存ライブラリを先にビルド
  ├── build: libs/ui-components
  ├── build: libs/feature-auth
  └── build: libs/data-access-users
      ↓ すべて完了後
      └── build: apps/admin-portal
```

### 細粒度のキャッシュ設定

```json
// nx.json
{
  "targetDefaults": {
    "build": {
      "inputs": [
        "production",
        "^production",
        {
          "env": "NODE_ENV"
        },
        {
          "env": "BUILD_VERSION"
        }
      ],
      "outputs": ["{options.outputPath}"],
      "cache": true
    },
    "test": {
      "inputs": [
        "default",
        "^production",
        "{workspaceRoot}/jest.preset.js",
        {
          "env": "CI"
        }
      ],
      "outputs": ["{workspaceRoot}/coverage/{projectRoot}"],
      "cache": true
    }
  }
}
```

### プロジェクト固有のパイプライン設定

```json
// apps/api-server/project.json
{
  "targets": {
    "build": {
      "executor": "@nx/webpack:webpack",
      "dependsOn": [
        "generate-prisma",
        "^build"
      ],
      "options": {
        "outputPath": "dist/apps/api-server"
      }
    },
    "generate-prisma": {
      "executor": "nx:run-commands",
      "cache": true,
      "inputs": [
        "{projectRoot}/prisma/schema.prisma"
      ],
      "outputs": [
        "{projectRoot}/node_modules/.prisma"
      ],
      "options": {
        "command": "prisma generate",
        "cwd": "{projectRoot}"
      }
    }
  }
}
```

---

## 8. ローカルキャッシュとNx Cloud分散キャッシュ

### ローカルキャッシュの仕組み

Nxはデフォルトで`.nx/cache`ディレクトリにタスク結果をキャッシュする。同じ入力（ソースコード・環境変数・設定ファイル）でタスクを再実行すると、キャッシュから即座に結果を取得する。

```bash
# キャッシュの確認
ls .nx/cache/

# キャッシュをクリア
nx reset

# キャッシュなしで実行
nx build admin-portal --skip-nx-cache
```

```
# キャッシュヒット時のログ
> nx run admin-portal:build  [existing outputs match the cache, left as is]

   ✔    1/1 dependent project tasks succeeded [1 read from cache]

   Hint: you can run the command with --verbose to see the full dependent project outputs

 ——————————————————————————————————————————————————————————————————————————————————————————

 >  NX   Successfully ran target build for project admin-portal and 1 task it depends on (21ms)

   Nx read the output from the cache instead of running the command for 1 out of 1 tasks.
```

### Nx Cloudの設定

Nx Cloudはリモートキャッシュと分散タスク実行を提供するサービスだ。チームの複数のCI/CDマシンでキャッシュを共有できる。

```bash
# Nx Cloudをワークスペースに接続
npx nx connect

# または手動設定
npm install -D nx-cloud
```

```json
// nx.json
{
  "nxCloudAccessToken": "YOUR_ACCESS_TOKEN",
  "tasksRunnerOptions": {
    "default": {
      "runner": "nx-cloud",
      "options": {
        "cacheableOperations": ["build", "test", "lint", "e2e"],
        "accessToken": "YOUR_ACCESS_TOKEN"
      }
    }
  }
}
```

### セルフホステッドのリモートキャッシュ

Nx Cloudを使わずに、S3やGCSをリモートキャッシュとして利用するオープンソースの選択肢もある。

```bash
# nx-remotecache-s3 プラグイン
npm install -D nx-remotecache-s3
```

```json
// nx.json
{
  "tasksRunnerOptions": {
    "default": {
      "runner": "nx-remotecache-s3",
      "options": {
        "cacheableOperations": ["build", "test", "lint"],
        "bucket": "my-nx-cache",
        "region": "ap-northeast-1",
        "prefix": "nx-cache/"
      }
    }
  }
}
```

---

## 9. モジュール境界ルール（@nrwl/enforce-module-boundaries）

### ライブラリのタグシステム

Nxのモジュール境界ルールは、`project.json`の`tags`フィールドを使ってライブラリの種別とスコープを定義し、不正な依存関係をESLintで検出する。

```json
// libs/feature-auth/project.json
{
  "tags": ["scope:shared", "type:feature"]
}

// libs/ui-components/project.json
{
  "tags": ["scope:shared", "type:ui"]

// libs/data-access-users/project.json
{
  "tags": ["scope:admin", "type:data-access"]
}

// apps/admin-portal/project.json
{
  "tags": ["scope:admin", "type:app"]
}

// apps/marketing-site/project.json
{
  "tags": ["scope:marketing", "type:app"]
}
```

### ESLintルールの設定

```json
// .eslintrc.json
{
  "plugins": ["@nx"],
  "rules": {
    "@nx/enforce-module-boundaries": [
      "error",
      {
        "enforceBuildableLibDependency": true,
        "allow": [],
        "depConstraints": [
          {
            "sourceTag": "type:app",
            "onlyDependOnLibsWithTags": [
              "type:feature",
              "type:ui",
              "type:data-access",
              "type:util"
            ]
          },
          {
            "sourceTag": "type:feature",
            "onlyDependOnLibsWithTags": [
              "type:ui",
              "type:data-access",
              "type:util"
            ]
          },
          {
            "sourceTag": "type:ui",
            "onlyDependOnLibsWithTags": ["type:ui", "type:util"]
          },
          {
            "sourceTag": "type:data-access",
            "onlyDependOnLibsWithTags": ["type:util"]
          },
          {
            "sourceTag": "type:util",
            "onlyDependOnLibsWithTags": ["type:util"]
          },
          {
            "sourceTag": "scope:admin",
            "onlyDependOnLibsWithTags": ["scope:admin", "scope:shared"]
          },
          {
            "sourceTag": "scope:marketing",
            "onlyDependOnLibsWithTags": ["scope:marketing", "scope:shared"]
          },
          {
            "sourceTag": "scope:shared",
            "onlyDependOnLibsWithTags": ["scope:shared"]
          }
        ]
      }
    ]
  }
}
```

### 境界違反の検出例

```typescript
// apps/marketing-site/src/app/dashboard.tsx
// ❌ エラー: scope:marketing が scope:admin の libs を参照している
import { AdminUserList } from '@my-monorepo/feature-admin-users'; 
// ESLint: A project tagged with "scope:marketing" can only depend on 
// libs tagged with "scope:marketing" or "scope:shared"

// ❌ エラー: type:ui が type:feature を参照している
import { useAuthStore } from '@my-monorepo/feature-auth';
// ESLint: A project tagged with "type:ui" can only depend on 
// libs tagged with "type:ui" or "type:util"

// ✅ 正しい依存関係
import { Button } from '@my-monorepo/ui-components'; // scope:shared, type:ui
import { formatDate } from '@my-monorepo/utils-date'; // scope:shared, type:util
```

---

## 10. GitHub Actions統合（affected + remote cache）

### 基本的なCI設定

```yaml
# .github/workflows/ci.yml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

env:
  NX_CLOUD_ACCESS_TOKEN: ${{ secrets.NX_CLOUD_ACCESS_TOKEN }}

jobs:
  main:
    name: Nx Cloud - Main Job
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4
        with:
          fetch-depth: 0  # affected計算に全履歴が必要

      - name: Cache node_modules
        uses: actions/cache@v4
        with:
          path: ~/.npm
          key: ${{ runner.os }}-node-${{ hashFiles('**/package-lock.json') }}
          restore-keys: |
            ${{ runner.os }}-node-

      - name: Install Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Set NX_BASE for PR
        if: github.event_name == 'pull_request'
        run: echo "NX_BASE=origin/${{ github.base_ref }}" >> $GITHUB_ENV

      - name: Set NX_BASE for main push
        if: github.event_name == 'push' && github.ref == 'refs/heads/main'
        run: echo "NX_BASE=HEAD~1" >> $GITHUB_ENV

      - name: Lint affected
        run: npx nx affected --target=lint --parallel=3

      - name: Test affected
        run: npx nx affected --target=test --parallel=3 --ci --coverage

      - name: Build affected
        run: npx nx affected --target=build --parallel=3

      - name: E2E affected
        run: npx nx affected --target=e2e --parallel=1

      - name: Upload coverage
        uses: codecov/codecov-action@v4
        with:
          directory: ./coverage
          token: ${{ secrets.CODECOV_TOKEN }}
```

### 分散CI設定（Nx Agents）

```yaml
# .github/workflows/ci-distributed.yml
name: CI (Distributed)

on:
  push:
    branches: [main]
  pull_request:

env:
  NX_CLOUD_ACCESS_TOKEN: ${{ secrets.NX_CLOUD_ACCESS_TOKEN }}

jobs:
  main:
    name: Nx Cloud - Main Job
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: 'npm'

      - run: npm ci

      # Nx Agentsを使った分散実行（有料プラン）
      - name: Initialize the Nx Cloud main branch
        run: npx nx-cloud start-ci-run --distribute-on="5 linux-medium-js" --stop-agents-after="build"

      - name: Run commands in parallel
        run: |
          npx nx-cloud record -- npx nx format:check &
          npx nx affected --target=lint --parallel=3 &
          npx nx affected --target=test --parallel=3 --ci &
          npx nx affected --target=build --parallel=3 &
          wait
```

### デプロイパイプライン

```yaml
# .github/workflows/deploy.yml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  deploy-apps:
    name: Deploy affected apps
    runs-on: ubuntu-latest
    environment: production
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: 'npm'

      - run: npm ci

      # 変更されたアプリのみデプロイ
      - name: Deploy affected to Vercel
        run: |
          AFFECTED=$(npx nx show projects --affected --base=HEAD~1 --head=HEAD --type=app)
          for APP in $AFFECTED; do
            echo "Deploying $APP..."
            npx nx run $APP:deploy
          done
        env:
          VERCEL_TOKEN: ${{ secrets.VERCEL_TOKEN }}
          AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
          AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
```

---

## 11. React + Node.js フルスタックモノレポ実例

### ワークスペース構造

```
fullstack-monorepo/
├── apps/
│   ├── web/                    # React SPA (Vite)
│   ├── api/                    # Express API
│   └── web-e2e/                # Playwright E2E
├── libs/
│   ├── shared/
│   │   ├── types/              # 共通TypeScript型定義
│   │   └── utils/              # 共通ユーティリティ
│   ├── web/
│   │   ├── feature-dashboard/  # ダッシュボード画面
│   │   ├── feature-auth/       # 認証画面
│   │   └── ui-components/      # UIコンポーネント
│   └── api/
│       ├── data-access-users/  # ユーザーDB操作
│       └── feature-auth/       # 認証ロジック
├── tools/
│   └── generators/             # カスタムジェネレーター
├── nx.json
├── package.json
└── tsconfig.base.json
```

### 共有型定義ライブラリ

```typescript
// libs/shared/types/src/lib/user.ts
export interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'user' | 'guest';
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateUserDto {
  email: string;
  name: string;
  password: string;
  role?: User['role'];
}

export interface UpdateUserDto {
  name?: string;
  role?: User['role'];
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  hasNextPage: boolean;
}
```

```typescript
// libs/shared/types/src/index.ts
export * from './lib/user';
export * from './lib/auth';
export * from './lib/api-response';
```

### APIサーバー（Express + TypeScript）

```typescript
// apps/api/src/main.ts
import express from 'express';
import cors from 'cors';
import { usersRouter } from './routes/users';
import { authRouter } from './routes/auth';

const app = express();
const port = process.env.PORT || 3000;

app.use(cors({ origin: process.env.WEB_URL || 'http://localhost:4200' }));
app.use(express.json());

app.use('/api/auth', authRouter);
app.use('/api/users', usersRouter);

app.listen(port, () => {
  console.log(`API server running on port ${port}`);
});
```

```typescript
// libs/api/data-access-users/src/lib/users.repository.ts
import { db } from '@my-monorepo/api-db';
import { CreateUserDto, UpdateUserDto, User } from '@my-monorepo/shared-types';

export class UsersRepository {
  async findAll(page = 1, limit = 20): Promise<{ data: User[]; total: number }> {
    const offset = (page - 1) * limit;
    const [data, total] = await Promise.all([
      db.user.findMany({ skip: offset, take: limit, orderBy: { createdAt: 'desc' } }),
      db.user.count(),
    ]);
    return { data, total };
  }

  async findById(id: string): Promise<User | null> {
    return db.user.findUnique({ where: { id } });
  }

  async create(dto: CreateUserDto): Promise<User> {
    return db.user.create({ data: dto });
  }

  async update(id: string, dto: UpdateUserDto): Promise<User> {
    return db.user.update({ where: { id }, data: dto });
  }

  async delete(id: string): Promise<void> {
    await db.user.delete({ where: { id } });
  }
}
```

### Reactフロントエンド

```typescript
// libs/web/feature-dashboard/src/lib/UserList.tsx
import { useEffect, useState } from 'react';
import type { PaginatedResponse, User } from '@my-monorepo/shared-types';
import { UserCard } from '@my-monorepo/web-ui-components';

export function UserList() {
  const [users, setUsers] = useState<PaginatedResponse<User> | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchUsers = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/users?page=${page}&limit=20`);
        const data: PaginatedResponse<User> = await res.json();
        setUsers(data);
      } catch (error) {
        console.error('Failed to fetch users:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchUsers();
  }, [page]);

  if (loading) return <div>Loading...</div>;
  if (!users) return null;

  return (
    <div>
      <h1>Users ({users.total})</h1>
      <div className="grid">
        {users.data.map((user) => (
          <UserCard key={user.id} user={user} />
        ))}
      </div>
      <div className="pagination">
        <button onClick={() => setPage(p => p - 1)} disabled={page === 1}>
          Previous
        </button>
        <span>Page {page}</span>
        <button onClick={() => setPage(p => p + 1)} disabled={!users.hasNextPage}>
          Next
        </button>
      </div>
    </div>
  );
}
```

---

## 12. マイクロフロントエンド構成（Module Federation）

### Module Federationとは

Module Federation（Webpack 5の機能）を使うと、複数の独立したアプリが実行時にコードを動的に共有できる。Nxはこれをサポートする専用のexecutorとジェネレーターを提供している。

### ホスト・リモートアプリの生成

```bash
# ホストアプリを生成
nx generate @nx/react:host \
  --name=shell \
  --remotes=dashboard,profile,settings \
  --directory=apps/mfe/shell \
  --style=scss \
  --bundler=webpack

# 個別のリモートアプリを生成
nx generate @nx/react:remote \
  --name=dashboard \
  --host=shell \
  --directory=apps/mfe/dashboard \
  --style=scss \
  --bundler=webpack
```

### webpack設定の自動生成

```typescript
// apps/mfe/shell/webpack.config.ts（自動生成）
import { composePlugins, withNx, withReact, withModuleFederation } from '@nx/webpack';
import { ModuleFederationConfig } from '@nx/webpack/src/utils/module-federation';

const config: ModuleFederationConfig = {
  name: 'shell',
  remotes: ['dashboard', 'profile', 'settings'],
  shared: (libraryName, defaultConfig) => {
    // Reactは必ずsingleton共有
    if (libraryName === 'react' || libraryName === 'react-dom') {
      return { ...defaultConfig, singleton: true, strictVersion: true };
    }
    return defaultConfig;
  },
};

export default composePlugins(
  withNx(),
  withReact(),
  withModuleFederation(config)
);
```

### 動的リモートの設定

```typescript
// apps/mfe/shell/src/app/app.tsx
import { Suspense, lazy } from 'react';
import { Route, Routes } from 'react-router-dom';
import { loadRemoteModule } from '@nx/react/mfe';

// 動的インポートでリモートを遅延読み込み
const DashboardApp = lazy(() =>
  loadRemoteModule('dashboard', './Module').then((m) => ({
    default: m.RemoteEntryModule,
  }))
);

const ProfileApp = lazy(() =>
  loadRemoteModule('profile', './Module')
);

export function App() {
  return (
    <Routes>
      <Route
        path="/dashboard/*"
        element={
          <Suspense fallback={<div>Loading Dashboard...</div>}>
            <DashboardApp />
          </Suspense>
        }
      />
      <Route
        path="/profile/*"
        element={
          <Suspense fallback={<div>Loading Profile...</div>}>
            <ProfileApp />
          </Suspense>
        }
      />
    </Routes>
  );
}
```

### MFEの個別開発・デプロイ

```bash
# シェルと全リモートを同時起動（開発時）
nx serve shell

# リモート単体で起動（独立開発）
nx serve dashboard

# 本番ビルド（並列）
nx run-many --target=build --projects=shell,dashboard,profile,settings --parallel=4

# 個別リモートのみデプロイ
nx affected --target=deploy --base=main
```

---

## 13. バージョン管理とリリース（nx release）

### nx releaseの概要

Nx 17以降、`nx release`コマンドでモノレポ内のパッケージのバージョン管理とリリースを自動化できる。

```json
// nx.json
{
  "release": {
    "projects": ["libs/*"],
    "changelog": {
      "workspaceChangelog": {
        "createRelease": "github"
      },
      "projectChangelogs": true
    },
    "releaseTagPattern": "v{version}",
    "version": {
      "generatorOptions": {
        "updateDependents": "auto"
      }
    }
  }
}
```

### バージョン管理フロー

```bash
# ドライランで確認
nx release version --dry-run

# パッチバージョンをバンプ
nx release version patch

# マイナーバージョンをバンプ
nx release version minor

# メジャーバージョンをバンプ
nx release version major

# 特定バージョンに設定
nx release version 2.0.0

# CHANGELOG生成
nx release changelog 2.0.0

# NPMに公開
nx release publish

# すべてを一括実行
nx release --first-release
```

### セマンティックバージョニングの自動化

```json
// nx.json
{
  "release": {
    "version": {
      "conventionalCommits": true
    },
    "changelog": {
      "workspaceChangelog": {
        "createRelease": "github",
        "entryWhenNoChanges": "This was a version bump only, no significant changes were made."
      }
    }
  }
}
```

```yaml
# .github/workflows/release.yml
name: Release

on:
  push:
    branches: [main]

permissions:
  contents: write
  id-token: write

jobs:
  release:
    runs-on: ubuntu-latest
    if: "!contains(github.event.head_commit.message, 'chore: release')"
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
          token: ${{ secrets.GITHUB_TOKEN }}

      - uses: actions/setup-node@v4
        with:
          node-version: 22
          registry-url: 'https://registry.npmjs.org'
          cache: 'npm'

      - run: npm ci

      - name: Configure git
        run: |
          git config user.email "ci@my-company.com"
          git config user.name "CI Bot"

      - name: Version and release
        run: npx nx release --yes
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```

---

## まとめ — Nxで実現するスケーラブルな開発体制

Nxが提供する価値を整理しよう。

**開発速度の向上**
- `affected`コマンドで変更箇所のみビルド・テスト。1000プロジェクトのモノレポでも、変更した3プロジェクトのみが対象になる
- ローカル・リモートキャッシュで同じビルドを二度実行しない
- コードジェネレーターで標準化されたコードを瞬時に生成

**アーキテクチャの保護**
- モジュール境界ルールで「feature層がutil層を参照してはいけない」などの制約をCIで自動チェック
- タグシステムでスコープを分離し、admin用コードがmarketing側に漏れるのを防ぐ

**チームのスケーラビリティ**
- 依存グラフの可視化でプロジェクト全体の見通しを保つ
- `nx release`でセマンティックバージョニングとCHANGELOG生成を自動化

**CI/CDの効率化**
- GitHub ActionsとNx Cloudを組み合わせ、PRごとに変更されたプロジェクトのみを検証
- 分散キャッシュでチームメンバー全員がビルド結果を共有

モノレポの導入は初期コストがかかるが、プロジェクトが3〜4個を超えた時点でNxの恩恵が顕著になる。特に、TypeScriptの型定義を共有ライブラリに集約することで、フロントエンドとバックエンドのAPI型不一致バグがゼロになる体験は一度試すと手放せない。

---

Nxの設定ファイル（`nx.json`、`project.json`）はJSONが複雑になりがちだ。設定を手書きする前に **[DevToolBox](https://usedevtools.com/)** のJSONバリデーターでスキーマエラーを事前チェックしておくと、設定ミスによるビルド失敗を大幅に削減できる。JSON整形・スキーマ検証・差分比較など開発効率化ツールが揃っているので、Nx設定の作業と組み合わせて活用してほしい。
