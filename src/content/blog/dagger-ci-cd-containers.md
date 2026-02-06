---
title: 'Dagger CI/CD実践ガイド - コンテナベースパイプライン構築'
description: 'Daggerを使ったコンテナベースCI/CD構築を実践的に解説。TypeScript SDK、ポータブルCI、マルチプラットフォームビルド、GitHub Actions統合を習得'
pubDate: '2025-02-06'
tags: ['Dagger', 'CI/CD', 'Docker', 'TypeScript', 'DevOps']
---

# Dagger CI/CD実践ガイド - コンテナベースパイプライン構築

Daggerは、コンテナベースのプログラマブルCI/CDエンジンです。YAMLではなくTypeScript/Go/Pythonでパイプラインを記述し、ローカルでもCIでも同じように実行できます。

本ガイドでは、TypeScript SDKを使った実践的なパイプライン構築を中心に解説します。

## Daggerのコンテナベースアーキテクチャ

### 実行フロー

```
┌──────────────────────────────────┐
│  開発者マシン / CI環境           │
│                                  │
│  ┌────────────────────────────┐ │
│  │  dagger call               │ │
│  │  (CLI Command)             │ │
│  └────────────┬───────────────┘ │
│               │                  │
│  ┌────────────▼───────────────┐ │
│  │  Dagger Engine             │ │
│  │  (BuildKit Container)      │ │
│  │  - DAG構築                  │ │
│  │  - キャッシュ管理           │ │
│  │  - 並列実行                 │ │
│  └────────────┬───────────────┘ │
└───────────────┼──────────────────┘
                │
                ▼
┌──────────────────────────────────┐
│  コンテナ実行環境                │
│  - ビルドコンテナ                │
│  - テストコンテナ                │
│  - デプロイコンテナ              │
└──────────────────────────────────┘
```

## プロジェクトセットアップ

### TypeScript SDKプロジェクト初期化

```bash
# プロジェクトディレクトリ作成
mkdir my-dagger-pipeline && cd my-dagger-pipeline

# Dagger初期化
dagger init --sdk=typescript --name=my-pipeline

# 依存関係インストール
cd dagger
npm install
```

### プロジェクト構造

```
my-dagger-pipeline/
├── dagger/
│   ├── src/
│   │   └── index.ts        # パイプライン定義
│   ├── package.json
│   └── tsconfig.json
├── src/                     # アプリケーションコード
├── tests/
├── Dockerfile
└── package.json
```

## TypeScript SDKでのパイプライン構築

### 基本的なビルドパイプライン

```typescript
// dagger/src/index.ts
import { dag, Container, Directory, object, func } from "@dagger.io/dagger"

@object()
class MyPipeline {
  /**
   * ソースコードをビルド
   */
  @func()
  async build(source: Directory): Promise<Container> {
    return dag
      .container()
      .from("node:20-alpine")
      .withDirectory("/app", source, {
        exclude: ["node_modules", ".git", "dagger"],
      })
      .withWorkdir("/app")
      .withExec(["npm", "ci"])
      .withExec(["npm", "run", "build"])
  }

  /**
   * ビルド成果物をディレクトリとして取得
   */
  @func()
  async buildArtifacts(source: Directory): Promise<Directory> {
    const container = await this.build(source)
    return container.directory("/app/dist")
  }

  /**
   * ビルド成果物をローカルにエクスポート
   */
  @func()
  async exportBuild(source: Directory, dest: string): Promise<string> {
    const artifacts = await this.buildArtifacts(source)
    await artifacts.export(dest)
    return `Build exported to ${dest}`
  }
}
```

### 実行

```bash
# ビルド実行
dagger call build --source=..

# 成果物エクスポート
dagger call export-build --source=.. --dest=./dist

# 特定の関数をチェーン
dagger call build --source=.. build-artifacts
```

## マルチステージビルド戦略

### 最適化されたコンテナビルド

