---
title: "GitHub ActionsでモノレポのCI/CDを構築する実践テクニック"
description: "モノレポ環境でのGitHub Actions活用法を徹底解説。パス指定トリガー、マトリックスビルド、キャッシュ戦略、Changesetsによる自動リリースまで網羅します。"
pubDate: "2026-02-05"
tags: ["GitHub Actions", "CI/CD", "Monorepo", "DevOps"]
---

## モノレポCI/CDの課題

モノレポ（Turborepo、Nx、pnpm workspaces等）では、複数のパッケージやアプリが1つのリポジトリに共存します。効率的なCI/CDには以下の課題があります。

1. **不要なビルドの削減**: 変更されたパッケージのみテスト・ビルドしたい
2. **依存関係の解決**: パッケージ間の依存を正しく処理
3. **キャッシュ戦略**: node_modules、ビルド成果物の効率的なキャッシュ
4. **並列実行**: 複数のジョブを並列化してCI時間を短縮

## パス指定トリガー

### 基本的なパスフィルター

```yaml
# .github/workflows/frontend.yml
name: Frontend CI

on:
  push:
    branches: [main, develop]
    paths:
      - 'apps/frontend/**'
      - 'packages/ui/**'
      - 'packages/shared/**'
      - 'package.json'
      - 'pnpm-lock.yaml'

  pull_request:
    paths:
      - 'apps/frontend/**'
      - 'packages/ui/**'
      - 'packages/shared/**'

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: '20'
      - name: Install dependencies
        run: pnpm install
      - name: Test frontend
        run: pnpm --filter frontend test
```

### 変更検出アクション

より柔軟な変更検出には `dorny/paths-filter` を使用します。

```yaml
# .github/workflows/monorepo-ci.yml
name: Monorepo CI

on:
  pull_request:
  push:
    branches: [main]

jobs:
  changes:
    runs-on: ubuntu-latest
    outputs:
      frontend: ${{ steps.filter.outputs.frontend }}
      backend: ${{ steps.filter.outputs.backend }}
      packages: ${{ steps.filter.outputs.packages }}
    steps:
      - uses: actions/checkout@v4
      - uses: dorny/paths-filter@v3
        id: filter
        with:
          filters: |
            frontend:
              - 'apps/frontend/**'
              - 'packages/ui/**'
            backend:
              - 'apps/backend/**'
              - 'packages/api/**'
            packages:
              - 'packages/**'

  test-frontend:
    needs: changes
    if: needs.changes.outputs.frontend == 'true'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: pnpm install
      - run: pnpm --filter frontend test

  test-backend:
    needs: changes
    if: needs.changes.outputs.backend == 'true'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: pnpm install
      - run: pnpm --filter backend test
```

## マトリックスビルド

### 複数バージョンのNode.jsでテスト

```yaml
name: Test Matrix

on: [push, pull_request]

jobs:
  test:
    runs-on: ${{ matrix.os }}
    strategy:
      matrix:
        os: [ubuntu-latest, windows-latest, macos-latest]
        node-version: [18, 20, 22]
        exclude:
          # Windows + Node 18 は除外
          - os: windows-latest
            node-version: 18

    steps:
      - uses: actions/checkout@v4
      - name: Setup Node ${{ matrix.node-version }}
        uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node-version }}
      - run: pnpm install
      - run: pnpm test
```

### パッケージ別マトリックス

```yaml
name: Package Tests

on: [push]

jobs:
  test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        package:
          - ui
          - api
          - shared
          - utils

    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: pnpm install
      - name: Test ${{ matrix.package }}
        run: pnpm --filter ${{ matrix.package }} test
```

## 効率的なキャッシュ戦略

### pnpmキャッシュ

```yaml
name: CI with Cache

on: [push]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup pnpm
        uses: pnpm/action-setup@v3
        with:
          version: 9

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Build
        run: pnpm build
```

### Turborepoキャッシュ

```yaml
name: Turborepo CI

on: [push]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v3

      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'

      - run: pnpm install

      # Turborepoのリモートキャッシュ
      - name: Build with Turbo
        run: pnpm turbo build
        env:
          TURBO_TOKEN: ${{ secrets.TURBO_TOKEN }}
          TURBO_TEAM: ${{ vars.TURBO_TEAM }}

      - name: Test with Turbo
        run: pnpm turbo test
        env:
          TURBO_TOKEN: ${{ secrets.TURBO_TOKEN }}
          TURBO_TEAM: ${{ vars.TURBO_TEAM }}
```

### ビルド成果物のキャッシュ

```yaml
name: Build Cache

on: [push]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'

      - run: pnpm install

      # ビルド成果物をキャッシュ
      - name: Cache build output
        uses: actions/cache@v4
        with:
          path: |
            apps/*/dist
            packages/*/dist
          key: build-${{ runner.os }}-${{ hashFiles('**/*.ts', '**/*.tsx') }}
          restore-keys: |
            build-${{ runner.os }}-

      - run: pnpm build

      # アーティファクトとしてアップロード（後続ジョブで使用）
      - name: Upload build artifacts
        uses: actions/upload-artifact@v4
        with:
          name: build-output
          path: |
            apps/*/dist
            packages/*/dist
          retention-days: 7

  deploy:
    needs: build
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Download build artifacts
        uses: actions/download-artifact@v4
        with:
          name: build-output

      - name: Deploy
        run: echo "Deploying..."
```

