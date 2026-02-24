---
title: 'CI/CDパイプライン完全ガイド — GitHub Actions上級・マトリックスビルド・セキュリティ・デプロイ自動化'
description: 'GitHub Actions上級テクニックを完全解説。Reusable Workflows・マトリックスビルド・セクレット管理・OIDC・Docker Layer Caching・Kubernetes自動デプロイ・コスト最適化まで実装例付きで網羅。'
pubDate: 'Feb 20 2026'
heroImage: '../../assets/blog-placeholder-5.jpg'
tags: ['GitHub Actions', 'CI/CD', 'DevOps', 'Docker', 'Kubernetes']
---

GitHub Actionsの基本を習得した後、次のステップは「本番レベルのCI/CDパイプライン設計」です。本記事では、Reusable Workflowsによるコード再利用からOIDCキーレス認証、Docker Layer Caching、Kubernetes自動デプロイ、カナリアリリース、セキュリティスキャン、コスト最適化まで、実務で直接使える上級テクニックを網羅的に解説します。

---

## 1. Reusable Workflows — ワークフローの再利用設計

大規模プロジェクトやモノレポ環境では、同じCI処理を複数のワークフローに書き続けると保守コストが爆発します。**Reusable Workflows**（`workflow_call`トリガー）を使えば、ワークフロー全体をコンポーネントとして再利用できます。

### 1.1 呼び出し可能なワークフローの定義

```yaml
# .github/workflows/_reusable-test.yml
# アンダースコアプレフィックスで「内部用」を明示する命名規則を推奨
name: Reusable — Test & Lint

on:
  workflow_call:
    inputs:
      node-version:
        description: 'Node.jsのバージョン'
        required: false
        type: string
        default: '20'
      working-directory:
        description: '作業ディレクトリ（モノレポ対応）'
        required: false
        type: string
        default: '.'
      enable-coverage:
        description: 'カバレッジレポートを生成するか'
        required: false
        type: boolean
        default: false
    secrets:
      NPM_TOKEN:
        description: 'プライベートnpmレジストリ用トークン'
        required: false
      CODECOV_TOKEN:
        required: false
    outputs:
      coverage-percentage:
        description: 'テストカバレッジのパーセンテージ'
        value: ${{ jobs.test.outputs.coverage }}

jobs:
  test:
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: ${{ inputs.working-directory }}
    outputs:
      coverage: ${{ steps.coverage.outputs.percentage }}
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ inputs.node-version }}
          cache: 'pnpm'

      - name: Install pnpm
        uses: pnpm/action-setup@v3
        with:
          version: 9

      - name: Configure npm registry
        if: secrets.NPM_TOKEN != ''
        run: |
          echo "//registry.npmjs.org/:_authToken=${{ secrets.NPM_TOKEN }}" > ~/.npmrc

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Run lint
        run: pnpm lint

      - name: Run type check
        run: pnpm type-check

      - name: Run tests
        run: |
          if [ "${{ inputs.enable-coverage }}" = "true" ]; then
            pnpm test:coverage --reporter=json
          else
            pnpm test
          fi

      - name: Extract coverage percentage
        if: inputs.enable-coverage
        id: coverage
        run: |
          COVERAGE=$(cat coverage/coverage-summary.json | jq '.total.lines.pct')
          echo "percentage=${COVERAGE}" >> $GITHUB_OUTPUT

      - name: Upload coverage to Codecov
        if: inputs.enable-coverage && secrets.CODECOV_TOKEN != ''
        uses: codecov/codecov-action@v4
        with:
          token: ${{ secrets.CODECOV_TOKEN }}
          directory: ${{ inputs.working-directory }}/coverage
```

### 1.2 呼び出し側ワークフロー

```yaml
# .github/workflows/ci.yml
name: CI

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  # Reusable Workflowを呼び出す
  test-frontend:
    uses: ./.github/workflows/_reusable-test.yml
    with:
      node-version: '20'
      working-directory: './packages/frontend'
      enable-coverage: true
    secrets:
      NPM_TOKEN: ${{ secrets.NPM_TOKEN }}
      CODECOV_TOKEN: ${{ secrets.CODECOV_TOKEN }}

  test-backend:
    uses: ./.github/workflows/_reusable-test.yml
    with:
      node-version: '20'
      working-directory: './packages/backend'
      enable-coverage: true
    secrets: inherit  # 全シークレットを継承する簡略記法

  # outputsを参照
  coverage-gate:
    needs: [test-frontend, test-backend]
    runs-on: ubuntu-latest
    steps:
      - name: Check coverage thresholds
        run: |
          FRONTEND_COV=${{ needs.test-frontend.outputs.coverage-percentage }}
          BACKEND_COV=${{ needs.test-backend.outputs.coverage-percentage }}
          echo "Frontend coverage: ${FRONTEND_COV}%"
          echo "Backend coverage: ${BACKEND_COV}%"
          # 80%未満なら失敗
          if (( $(echo "$FRONTEND_COV < 80" | bc -l) )); then
            echo "::error::Frontend coverage ${FRONTEND_COV}% is below 80% threshold"
            exit 1
          fi
```

### 1.3 外部リポジトリのReusable Workflowを呼び出す

```yaml
jobs:
  deploy:
    # 別リポジトリのワークフローを参照（組織共通テンプレート）
    uses: my-org/shared-workflows/.github/workflows/deploy-to-eks.yml@v2
    with:
      environment: production
      cluster-name: prod-eks-cluster
    secrets: inherit
```

