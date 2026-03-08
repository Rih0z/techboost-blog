---
title: "GitHub Actions上級ガイド2026"
description: "GitHub Actionsの上級テクニックを徹底解説。マトリックスビルド、依存関係キャッシュ、セルフホストランナー、Reusable Workflows、セキュリティ強化の実践手法を紹介します。"
pubDate: '2026-03-05'
tags: ['GitHub Actions', 'CICD', 'DevOps', '自動化', 'インフラ']
heroImage: '../../assets/thumbnails/github-actions-advanced-2026.jpg'
---

**関連記事**: [GitHub Actions上級テクニック完全ガイド2026](/blog/github-actions-advanced-guide)では基本的な上級テクニックを解説しています。本記事ではセルフホストランナー、Composite Actions、高度なキャッシュ戦略など、さらに踏み込んだ内容を扱います。

GitHub Actionsは、CI/CDパイプラインの構築に最も広く使われているプラットフォームの一つです。基本的なテスト・ビルド・デプロイのワークフローから一歩進み、マトリックスビルド、高度なキャッシュ戦略、セルフホストランナー、Reusable Workflowsなどの上級テクニックを活用することで、パイプラインの実行速度とメンテナンス性を大幅に改善できます。

本記事では、GitHub Actionsの上級テクニックを実践的なコード例とともに徹底解説します。

## マトリックスビルド

### 基本的なマトリックス戦略

マトリックスビルドを使うと、複数のOS、ランタイムバージョン、設定の組み合わせを自動的に並列実行できます。

```yaml
# .github/workflows/test-matrix.yml
name: Test Matrix

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ${{ matrix.os }}
    strategy:
      # 1つのジョブが失敗しても他を継続
      fail-fast: false
      matrix:
        os: [ubuntu-latest, macos-latest, windows-latest]
        node-version: [18, 20, 22]
        # 特定の組み合わせを除外
        exclude:
          - os: windows-latest
            node-version: 18
        # 特定の組み合わせを追加（追加設定付き）
        include:
          - os: ubuntu-latest
            node-version: 22
            coverage: true
            experimental: false
          - os: ubuntu-latest
            node-version: 23
            experimental: true

    # experimentalフラグがtrueの場合は失敗を許容
    continue-on-error: ${{ matrix.experimental || false }}

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js ${{ matrix.node-version }}
        uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node-version }}
          cache: 'npm'

      - run: npm ci
      - run: npm test

      - name: Upload coverage
        if: matrix.coverage
        uses: codecov/codecov-action@v4
        with:
          token: ${{ secrets.CODECOV_TOKEN }}
```

### 動的マトリックス

マトリックスの値をジョブの出力から動的に生成できます。

```yaml
name: Dynamic Matrix

on:
  push:
    branches: [main]

jobs:
  # Step 1: 変更されたパッケージを検出
  detect-changes:
    runs-on: ubuntu-latest
    outputs:
      packages: ${{ steps.changes.outputs.packages }}
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - id: changes
        run: |
          # 変更されたパッケージを検出してJSON配列として出力
          CHANGED_PACKAGES=$(git diff --name-only HEAD~1 HEAD | \
            grep '^packages/' | \
            cut -d'/' -f2 | \
            sort -u | \
            jq -R -s -c 'split("\n")[:-1]')

          echo "packages=$CHANGED_PACKAGES" >> $GITHUB_OUTPUT
          echo "Changed packages: $CHANGED_PACKAGES"

  # Step 2: 変更されたパッケージのみテスト
  test:
    needs: detect-changes
    if: needs.detect-changes.outputs.packages != '[]'
    runs-on: ubuntu-latest
    strategy:
      matrix:
        package: ${{ fromJSON(needs.detect-changes.outputs.packages) }}
    steps:
      - uses: actions/checkout@v4

      - name: Test ${{ matrix.package }}
        run: |
          cd packages/${{ matrix.package }}
          npm ci
          npm test
```

