---
title: 'GitHub Actions CI/CD完全ガイド2026｜テスト自動化・デプロイ・キャッシュ最適化'
description: 'GitHub ActionsでCI/CDパイプラインを構築する方法を徹底解説。テスト自動化、Docker build、Vercel/AWS/GCPデプロイ、キャッシュ最適化、セキュリティ設定までワークフロー例付き。'
pubDate: '2026-03-05'
tags: ['GitHub Actions', 'CICD', 'DevOps', 'テスト', '自動化']
heroImage: '../../assets/thumbnails/github-actions-cicd-complete-guide-2026.jpg'
---

## GitHub Actionsとは

GitHub Actionsは、GitHubリポジトリに統合された**CI/CDプラットフォーム**です。コードのプッシュやPR作成をトリガーに、テスト実行・ビルド・デプロイを自動化できます。

### 基本構造

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
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'
      - run: npm ci
      - run: npm test
```

---

## テスト自動化

### Node.js + TypeScriptプロジェクト

```yaml
name: Test & Lint

on:
  pull_request:
    branches: [main]

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'
      - run: npm ci
      - run: npm run lint
      - run: npm run type-check

  test:
    runs-on: ubuntu-latest
    needs: lint
    strategy:
      matrix:
        node-version: [18, 20, 22]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node-version }}
          cache: 'npm'
      - run: npm ci
      - run: npm test -- --coverage
      - name: Upload coverage
        if: matrix.node-version == 20
        uses: codecov/codecov-action@v4
        with:
          token: ${{ secrets.CODECOV_TOKEN }}

  e2e:
    runs-on: ubuntu-latest
    needs: lint
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'
      - run: npm ci
      - name: Install Playwright
        run: npx playwright install --with-deps chromium
      - name: Run E2E tests
        run: npx playwright test
      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: playwright-report
          path: playwright-report/
```

### データベースを使ったテスト

```yaml
jobs:
  test-with-db:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16
        env:
          POSTGRES_DB: test_db
          POSTGRES_USER: test
          POSTGRES_PASSWORD: test
        ports:
          - 5432:5432
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

      redis:
        image: redis:7
        ports:
          - 6379:6379
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'
      - run: npm ci
      - name: Run migrations
        run: npm run db:migrate
        env:
          DATABASE_URL: postgresql://test:test@localhost:5432/test_db
      - name: Run tests
        run: npm test
        env:
          DATABASE_URL: postgresql://test:test@localhost:5432/test_db
          REDIS_URL: redis://localhost:6379
```

---

## キャッシュ最適化

### npm/pnpmのキャッシュ

```yaml
# setup-nodeの内蔵キャッシュ（推奨）
- uses: actions/setup-node@v4
  with:
    node-version: 20
    cache: 'npm'  # or 'pnpm' or 'yarn'
```

### Dockerレイヤーキャッシュ

```yaml
- name: Set up Docker Buildx
  uses: docker/setup-buildx-action@v3

- name: Build with cache
  uses: docker/build-push-action@v5
  with:
    context: .
    push: true
    tags: myapp:latest
    cache-from: type=gha
    cache-to: type=gha,mode=max
```

### Turborepo のキャッシュ

```yaml
- name: Turbo cache
  uses: actions/cache@v4
  with:
    path: .turbo
    key: turbo-${{ runner.os }}-${{ hashFiles('**/turbo.json') }}-${{ github.sha }}
    restore-keys: |
      turbo-${{ runner.os }}-${{ hashFiles('**/turbo.json') }}-
      turbo-${{ runner.os }}-
```

---

## デプロイワークフロー

### Vercelデプロイ

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

### AWS ECS デプロイ

```yaml
name: Deploy to ECS

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    permissions:
      id-token: write
      contents: read

    steps:
      - uses: actions/checkout@v4

      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: ${{ secrets.AWS_ROLE_ARN }}
          aws-region: ap-northeast-1

      - name: Login to ECR
        id: ecr
        uses: aws-actions/amazon-ecr-login@v2

      - name: Build and push
        env:
          ECR_REGISTRY: ${{ steps.ecr.outputs.registry }}
          IMAGE_TAG: ${{ github.sha }}
        run: |
          docker build -t $ECR_REGISTRY/myapp:$IMAGE_TAG .
          docker push $ECR_REGISTRY/myapp:$IMAGE_TAG

      - name: Deploy to ECS
        uses: aws-actions/amazon-ecs-deploy-task-definition@v1
        with:
          task-definition: task-definition.json
          service: myapp-service
          cluster: myapp-cluster
          wait-for-service-stability: true
```

### Cloudflare Pagesデプロイ

```yaml
name: Deploy to Cloudflare Pages

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'
      - run: npm ci
      - run: npm run build
      - name: Deploy
        uses: cloudflare/pages-action@v1
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          accountId: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
          projectName: my-project
          directory: dist