---

## 2. マトリックスビルド — 並列テスト戦略

`matrix`戦略は、1つのジョブ定義から複数の環境・バージョンの組み合わせを自動生成します。

### 2.1 基本的なマトリックス

```yaml
jobs:
  test:
    runs-on: ${{ matrix.os }}
    strategy:
      matrix:
        os: [ubuntu-latest, windows-latest, macos-latest]
        node: ['18', '20', '22']
        # 3 OS × 3 Node = 9並列ジョブが生成される
      fail-fast: false  # 1つ失敗しても他を続行
      max-parallel: 6   # 同時実行数を制限

    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node }}
      - run: npm ci
      - run: npm test
```

### 2.2 include/exclude で細かく制御

```yaml
strategy:
  matrix:
    os: [ubuntu-latest, windows-latest]
    node: ['18', '20', '22']
    include:
      # Node 22 + macOS の組み合わせを追加
      - os: macos-latest
        node: '22'
        experimental: true
      # 特定の組み合わせに追加プロパティを付与
      - os: ubuntu-latest
        node: '20'
        coverage: true
    exclude:
      # Windows + Node 18 は除外
      - os: windows-latest
        node: '18'

steps:
  - name: Run tests with coverage
    if: matrix.coverage == true
    run: npm run test:coverage

  - name: Run tests
    if: matrix.coverage != true
    run: npm test

  # 実験的なマトリックスの失敗を許容
  - name: Handle experimental failures
    continue-on-error: ${{ matrix.experimental == true }}
```

### 2.3 動的マトリックス（JSONから生成）

```yaml
jobs:
  # まず変更されたパッケージを検出
  detect-changes:
    runs-on: ubuntu-latest
    outputs:
      packages: ${{ steps.detect.outputs.packages }}
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
      - name: Detect changed packages
        id: detect
        run: |
          # 変更されたpackages/配下のディレクトリを検出
          CHANGED=$(git diff --name-only origin/main...HEAD \
            | grep '^packages/' \
            | cut -d'/' -f2 \
            | sort -u \
            | jq -R -s -c 'split("\n") | map(select(. != ""))')
          echo "packages=${CHANGED}" >> $GITHUB_OUTPUT

  # 変更されたパッケージのみテスト
  test:
    needs: detect-changes
    if: needs.detect-changes.outputs.packages != '[]'
    strategy:
      matrix:
        package: ${{ fromJson(needs.detect-changes.outputs.packages) }}
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: cd packages/${{ matrix.package }} && npm ci && npm test
```

---

## 3. 条件実行と高度な制御フロー

### 3.1 if 条件式のパターン集

```yaml
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      # ブランチ判定
      - name: Deploy to production
        if: github.ref == 'refs/heads/main' && github.event_name == 'push'
        run: ./deploy.sh production

      # イベント判定
      - name: Comment on PR
        if: github.event_name == 'pull_request'
        run: gh pr comment ${{ github.event.number }} --body "CI passed!"

      # 前のステップの失敗を検知
      - name: Notify on failure
        if: failure()
        uses: slackapi/slack-github-action@v1
        with:
          payload: '{"text": "Build failed: ${{ github.run_url }}"}'

      # 前のステップを常に実行
      - name: Cleanup
        if: always()
        run: rm -rf /tmp/build-artifacts

      # 環境変数で分岐
      - name: Run E2E only on schedule
        if: github.event_name == 'schedule' || contains(github.event.head_commit.message, '[e2e]')
        run: npm run test:e2e

      # outputs を参照した条件
      - name: Skip if no changes
        if: steps.detect.outputs.changed == 'true'
        run: npm run build
```

### 3.2 ジョブ間依存とfan-out/fan-in

```yaml
jobs:
  # Stage 1: 並列ビルド（fan-out）
  build-app:
    runs-on: ubuntu-latest
    outputs:
      image-tag: ${{ steps.tag.outputs.tag }}
    steps:
      - id: tag
        run: echo "tag=$(git rev-parse --short HEAD)" >> $GITHUB_OUTPUT
      - run: docker build -t app:${{ steps.tag.outputs.tag }} .

  build-docs:
    runs-on: ubuntu-latest
    steps:
      - run: npm run docs:build

  run-tests:
    runs-on: ubuntu-latest
    steps:
      - run: npm test

  # Stage 2: 全ビルド完了後にデプロイ（fan-in）
  deploy:
    needs: [build-app, build-docs, run-tests]
    runs-on: ubuntu-latest
    # needsで参照したジョブのoutputsにアクセス
    steps:
      - name: Deploy with image tag
        run: |
          IMAGE_TAG=${{ needs.build-app.outputs.image-tag }}
          kubectl set image deployment/app app=registry.example.com/app:${IMAGE_TAG}

  # いずれかのビルドが失敗しても通知は送る
  notify:
    needs: [build-app, build-docs, run-tests, deploy]
    if: always()
    runs-on: ubuntu-latest
    steps:
      - name: Check overall status
        run: |
          if [[ "${{ contains(needs.*.result, 'failure') }}" == "true" ]]; then
            echo "One or more jobs failed"
            exit 1
          fi
```

---

## 4. セクレット管理 — 環境保護ルール

### 4.1 GitHub Secretsの階層

