---
title: 'GitHub Actions完全ガイド — CI/CDパイプラインをゼロから構築する'
description: 'GitHub Actionsを使ったCI/CDパイプラインの構築方法を徹底解説。Node.js/Next.jsのテスト自動化・Vercelデプロイ・Docker Build・マトリックスビルド・シークレット管理・セルフホストランナーまで実践コード付きで解説。'
pubDate: '2026-02-20'
heroImage: '../../assets/blog-placeholder-2.jpg'
tags: ['GitHub Actions', 'CI/CD', 'DevOps', 'Docker', 'Vercel']
---

GitHub Actionsは、GitHubに統合されたCI/CDプラットフォームです。コードのプッシュやプルリクエストをトリガーに、テスト・ビルド・デプロイを自動化できます。本記事では、基本概念から実践的なパイプライン構築まで、動作するYAMLコードとともに徹底解説します。

## 1. GitHub Actionsの基本概念

GitHub Actionsを理解するうえで押さえるべき4つの要素があります。

### ワークフロー（Workflow）

ワークフローは`.github/workflows/`ディレクトリに置かれるYAMLファイルです。1つのリポジトリに複数のワークフローを定義できます。

```
.github/
└── workflows/
    ├── ci.yml          # テスト・Lint
    ├── deploy.yml      # 本番デプロイ
    └── release.yml     # リリース管理
```

### ジョブ（Job）

ワークフロー内で並列または直列に実行される処理単位です。各ジョブは独立したランナー上で動きます。

### ステップ（Step）

ジョブ内で順番に実行されるコマンドやアクションの単位です。前のステップの結果を次のステップで参照できます。

### ランナー（Runner）

ジョブが実行されるサーバー環境です。GitHubが提供するホスト型ランナー（ubuntu-latest、windows-latest、macos-latest）と、自前のセルフホストランナーがあります。

```
ワークフロー
└── ジョブA（ubuntu-latest で実行）
    ├── ステップ1: コードをチェックアウト
    ├── ステップ2: Node.jsをセットアップ
    ├── ステップ3: 依存関係をインストール
    └── ステップ4: テストを実行
└── ジョブB（ジョブA成功後に実行）
    └── ステップ1: デプロイ
```

## 2. YAMLの基本構文と主要コンテキスト

### ワークフローの最小構成

```yaml
name: CI

on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Run tests
        run: npm test
```

### 主要コンテキスト

GitHub Actionsでは、実行環境の情報にコンテキスト経由でアクセスします。

```yaml
steps:
  - name: コンテキストの確認
    run: |
      echo "リポジトリ: ${{ github.repository }}"
      echo "ブランチ:   ${{ github.ref_name }}"
      echo "コミットSHA: ${{ github.sha }}"
      echo "イベント:   ${{ github.event_name }}"
      echo "実行者:     ${{ github.actor }}"
      echo "ワークスペース: ${{ github.workspace }}"
```

| コンテキスト | 用途 |
|---|---|
| `github` | リポジトリ・コミット・イベント情報 |
| `env` | 環境変数 |
| `secrets` | 暗号化されたシークレット |
| `matrix` | マトリックスビルドの変数 |
| `steps` | 前のステップの出力値 |
| `needs` | 依存ジョブの出力値 |

## 3. トリガー設定

`on`キーでワークフローの起動条件を細かく制御できます。

```yaml
on:
  # mainとdevelopへのプッシュ時
  push:
    branches:
      - main
      - develop
    paths:
      - 'src/**'
      - 'package.json'

  # mainへのプルリクエスト時
  pull_request:
    branches:
      - main
    types: [opened, synchronize, reopened]

  # スケジュール実行（毎日午前9時 JST = UTC 0時）
  schedule:
    - cron: '0 0 * * *'

  # 手動トリガー（入力パラメータ付き）
  workflow_dispatch:
    inputs:
      environment:
        description: 'デプロイ環境'
        required: true
        default: 'staging'
        type: choice
        options:
          - staging
          - production
      dry_run:
        description: 'ドライランモード'
        required: false
        type: boolean
        default: false
```

手動トリガーの入力値は`${{ github.event.inputs.environment }}`で参照できます。

## 4. Node.js/TypeScriptプロジェクトのCI

実際のNext.jsプロジェクトに使えるCIワークフローの完全版です。