### マトリックスの最大並列数制御

```yaml
jobs:
  test:
    runs-on: ubuntu-latest
    strategy:
      # 同時実行数を制限（APIレート制限対策等）
      max-parallel: 3
      matrix:
        shard: [1, 2, 3, 4, 5, 6]
    steps:
      - uses: actions/checkout@v4
      - run: npm ci
      - name: Run tests (shard ${{ matrix.shard }}/6)
        run: |
          npx vitest --shard=${{ matrix.shard }}/6
```

## 高度なキャッシュ戦略

### 依存関係キャッシュの最適化

```yaml
name: Optimized Cache

on: [push, pull_request]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      # npm キャッシュ（actions/setup-node内蔵）
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: 'npm'

      # より高度なキャッシュ: node_modulesを直接キャッシュ
      - name: Cache node_modules
        id: cache-deps
        uses: actions/cache@v4
        with:
          path: node_modules
          key: deps-${{ runner.os }}-${{ hashFiles('package-lock.json') }}
          # フォールバックキー
          restore-keys: |
            deps-${{ runner.os }}-

      # キャッシュミス時のみinstall
      - name: Install dependencies
        if: steps.cache-deps.outputs.cache-hit != 'true'
        run: npm ci

      - run: npm run build
      - run: npm test
```

### ビルド成果物のキャッシュ

```yaml
name: Build Cache

on:
  push:
    branches: [main]
  pull_request:

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 22

      # Next.jsビルドキャッシュ
      - name: Cache Next.js build
        uses: actions/cache@v4
        with:
          path: |
            ${{ github.workspace }}/.next/cache
          key: nextjs-${{ runner.os }}-${{ hashFiles('package-lock.json') }}-${{ hashFiles('**/*.ts', '**/*.tsx') }}
          restore-keys: |
            nextjs-${{ runner.os }}-${{ hashFiles('package-lock.json') }}-
            nextjs-${{ runner.os }}-

      # Turborepoキャッシュ（モノレポ用）
      - name: Cache Turborepo
        uses: actions/cache@v4
        with:
          path: .turbo
          key: turbo-${{ runner.os }}-${{ github.sha }}
          restore-keys: |
            turbo-${{ runner.os }}-

      - run: npm ci
      - run: npm run build

  test:
    needs: build
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: 'npm'
      - run: npm ci
      - run: npm test
```

### Docker Layerキャッシュ

```yaml
name: Docker Build

on:
  push:
    branches: [main]

jobs:
  docker:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      # Docker Buildxセットアップ
      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3

      # Docker Hubログイン
      - name: Login to Docker Hub
        uses: docker/login-action@v3
        with:
          username: ${{ secrets.DOCKERHUB_USERNAME }}
          password: ${{ secrets.DOCKERHUB_TOKEN }}

      # キャッシュ付きビルド＆プッシュ
      - name: Build and push
        uses: docker/build-push-action@v6
        with:
          context: .
          push: true
          tags: myapp:latest,myapp:${{ github.sha }}
          cache-from: type=gha
          cache-to: type=gha,mode=max
          # マルチプラットフォーム
          platforms: linux/amd64,linux/arm64
```

## セルフホストランナー

### セルフホストランナーの設置

```bash
# Linux (x64) へのランナーインストール
mkdir actions-runner && cd actions-runner

# ダウンロード
curl -o actions-runner-linux-x64-2.320.0.tar.gz -L \
  https://github.com/actions/runner/releases/download/v2.320.0/actions-runner-linux-x64-2.320.0.tar.gz

tar xzf ./actions-runner-linux-x64-2.320.0.tar.gz

# 設定（GitHubリポジトリURLとトークンが必要）
./config.sh --url https://github.com/YOUR_ORG/YOUR_REPO \
  --token YOUR_RUNNER_TOKEN \
  --labels self-hosted,linux,x64,gpu \
  --name my-runner-01

# サービスとしてインストール・起動
sudo ./svc.sh install
sudo ./svc.sh start
```