GitHubには3階層のシークレット管理があります。

```
Organization Secrets     # 組織全体で共有（admin設定）
  └── Repository Secrets # リポジトリ単位
        └── Environment Secrets # 環境（production/staging）単位
```

### 4.2 Environment Protection Rules

```yaml
# .github/workflows/deploy.yml
jobs:
  deploy-staging:
    environment: staging  # Environment Secretsを参照
    runs-on: ubuntu-latest
    steps:
      - name: Deploy to staging
        run: |
          # staging環境のシークレットが自動的に注入される
          aws s3 sync ./dist s3://${{ secrets.S3_BUCKET_NAME }}
        env:
          AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
          AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}

  deploy-production:
    environment: production  # 本番環境（レビュアー承認必須に設定可能）
    needs: [deploy-staging]
    runs-on: ubuntu-latest
    steps:
      - name: Deploy to production
        run: ./deploy-prod.sh
        env:
          # production環境のシークレットは staging と別物
          DATABASE_URL: ${{ secrets.DATABASE_URL }}
          API_KEY: ${{ secrets.API_KEY }}
```

**GitHub UIでの設定ポイント:**
- `Settings > Environments > production > Required reviewers` に承認者を設定
- `Wait timer` で一定時間後に自動承認も可能
- `Deployment branches` で特定ブランチからのデプロイのみ許可

---

## 5. OIDC認証 — キーレスでAWS/GCP/Azureに認証

従来の長期間有効なアクセスキーをシークレットに保存する方法は、漏洩リスクがあります。**OpenID Connect (OIDC)** を使えば、GitHub Actionsが一時的なトークンを取得し、クラウドプロバイダに直接認証できます。

### 5.1 AWS OIDC設定

```yaml
# .github/workflows/deploy-aws.yml
name: Deploy to AWS

on:
  push:
    branches: [main]

permissions:
  id-token: write  # OIDC トークン発行に必須
  contents: read

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Configure AWS credentials via OIDC
        uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: arn:aws:iam::123456789012:role/GitHubActionsRole
          role-session-name: GitHubActions-${{ github.run_id }}
          aws-region: ap-northeast-1
          # アクセスキーは一切不要！

      - name: Login to Amazon ECR
        id: login-ecr
        uses: aws-actions/amazon-ecr-login@v2

      - name: Build and push Docker image
        env:
          ECR_REGISTRY: ${{ steps.login-ecr.outputs.registry }}
          IMAGE_TAG: ${{ github.sha }}
        run: |
          docker build -t $ECR_REGISTRY/my-app:$IMAGE_TAG .
          docker push $ECR_REGISTRY/my-app:$IMAGE_TAG

      - name: Deploy to ECS
        run: |
          aws ecs update-service \
            --cluster production \
            --service my-app \
            --force-new-deployment
```

**AWS側のIAMロール設定（Terraformの例）:**

```hcl
resource "aws_iam_role" "github_actions" {
  name = "GitHubActionsRole"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRoleWithWebIdentity"
      Effect = "Allow"
      Principal = {
        Federated = aws_iam_openid_connect_provider.github.arn
      }
      Condition = {
        StringEquals = {
          "token.actions.githubusercontent.com:aud" = "sts.amazonaws.com"
        }
        StringLike = {
          # 特定のリポジトリとブランチのみ許可
          "token.actions.githubusercontent.com:sub" = "repo:my-org/my-repo:ref:refs/heads/main"
        }
      }
    }]
  })
}
```

### 5.2 Google Cloud OIDC設定

```yaml
- name: Authenticate to Google Cloud
  uses: google-github-actions/auth@v2
  with:
    workload_identity_provider: 'projects/123456789/locations/global/workloadIdentityPools/github/providers/github'
    service_account: 'github-actions@my-project.iam.gserviceaccount.com'
    # サービスアカウントキーJSONは不要！

- name: Deploy to Cloud Run
  uses: google-github-actions/deploy-cloudrun@v2
  with:
    service: my-service
    region: asia-northeast1
    image: gcr.io/my-project/my-app:${{ github.sha }}
```

---

## 6. Docker Layer Caching — ビルド時間を大幅短縮

Dockerビルドの最大のボトルネックはレイヤーキャッシュの非活用です。適切なキャッシュ戦略でビルド時間を10分から1分以下に短縮できます。

### 6.1 GitHub Actions Cache Backend

```yaml
- name: Set up Docker Buildx
  uses: docker/setup-buildx-action@v3

- name: Build and push with layer cache
  uses: docker/build-push-action@v6
  with:
    context: .
    push: true
    tags: registry.example.com/app:${{ github.sha }}
    cache-from: type=gha          # GitHub Actions Cacheからキャッシュ読み込み
    cache-to: type=gha,mode=max   # 全レイヤーをキャッシュ（mode=max推奨）
```

### 6.2 Registry Cache Backend（本番推奨）

```yaml
- name: Build with registry cache
  uses: docker/build-push-action@v6
  with:
    context: .
    push: true
    tags: |
      ${{ env.REGISTRY }}/app:latest
      ${{ env.REGISTRY }}/app:${{ github.sha }}
    cache-from: type=registry,ref=${{ env.REGISTRY }}/app:cache
    cache-to: type=registry,ref=${{ env.REGISTRY }}/app:cache,mode=max
    # Buildkit のインライン cache より高速
```

### 6.3 マルチプラットフォームビルド + キャッシュ

