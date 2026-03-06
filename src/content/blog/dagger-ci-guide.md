---
title: 'Dagger CI/CD完全ガイド - プログラマブルなCI/CDパイプライン'
description: 'Daggerを使ったCI/CD構築を徹底解説。コンテナベースパイプライン、Go/TypeScript/Python SDK、ローカル実行、GitHub Actions統合、再現可能なビルドを習得しよう。Dagger・CICD・Dockerに関する実践情報。'
pubDate: '2026-02-05'
tags: ['Dagger', 'CICD', 'Docker', 'DevOps']
---

Daggerは、コンテナベースのプログラマブルCI/CDエンジンです。YAMLではなくコード（Go、TypeScript、Python）でパイプラインを記述し、ローカルでもCIでも同じように実行できます。

## Daggerとは

### 主な特徴

1. **コードでパイプライン記述** - Go、TypeScript、Pythonで記述
2. **再現可能** - ローカルとCIで同じコンテナ環境
3. **高速** - レイヤーキャッシュと並列実行
4. **ポータブル** - CI/CDプラットフォーム非依存
5. **型安全** - 各言語の型システムを活用
6. **デバッグ可能** - ローカルで即座に検証

### アーキテクチャ

```
┌─────────────────┐
│  Your Code      │
│  (Go/TS/Python) │
└────────┬────────┘
         │ Dagger SDK
         ▼
┌─────────────────┐
│  Dagger Engine  │
│  (BuildKit)     │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Containers     │
│  (Execution)    │
└─────────────────┘
```

## セットアップ

### Dagger CLIインストール

```bash
# macOS (Homebrew)
brew install dagger/tap/dagger

# Linux
curl -L https://dl.dagger.io/dagger/install.sh | sh

# Windows (PowerShell)
iwr https://dl.dagger.io/dagger/install.ps1 -useb | iex

# バージョン確認
dagger version
```

### プロジェクト初期化

```bash
# プロジェクトディレクトリ作成
mkdir my-dagger-project && cd my-dagger-project

# Dagger初期化（言語選択）
dagger init --sdk=go
# または
dagger init --sdk=typescript
# または
dagger init --sdk=python
```

## TypeScriptでのパイプライン

### 基本的なビルド

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
      .withDirectory("/app", source)
      .withWorkdir("/app")
      .withExec(["npm", "install"])
      .withExec(["npm", "run", "build"])
  }

  /**
   * テスト実行
   */
  @func()
  async test(source: Directory): Promise<string> {
    const output = await dag
      .container()
      .from("node:20-alpine")
      .withDirectory("/app", source)
      .withWorkdir("/app")
      .withExec(["npm", "install"])
      .withExec(["npm", "test"])
      .stdout()

    return output
  }

  /**
   * ビルド成果物をエクスポート
   */
  @func()
  async export(source: Directory, dest: string): Promise<string> {
    const container = await this.build(source)

    await container
      .directory("/app/dist")
      .export(dest)

    return `Exported to ${dest}`
  }
}
```

### 実行

```bash
# ビルド実行
dagger call build --source=.

# テスト実行
dagger call test --source=.

# 成果物エクスポート
dagger call export --source=. --dest=./dist
```

### Dockerイメージのビルドとプッシュ

```typescript
// dagger/src/index.ts
@object()
class DockerPipeline {
  /**
   * Dockerイメージをビルド
   */
  @func()
  async buildImage(
    source: Directory,
    tag: string = "latest"
  ): Promise<Container> {
    return dag
      .container()
      .from("node:20-alpine")
      .withDirectory("/app", source, {
        exclude: ["node_modules", "dist", ".git"]
      })
      .withWorkdir("/app")
      .withExec(["npm", "install", "--production"])
      .withExec(["npm", "run", "build"])
      .withEntrypoint(["node", "dist/index.js"])
      .withLabel("org.opencontainers.image.title", "my-app")
      .withLabel("org.opencontainers.image.version", tag)
  }