### セルフホストランナーの活用

```yaml
name: GPU Training

on:
  workflow_dispatch:
    inputs:
      model:
        description: 'Model to train'
        required: true
        type: choice
        options:
          - resnet50
          - bert-base
          - gpt2-small

jobs:
  train:
    # セルフホストランナーをラベルで指定
    runs-on: [self-hosted, linux, gpu]
    timeout-minutes: 360

    steps:
      - uses: actions/checkout@v4

      - name: Check GPU
        run: nvidia-smi

      - name: Train model
        run: |
          python train.py \
            --model ${{ github.event.inputs.model }} \
            --epochs 100 \
            --batch-size 32

      - name: Upload model artifacts
        uses: actions/upload-artifact@v4
        with:
          name: model-${{ github.event.inputs.model }}
          path: output/model.*
          retention-days: 30
```

### Kubernetes上のセルフホストランナー（ARC）

```yaml
# actions-runner-controller のHelmチャート設定
# helm-values.yaml
githubConfigUrl: "https://github.com/YOUR_ORG"
githubConfigSecret:
  github_token: "ghp_xxxxx"

containerMode:
  type: "kubernetes"

template:
  spec:
    containers:
      - name: runner
        image: ghcr.io/actions/actions-runner:latest
        resources:
          requests:
            cpu: "2"
            memory: "4Gi"
          limits:
            cpu: "4"
            memory: "8Gi"
        volumeMounts:
          - name: work
            mountPath: /home/runner/_work
    volumes:
      - name: work
        ephemeral:
          volumeClaimTemplate:
            spec:
              accessModes: ["ReadWriteOnce"]
              resources:
                requests:
                  storage: 50Gi

maxRunners: 10
minRunners: 2
```

```bash
# ARC のインストール
helm install arc \
  --namespace arc-systems \
  --create-namespace \
  oci://ghcr.io/actions/actions-runner-controller-charts/gha-runner-scale-set-controller

helm install arc-runner-set \
  --namespace arc-runners \
  --create-namespace \
  -f helm-values.yaml \
  oci://ghcr.io/actions/actions-runner-controller-charts/gha-runner-scale-set
```

## Reusable Workflows

### 再利用可能なワークフローの定義

```yaml
# .github/workflows/reusable-deploy.yml
name: Reusable Deploy

on:
  workflow_call:
    inputs:
      environment:
        required: true
        type: string
        description: 'Target environment (staging/production)'
      version:
        required: true
        type: string
        description: 'Version to deploy'
      dry-run:
        required: false
        type: boolean
        default: false
    secrets:
      DEPLOY_KEY:
        required: true
      SLACK_WEBHOOK:
        required: false
    outputs:
      deploy-url:
        description: "Deployed URL"
        value: ${{ jobs.deploy.outputs.url }}

jobs:
  deploy:
    runs-on: ubuntu-latest
    environment: ${{ inputs.environment }}
    outputs:
      url: ${{ steps.deploy.outputs.url }}
    steps:
      - uses: actions/checkout@v4
        with:
          ref: ${{ inputs.version }}

      - name: Setup
        run: |
          echo "Deploying version ${{ inputs.version }} to ${{ inputs.environment }}"
          echo "Dry run: ${{ inputs.dry-run }}"

      - name: Deploy
        id: deploy
        if: ${{ !inputs.dry-run }}
        env:
          DEPLOY_KEY: ${{ secrets.DEPLOY_KEY }}
        run: |
          # デプロイスクリプト実行
          ./scripts/deploy.sh ${{ inputs.environment }}
          echo "url=https://${{ inputs.environment }}.example.com" >> $GITHUB_OUTPUT

      - name: Notify Slack
        if: ${{ !inputs.dry-run && secrets.SLACK_WEBHOOK }}
        run: |
          curl -X POST ${{ secrets.SLACK_WEBHOOK }} \
            -H 'Content-type: application/json' \
            -d '{
              "text": "Deployed ${{ inputs.version }} to ${{ inputs.environment }}: ${{ steps.deploy.outputs.url }}"
            }'
```