```yaml
# .github/workflows/ci.yml
name: CI

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  lint-and-test:
    name: Lint & Test
    runs-on: ubuntu-latest

    steps:
      - name: コードをチェックアウト
        uses: actions/checkout@v4

      - name: Node.jsをセットアップ
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: 依存関係をインストール
        run: npm ci

      - name: TypeScript型チェック
        run: npm run type-check

      - name: ESLint実行
        run: npm run lint

      - name: Prettierチェック
        run: npm run format:check

      - name: ユニットテスト実行
        run: npm run test -- --coverage

      - name: カバレッジレポートをアップロード
        uses: codecov/codecov-action@v4
        with:
          token: ${{ secrets.CODECOV_TOKEN }}
          files: ./coverage/lcov.info
          fail_ci_if_error: false

      - name: Next.jsビルド確認
        run: npm run build
        env:
          NEXT_TELEMETRY_DISABLED: 1
```

`package.json`のスクリプト定義例：

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "lint": "eslint . --ext .ts,.tsx",
    "type-check": "tsc --noEmit",
    "format:check": "prettier --check .",
    "test": "vitest run",
    "test:watch": "vitest"
  }
}
```

## 5. マトリックスビルド

複数のNode.jsバージョンやOSで同時にテストを実行できます。

```yaml
jobs:
  test-matrix:
    name: Test (Node ${{ matrix.node-version }} / ${{ matrix.os }})
    runs-on: ${{ matrix.os }}

    strategy:
      fail-fast: false   # 一つが失敗しても他を継続
      matrix:
        node-version: ['18', '20', '22']
        os: [ubuntu-latest, windows-latest, macos-latest]
        # 特定の組み合わせを除外
        exclude:
          - os: windows-latest
            node-version: '18'
        # 特定の組み合わせに追加パラメータ
        include:
          - os: ubuntu-latest
            node-version: '20'
            experimental: false

    steps:
      - uses: actions/checkout@v4

      - name: Node.js ${{ matrix.node-version }} をセットアップ
        uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node-version }}
          cache: 'npm'

      - run: npm ci
      - run: npm test
```

マトリックスビルドにより、3バージョン × 3OS = 9パターンのテストが並列実行されます。

## 6. アーティファクトとキャッシュ

### npmキャッシュ

`actions/setup-node`の`cache`オプションを使うと、`node_modules`のキャッシュが自動管理されます。

```yaml
- uses: actions/setup-node@v4
  with:
    node-version: '20'
    cache: 'npm'        # package-lock.json のハッシュでキャッシュ
```

### 高度なキャッシュ設定

```yaml
- name: Next.jsビルドキャッシュ
  uses: actions/cache@v4
  with:
    path: |
      ~/.npm
      ${{ github.workspace }}/.next/cache
    key: ${{ runner.os }}-nextjs-${{ hashFiles('**/package-lock.json') }}-${{ hashFiles('**/*.ts', '**/*.tsx') }}
    restore-keys: |
      ${{ runner.os }}-nextjs-${{ hashFiles('**/package-lock.json') }}-
      ${{ runner.os }}-nextjs-
```

### アーティファクトの保存と取得

```yaml
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm ci && npm run build

      - name: ビルド成果物を保存
        uses: actions/upload-artifact@v4
        with:
          name: build-output
          path: .next/
          retention-days: 7

  deploy:
    needs: build
    runs-on: ubuntu-latest
    steps:
      - name: ビルド成果物を取得
        uses: actions/download-artifact@v4
        with:
          name: build-output
          path: .next/

      - name: デプロイ実行
        run: echo "デプロイ処理..."
```

## 7. シークレット管理と環境変数

### シークレットの登録と参照

GitHubリポジトリの Settings > Secrets and variables > Actions からシークレットを登録します。

```yaml
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - name: 環境変数とシークレットの使い方
        run: |
          # シークレットはログに表示されない（マスクされる）
          echo "APIキーの長さ: ${#API_KEY}"
        env:
          API_KEY: ${{ secrets.API_KEY }}
          DATABASE_URL: ${{ secrets.DATABASE_URL }}
```

### 環境（Environment）ごとのシークレット管理

```yaml
jobs:
  deploy-staging:
    runs-on: ubuntu-latest
    environment: staging    # Settings > Environments で定義
    steps:
      - run: echo "ステージングにデプロイ"
        env:
          API_URL: ${{ secrets.STAGING_API_URL }}

  deploy-production:
    runs-on: ubuntu-latest
    environment: production  # 承認者設定・デプロイブランチ制限が可能
    steps:
      - run: echo "本番にデプロイ"
        env:
          API_URL: ${{ secrets.PRODUCTION_API_URL }}
```

### ステップ間での値の受け渡し

```yaml
steps:
  - name: バージョンを取得
    id: get_version
    run: echo "version=$(node -p "require('./package.json').version")" >> $GITHUB_OUTPUT

  - name: タグを作成
    run: git tag v${{ steps.get_version.outputs.version }}
