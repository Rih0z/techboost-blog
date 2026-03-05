---
title: 'GitHub Actions完全ガイド2026 — CI/CDとワークフロー自動化'
description: 'GitHub Actionsの完全ガイド。CI/CD、ワークフロー、デプロイ自動化、セキュリティ対策まで実践的に解説します。'
pubDate: 'Feb 05 2026'
tags: ['GitHub Actions', 'CICD', 'DevOps', 'Automation', 'Deployment', 'インフラ']
---

GitHub Actionsは、GitHubに統合されたCI/CD（継続的インテグレーション/継続的デリバリー）プラットフォームです。2026年現在、多くの開発チームがGitHub Actionsを使ってビルド、テスト、デプロイを自動化しています。この記事では、GitHub Actionsの全機能を実践的に解説します。

## GitHub Actionsとは

GitHub Actionsは、以下の特徴を持つ自動化プラットフォームです。

- **ワークフロー自動化**: プッシュ、PR、スケジュールなどでトリガー
- **CI/CD統合**: ビルド、テスト、デプロイを自動化
- **豊富なアクション**: GitHubマーケットプレイスに数千のアクション
- **マルチOS対応**: Ubuntu、Windows、macOSで実行可能
- **無料枠**: パブリックリポジトリは無料、プライベートも月2,000分無料

## 基本概念

### ワークフロー（Workflow）

ワークフローは、自動化されたプロセスの設定ファイル（YAMLファイル）です。

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
      - name: Run tests
        run: npm test
```

### ジョブ（Job）

ジョブは、ワークフロー内の一連のステップです。並列実行が可能です。

### ステップ（Step）

ステップは、ジョブ内の個別のタスクです。アクションまたはシェルコマンドを実行します。

### アクション（Action）

アクションは、再利用可能なコードユニットです。GitHubマーケットプレイスから利用できます。

## クイックスタート

### シンプルなCI/CD

```yaml
# .github/workflows/ci.yml
name: CI

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run tests
        run: npm test

      - name: Build
        run: npm run build
```

### マルチOS対応

```yaml
name: Multi-OS CI

on: [push, pull_request]

jobs:
  test:
    runs-on: ${{ matrix.os }}

    strategy:
      matrix:
        os: [ubuntu-latest, windows-latest, macos-latest]
        node-version: [18, 20, 22]

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js ${{ matrix.node-version }}
        uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node-version }}

      - run: npm ci
      - run: npm test
```

## トリガーイベント

### プッシュ/PR

```yaml
on:
  push:
    branches:
      - main
      - develop
    paths:
      - 'src/**'
      - 'tests/**'

  pull_request:
    branches:
      - main
    types:
      - opened
      - synchronize
      - reopened
```

### スケジュール（Cron）

```yaml
on:
  schedule:
    # 毎日午前2時（UTC）に実行
    - cron: '0 2 * * *'
    # 毎週月曜日午前9時（UTC）に実行
    - cron: '0 9 * * 1'
```

### 手動トリガー

```yaml
on:
  workflow_dispatch:
    inputs:
      environment:
        description: 'Environment to deploy to'
        required: true
        type: choice
        options:
          - development
          - staging
          - production

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Deploy to ${{ inputs.environment }}
        run: echo "Deploying to ${{ inputs.environment }}"
```

### リリース

```yaml
on:
  release:
    types: [published]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Deploy release
        run: ./deploy.sh
```

## 環境変数とシークレット

### 環境変数

```yaml
env:
  NODE_ENV: production
  API_URL: https://api.example.com

jobs:
  build:
    runs-on: ubuntu-latest
    env:
      BUILD_DIR: dist

    steps:
      - name: Build
        run: npm run build
        env:
          VITE_API_URL: ${{ env.API_URL }}
```

### シークレット

```yaml
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Deploy
        env:
          API_KEY: ${{ secrets.API_KEY }}
          DATABASE_URL: ${{ secrets.DATABASE_URL }}
        run: ./deploy.sh
```

GitHubリポジトリの Settings > Secrets and variables > Actions でシークレットを追加できます。

### 環境（Environments）

```yaml
jobs:
  deploy-prod:
    runs-on: ubuntu-latest
    environment:
      name: production
      url: https://myapp.com

    steps:
      - uses: actions/checkout@v4

      - name: Deploy to Production
        env:
          DEPLOY_KEY: ${{ secrets.PRODUCTION_DEPLOY_KEY }}
        run: ./deploy-prod.sh