### 再利用可能なワークフローの呼び出し

```yaml
# .github/workflows/release.yml
name: Release Pipeline

on:
  push:
    tags: ['v*']

jobs:
  test:
    uses: ./.github/workflows/reusable-test.yml
    with:
      node-version: 22

  deploy-staging:
    needs: test
    uses: ./.github/workflows/reusable-deploy.yml
    with:
      environment: staging
      version: ${{ github.ref_name }}
    secrets:
      DEPLOY_KEY: ${{ secrets.STAGING_DEPLOY_KEY }}
      SLACK_WEBHOOK: ${{ secrets.SLACK_WEBHOOK }}

  # ステージングデプロイ後にE2Eテスト
  e2e-test:
    needs: deploy-staging
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: |
          echo "Testing against ${{ needs.deploy-staging.outputs.deploy-url }}"
          npm run test:e2e -- --base-url=${{ needs.deploy-staging.outputs.deploy-url }}

  deploy-production:
    needs: [deploy-staging, e2e-test]
    uses: ./.github/workflows/reusable-deploy.yml
    with:
      environment: production
      version: ${{ github.ref_name }}
    secrets:
      DEPLOY_KEY: ${{ secrets.PRODUCTION_DEPLOY_KEY }}
      SLACK_WEBHOOK: ${{ secrets.SLACK_WEBHOOK }}
```

## Composite Actions

### カスタムアクションの作成

```yaml
# .github/actions/setup-project/action.yml
name: 'Setup Project'
description: 'Setup Node.js project with caching'

inputs:
  node-version:
    description: 'Node.js version'
    required: false
    default: '22'
  install-playwright:
    description: 'Install Playwright browsers'
    required: false
    default: 'false'

outputs:
  cache-hit:
    description: 'Whether cache was hit'
    value: ${{ steps.cache.outputs.cache-hit }}

runs:
  using: 'composite'
  steps:
    - name: Setup Node.js
      uses: actions/setup-node@v4
      with:
        node-version: ${{ inputs.node-version }}

    - name: Cache dependencies
      id: cache
      uses: actions/cache@v4
      with:
        path: |
          node_modules
          ~/.cache/ms-playwright
        key: project-${{ runner.os }}-node${{ inputs.node-version }}-${{ hashFiles('package-lock.json') }}

    - name: Install dependencies
      if: steps.cache.outputs.cache-hit != 'true'
      shell: bash
      run: npm ci

    - name: Install Playwright
      if: inputs.install-playwright == 'true' && steps.cache.outputs.cache-hit != 'true'
      shell: bash
      run: npx playwright install --with-deps chromium

    - name: Verify installation
      shell: bash
      run: |
        echo "Node.js $(node --version)"
        echo "npm $(npm --version)"
        echo "Dependencies installed: $(ls node_modules | wc -l) packages"
```

### Composite Actionの使用

```yaml
# .github/workflows/ci.yml
name: CI

on: [push, pull_request]

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: ./.github/actions/setup-project
      - run: npm run lint

  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: ./.github/actions/setup-project
      - run: npm test

  e2e:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: ./.github/actions/setup-project
        with:
          install-playwright: 'true'
      - run: npm run test:e2e
```

## セキュリティ強化

### シークレットの管理

```yaml
name: Secure Pipeline

on:
  push:
    branches: [main]

# ジョブレベルの権限設定（最小権限の原則）
permissions:
  contents: read
  packages: write
  id-token: write  # OIDC認証用

jobs:
  deploy:
    runs-on: ubuntu-latest
    environment: production  # Environment保護ルール適用
    steps:
      - uses: actions/checkout@v4

      # OIDC認証（シークレット不要でAWSにアクセス）
      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: arn:aws:iam::123456789012:role/github-actions
          aws-region: ap-northeast-1

      # ステップ間でシークレットをマスク
      - name: Fetch secret
        id: secret
        run: |
          SECRET=$(aws secretsmanager get-secret-value \
            --secret-id my-app/production \
            --query SecretString --output text)
          echo "::add-mask::$SECRET"
          echo "value=$SECRET" >> $GITHUB_OUTPUT
```