```

## 8. Vercelへの自動デプロイ

### Vercel CLIを使ったデプロイ

```yaml
# .github/workflows/deploy.yml
name: Deploy to Vercel

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
          node-version: '20'

      - name: Vercel CLIをインストール
        run: npm install -g vercel@latest

      - name: Vercelにプルリクエストプレビューをデプロイ
        if: github.event_name == 'pull_request'
        run: |
          vercel deploy --token=${{ secrets.VERCEL_TOKEN }} \
            --yes \
            --env NEXT_PUBLIC_API_URL=${{ secrets.STAGING_API_URL }}
        env:
          VERCEL_ORG_ID: ${{ secrets.VERCEL_ORG_ID }}
          VERCEL_PROJECT_ID: ${{ secrets.VERCEL_PROJECT_ID }}

      - name: Vercel本番デプロイ
        if: github.ref == 'refs/heads/main'
        run: |
          vercel deploy --prod --token=${{ secrets.VERCEL_TOKEN }} --yes
        env:
          VERCEL_ORG_ID: ${{ secrets.VERCEL_ORG_ID }}
          VERCEL_PROJECT_ID: ${{ secrets.VERCEL_PROJECT_ID }}
```

Vercelのトークンと各IDは`vercel link`コマンド実行後に`.vercel/project.json`で確認できます。

## 9. DockerイメージのビルドとGitHub Container Registry push

```yaml
# .github/workflows/docker.yml
name: Docker Build & Push

on:
  push:
    branches: [main]
    tags: ['v*.*.*']

env:
  REGISTRY: ghcr.io
  IMAGE_NAME: ${{ github.repository }}

jobs:
  build-and-push:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      packages: write    # ghcr.io へのプッシュに必要

    steps:
      - uses: actions/checkout@v4

      - name: Docker Buildxをセットアップ
        uses: docker/setup-buildx-action@v3

      - name: GitHub Container Registryにログイン
        uses: docker/login-action@v3
        with:
          registry: ${{ env.REGISTRY }}
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}  # 自動提供されるトークン

      - name: Dockerメタデータを抽出
        id: meta
        uses: docker/metadata-action@v5
        with:
          images: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}
          tags: |
            type=ref,event=branch
            type=ref,event=pr
            type=semver,pattern={{version}}
            type=semver,pattern={{major}}.{{minor}}
            type=sha,prefix=sha-

      - name: Dockerイメージをビルド & プッシュ
        uses: docker/build-push-action@v5
        with:
          context: .
          push: true
          tags: ${{ steps.meta.outputs.tags }}
          labels: ${{ steps.meta.outputs.labels }}
          cache-from: type=gha        # GitHubActionsキャッシュを使用
          cache-to: type=gha,mode=max
          platforms: linux/amd64,linux/arm64   # マルチアーキテクチャ対応
```

マルチステージビルドのDockerfile例：

```dockerfile
# --- ビルドステージ ---
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# --- 実行ステージ ---
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

EXPOSE 3000
CMD ["node", "server.js"]
```

## 10. Slack通知・PRへのコメント自動投稿

### Slack通知

```yaml
steps:
  - name: テスト実行
    id: tests
    run: npm test
    continue-on-error: true

  - name: 成功時にSlack通知
    if: steps.tests.outcome == 'success'
    uses: slackapi/slack-github-action@v1
    with:
      payload: |
        {
          "text": "✅ テスト成功: ${{ github.repository }}@${{ github.ref_name }}",
          "blocks": [
            {
              "type": "section",
              "text": {
                "type": "mrkdwn",
                "text": "*✅ CI成功* — <${{ github.server_url }}/${{ github.repository }}/actions/runs/${{ github.run_id }}|詳細を見る>"
              }
            }
          ]
        }
    env:
      SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK_URL }}
      SLACK_WEBHOOK_TYPE: INCOMING_WEBHOOK

  - name: 失敗時にSlack通知
    if: steps.tests.outcome == 'failure'
    uses: slackapi/slack-github-action@v1
    with:
      payload: |
        {
          "text": "❌ テスト失敗: ${{ github.repository }}@${{ github.ref_name }}"
        }
    env:
      SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK_URL }}
      SLACK_WEBHOOK_TYPE: INCOMING_WEBHOOK