```

## キャッシュ

### npm キャッシュ

```yaml
- name: Setup Node.js
  uses: actions/setup-node@v4
  with:
    node-version: '20'
    cache: 'npm'

- run: npm ci
```

### カスタムキャッシュ

```yaml
- name: Cache dependencies
  uses: actions/cache@v4
  with:
    path: |
      ~/.npm
      node_modules
    key: ${{ runner.os }}-node-${{ hashFiles('**/package-lock.json') }}
    restore-keys: |
      ${{ runner.os }}-node-

- run: npm ci
```

### Docker レイヤーキャッシュ

```yaml
- name: Set up Docker Buildx
  uses: docker/setup-buildx-action@v3

- name: Build and push
  uses: docker/build-push-action@v5
  with:
    context: .
    push: true
    tags: user/app:latest
    cache-from: type=gha
    cache-to: type=gha,mode=max
```

## アーティファクト

### アーティファクトのアップロード

```yaml
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Build
        run: npm run build

      - name: Upload build artifacts
        uses: actions/upload-artifact@v4
        with:
          name: build-files
          path: dist/
          retention-days: 7
```

### アーティファクトのダウンロード

```yaml
jobs:
  test:
    runs-on: ubuntu-latest
    needs: build
    steps:
      - name: Download artifacts
        uses: actions/download-artifact@v4
        with:
          name: build-files
          path: dist/

      - name: Test
        run: npm test
```

## デプロイ

### Vercelへのデプロイ

```yaml
name: Deploy to Vercel

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          vercel-args: '--prod'
```

### AWS S3へのデプロイ

```yaml
- name: Configure AWS credentials
  uses: aws-actions/configure-aws-credentials@v4
  with:
    aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
    aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
    aws-region: us-east-1

- name: Deploy to S3
  run: |
    aws s3 sync ./dist s3://my-bucket --delete
    aws cloudfront create-invalidation --distribution-id ${{ secrets.CLOUDFRONT_ID }} --paths "/*"
```

### Dockerイメージのビルドとプッシュ

```yaml
name: Docker Build and Push

on:
  push:
    branches: [main]
    tags:
      - 'v*'

jobs:
  docker:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Set up QEMU
        uses: docker/setup-qemu-action@v3

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3

      - name: Login to Docker Hub
        uses: docker/login-action@v3
        with:
          username: ${{ secrets.DOCKERHUB_USERNAME }}
          password: ${{ secrets.DOCKERHUB_TOKEN }}

      - name: Extract metadata
        id: meta
        uses: docker/metadata-action@v5
        with:
          images: user/app

      - name: Build and push
        uses: docker/build-push-action@v5
        with:
          context: .
          platforms: linux/amd64,linux/arm64
          push: true
          tags: ${{ steps.meta.outputs.tags }}
          labels: ${{ steps.meta.outputs.labels }}
```

### GitHub Pagesへのデプロイ

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [main]

permissions:
  contents: read
  pages: write
  id-token: write

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - run: npm ci
      - run: npm run build

      - name: Setup Pages
        uses: actions/configure-pages@v4

      - name: Upload artifact
        uses: actions/upload-pages-artifact@v3
        with:
          path: './dist'

      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v4
```

## テストとコードカバレッジ

### Jest + Codecov

```yaml
name: Test and Coverage

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - run: npm ci

      - name: Run tests with coverage
        run: npm test -- --coverage

      - name: Upload coverage to Codecov
        uses: codecov/codecov-action@v4
        with:
          token: ${{ secrets.CODECOV_TOKEN }}
          files: ./coverage/lcov.info
          flags: unittests
```

### E2Eテスト（Playwright）

```yaml
name: E2E Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - run: npm ci

      - name: Install Playwright Browsers
        run: npx playwright install --with-deps

      - name: Run Playwright tests
        run: npx playwright test

      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: playwright-report
          path: playwright-report/
```

## セキュリティ

### CodeQL分析

```yaml
name: CodeQL

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]
  schedule:
    - cron: '0 0 * * 0'

jobs:
  analyze:
    runs-on: ubuntu-latest
    permissions:
      security-events: write

    strategy:
      matrix:
        language: ['javascript', 'typescript']

    steps:
      - uses: actions/checkout@v4

      - name: Initialize CodeQL
        uses: github/codeql-action/init@v3
        with:
          languages: ${{ matrix.language }}

      - name: Autobuild
        uses: github/codeql-action/autobuild@v3

      - name: Perform CodeQL Analysis
        uses: github/codeql-action/analyze@v3
```