### 依存関係のピン留め

```yaml
# セキュリティのためアクションのバージョンをSHAでピン留め
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      # タグ指定（便利だが改竄リスクあり）
      # - uses: actions/checkout@v4

      # SHA指定（改竄不可能）
      - uses: actions/checkout@b4ffde65f46336ab88eb53be808477a3936bae11 # v4.1.1

      - uses: actions/setup-node@60edb5dd545a775178f52524783378180af0d1f8 # v4.0.2
        with:
          node-version: 22
```

### Dependabotとの連携

```yaml
# .github/dependabot.yml
version: 2
updates:
  # npmパッケージの更新
  - package-ecosystem: "npm"
    directory: "/"
    schedule:
      interval: "weekly"
    groups:
      development-dependencies:
        dependency-type: "development"
      production-dependencies:
        dependency-type: "production"

  # GitHub Actionsの更新
  - package-ecosystem: "github-actions"
    directory: "/"
    schedule:
      interval: "weekly"
    # 自動マージ設定
    open-pull-requests-limit: 10
```

```yaml
# .github/workflows/dependabot-auto-merge.yml
name: Dependabot Auto Merge

on: pull_request

permissions:
  contents: write
  pull-requests: write

jobs:
  auto-merge:
    if: github.actor == 'dependabot[bot]'
    runs-on: ubuntu-latest
    steps:
      - name: Fetch Dependabot metadata
        id: metadata
        uses: dependabot/fetch-metadata@v2
        with:
          github-token: ${{ secrets.GITHUB_TOKEN }}

      # パッチ・マイナーアップデートのみ自動マージ
      - name: Auto-merge minor/patch updates
        if: >
          steps.metadata.outputs.update-type == 'version-update:semver-patch' ||
          steps.metadata.outputs.update-type == 'version-update:semver-minor'
        run: gh pr merge --auto --squash "$PR_URL"
        env:
          PR_URL: ${{ github.event.pull_request.html_url }}
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

## 高度なワークフロー制御

### Concurrency制御

```yaml
name: Deploy

on:
  push:
    branches: [main]

# 同一ブランチへの同時デプロイを防止
concurrency:
  group: deploy-${{ github.ref }}
  cancel-in-progress: true  # 新しいデプロイが来たら古いのをキャンセル

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: ./deploy.sh
```

### 条件分岐とパスフィルタ

```yaml
name: Smart CI

on:
  push:
    branches: [main]
    paths-ignore:
      - '**.md'
      - 'docs/**'
      - '.github/ISSUE_TEMPLATE/**'
  pull_request:
    paths:
      - 'src/**'
      - 'tests/**'
      - 'package.json'
      - 'package-lock.json'

jobs:
  # 変更内容に応じてジョブを条件分岐
  changes:
    runs-on: ubuntu-latest
    outputs:
      frontend: ${{ steps.filter.outputs.frontend }}
      backend: ${{ steps.filter.outputs.backend }}
      infra: ${{ steps.filter.outputs.infra }}
    steps:
      - uses: actions/checkout@v4
      - uses: dorny/paths-filter@v3
        id: filter
        with:
          filters: |
            frontend:
              - 'src/frontend/**'
              - 'src/components/**'
            backend:
              - 'src/api/**'
              - 'src/lib/**'
              - 'prisma/**'
            infra:
              - 'terraform/**'
              - 'Dockerfile'
              - 'docker-compose.yml'

  frontend-test:
    needs: changes
    if: needs.changes.outputs.frontend == 'true'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm run test:frontend

  backend-test:
    needs: changes
    if: needs.changes.outputs.backend == 'true'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm run test:backend

  infra-validate:
    needs: changes
    if: needs.changes.outputs.infra == 'true'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: terraform validate