```yaml
- name: Set up QEMU
  uses: docker/setup-qemu-action@v3

- name: Set up Docker Buildx
  uses: docker/setup-buildx-action@v3

- name: Build multi-platform image
  uses: docker/build-push-action@v6
  with:
    context: .
    platforms: linux/amd64,linux/arm64
    push: true
    tags: ${{ env.REGISTRY }}/app:${{ github.sha }}
    cache-from: |
      type=registry,ref=${{ env.REGISTRY }}/app:cache-amd64
      type=registry,ref=${{ env.REGISTRY }}/app:cache-arm64
    cache-to: |
      type=registry,ref=${{ env.REGISTRY }}/app:cache-amd64,platform=linux/amd64
      type=registry,ref=${{ env.REGISTRY }}/app:cache-arm64,platform=linux/arm64
```

### 6.4 Dockerfile最適化でキャッシュ効率を上げる

```dockerfile
# NG: パッケージインストールとソースコードを同一レイヤーに混在
COPY . .
RUN npm ci && npm run build

# OK: 変更頻度の低いものを先に、高いものを後に
FROM node:20-alpine AS base

# 依存関係のみ先にコピー（package.jsonが変わらなければキャッシュ再利用）
COPY package*.json ./
RUN npm ci --only=production

# ソースコードは最後にコピー（毎回変わる）
COPY . .
RUN npm run build

# 本番イメージは最小限に
FROM node:20-alpine AS production
COPY --from=base /app/dist ./dist
COPY --from=base /app/node_modules ./node_modules
CMD ["node", "dist/index.js"]
```

---

## 7. 依存関係キャッシュ最適化

### 7.1 pnpm キャッシュ（推奨）

```yaml
- name: Install pnpm
  uses: pnpm/action-setup@v3
  with:
    version: 9

- name: Setup Node.js with pnpm cache
  uses: actions/setup-node@v4
  with:
    node-version: '20'
    cache: 'pnpm'  # setup-node が pnpm のキャッシュを自動管理

- name: Install dependencies
  run: pnpm install --frozen-lockfile
```

### 7.2 pip / uv キャッシュ（Python）

```yaml
- name: Install uv
  uses: astral-sh/setup-uv@v3

- name: Set up Python with cache
  uses: actions/setup-python@v5
  with:
    python-version: '3.12'
    cache: 'pip'
    cache-dependency-path: '**/requirements*.txt'

- name: Install dependencies
  run: uv pip install -r requirements.txt --system
```

### 7.3 カスタムキャッシュ（Gradle/Maven等）

```yaml
- name: Cache Gradle packages
  uses: actions/cache@v4
  with:
    path: |
      ~/.gradle/caches
      ~/.gradle/wrapper
    key: ${{ runner.os }}-gradle-${{ hashFiles('**/*.gradle*', '**/gradle-wrapper.properties') }}
    restore-keys: |
      ${{ runner.os }}-gradle-
    # restore-keys は前方一致でキャッシュを段階的に検索

- name: Cache pip with hash
  uses: actions/cache@v4
  with:
    path: ~/.cache/pip
    key: ${{ runner.os }}-pip-${{ hashFiles('**/requirements*.txt') }}
    restore-keys: ${{ runner.os }}-pip-
    # save-always: true  # テスト失敗でもキャッシュを保存
```

---

## 8. 並列ジョブ設計 — 最大スループットを引き出す

### 8.1 テストシャーディング

大規模なテストスイートを複数のランナーに分散させます。

```yaml
jobs:
  test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        shard: [1, 2, 3, 4]  # 4分割で並列実行
    steps:
      - uses: actions/checkout@v4
      - run: npm ci

      # Vitest のシャーディング
      - name: Run tests (shard ${{ matrix.shard }}/4)
        run: npx vitest run --reporter=junit --outputFile=test-results.xml --shard=${{ matrix.shard }}/4

      # Playwright のシャーディング
      - name: Run E2E tests
        run: npx playwright test --shard=${{ matrix.shard }}/4

      - name: Upload test results
        uses: actions/upload-artifact@v4
        if: always()
        with:
          name: test-results-${{ matrix.shard }}
          path: test-results.xml

  # 全シャードの結果をマージ
  merge-results:
    needs: test
    runs-on: ubuntu-latest
    if: always()
    steps:
      - uses: actions/download-artifact@v4
        with:
          pattern: test-results-*
          merge-multiple: true
          path: test-results/
      - name: Merge JUnit reports
        run: npx junit-report-merger merged-results.xml "test-results/*.xml"
```

### 8.2 パイプラインの最適化パターン

```yaml
# 最適化前: 直列実行（合計時間 = 各ジョブの合計）
# lint(3分) -> test(8分) -> build(5分) -> deploy(2分) = 18分

# 最適化後: 並列化（合計時間 = 最長ジョブ）
jobs:
  lint:       # 3分
    runs-on: ubuntu-latest
    steps: [...]

  test:       # 8分（並列）
    runs-on: ubuntu-latest
    steps: [...]

  type-check: # 2分（並列）
    runs-on: ubuntu-latest
    steps: [...]

  # lint と test が両方完了したらビルド
  build:
    needs: [lint, test, type-check]  # 8分後に開始
    runs-on: ubuntu-latest
    steps: [...]

  deploy:
    needs: [build]   # 8+5=13分後に開始
    runs-on: ubuntu-latest
    steps: [...]
# 合計: 8 + 5 + 2 = 15分（3分短縮）
```