```

---

## セキュリティ

### シークレットの管理

```yaml
# リポジトリ Settings > Secrets and variables > Actions で設定

# 環境別シークレット
jobs:
  deploy:
    environment: production  # 環境を指定
    steps:
      - name: Deploy
        env:
          API_KEY: ${{ secrets.API_KEY }}       # 環境別シークレット
          DB_URL: ${{ secrets.DATABASE_URL }}
```

### 依存関係の脆弱性チェック

```yaml
name: Security Scan

on:
  schedule:
    - cron: '0 9 * * 1'  # 毎週月曜9時
  push:
    branches: [main]

jobs:
  audit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm audit --production

  trivy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Run Trivy
        uses: aquasecurity/trivy-action@master
        with:
          scan-type: 'fs'
          severity: 'CRITICAL,HIGH'
```

### OIDC認証（パスワードレス）

```yaml
# AWSとのOIDC連携（シークレットキー不要）
permissions:
  id-token: write
  contents: read

steps:
  - uses: aws-actions/configure-aws-credentials@v4
    with:
      role-to-assume: arn:aws:iam::123456789:role/github-actions
      aws-region: ap-northeast-1
      # アクセスキーやシークレットキーは不要！
```

---

## 実践的なワークフロー例

### monorepoでの変更検知

```yaml
jobs:
  changes:
    runs-on: ubuntu-latest
    outputs:
      frontend: ${{ steps.filter.outputs.frontend }}
      backend: ${{ steps.filter.outputs.backend }}
    steps:
      - uses: actions/checkout@v4
      - uses: dorny/paths-filter@v3
        id: filter
        with:
          filters: |
            frontend:
              - 'packages/frontend/**'
            backend:
              - 'packages/backend/**'

  deploy-frontend:
    needs: changes
    if: needs.changes.outputs.frontend == 'true'
    runs-on: ubuntu-latest
    steps:
      - run: echo "フロントエンドをデプロイ"

  deploy-backend:
    needs: changes
    if: needs.changes.outputs.backend == 'true'
    runs-on: ubuntu-latest
    steps:
      - run: echo "バックエンドをデプロイ"
```

### リリース自動化

```yaml
name: Release

on:
  push:
    tags:
      - 'v*'

jobs:
  release:
    runs-on: ubuntu-latest
    permissions:
      contents: write
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Generate changelog
        id: changelog
        run: |
          PREV_TAG=$(git describe --tags --abbrev=0 HEAD^ 2>/dev/null || echo "")
          if [ -n "$PREV_TAG" ]; then
            CHANGES=$(git log ${PREV_TAG}..HEAD --pretty=format:"- %s (%h)" --no-merges)
          else
            CHANGES=$(git log --pretty=format:"- %s (%h)" --no-merges)
          fi
          echo "changes<<EOF" >> $GITHUB_OUTPUT
          echo "$CHANGES" >> $GITHUB_OUTPUT
          echo "EOF" >> $GITHUB_OUTPUT

      - name: Create Release
        uses: softprops/action-gh-release@v2
        with:
          body: |
            ## Changes
            ${{ steps.changelog.outputs.changes }}
          draft: false
          prerelease: false
```

---

## コスト最適化

### 無料枠の理解

| プラン | 実行時間/月 | 同時実行数 |
|--------|-----------|----------|
| Free | 2,000分 | 20ジョブ |
| Team | 3,000分 | 60ジョブ |
| Enterprise | 50,000分 | 180ジョブ |

### 実行時間を節約するテクニック

1. **キャッシュを最大限活用**: npm, Docker, ビルド成果物
2. **変更検知で不要なジョブをスキップ**: `paths-filter`
3. **並列実行**: 独立したジョブは`needs`なしで並列化
4. **タイムアウト設定**: ハングしたジョブを防止

```yaml
jobs:
  test:
    runs-on: ubuntu-latest
    timeout-minutes: 10  # 10分でタイムアウト
```

---

## まとめ

GitHub ActionsでCI/CDを構築する際のベストプラクティス：

1. **テストは必ずPR時に実行** — マージ前に品質を担保
2. **キャッシュを活用** — ビルド時間を50%以上短縮可能
3. **環境を分離** — staging / production でシークレットを分ける
4. **OIDC認証** — 長期的なシークレットキーを排除
5. **変更検知** — monorepoでは変更されたパッケージのみデプロイ
6. **タイムアウト** — ハングしたジョブでの無駄なコストを防止

GitHub Actionsは無料枠でも十分実用的です。まずはテスト自動化から始めて、段階的にデプロイパイプラインを構築していきましょう。