```typescript
@object()
class OptimizedBuild {
  /**
   * マルチステージビルド
   */
  @func()
  async buildProduction(source: Directory): Promise<Container> {
    // ステージ1: 依存関係インストール
    const dependencies = dag
      .container()
      .from("node:20-alpine")
      .withDirectory("/app", source, {
        include: ["package.json", "package-lock.json"],
      })
      .withWorkdir("/app")
      .withExec(["npm", "ci", "--production"])

    // ステージ2: ビルド
    const builder = dag
      .container()
      .from("node:20-alpine")
      .withDirectory("/app", source, {
        exclude: ["node_modules", ".git", "dagger"],
      })
      .withWorkdir("/app")
      .withExec(["npm", "ci"])
      .withExec(["npm", "run", "build"])

    // ステージ3: 実行環境
    return dag
      .container()
      .from("node:20-alpine")
      .withDirectory("/app/node_modules", dependencies.directory("/app/node_modules"))
      .withDirectory("/app/dist", builder.directory("/app/dist"))
      .withFile("/app/package.json", source.file("package.json"))
      .withWorkdir("/app")
      .withEntrypoint(["node", "dist/index.js"])
      .withExposedPort(3000)
  }

  /**
   * Dockerイメージとして公開
   */
  @func()
  async publish(
    source: Directory,
    registry: string,
    tag: string = "latest"
  ): Promise<string> {
    const container = await this.buildProduction(source)
    const imageRef = `${registry}/my-app:${tag}`

    return await container.publish(imageRef)
  }
}
```

## テストパイプライン

### 並列テスト実行

```typescript
@object()
class TestPipeline {
  /**
   * すべてのテストを並列実行
   */
  @func()
  async testAll(source: Directory): Promise<TestResults> {
    const [unit, integration, e2e] = await Promise.all([
      this.unitTests(source),
      this.integrationTests(source),
      this.e2eTests(source),
    ])

    return {
      unit,
      integration,
      e2e,
      passed: unit.passed && integration.passed && e2e.passed,
    }
  }

  /**
   * ユニットテスト
   */
  @func()
  async unitTests(source: Directory): Promise<TestResult> {
    const output = await dag
      .container()
      .from("node:20-alpine")
      .withDirectory("/app", source)
      .withWorkdir("/app")
      .withExec(["npm", "ci"])
      .withExec(["npm", "run", "test:unit", "--", "--ci"])
      .stdout()

    return {
      name: "Unit Tests",
      output,
      passed: !output.includes("FAIL"),
    }
  }

  /**
   * 統合テスト（データベース付き）
   */
  @func()
  async integrationTests(source: Directory): Promise<TestResult> {
    // PostgreSQLサービス起動
    const postgres = dag
      .container()
      .from("postgres:16-alpine")
      .withEnvVariable("POSTGRES_PASSWORD", "testpass")
      .withEnvVariable("POSTGRES_DB", "testdb")
      .withExposedPort(5432)
      .asService()

    // Redisサービス起動
    const redis = dag
      .container()
      .from("redis:7-alpine")
      .withExposedPort(6379)
      .asService()

    const output = await dag
      .container()
      .from("node:20-alpine")
      .withServiceBinding("postgres", postgres)
      .withServiceBinding("redis", redis)
      .withDirectory("/app", source)
      .withWorkdir("/app")
      .withEnvVariable("DATABASE_URL", "postgres://postgres:testpass@postgres:5432/testdb")
      .withEnvVariable("REDIS_URL", "redis://redis:6379")
      .withExec(["npm", "ci"])
      .withExec(["npm", "run", "test:integration"])
      .stdout()

    return {
      name: "Integration Tests",
      output,
      passed: !output.includes("FAIL"),
    }
  }

  /**
   * E2Eテスト（Playwright）
   */
  @func()
  async e2eTests(source: Directory): Promise<TestResult> {
    // アプリケーションサービス起動
    const app = dag
      .container()
      .from("node:20-alpine")
      .withDirectory("/app", source)
      .withWorkdir("/app")
      .withExec(["npm", "ci"])
      .withExec(["npm", "run", "build"])
      .withExec(["npm", "run", "start"])
      .withExposedPort(3000)
      .asService()

    const output = await dag
      .container()
      .from("mcr.microsoft.com/playwright:v1.40.0")
      .withServiceBinding("app", app)
      .withDirectory("/work", source)
      .withWorkdir("/work")
      .withEnvVariable("BASE_URL", "http://app:3000")
      .withExec(["npm", "ci"])
      .withExec(["npx", "playwright", "test"])
      .stdout()

    return {
      name: "E2E Tests",
      output,
      passed: !output.includes("failed"),
    }
  }
}

interface TestResult {
  name: string
  output: string
  passed: boolean
}

interface TestResults {
  unit: TestResult
  integration: TestResult
  e2e: TestResult
  passed: boolean
}
```

## コード品質チェック

### Lint と型チェック