---

## 9. セルフホストランナー — EC2とKubernetesで大規模CI

### 9.1 EC2 Spot Instanceランナー（コスト最適化）

```yaml
# .github/workflows/spawn-runner.yml
jobs:
  start-runner:
    runs-on: ubuntu-latest
    outputs:
      label: ${{ steps.start-ec2-runner.outputs.label }}
      ec2-instance-id: ${{ steps.start-ec2-runner.outputs.ec2-instance-id }}
    steps:
      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: ${{ secrets.AWS_ROLE_ARN }}
          aws-region: ap-northeast-1

      - name: Start EC2 runner
        id: start-ec2-runner
        uses: machulav/ec2-github-runner@v2
        with:
          mode: start
          github-token: ${{ secrets.GH_PERSONAL_ACCESS_TOKEN }}
          ec2-image-id: ami-0d979355d03fa2522  # カスタムAMI（ランナー事前インストール済み）
          ec2-instance-type: c6i.4xlarge        # 高スペック（大規模ビルド向け）
          subnet-id: subnet-xxxxxxxxx
          security-group-id: sg-xxxxxxxxx
          spot-instance-strategy: BestEffort    # Spotインスタンスで最大70%コスト削減

  build:
    needs: start-runner
    runs-on: ${{ needs.start-runner.outputs.label }}  # EC2上で実行
    steps:
      - run: npm ci && npm run build:full  # 大規模ビルドをEC2で実行

  stop-runner:
    needs: [start-runner, build]
    runs-on: ubuntu-latest
    if: always()  # ビルド失敗でも必ずEC2を停止
    steps:
      - uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: ${{ secrets.AWS_ROLE_ARN }}
          aws-region: ap-northeast-1
      - name: Stop EC2 runner
        uses: machulav/ec2-github-runner@v2
        with:
          mode: stop
          github-token: ${{ secrets.GH_PERSONAL_ACCESS_TOKEN }}
          label: ${{ needs.start-runner.outputs.label }}
          ec2-instance-id: ${{ needs.start-runner.outputs.ec2-instance-id }}
```

### 9.2 Kubernetes Actions Runner Controller (ARC)

```yaml
# runner-deployment.yaml（Kubernetes上のRunner設定）
apiVersion: actions.summerwind.dev/v1alpha1
kind: RunnerDeployment
metadata:
  name: github-runner
  namespace: actions-runner-system
spec:
  replicas: 3
  template:
    spec:
      repository: my-org/my-repo
      image: summerwind/actions-runner:latest
      resources:
        limits:
          cpu: "4"
          memory: "8Gi"
        requests:
          cpu: "2"
          memory: "4Gi"
      volumeMounts:
        - name: docker-sock
          mountPath: /var/run/docker.sock
---
# オートスケーラー（需要に応じてRunner数を自動調整）
apiVersion: actions.summerwind.dev/v1alpha1
kind: HorizontalRunnerAutoscaler
metadata:
  name: github-runner-autoscaler
spec:
  scaleTargetRef:
    name: github-runner
  minReplicas: 1
  maxReplicas: 20
  metrics:
    - type: TotalNumberOfQueuedAndInProgressWorkflowRuns
      repositoryNames:
        - my-org/my-repo
```

---

## 10. Kubernetes自動デプロイ

### 10.1 kubectl apply によるデプロイ

```yaml
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: ${{ secrets.AWS_ROLE_ARN }}
          aws-region: ap-northeast-1

      - name: Update kubeconfig for EKS
        run: |
          aws eks update-kubeconfig \
            --name production-cluster \
            --region ap-northeast-1

      - name: Set image tag in manifests
        run: |
          # kustomize で image tag を動的に変更
          cd k8s/overlays/production
          kustomize edit set image \
            app=registry.example.com/app:${{ github.sha }}

      - name: Apply Kubernetes manifests
        run: |
          kustomize build k8s/overlays/production | kubectl apply -f -
          # ロールアウト完了まで待機
          kubectl rollout status deployment/app -n production --timeout=10m

      - name: Rollback on failure
        if: failure()
        run: kubectl rollout undo deployment/app -n production
```

### 10.2 Helm upgrade によるデプロイ

```yaml
- name: Deploy with Helm
  run: |
    helm upgrade --install my-app ./charts/my-app \
      --namespace production \
      --create-namespace \
      --set image.repository=registry.example.com/app \
      --set image.tag=${{ github.sha }} \
      --set replicaCount=3 \
      --set resources.requests.cpu=500m \
      --set resources.requests.memory=512Mi \
      --values ./charts/my-app/values-production.yaml \
      --atomic \          # 失敗時に自動ロールバック
      --timeout 10m \
      --wait              # Podが全てReady状態になるまで待機

- name: Verify deployment
  run: |
    kubectl get pods -n production -l app=my-app
    kubectl get services -n production
    # ヘルスチェックエンドポイントを確認
    INGRESS_IP=$(kubectl get ingress my-app -n production -o jsonpath='{.status.loadBalancer.ingress[0].ip}')
    curl -f "http://${INGRESS_IP}/health" || exit 1
```

---

## 11. カナリアリリース・ブルーグリーンデプロイ

### 11.1 カナリアリリース（段階的ロールアウト）