```

### PRへのコメント自動投稿

```yaml
- name: PRにカバレッジコメントを投稿
  if: github.event_name == 'pull_request'
  uses: actions/github-script@v7
  with:
    script: |
      const coverage = require('./coverage/coverage-summary.json');
      const pct = coverage.total.lines.pct;
      const emoji = pct >= 80 ? '✅' : '⚠️';

      const body = [
        `## ${emoji} テストカバレッジレポート`,
        '',
        `| 種類 | カバレッジ |`,
        `|------|-----------|`,
        `| Lines | ${coverage.total.lines.pct}% |`,
        `| Branches | ${coverage.total.branches.pct}% |`,
        `| Functions | ${coverage.total.functions.pct}% |`,
      ].join('\n');

      await github.rest.issues.createComment({
        issue_number: context.issue.number,
        owner: context.repo.owner,
        repo: context.repo.repo,
        body,
      });
```

## 11. セルフホストランナーの設定

クラウドのランナーでは対応できない環境（プライベートネットワーク内のデプロイ、GPU処理、高スペック要件）にはセルフホストランナーが有効です。

```bash
# セルフホストランナーの設定手順（Ubuntu）
mkdir actions-runner && cd actions-runner

# ランナーパッケージをダウンロード（GitHubのUIから最新URLを取得）
curl -o actions-runner-linux-x64-2.321.0.tar.gz -L \
  https://github.com/actions/runner/releases/download/v2.321.0/actions-runner-linux-x64-2.321.0.tar.gz

tar xzf ./actions-runner-linux-x64-2.321.0.tar.gz

# 設定（トークンはGitHub UIから取得）
./config.sh --url https://github.com/your-org/your-repo \
            --token YOUR_REGISTRATION_TOKEN \
            --labels self-hosted,linux,production

# サービスとして登録
sudo ./svc.sh install
sudo ./svc.sh start
```

ワークフローでの使用：

```yaml
jobs:
  deploy-internal:
    runs-on: [self-hosted, linux, production]   # ラベルでランナーを指定
    steps:
      - uses: actions/checkout@v4
      - name: 内部サービスへのデプロイ
        run: ./scripts/deploy-internal.sh
```

## 12. ワークフローの再利用

### 再利用可能ワークフロー（Reusable Workflows）

共通の処理を切り出して複数のワークフローから呼び出せます。

```yaml
# .github/workflows/reusable-test.yml
name: Reusable Test Workflow

on:
  workflow_call:
    inputs:
      node-version:
        required: false
        type: string
        default: '20'
      run-e2e:
        required: false
        type: boolean
        default: false
    secrets:
      CODECOV_TOKEN:
        required: false

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ inputs.node-version }}
          cache: 'npm'
      - run: npm ci
      - run: npm test -- --coverage
      - name: E2Eテスト（オプション）
        if: inputs.run-e2e
        run: npm run test:e2e
```

呼び出し側：

```yaml
# .github/workflows/ci.yml
name: CI

on:
  push:
    branches: [main]

jobs:
  run-tests:
    uses: ./.github/workflows/reusable-test.yml
    with:
      node-version: '20'
      run-e2e: true
    secrets:
      CODECOV_TOKEN: ${{ secrets.CODECOV_TOKEN }}
```

### コンポジットアクション（Composite Actions）

複数ステップをひとつのアクションとして切り出します。

```yaml
# .github/actions/setup-project/action.yml
name: 'Setup Project'
description: 'Node.jsのセットアップと依存関係インストール'

inputs:
  node-version:
    description: 'Node.jsバージョン'
    required: false
    default: '20'

runs:
  using: 'composite'
  steps:
    - uses: actions/setup-node@v4
      with:
        node-version: ${{ inputs.node-version }}
        cache: 'npm'

    - name: 依存関係をインストール
      shell: bash
      run: npm ci

    - name: キャッシュ情報を出力
      shell: bash
      run: echo "セットアップ完了: Node.js ${{ inputs.node-version }}"
```

使用例：

```yaml
steps:
  - uses: actions/checkout@v4
  - uses: ./.github/actions/setup-project
    with:
      node-version: '22'
  - run: npm test
```

## 13. セキュリティベストプラクティス

### OIDCによるクラウド認証（AWS例）

シークレットを使わずに、OpenID ConnectでAWSに一時的なクレデンシャルで認証できます。

```yaml
jobs:
  deploy-aws:
    runs-on: ubuntu-latest
    permissions:
      id-token: write   # OIDCトークンの発行に必要
      contents: read

    steps:
      - uses: actions/checkout@v4

      - name: AWSクレデンシャルを設定（OIDC）
        uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: arn:aws:iam::123456789012:role/GitHubActionsRole
          aws-region: ap-northeast-1

      - name: S3にデプロイ
        run: aws s3 sync ./dist s3://my-bucket/