### Dependabot

```yaml
# .github/dependabot.yml
version: 2
updates:
  - package-ecosystem: 'npm'
    directory: '/'
    schedule:
      interval: 'weekly'
    open-pull-requests-limit: 10
```

### セキュリティスキャン

```yaml
- name: Run Trivy vulnerability scanner
  uses: aquasecurity/trivy-action@master
  with:
    scan-type: 'fs'
    scan-ref: '.'
    format: 'sarif'
    output: 'trivy-results.sarif'

- name: Upload Trivy results to GitHub Security
  uses: github/codeql-action/upload-sarif@v3
  with:
    sarif_file: 'trivy-results.sarif'
```

## リリース自動化

### Semantic Release

```yaml
name: Release

on:
  push:
    branches: [main]

jobs:
  release:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - run: npm ci

      - name: Release
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          NPM_TOKEN: ${{ secrets.NPM_TOKEN }}
        run: npx semantic-release
```

### Changelogの自動生成

```yaml
- name: Generate Changelog
  uses: orhun/git-cliff-action@v3
  with:
    config: cliff.toml
    args: --verbose
  env:
    GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}

- name: Create Release
  uses: softprops/action-gh-release@v1
  with:
    body_path: CHANGELOG.md
    tag_name: ${{ github.ref }}
```

## 並列ジョブと依存関係

### 並列実行

```yaml
jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm run lint

  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm test

  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm run build
```

### ジョブの依存関係

```yaml
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm run build

  test:
    needs: build
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm test

  deploy:
    needs: [build, test]
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: ./deploy.sh
```

## 条件付き実行

### if条件

```yaml
jobs:
  deploy:
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - name: Deploy to production
        run: ./deploy.sh

  notify:
    if: failure()
    runs-on: ubuntu-latest
    steps:
      - name: Send failure notification
        run: ./notify-failure.sh
```

### マトリックス戦略の除外

```yaml
strategy:
  matrix:
    os: [ubuntu-latest, windows-latest, macos-latest]
    node-version: [18, 20, 22]
    exclude:
      - os: windows-latest
        node-version: 18
```

## モノレポ対応

### パスフィルター

```yaml
name: Frontend CI

on:
  push:
    paths:
      - 'frontend/**'
      - '.github/workflows/frontend.yml'

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Test frontend
        working-directory: ./frontend
        run: npm test
```

### 変更検出

```yaml
- name: Get changed files
  id: changed-files
  uses: tj-actions/changed-files@v41

- name: Run tests for changed packages
  if: steps.changed-files.outputs.any_changed == 'true'
  run: |
    for file in ${{ steps.changed-files.outputs.all_changed_files }}; do
      echo "$file was changed"
    done
```

## ベストプラクティス

### 1. キャッシュを活用

```yaml
- uses: actions/setup-node@v4
  with:
    node-version: '20'
    cache: 'npm'
```

### 2. シークレットを保護

```yaml
env:
  API_KEY: ${{ secrets.API_KEY }}
```

### 3. 並列実行でビルド時間短縮

```yaml
jobs:
  test:
    strategy:
      matrix:
        node-version: [18, 20, 22]
```

### 4. 条件付き実行で無駄を削減

```yaml
if: github.event_name == 'push' && github.ref == 'refs/heads/main'
```

### 5. タイムアウトを設定

```yaml
jobs:
  test:
    runs-on: ubuntu-latest
    timeout-minutes: 10
```

## トラブルシューティング

### デバッグログ

```yaml
- name: Debug
  run: |
    echo "Event name: ${{ github.event_name }}"
    echo "Ref: ${{ github.ref }}"
    echo "SHA: ${{ github.sha }}"
```

### ステップのスキップ

```yaml
- name: Run tests
  if: ${{ !cancelled() }}
  run: npm test
```

## まとめ

GitHub Actionsの主な特徴:

**利点:**
- GitHubに統合されたCI/CD
- 豊富なアクションマーケットプレイス
- マルチOS対応
- 無料枠が充実

**適しているケース:**
- GitHubでホストされているプロジェクト
- CI/CDパイプラインの構築
- 自動デプロイ
- 定期的なタスク実行

**ベストプラクティス:**
- キャッシュを活用してビルド時間を短縮
- シークレットを安全に管理
- 並列実行で効率化
- 条件付き実行で無駄を削減

GitHub Actionsは、2026年現在、最も使われているCI/CDプラットフォームの一つです。効率的な開発ワークフローを構築しましょう。