```yaml
jobs:
  canary-deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Deploy canary (10% traffic)
        run: |
          # カナリア用DeploymentとServiceを適用
          kubectl apply -f k8s/canary/deployment-canary.yaml
          # 10%のトラフィックをカナリアに向ける（Istio/Argo Rolloutsを使用）
          kubectl apply -f - <<EOF
          apiVersion: networking.istio.io/v1alpha3
          kind: VirtualService
          metadata:
            name: my-app
          spec:
            http:
            - route:
              - destination:
                  host: my-app-stable
                weight: 90
              - destination:
                  host: my-app-canary
                weight: 10
          EOF

      - name: Monitor canary metrics (5 minutes)
        run: |
          sleep 300  # 5分間モニタリング
          # Prometheusでエラーレートを確認
          ERROR_RATE=$(curl -s "http://prometheus/api/v1/query?query=rate(http_requests_total{status=~'5.*',version='canary'}[5m])" \
            | jq '.data.result[0].value[1]' -r)
          if (( $(echo "$ERROR_RATE > 0.01" | bc -l) )); then
            echo "Error rate ${ERROR_RATE} exceeds 1% threshold. Rolling back."
            kubectl delete -f k8s/canary/deployment-canary.yaml
            exit 1
          fi
          echo "Canary is healthy. Proceeding to full rollout."

      - name: Full rollout (100% traffic)
        run: |
          # 全トラフィックを新バージョンに切り替え
          kubectl set image deployment/my-app-stable app=registry.example.com/app:${{ github.sha }}
          kubectl rollout status deployment/my-app-stable --timeout=10m
          kubectl delete -f k8s/canary/deployment-canary.yaml
```

### 11.2 ブルーグリーンデプロイ

```yaml
jobs:
  blue-green-deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Determine current active slot
        id: slot
        run: |
          CURRENT=$(kubectl get service my-app -n production \
            -o jsonpath='{.spec.selector.slot}')
          if [ "$CURRENT" = "blue" ]; then
            echo "active=blue" >> $GITHUB_OUTPUT
            echo "inactive=green" >> $GITHUB_OUTPUT
          else
            echo "active=green" >> $GITHUB_OUTPUT
            echo "inactive=blue" >> $GITHUB_OUTPUT
          fi

      - name: Deploy to inactive slot
        run: |
          INACTIVE=${{ steps.slot.outputs.inactive }}
          # 非アクティブスロットに新バージョンをデプロイ
          kubectl set image deployment/my-app-${INACTIVE} \
            app=registry.example.com/app:${{ github.sha }} -n production
          kubectl rollout status deployment/my-app-${INACTIVE} -n production --timeout=10m

      - name: Run smoke tests on inactive slot
        run: |
          INACTIVE=${{ steps.slot.outputs.inactive }}
          INACTIVE_IP=$(kubectl get service my-app-${INACTIVE}-internal \
            -n production -o jsonpath='{.spec.clusterIP}')
          # スモークテスト実行
          curl -f "http://${INACTIVE_IP}/health"
          curl -f "http://${INACTIVE_IP}/api/v1/status"

      - name: Switch traffic to new slot
        run: |
          INACTIVE=${{ steps.slot.outputs.inactive }}
          # Serviceのselectorを切り替えるだけでゼロダウンタイム切り替え
          kubectl patch service my-app -n production \
            -p "{\"spec\":{\"selector\":{\"slot\":\"${INACTIVE}\"}}}"
          echo "Traffic switched to ${INACTIVE} slot"
```

---

## 12. セキュリティスキャン — シフトレフトセキュリティ

### 12.1 Trivy による脆弱性スキャン

```yaml
jobs:
  security-scan:
    runs-on: ubuntu-latest
    permissions:
      security-events: write  # SARIF アップロードに必要

    steps:
      - uses: actions/checkout@v4

      # コンテナイメージのスキャン
      - name: Build Docker image
        run: docker build -t app:scan .

      - name: Run Trivy vulnerability scanner
        uses: aquasecurity/trivy-action@master
        with:
          image-ref: 'app:scan'
          format: 'sarif'
          output: 'trivy-results.sarif'
          severity: 'CRITICAL,HIGH'
          exit-code: '1'  # 高・重大の脆弱性が見つかれば失敗

      - name: Upload Trivy scan results to GitHub Security tab
        uses: github/codeql-action/upload-sarif@v3
        if: always()
        with:
          sarif_file: 'trivy-results.sarif'

      # ファイルシステムスキャン（IaCファイル等）
      - name: Scan filesystem
        uses: aquasecurity/trivy-action@master
        with:
          scan-type: 'fs'
          scan-ref: '.'
          format: 'table'
          severity: 'CRITICAL,HIGH,MEDIUM'
```

### 12.2 CodeQL による静的解析

```yaml
jobs:
  analyze:
    name: CodeQL Analysis
    runs-on: ubuntu-latest
    permissions:
      actions: read
      contents: read
      security-events: write

    strategy:
      matrix:
        language: ['javascript-typescript', 'python']

    steps:
      - uses: actions/checkout@v4

      - name: Initialize CodeQL
        uses: github/codeql-action/init@v3
        with:
          languages: ${{ matrix.language }}
          queries: security-extended,security-and-quality  # 拡張クエリセット

      - name: Autobuild
        uses: github/codeql-action/autobuild@v3

      - name: Perform CodeQL Analysis
        uses: github/codeql-action/analyze@v3
        with:
          category: '/language:${{ matrix.language }}'
```