```

### ワークフローの手動トリガーとAPI呼び出し

```yaml
name: Manual Operations

on:
  workflow_dispatch:
    inputs:
      operation:
        description: '実行する操作'
        required: true
        type: choice
        options:
          - database-migration
          - cache-clear
          - rollback
      target:
        description: '対象環境'
        required: true
        type: environment
      confirm:
        description: '本当に実行しますか？ (yes と入力)'
        required: true
        type: string

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - name: Validate confirmation
        if: github.event.inputs.confirm != 'yes'
        run: |
          echo "::error::確認が'yes'ではありません。操作を中止します。"
          exit 1

  execute:
    needs: validate
    runs-on: ubuntu-latest
    environment: ${{ github.event.inputs.target }}
    steps:
      - uses: actions/checkout@v4

      - name: Execute operation
        run: |
          case "${{ github.event.inputs.operation }}" in
            database-migration)
              echo "Running database migration..."
              npx prisma migrate deploy
              ;;
            cache-clear)
              echo "Clearing cache..."
              curl -X POST "$PURGE_URL" -H "Authorization: Bearer $TOKEN"
              ;;
            rollback)
              echo "Rolling back..."
              ./scripts/rollback.sh
              ;;
          esac
```

```bash
# APIからワークフローをトリガー
curl -X POST \
  -H "Authorization: token ghp_xxxxx" \
  -H "Accept: application/vnd.github.v3+json" \
  https://api.github.com/repos/OWNER/REPO/actions/workflows/manual-ops.yml/dispatches \
  -d '{
    "ref": "main",
    "inputs": {
      "operation": "cache-clear",
      "target": "staging",
      "confirm": "yes"
    }
  }'
```

## パフォーマンス最適化

### ジョブの並列化とアーティファクト共有

```yaml
name: Optimized Pipeline

on:
  push:
    branches: [main]

jobs:
  # ビルドジョブ（1回だけ実行）
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: 'npm'
      - run: npm ci
      - run: npm run build

      # ビルド成果物をアーティファクトとして保存
      - uses: actions/upload-artifact@v4
        with:
          name: build-output
          path: dist/
          retention-days: 1

  # テスト（並列実行）
  unit-test:
    needs: build
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: 'npm'
      - run: npm ci
      - run: npm run test:unit

  integration-test:
    needs: build
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16
        env:
          POSTGRES_PASSWORD: test
          POSTGRES_DB: testdb
        ports:
          - 5432:5432
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: 'npm'
      - run: npm ci
      - run: npm run test:integration
        env:
          DATABASE_URL: postgresql://postgres:test@localhost:5432/testdb

  e2e-test:
    needs: build
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: 'npm'
      - run: npm ci
      - uses: actions/download-artifact@v4
        with:
          name: build-output
          path: dist/
      - run: npx playwright install chromium
      - run: npm run test:e2e

  # 全テスト通過後にデプロイ
  deploy:
    needs: [unit-test, integration-test, e2e-test]
    runs-on: ubuntu-latest
    steps:
      - uses: actions/download-artifact@v4
        with:
          name: build-output
          path: dist/
      - run: echo "Deploying..."
```

### テストシャーディング

```yaml
name: Sharded Tests

on: [push]

jobs:
  test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        shard: [1, 2, 3, 4]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: 'npm'
      - run: npm ci

      # Vitestのシャーディング
      - run: npx vitest --shard=${{ matrix.shard }}/4

      # Playwrightのシャーディング
      - run: npx playwright test --shard=${{ matrix.shard }}/4

  # 全シャードの結果を統合
  merge-reports:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: echo "All shards passed!"
```

## 実践的なCI/CDパイプライン

### フルスタックアプリケーションの完全なパイプライン

```yaml
name: Full CI/CD Pipeline