  /**
   * イメージをレジストリにプッシュ
   */
  @func()
  async publish(
    source: Directory,
    registry: string,
    username: string,
    password: string,
    tag: string = "latest"
  ): Promise<string> {
    const image = await this.buildImage(source, tag)

    const address = await image
      .withRegistryAuth(registry, username, password)
      .publish(`${registry}/my-app:${tag}`)

    return address
  }
}
```

### 並列実行

```typescript
@object()
class ParallelPipeline {
  /**
   * 複数のテストを並列実行
   */
  @func()
  async testAll(source: Directory): Promise<string> {
    // 並列実行
    const [unitTests, integrationTests, e2eTests] = await Promise.all([
      this.runUnitTests(source),
      this.runIntegrationTests(source),
      this.runE2ETests(source)
    ])

    return `All tests passed:\n${unitTests}\n${integrationTests}\n${e2eTests}`
  }

  private async runUnitTests(source: Directory): Promise<string> {
    return await dag
      .container()
      .from("node:20-alpine")
      .withDirectory("/app", source)
      .withWorkdir("/app")
      .withExec(["npm", "install"])
      .withExec(["npm", "run", "test:unit"])
      .stdout()
  }

  private async runIntegrationTests(source: Directory): Promise<string> {
    return await dag
      .container()
      .from("node:20-alpine")
      .withDirectory("/app", source)
      .withWorkdir("/app")
      .withExec(["npm", "install"])
      .withExec(["npm", "run", "test:integration"])
      .stdout()
  }

  private async runE2ETests(source: Directory): Promise<string> {
    return await dag
      .container()
      .from("mcr.microsoft.com/playwright:v1.40.0")
      .withDirectory("/app", source)
      .withWorkdir("/app")
      .withExec(["npm", "install"])
      .withExec(["npx", "playwright", "test"])
      .stdout()
  }
}
```

## Goでのパイプライン

### プロジェクトセットアップ

```bash
dagger init --sdk=go
cd dagger
go mod tidy
```

### 基本的なビルド

```go
// dagger/main.go
package main

import (
	"context"
	"fmt"
)

type MyPipeline struct{}

// ソースコードをビルド
func (m *MyPipeline) Build(ctx context.Context, source *Directory) (*Container, error) {
	return dag.Container().
		From("golang:1.21-alpine").
		WithDirectory("/src", source).
		WithWorkdir("/src").
		WithExec([]string{"go", "build", "-o", "app", "."}).
		Sync(ctx)
}

// テスト実行
func (m *MyPipeline) Test(ctx context.Context, source *Directory) (string, error) {
	return dag.Container().
		From("golang:1.21-alpine").
		WithDirectory("/src", source).
		WithWorkdir("/src").
		WithExec([]string{"go", "test", "./..."}).
		Stdout(ctx)
}

// バイナリをエクスポート
func (m *MyPipeline) Export(ctx context.Context, source *Directory) (*File, error) {
	container, err := m.Build(ctx, source)
	if err != nil {
		return nil, err
	}

	return container.File("/src/app"), nil
}
```

### マルチステージビルド

```go
func (m *MyPipeline) BuildOptimized(ctx context.Context, source *Directory) (*Container, error) {
	// ビルドステージ
	builder := dag.Container().
		From("golang:1.21-alpine").
		WithDirectory("/src", source).
		WithWorkdir("/src").
		WithExec([]string{"go", "mod", "download"}).
		WithExec([]string{"go", "build", "-o", "app", "."})

	// 実行ステージ
	return dag.Container().
		From("alpine:latest").
		WithFile("/app", builder.File("/src/app")).
		WithEntrypoint([]string{"/app"}).
		Sync(ctx)
}
```

### サービス統合（データベース）

```go
func (m *MyPipeline) TestWithDatabase(ctx context.Context, source *Directory) (string, error) {
	// PostgreSQLサービス起動
	postgres := dag.Container().
		From("postgres:16-alpine").
		WithEnvVariable("POSTGRES_PASSWORD", "testpass").
		WithEnvVariable("POSTGRES_DB", "testdb").
		WithExposedPort(5432).
		AsService()

	// テスト実行（データベース接続）
	return dag.Container().
		From("golang:1.21-alpine").
		WithServiceBinding("postgres", postgres).
		WithDirectory("/src", source).
		WithWorkdir("/src").
		WithEnvVariable("DATABASE_URL", "postgres://postgres:testpass@postgres:5432/testdb").
		WithExec([]string{"go", "test", "./..."}).
		Stdout(ctx)
}
```

## Pythonでのパイプライン

### プロジェクトセットアップ

```bash
dagger init --sdk=python
cd dagger
pip install -e .
```

### 基本的なビルド

```python
# dagger/src/main.py
import dagger
from dagger import dag, function, object_type