### 12.3 Secretsスキャン + Dependabot設定

```yaml
# .github/workflows/secret-scan.yml
- name: Scan for exposed secrets
  uses: trufflesecurity/trufflehog@main
  with:
    path: ./
    base: ${{ github.event.repository.default_branch }}
    head: HEAD
    extra_args: --only-verified  # 検証済みの漏洩のみ報告
```

```yaml
# .github/dependabot.yml
version: 2
updates:
  - package-ecosystem: "npm"
    directory: "/"
    schedule:
      interval: "weekly"
      day: "monday"
      time: "09:00"
      timezone: "Asia/Tokyo"
    groups:
      # 関連パッケージをまとめてPR
      react:
        patterns: ["react", "react-dom", "@types/react*"]
      testing:
        patterns: ["vitest", "@testing-library/*", "playwright"]
    ignore:
      # メジャーバージョンアップは手動対応
      - dependency-name: "next"
        update-types: ["version-update:semver-major"]
    open-pull-requests-limit: 10
    labels:
      - "dependencies"
      - "automated"

  - package-ecosystem: "docker"
    directory: "/"
    schedule:
      interval: "weekly"
```

### 12.4 SLSA Provenance — サプライチェーン攻撃対策

```yaml
jobs:
  build:
    outputs:
      digests: ${{ steps.hash.outputs.digests }}
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm ci && npm run build
      - name: Generate artifact hash
        id: hash
        run: |
          sha256sum dist/*.js > checksums.txt
          echo "digests=$(base64 -w0 checksums.txt)" >> $GITHUB_OUTPUT

  # SLSA Level 3 Provenanceを生成
  provenance:
    needs: [build]
    permissions:
      actions: read
      id-token: write
      contents: write
    uses: slsa-framework/slsa-github-generator/.github/workflows/generator_generic_slsa3.yml@v2.0.0
    with:
      base64-subjects: ${{ needs.build.outputs.digests }}
      upload-assets: true
```

---

## 13. コスト最適化戦略

### 13.1 実行時間とコストの把握

GitHub-hosted runnerの料金（2026年現在）:
- `ubuntu-latest` (2-core): $0.008/分
- `ubuntu-latest-4-core`: $0.016/分
- `ubuntu-latest-8-core`: $0.032/分
- macOS: $0.08/分（10倍高価）

### 13.2 ランナーの適切なサイズ選択

```yaml
jobs:
  # 軽量タスクは標準ランナー
  lint:
    runs-on: ubuntu-latest  # 2-core: $0.008/分

  # CPU集約型タスクは大型ランナー（時間短縮でコスト相殺）
  build:
    runs-on: ubuntu-latest-8-core  # 8-core: $0.032/分
    # 10分→2.5分に短縮 → コストは同等、スピードは4倍

  # macOSは必要最小限に
  ios-test:
    runs-on: macos-14  # Apple Silicon Mは必要な時のみ
    if: github.ref == 'refs/heads/main'  # mainブランチのみ実行
```

### 13.3 不要なトリガーを制限

```yaml
on:
  push:
    branches: [main, 'release/**']
    paths:
      # 関連ファイルの変更時のみ実行
      - 'src/**'
      - 'package*.json'
      - '.github/workflows/**'
      # ドキュメント変更ではCI不要
      - '!docs/**'
      - '!*.md'

  pull_request:
    branches: [main]
    types: [opened, synchronize, reopened]  # 必要なイベントのみ
```

### 13.4 Concurrencyでの重複実行防止

```yaml
concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true
  # 同じブランチへの連続pushで前のワークフローをキャンセル
  # 開発中に大量のプッシュをしてもコストが跳ね上がらない
```

### 13.5 長時間ジョブのタイムアウト設定

```yaml
jobs:
  test:
    runs-on: ubuntu-latest
    timeout-minutes: 30  # デフォルトの360分（6時間）を短縮
    steps:
      - name: Run tests
        timeout-minutes: 20  # ステップ単位でもタイムアウト設定可能
        run: npm test
```

---

## 14. 完全なプロダクション対応パイプライン

以上の要素を組み合わせた、実務で使えるフルパイプラインの例を示します。