```typescript
@object()
class QualityPipeline {
  /**
   * すべての品質チェックを実行
   */
  @func()
  async checkAll(source: Directory): Promise<QualityReport> {
    const [lint, typeCheck, format, security] = await Promise.all([
      this.lint(source),
      this.typeCheck(source),
      this.formatCheck(source),
      this.securityScan(source),
    ])

    return {
      lint,
      typeCheck,
      format,
      security,
      passed: lint.passed && typeCheck.passed && format.passed && security.passed,
    }
  }

  /**
   * ESLint実行
   */
  @func()
  async lint(source: Directory): Promise<CheckResult> {
    const output = await dag
      .container()
      .from("node:20-alpine")
      .withDirectory("/app", source)
      .withWorkdir("/app")
      .withExec(["npm", "ci"])
      .withExec(["npm", "run", "lint"])
      .stdout()

    return {
      name: "ESLint",
      output,
      passed: !output.includes("error"),
    }
  }

  /**
   * TypeScript型チェック
   */
  @func()
  async typeCheck(source: Directory): Promise<CheckResult> {
    const output = await dag
      .container()
      .from("node:20-alpine")
      .withDirectory("/app", source)
      .withWorkdir("/app")
      .withExec(["npm", "ci"])
      .withExec(["npx", "tsc", "--noEmit"])
      .stdout()

    return {
      name: "TypeScript",
      output,
      passed: !output.includes("error"),
    }
  }

  /**
   * コードフォーマットチェック
   */
  @func()
  async formatCheck(source: Directory): Promise<CheckResult> {
    const output = await dag
      .container()
      .from("node:20-alpine")
      .withDirectory("/app", source)
      .withWorkdir("/app")
      .withExec(["npm", "ci"])
      .withExec(["npm", "run", "format:check"])
      .stdout()

    return {
      name: "Prettier",
      output,
      passed: output.includes("All matched files use Prettier"),
    }
  }

  /**
   * セキュリティスキャン
   */
  @func()
  async securityScan(source: Directory): Promise<CheckResult> {
    const output = await dag
      .container()
      .from("node:20-alpine")
      .withDirectory("/app", source)
      .withWorkdir("/app")
      .withExec(["npm", "ci"])
      .withExec(["npm", "audit", "--audit-level=moderate"])
      .stdout()

    return {
      name: "npm audit",
      output,
      passed: !output.includes("vulnerabilities"),
    }
  }
}

interface CheckResult {
  name: string
  output: string
  passed: boolean
}

interface QualityReport {
  lint: CheckResult
  typeCheck: CheckResult
  format: CheckResult
  security: CheckResult
  passed: boolean
}
```

## キャッシュ戦略

### レイヤーキャッシュ最適化

```typescript
@object()
class CachedBuild {
  /**
   * キャッシュを活用したビルド
   */
  @func()
  async buildWithCache(source: Directory): Promise<Container> {
    // node_modulesキャッシュボリューム
    const nodeModulesCache = dag.cacheVolume("node-modules")

    // ビルドキャッシュボリューム
    const buildCache = dag.cacheVolume("build-cache")

    return dag
      .container()
      .from("node:20-alpine")
      .withDirectory("/app", source, {
        exclude: ["node_modules", "dist", ".git"],
      })
      .withWorkdir("/app")
      // node_modulesをキャッシュマウント
      .withMountedCache("/app/node_modules", nodeModulesCache)
      // Next.js .nextキャッシュ
      .withMountedCache("/app/.next/cache", buildCache)
      .withExec(["npm", "ci"])
      .withExec(["npm", "run", "build"])
  }

  /**
   * 段階的なキャッシング
   */
  @func()
  async buildLayered(source: Directory): Promise<Container> {
    const base = dag
      .container()
      .from("node:20-alpine")
      .withWorkdir("/app")

    // 依存関係レイヤー（変更頻度低）
    const withDeps = base
      .withFile("/app/package.json", source.file("package.json"))
      .withFile("/app/package-lock.json", source.file("package-lock.json"))
      .withExec(["npm", "ci"])

    // ソースコードレイヤー（変更頻度高）
    const withSource = withDeps
      .withDirectory("/app/src", source.directory("src"))
      .withDirectory("/app/public", source.directory("public"))

    // ビルドレイヤー
    return withSource.withExec(["npm", "run", "build"])
  }
}
```

## マルチプラットフォームビルド

### クロスプラットフォームイメージ