## Changesetsによる自動リリース

### Changesetsセットアップ

```bash
# パッケージインストール
pnpm add -D @changesets/cli

# 初期化
pnpm changeset init
```

`.changeset/config.json`:
```json
{
  "$schema": "https://unpkg.com/@changesets/config@3.0.0/schema.json",
  "changelog": "@changesets/cli/changelog",
  "commit": false,
  "fixed": [],
  "linked": [],
  "access": "public",
  "baseBranch": "main",
  "updateInternalDependencies": "patch",
  "ignore": []
}
```

### リリースワークフロー

```yaml
# .github/workflows/release.yml
name: Release

on:
  push:
    branches:
      - main

concurrency: ${{ github.workflow }}-${{ github.ref }}

jobs:
  release:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v3

      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'

      - run: pnpm install

      - name: Create Release Pull Request or Publish
        id: changesets
        uses: changesets/action@v1
        with:
          publish: pnpm release
          commit: 'chore: release packages'
          title: 'chore: release packages'
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          NPM_TOKEN: ${{ secrets.NPM_TOKEN }}

      - name: Send Slack notification
        if: steps.changesets.outputs.published == 'true'
        run: |
          echo "Published packages: ${{ steps.changesets.outputs.publishedPackages }}"
```

### package.jsonのrelease script

```json
{
  "scripts": {
    "changeset": "changeset",
    "version": "changeset version",
    "release": "pnpm build && changeset publish"
  }
}
```

### 使用フロー

1. 変更をコミット
2. `pnpm changeset` でチェンジログ作成
3. mainにマージ
4. GitHub Actionsが自動でリリースPR作成
5. PRをマージするとnpmに自動公開

## コスト削減テクニック

### 1. 不要なジョブをスキップ

```yaml
name: Smart CI

on:
  pull_request:
    paths-ignore:
      - '**.md'
      - 'docs/**'
      - '.vscode/**'

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: pnpm test
```

### 2. タイムアウト設定

```yaml
jobs:
  test:
    runs-on: ubuntu-latest
    timeout-minutes: 10  # 10分でタイムアウト
    steps:
      - run: pnpm test
```

### 3. 並列実行の最適化

```yaml
jobs:
  test:
    strategy:
      matrix:
        shard: [1, 2, 3, 4]
    steps:
      - run: pnpm test --shard=${{ matrix.shard }}/4
```

### 4. 条件付き実行

```yaml
jobs:
  deploy:
    if: github.ref == 'refs/heads/main' && github.event_name == 'push'
    runs-on: ubuntu-latest
    steps:
      - run: pnpm deploy
```

## 実践例: 完全なモノレポCI/CD

```yaml
# .github/workflows/ci.yml
name: CI/CD Pipeline

on:
  push:
    branches: [main, develop]
  pull_request:

concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true

jobs:
  changes:
    runs-on: ubuntu-latest
    outputs:
      packages: ${{ steps.filter.outputs.packages }}
      frontend: ${{ steps.filter.outputs.frontend }}
      backend: ${{ steps.filter.outputs.backend }}
    steps:
      - uses: actions/checkout@v4
      - uses: dorny/paths-filter@v3
        id: filter
        with:
          filters: |
            packages:
              - 'packages/**'
            frontend:
              - 'apps/frontend/**'
              - 'packages/**'
            backend:
              - 'apps/backend/**'
              - 'packages/**'

  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v3
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'
      - run: pnpm install
      - run: pnpm lint

  test-packages:
    needs: changes
    if: needs.changes.outputs.packages == 'true'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v3
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'
      - run: pnpm install
      - run: pnpm --filter './packages/**' test

  test-frontend:
    needs: changes
    if: needs.changes.outputs.frontend == 'true'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v3
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'
      - run: pnpm install
      - run: pnpm --filter frontend test

  test-backend:
    needs: changes
    if: needs.changes.outputs.backend == 'true'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v3
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'
      - run: pnpm install
      - run: pnpm --filter backend test

  build:
    needs: [lint, test-packages, test-frontend, test-backend]
    if: always() && !cancelled() && !contains(needs.*.result, 'failure')
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v3
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'
      - run: pnpm install
      - run: pnpm build
        env:
          TURBO_TOKEN: ${{ secrets.TURBO_TOKEN }}
          TURBO_TEAM: ${{ vars.TURBO_TEAM }}

  deploy:
    needs: build
    if: github.ref == 'refs/heads/main' && github.event_name == 'push'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Deploy to production
        run: echo "Deploying..."
```

## まとめ

モノレポのCI/CDを最適化する鍵は以下の点です。

1. **変更検出**: 変更されたパッケージのみビルド・テスト
2. **並列化**: マトリックスビルドで複数ジョブを並列実行
3. **キャッシュ**: 依存関係とビルド成果物を効率的にキャッシュ
4. **自動化**: Changesetsでバージョン管理とリリースを自動化

これらのテクニックを組み合わせることで、CI時間を大幅に短縮し、開発者の生産性を向上できます。