@object_type
class MyPipeline:
    @function
    async def build(self, source: dagger.Directory) -> dagger.Container:
        """ソースコードをビルド"""
        return (
            dag.container()
            .from_("python:3.12-slim")
            .with_directory("/app", source)
            .with_workdir("/app")
            .with_exec(["pip", "install", "-r", "requirements.txt"])
        )

    @function
    async def test(self, source: dagger.Directory) -> str:
        """テスト実行"""
        return await (
            dag.container()
            .from_("python:3.12-slim")
            .with_directory("/app", source)
            .with_workdir("/app")
            .with_exec(["pip", "install", "-r", "requirements.txt"])
            .with_exec(["pytest", "--verbose"])
            .stdout()
        )

    @function
    async def lint(self, source: dagger.Directory) -> str:
        """リント実行"""
        return await (
            dag.container()
            .from_("python:3.12-slim")
            .with_directory("/app", source)
            .with_workdir("/app")
            .with_exec(["pip", "install", "ruff"])
            .with_exec(["ruff", "check", "."])
            .stdout()
        )
```

### Django アプリケーション

```python
@object_type
class DjangoPipeline:
    @function
    async def migrate(self, source: dagger.Directory) -> str:
        """マイグレーション実行"""
        postgres = (
            dag.container()
            .from_("postgres:16-alpine")
            .with_env_variable("POSTGRES_PASSWORD", "password")
            .with_env_variable("POSTGRES_DB", "mydb")
            .with_exposed_port(5432)
            .as_service()
        )

        return await (
            dag.container()
            .from_("python:3.12-slim")
            .with_service_binding("postgres", postgres)
            .with_directory("/app", source)
            .with_workdir("/app")
            .with_exec(["pip", "install", "-r", "requirements.txt"])
            .with_env_variable("DATABASE_URL", "postgres://postgres:password@postgres:5432/mydb")
            .with_exec(["python", "manage.py", "migrate"])
            .stdout()
        )

    @function
    async def collect_static(self, source: dagger.Directory) -> dagger.Directory:
        """静的ファイル収集"""
        container = (
            dag.container()
            .from_("python:3.12-slim")
            .with_directory("/app", source)
            .with_workdir("/app")
            .with_exec(["pip", "install", "-r", "requirements.txt"])
            .with_exec(["python", "manage.py", "collectstatic", "--noinput"])
        )

        return container.directory("/app/staticfiles")
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

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Dagger
        uses: dagger/dagger-for-github@v5

      - name: Run Tests
        run: dagger call test --source=.

      - name: Build
        run: dagger call build --source=.

      - name: Publish Image
        if: github.ref == 'refs/heads/main'
        run: |
          dagger call publish \
            --source=. \
            --registry=ghcr.io \
            --username=${{ github.actor }} \
            --password=${{ secrets.GITHUB_TOKEN }} \
            --tag=${{ github.sha }}
```

### GitLab CI

```yaml
# .gitlab-ci.yml
stages:
  - test
  - build
  - deploy

variables:
  DAGGER_VERSION: "0.9.0"

before_script:
  - curl -L https://dl.dagger.io/dagger/install.sh | sh

test:
  stage: test
  script:
    - dagger call test --source=.

build:
  stage: build
  script:
    - dagger call build --source=.

deploy:
  stage: deploy
  only:
    - main
  script:
    - |
      dagger call publish \
        --source=. \
        --registry=$CI_REGISTRY \
        --username=$CI_REGISTRY_USER \
        --password=$CI_REGISTRY_PASSWORD \
        --tag=$CI_COMMIT_SHA
```

### CircleCI

```yaml
# .circleci/config.yml
version: 2.1