```typescript
@object()
class MultiPlatformBuild {
  /**
   * 複数アーキテクチャ向けビルド
   */
  @func()
  async buildMultiPlatform(
    source: Directory,
    platforms: string[] = ["linux/amd64", "linux/arm64"]
  ): Promise<string[]> {
    const builds = platforms.map((platform) =>
      this.buildForPlatform(source, platform)
    )

    return await Promise.all(builds)
  }

  /**
   * 特定プラットフォーム向けビルド
   */
  @func()
  async buildForPlatform(
    source: Directory,
    platform: string
  ): Promise<string> {
    const container = dag
      .container({ platform: platform as Platform })
      .from("node:20-alpine")
      .withDirectory("/app", source, {
        exclude: ["node_modules", ".git"],
      })
      .withWorkdir("/app")
      .withExec(["npm", "ci"])
      .withExec(["npm", "run", "build"])

    // プラットフォーム固有のタグ
    const tag = platform.replace("/", "-")
    return await container.publish(`myregistry/myapp:${tag}`)
  }

  /**
   * マルチアーキテクチャマニフェスト作成
   */
  @func()
  async publishMultiArch(
    source: Directory,
    registry: string,
    tag: string = "latest"
  ): Promise<string> {
    const platforms = ["linux/amd64", "linux/arm64"]

    // 各プラットフォーム向けビルド
    const images = await Promise.all(
      platforms.map(async (platform) => {
        const container = dag
          .container({ platform: platform as Platform })
          .from("node:20-alpine")
          .withDirectory("/app", source)
          .withWorkdir("/app")
          .withExec(["npm", "ci"])
          .withExec(["npm", "run", "build"])

        return container
      })
    )

    // マルチアーキテクチャマニフェスト作成
    const manifestRef = `${registry}/myapp:${tag}`

    // イメージを並列プッシュ
    await Promise.all(
      images.map((img, i) =>
        img.publish(`${manifestRef}-${platforms[i].replace("/", "-")}`)
      )
    )

    return manifestRef
  }
}

type Platform = "linux/amd64" | "linux/arm64" | "darwin/amd64" | "darwin/arm64"
```

## CI/CD統合

### GitHub Actions

```yaml
# .github/workflows/ci.yml
name: CI/CD Pipeline

on:
  push:
    branches: [main, develop]
  pull_request:

jobs:
  quality:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Dagger
        uses: dagger/dagger-for-github@v5

      - name: Run Quality Checks
        run: dagger call check-all --source=.

  test:
    runs-on: ubuntu-latest
    needs: quality
    steps:
      - uses: actions/checkout@v4

      - name: Setup Dagger
        uses: dagger/dagger-for-github@v5

      - name: Run Tests
        run: dagger call test-all --source=.

  build:
    runs-on: ubuntu-latest
    needs: test
    steps:
      - uses: actions/checkout@v4

      - name: Setup Dagger
        uses: dagger/dagger-for-github@v5

      - name: Build Application
        run: dagger call build --source=.

  deploy:
    runs-on: ubuntu-latest
    needs: build
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v4

      - name: Setup Dagger
        uses: dagger/dagger-for-github@v5

      - name: Build and Push Image
        run: |
          dagger call publish \
            --source=. \
            --registry=ghcr.io/${{ github.repository }} \
            --tag=${{ github.sha }}

      - name: Deploy to Production
        run: |
          dagger call deploy \
            --image=ghcr.io/${{ github.repository }}:${{ github.sha }} \
            --environment=production
```

### シークレット管理

```typescript
@object()
class DeploymentPipeline {
  /**
   * 本番環境へのデプロイ
   */
  @func()
  async deploy(
    image: string,
    environment: string,
    kubeconfig: Secret,
    registryToken: Secret
  ): Promise<string> {
    return await dag
      .container()
      .from("bitnami/kubectl:latest")
      .withSecretVariable("KUBECONFIG_CONTENT", kubeconfig)
      .withSecretVariable("REGISTRY_TOKEN", registryToken)
      .withExec([
        "sh",
        "-c",
        `
        echo "$KUBECONFIG_CONTENT" > /tmp/kubeconfig
        export KUBECONFIG=/tmp/kubeconfig
        kubectl set image deployment/myapp myapp=${image} -n ${environment}
        kubectl rollout status deployment/myapp -n ${environment}
        `,
      ])
      .stdout()
  }
}
```

```bash
# GitHub Actionsでシークレットを使用
dagger call deploy \
  --image=ghcr.io/myorg/myapp:latest \
  --environment=production \
  --kubeconfig=env:KUBECONFIG \
  --registry-token=env:REGISTRY_TOKEN
```

## まとめ

Daggerのコンテナベースアプローチは以下を実現します:

1. **ポータブル** - ローカルとCIで同じコード実行
2. **再現可能** - コンテナベースで環境一貫性
3. **型安全** - TypeScriptの型システムを活用
4. **高速** - レイヤーキャッシュと並列実行
5. **CI/CD非依存** - プラットフォームに依存しない

Daggerは、複雑なCI/CDパイプラインをコードとして管理し、ローカルで即座にテストできる強力なツールです。YAMLからコードへの移行により、より柔軟で保守性の高いCI/CDを実現できます。