```yaml
# .github/workflows/production-pipeline.yml
name: Production Pipeline

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: ${{ github.event_name == 'pull_request' }}

env:
  REGISTRY: ghcr.io
  IMAGE_NAME: ${{ github.repository }}

permissions:
  contents: read
  packages: write
  id-token: write
  security-events: write

jobs:
  # ===========================================================
  # Stage 1: 品質チェック（並列）
  # ===========================================================
  lint-and-typecheck:
    uses: ./.github/workflows/_reusable-test.yml
    with:
      node-version: '20'

  security-scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: github/codeql-action/init@v3
        with:
          languages: javascript-typescript
      - uses: github/codeql-action/autobuild@v3
      - uses: github/codeql-action/analyze@v3

  # ===========================================================
  # Stage 2: ビルド（Stage 1完了後）
  # ===========================================================
  build:
    needs: [lint-and-typecheck]
    runs-on: ubuntu-latest-4-core  # 高速ビルド
    outputs:
      image-digest: ${{ steps.build.outputs.digest }}
      image-tag: ${{ steps.meta.outputs.tags }}

    steps:
      - uses: actions/checkout@v4

      - name: Extract metadata
        id: meta
        uses: docker/metadata-action@v5
        with:
          images: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}
          tags: |
            type=ref,event=branch
            type=sha,prefix={{branch}}-

      - uses: docker/setup-buildx-action@v3
      - uses: docker/login-action@v3
        with:
          registry: ${{ env.REGISTRY }}
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: Build and push
        id: build
        uses: docker/build-push-action@v6
        with:
          context: .
          push: true
          tags: ${{ steps.meta.outputs.tags }}
          labels: ${{ steps.meta.outputs.labels }}
          cache-from: type=registry,ref=${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:cache
          cache-to: type=registry,ref=${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:cache,mode=max

  # ===========================================================
  # Stage 3: テスト（マトリックス並列）
  # ===========================================================
  integration-test:
    needs: [build]
    runs-on: ubuntu-latest
    strategy:
      matrix:
        shard: [1, 2, 3, 4]
      fail-fast: false
    steps:
      - uses: actions/checkout@v4
      - run: npm ci
      - name: Run tests (shard ${{ matrix.shard }}/4)
        run: npx playwright test --shard=${{ matrix.shard }}/4
        env:
          APP_IMAGE: ${{ needs.build.outputs.image-tag }}

  image-scan:
    needs: [build]
    runs-on: ubuntu-latest
    steps:
      - name: Scan container image
        uses: aquasecurity/trivy-action@master
        with:
          image-ref: ${{ needs.build.outputs.image-tag }}
          format: sarif
          output: trivy-results.sarif
          severity: CRITICAL,HIGH
          exit-code: '1'
      - uses: github/codeql-action/upload-sarif@v3
        if: always()
        with:
          sarif_file: trivy-results.sarif

  # ===========================================================
  # Stage 4: デプロイ（mainブランチのみ）
  # ===========================================================
  deploy-staging:
    needs: [integration-test, image-scan, security-scan]
    if: github.ref == 'refs/heads/main' && github.event_name == 'push'
    environment: staging
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: ${{ secrets.AWS_ROLE_ARN_STAGING }}
          aws-region: ap-northeast-1
      - run: |
          aws eks update-kubeconfig --name staging-cluster --region ap-northeast-1
          helm upgrade --install my-app ./charts/my-app \
            --namespace staging \
            --set image.tag=${{ github.sha }} \
            --values ./charts/my-app/values-staging.yaml \
            --atomic --timeout 10m

  deploy-production:
    needs: [deploy-staging]
    if: github.ref == 'refs/heads/main'
    environment: production  # 承認必須
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: ${{ secrets.AWS_ROLE_ARN_PRODUCTION }}
          aws-region: ap-northeast-1
      - run: |
          aws eks update-kubeconfig --name production-cluster --region ap-northeast-1
          # カナリアデプロイ（まず10%）
          helm upgrade --install my-app-canary ./charts/my-app \
            --namespace production \
            --set image.tag=${{ github.sha }} \
            --set replicaCount=1 \
            --values ./charts/my-app/values-canary.yaml \
            --atomic --timeout 10m
          # 5分様子見
          sleep 300
          # 全量デプロイ
          helm upgrade --install my-app ./charts/my-app \
            --namespace production \
            --set image.tag=${{ github.sha }} \
            --values ./charts/my-app/values-production.yaml \
            --atomic --timeout 10m
          helm uninstall my-app-canary --namespace production
```

---

## まとめ — 上級CI/CDのベストプラクティス

本記事で解説した上級テクニックを振り返ります。

| テクニック | 主な効果 |
|-----------|---------|
| Reusable Workflows | ワークフローのDRY化・保守性向上 |
| マトリックスビルド | 複数環境テストの並列化 |
| OIDC認証 | 長期キー不要・セキュリティ向上 |
| Docker Layer Cache | ビルド時間を最大90%短縮 |
| 依存関係キャッシュ | インストール時間を大幅削減 |
| テストシャーディング | E2Eテストの並列化 |
| カナリアリリース | リスクを最小化した段階的デプロイ |
| Trivyスキャン | 脆弱性を本番到達前に検出 |
| Concurrency制御 | 重複実行防止・コスト削減 |

CI/CDパイプラインの設定ファイル（YAML）は、書き間違えが即座に本番障害につながります。GitHubの設定に慣れてきたら、YAMLの構文検証ツールを手元に持っておくと効率が大きく変わります。[DevToolBox](https://usedevtools.com/)のJSON/YAMLバリデーター機能を使えば、`workflow_call`のinputs定義や複雑なmatrix設定のJSONを、プッシュ前にブラウザ上で即座に検証できます。試行錯誤のコミット数を減らし、パイプラインの品質を保ちながら開発サイクルを加速させましょう。

---

*参考資料*
- [GitHub Actions公式ドキュメント — Reusable workflows](https://docs.github.com/ja/actions/sharing-automations/reusing-workflows)
- [GitHub Actions公式ドキュメント — Security hardening with OpenID Connect](https://docs.github.com/ja/actions/security-for-github-actions/security-hardening-your-deployments/about-security-hardening-with-openid-connect)
- [docker/build-push-action — Advanced usage](https://github.com/docker/build-push-action/blob/master/docs/advanced/cache.md)
- [Aqua Security Trivy](https://trivy.dev/)
- [SLSA Framework](https://slsa.dev/)