jobs:
  test:
    docker:
      - image: cimg/base:stable
    steps:
      - checkout
      - run:
          name: Install Dagger
          command: curl -L https://dl.dagger.io/dagger/install.sh | sh
      - run:
          name: Run tests
          command: dagger call test --source=.

  build:
    docker:
      - image: cimg/base:stable
    steps:
      - checkout
      - run:
          name: Install Dagger
          command: curl -L https://dl.dagger.io/dagger/install.sh | sh
      - run:
          name: Build
          command: dagger call build --source=.

workflows:
  version: 2
  test-and-build:
    jobs:
      - test
      - build:
          requires:
            - test
```

## キャッシュ最適化

### レイヤーキャッシュ

```typescript
@object()
class OptimizedPipeline {
  /**
   * キャッシュを最大限活用
   */
  @func()
  async build(source: Directory): Promise<Container> {
    return dag
      .container()
      .from("node:20-alpine")
      .withDirectory("/app", source)
      .withWorkdir("/app")
      // package.jsonだけを先にコピー（依存関係レイヤー）
      .withFile("package.json", source.file("package.json"))
      .withFile("package-lock.json", source.file("package-lock.json"))
      .withExec(["npm", "ci"])
      // ソースコードコピー（頻繁に変更される）
      .withDirectory("/app/src", source.directory("src"))
      .withExec(["npm", "run", "build"])
  }
}
```

### カスタムキャッシュ

```typescript
@object()
class CachedPipeline {
  /**
   * カスタムキャッシュディレクトリ
   */
  @func()
  async buildWithCache(source: Directory): Promise<Container> {
    const cacheVolume = dag.cacheVolume("node-modules")

    return dag
      .container()
      .from("node:20-alpine")
      .withDirectory("/app", source)
      .withWorkdir("/app")
      .withMountedCache("/app/node_modules", cacheVolume)
      .withExec(["npm", "install"])
      .withExec(["npm", "run", "build"])
  }
}
```

## シークレット管理

### シークレット使用

```typescript
@object()
class SecurePipeline {
  /**
   * シークレットを安全に使用
   */
  @func()
  async deploy(
    source: Directory,
    apiKey: Secret,
    token: Secret
  ): Promise<string> {
    return await dag
      .container()
      .from("alpine:latest")
      .withDirectory("/app", source)
      .withWorkdir("/app")
      .withSecretVariable("API_KEY", apiKey)
      .withSecretVariable("DEPLOY_TOKEN", token)
      .withExec(["sh", "-c", "deploy.sh"])
      .stdout()
  }
}
```

```bash
# シークレットをCLIで渡す
dagger call deploy \
  --source=. \
  --api-key=env:API_KEY \
  --token=file:./token.txt
```

## デバッグ

### インタラクティブシェル

```typescript
@object()
class DebugPipeline {
  /**
   * デバッグ用シェル
   */
  @func()
  async debug(source: Directory): Promise<Container> {
    return dag
      .container()
      .from("node:20-alpine")
      .withDirectory("/app", source)
      .withWorkdir("/app")
      .withExec(["npm", "install"])
      .terminal() // インタラクティブシェル起動
  }
}
```

```bash
# デバッグシェル起動
dagger call debug --source=.
```

### ログ出力

```go
func (m *MyPipeline) BuildWithLogs(ctx context.Context, source *Directory) (*Container, error) {
	container := dag.Container().
		From("golang:1.21-alpine").
		WithDirectory("/src", source).
		WithWorkdir("/src")

	// 進捗ログ
	fmt.Println("Installing dependencies...")
	container = container.WithExec([]string{"go", "mod", "download"})

	fmt.Println("Building application...")
	container = container.WithExec([]string{"go", "build", "-o", "app", "."})

	fmt.Println("Build completed!")

	return container.Sync(ctx)
}
```

## まとめ

Daggerは以下を実現します:

1. **コードでCI/CD** - YAML不要、プログラミング言語で記述
2. **再現可能** - ローカルとCIで同じ環境
3. **高速** - レイヤーキャッシュと並列実行
4. **ポータブル** - CI/CDプラットフォーム非依存
5. **デバッグ可能** - ローカルで即座にテスト
6. **型安全** - コンパイル時エラー検出

Daggerは、CI/CDパイプラインの再現性、デバッグ容易性、ポータビリティを大幅に向上させます。YAMLの限界を感じている開発者、複数のCI/CDプラットフォーム間で移行を考えている開発者に最適です。