```

### 最小権限の原則

```yaml
jobs:
  read-only-job:
    runs-on: ubuntu-latest
    permissions:
      contents: read      # リポジトリの読み取りのみ
      pull-requests: write  # PRへのコメント書き込み
      # packages: write   # 不要な権限はコメントアウト
```

### Dependabotによる自動更新設定

```yaml
# .github/dependabot.yml
version: 2
updates:
  # npm依存関係の自動更新
  - package-ecosystem: 'npm'
    directory: '/'
    schedule:
      interval: 'weekly'
      day: 'monday'
      time: '09:00'
      timezone: 'Asia/Tokyo'
    groups:
      # マイナー・パッチをまとめてPR
      minor-and-patch:
        update-types:
          - minor
          - patch
    ignore:
      - dependency-name: 'some-problematic-package'

  # GitHub Actionsの自動更新
  - package-ecosystem: 'github-actions'
    directory: '/'
    schedule:
      interval: 'weekly'
```

### アクションのバージョン固定

```yaml
# 危険: タグは書き換えられる可能性がある
- uses: actions/checkout@v4

# 安全: コミットSHAで固定
- uses: actions/checkout@11bd71901bbe5b1630ceea73d27597364c9af683  # v4.2.2
```

### サードパーティアクションのセキュリティレビュー

```yaml
# 信頼できるアクションのみ使用する
# - actions/* (GitHub公式)
# - docker/* (Docker公式)
# - aws-actions/* (AWS公式)
# それ以外は必ずソースを確認し、コミットSHAで固定
```

## フルスタックなNext.js CIパイプラインの例

上記を統合した実践的なワークフロー：

```yaml
# .github/workflows/full-pipeline.yml
name: Full CI/CD Pipeline

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true   # 古い実行を自動キャンセル

jobs:
  # ジョブ1: コード品質チェック
  quality:
    name: Code Quality
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npm run lint
      - run: npm run type-check
      - run: npm run format:check

  # ジョブ2: テスト（マトリックス）
  test:
    name: Test (Node ${{ matrix.node }})
    needs: quality
    runs-on: ubuntu-latest
    strategy:
      matrix:
        node: ['18', '20', '22']
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node }}
          cache: 'npm'
      - run: npm ci
      - run: npm test -- --coverage

  # ジョブ3: ビルド
  build:
    name: Build
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npm run build
        env:
          NEXT_TELEMETRY_DISABLED: 1
      - uses: actions/upload-artifact@v4
        with:
          name: next-build
          path: .next/

  # ジョブ4: 本番デプロイ（mainブランチのみ）
  deploy:
    name: Deploy to Production
    needs: build
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main' && github.event_name == 'push'
    environment: production
    steps:
      - uses: actions/checkout@v4
      - uses: actions/download-artifact@v4
        with:
          name: next-build
          path: .next/
      - run: npm install -g vercel@latest
      - run: vercel deploy --prod --token=${{ secrets.VERCEL_TOKEN }} --yes
        env:
          VERCEL_ORG_ID: ${{ secrets.VERCEL_ORG_ID }}
          VERCEL_PROJECT_ID: ${{ secrets.VERCEL_PROJECT_ID }}
```

## まとめ

GitHub Actionsを活用することで、コードをプッシュするだけでテスト・ビルド・デプロイが自動的に行われるCI/CDパイプラインを構築できます。

重要なポイントをまとめると：

1. **ワークフロー = ジョブ + ステップ**の階層構造を理解することが基本
2. **`needs`でジョブの依存関係**を定義して直列実行を制御する
3. **マトリックスビルド**で複数バージョン・OSのテストを並列化
4. **キャッシュを活用**してCI実行時間を短縮する
5. **シークレットは環境（Environment）単位**で管理してステージング/本番を分離
6. **OIDC認証**でクラウドへの静的シークレット不要な認証を実現
7. **再利用可能ワークフロー**でDRYな設定管理
8. **`concurrency`設定**で無駄な並列実行を防ぐ

CI/CDパイプラインの構築はソフトウェア開発の品質と速度を同時に向上させる投資です。最初は小さなワークフローから始め、段階的に自動化の範囲を広げていくことをお勧めします。

---

なお、GitHub Actionsのワークフロー実行履歴の確認、YAML構文の検証、環境変数の管理といった作業には、[DevToolBox](https://usedevtools.com)のYAML Validator・Env Manager・Base64 Encoderなどのツールが役立ちます。YAMLのインデントエラーはCI失敗の主要原因のひとつなので、事前に検証する習慣をつけておくと開発効率が上がります。