on:
  push:
    branches: [main, 'release/**']
  pull_request:
    branches: [main]

env:
  REGISTRY: ghcr.io
  IMAGE_NAME: ${{ github.repository }}

permissions:
  contents: read
  packages: write
  pull-requests: write
  security-events: write

jobs:
  # 1. コード品質チェック
  quality:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: 'npm'
      - run: npm ci
      - run: npm run lint
      - run: npm run typecheck
      - run: npm run format:check

  # 2. セキュリティスキャン
  security:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Run npm audit
        run: npm audit --audit-level=high
      - name: Run CodeQL
        uses: github/codeql-action/analyze@v3
        with:
          languages: javascript-typescript

  # 3. テスト
  test:
    needs: quality
    runs-on: ubuntu-latest
    strategy:
      matrix:
        shard: [1, 2, 3]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: 'npm'
      - run: npm ci
      - run: npx vitest --shard=${{ matrix.shard }}/3 --coverage
      - uses: actions/upload-artifact@v4
        with:
          name: coverage-${{ matrix.shard }}
          path: coverage/

  # 4. ビルド＆プッシュ
  build:
    needs: [test, security]
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    outputs:
      version: ${{ steps.version.outputs.version }}
    steps:
      - uses: actions/checkout@v4

      - name: Generate version
        id: version
        run: echo "version=$(date +%Y%m%d)-${GITHUB_SHA::8}" >> $GITHUB_OUTPUT

      - uses: docker/setup-buildx-action@v3
      - uses: docker/login-action@v3
        with:
          registry: ${{ env.REGISTRY }}
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}
      - uses: docker/build-push-action@v6
        with:
          push: true
          tags: |
            ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:latest
            ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:${{ steps.version.outputs.version }}
          cache-from: type=gha
          cache-to: type=gha,mode=max

  # 5. ステージングデプロイ
  deploy-staging:
    needs: build
    uses: ./.github/workflows/reusable-deploy.yml
    with:
      environment: staging
      version: ${{ needs.build.outputs.version }}
    secrets:
      DEPLOY_KEY: ${{ secrets.STAGING_DEPLOY_KEY }}

  # 6. 本番デプロイ（承認必要）
  deploy-production:
    needs: [build, deploy-staging]
    uses: ./.github/workflows/reusable-deploy.yml
    with:
      environment: production
      version: ${{ needs.build.outputs.version }}
    secrets:
      DEPLOY_KEY: ${{ secrets.PRODUCTION_DEPLOY_KEY }}
      SLACK_WEBHOOK: ${{ secrets.SLACK_WEBHOOK }}
```

## まとめ

GitHub Actionsの上級テクニックを活用することで、CI/CDパイプラインの実行速度、信頼性、メンテナンス性を大幅に向上させることができます。本記事で紹介した内容をまとめます。

- **マトリックスビルド**: 複数のOS・ランタイムバージョンの組み合わせテストを自動化し、動的マトリックスで変更範囲に応じた効率的なテストを実現
- **キャッシュ戦略**: node_modules、ビルド成果物、Docker Layerのキャッシュにより、パイプライン実行時間を50-70%削減可能
- **セルフホストランナー**: GPU演算や大容量ストレージが必要な場合、ARCによるKubernetes上のオートスケールランナーが有効
- **Reusable Workflows**: 共通パターンを再利用可能なワークフローとして定義し、組織全体でCI/CDの一貫性を維持
- **セキュリティ**: OIDC認証、SHAピン留め、Dependabot自動マージにより、サプライチェーンセキュリティを強化
- **パフォーマンス最適化**: テストシャーディング、ジョブ並列化、アーティファクト共有により、大規模プロジェクトでも高速なフィードバックループを実現

まずは既存のワークフローにキャッシュ戦略を導入し、次にReusable Workflowsで共通パターンを抽出するところから始めることをおすすめします。
