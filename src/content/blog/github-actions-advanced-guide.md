---
title: 'GitHub Actions上級テクニック完全ガイド2026'
description: 'GitHub Actionsのマトリクスビルド、再利用可能ワークフロー、カスタムアクション作成、セキュリティベストプラクティス、キャッシュ最適化まで徹底解説。CI/CDパイプラインを高速化・安全化する上級テクニック集です。'
pubDate: '2026-02-05'
tags: ['GitHub Actions', 'CICD', 'DevOps', '自動化', 'インフラ']
heroImage: '../../assets/thumbnails/github-actions-advanced-guide.jpg'
---

GitHub Actionsは進化を続け、2026年時点でさらに強力な機能が追加されています。本記事では、マトリクスビルド、再利用可能ワークフロー、カスタムアクションなど、上級テクニックを徹底解説します。

## 目次

1. マトリクスビルド完全攻略
2. 再利用可能ワークフロー
3. カスタムアクション作成
4. セキュリティベストプラクティス
5. キャッシュ最適化
6. 動的ワークフロー生成
7. デバッグとトラブルシューティング
8. パフォーマンス最適化
9. 実践的なワークフロー例

## マトリクスビルド完全攻略

### 基本的なマトリクスビルド

```yaml
name: Matrix Build

on: [push]

jobs:
  test:
    runs-on: ${{ matrix.os }}
    strategy:
      matrix:
        os: [ubuntu-latest, macos-latest, windows-latest]
        node-version: [18, 20, 22]
        # 3 OS × 3 Node.js = 9つのジョブが並列実行

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node-version }}

      - name: Install dependencies
        run: npm ci

      - name: Run tests
        run: npm test
```

### includeとexcludeの活用

```yaml
jobs:
  test:
    runs-on: ${{ matrix.os }}
    strategy:
      matrix:
        os: [ubuntu-latest, macos-latest, windows-latest]
        node-version: [18, 20, 22]

        # 特定の組み合わせを除外
        exclude:
          - os: macos-latest
            node-version: 18
          - os: windows-latest
            node-version: 18

        # 特定の組み合わせを追加
        include:
          # カナリアビルド
          - os: ubuntu-latest
            node-version: 23-nightly
            experimental: true

          # 特別な設定
          - os: ubuntu-latest
            node-version: 20
            coverage: true

    continue-on-error: ${{ matrix.experimental == true }}

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node-version }}

      - name: Install dependencies
        run: npm ci

      - name: Run tests
        run: npm test

      - name: Upload coverage
        if: matrix.coverage == true
        uses: codecov/codecov-action@v3
```

### 動的マトリクス

```yaml
jobs:
  prepare-matrix:
    runs-on: ubuntu-latest
    outputs:
      matrix: ${{ steps.set-matrix.outputs.matrix }}
    steps:
      - uses: actions/checkout@v4

      - name: Generate matrix
        id: set-matrix
        run: |
          # 変更されたパッケージを検出
          PACKAGES=$(node scripts/detect-changed-packages.js)
          echo "matrix=$PACKAGES" >> $GITHUB_OUTPUT

  test:
    needs: prepare-matrix
    runs-on: ubuntu-latest
    strategy:
      matrix: ${{ fromJSON(needs.prepare-matrix.outputs.matrix) }}

    steps:
      - uses: actions/checkout@v4

      - name: Test ${{ matrix.package }}
        run: npm test --workspace=${{ matrix.package }}
```

```javascript
// scripts/detect-changed-packages.js
const { execSync } = require('child_process');
const fs = require('fs');

// 変更されたファイルを取得
const changedFiles = execSync('git diff --name-only HEAD~1')
  .toString()
  .split('\n')
  .filter(Boolean);

// パッケージディレクトリを特定
const packages = new Set();
for (const file of changedFiles) {
  if (file.startsWith('packages/')) {
    const pkg = file.split('/')[1];
    packages.add(pkg);
  }
}

// マトリクス形式で出力
const matrix = {
  package: Array.from(packages),
};

console.log(JSON.stringify(matrix));
```

### fail-fastとmax-parallel

```yaml
jobs:
  test:
    runs-on: ${{ matrix.os }}
    strategy:
      # 1つ失敗したら全て停止しない
      fail-fast: false

      # 最大3つまで並列実行
      max-parallel: 3

      matrix:
        os: [ubuntu-latest, macos-latest, windows-latest]
        node-version: [18, 20, 22]

    steps:
      - uses: actions/checkout@v4
      - name: Run tests
        run: npm test
```

## 再利用可能ワークフロー

### 再利用可能ワークフローの定義

```yaml
# .github/workflows/reusable-test.yml
name: Reusable Test Workflow

on:
  workflow_call:
    inputs:
      node-version:
        required: true
        type: string
      coverage:
        required: false
        type: boolean
        default: false
      working-directory:
        required: false
        type: string
        default: '.'

    outputs:
      test-result:
        description: "Test result status"
        value: ${{ jobs.test.outputs.result }}

    secrets:
      CODECOV_TOKEN:
        required: false

jobs:
  test:
    runs-on: ubuntu-latest
    outputs:
      result: ${{ steps.test.outcome }}

    defaults:
      run:
        working-directory: ${{ inputs.working-directory }}

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ inputs.node-version }}
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run tests
        id: test
        run: |
          if [ "${{ inputs.coverage }}" = "true" ]; then
            npm run test:coverage
          else
            npm test
          fi

      - name: Upload coverage
        if: inputs.coverage && success()
        uses: codecov/codecov-action@v3
        with:
          token: ${{ secrets.CODECOV_TOKEN }}
          working-directory: ${{ inputs.working-directory }}
```

### 再利用可能ワークフローの呼び出し

```yaml
# .github/workflows/ci.yml
name: CI

on: [push, pull_request]

jobs:
  # フロントエンドのテスト
  test-frontend:
    uses: ./.github/workflows/reusable-test.yml
    with:
      node-version: '20'
      coverage: true
      working-directory: './frontend'
    secrets:
      CODECOV_TOKEN: ${{ secrets.CODECOV_TOKEN }}

  # バックエンドのテスト
  test-backend:
    uses: ./.github/workflows/reusable-test.yml
    with:
      node-version: '20'
      coverage: true
      working-directory: './backend'
    secrets:
      CODECOV_TOKEN: ${{ secrets.CODECOV_TOKEN }}

  # マトリクスで複数バージョンテスト
  test-matrix:
    strategy:
      matrix:
        node-version: [18, 20, 22]
    uses: ./.github/workflows/reusable-test.yml
    with:
      node-version: ${{ matrix.node-version }}
      coverage: false
```

### ネストした再利用可能ワークフロー

```yaml
# .github/workflows/reusable-deploy.yml
name: Reusable Deploy Workflow

on:
  workflow_call:
    inputs:
      environment:
        required: true
        type: string

jobs:
  # まずテストを実行
  test:
    uses: ./.github/workflows/reusable-test.yml
    with:
      node-version: '20'
      coverage: true
    secrets: inherit

  # テスト成功後にデプロイ
  deploy:
    needs: test
    runs-on: ubuntu-latest
    environment: ${{ inputs.environment }}

    steps:
      - uses: actions/checkout@v4

      - name: Deploy to ${{ inputs.environment }}
        run: |
          echo "Deploying to ${{ inputs.environment }}"
          npm run deploy:${{ inputs.environment }}
```

## カスタムアクション作成

### JavaScriptアクション

```yaml
# action.yml
name: 'Version Bumper'
description: 'Automatically bump package version'
author: 'Your Name'

inputs:
  bump-type:
    description: 'Version bump type (major, minor, patch)'
    required: true
    default: 'patch'

  github-token:
    description: 'GitHub token for creating commits'
    required: true

outputs:
  new-version:
    description: 'The new version number'
  old-version:
    description: 'The old version number'

runs:
  using: 'node20'
  main: 'dist/index.js'

branding:
  icon: 'arrow-up'
  color: 'blue'
```

```typescript
// src/index.ts
import * as core from '@actions/core';
import * as github from '@actions/github';
import { execSync } from 'child_process';
import fs from 'fs';

async function run() {
  try {
    // 入力を取得
    const bumpType = core.getInput('bump-type', { required: true });
    const githubToken = core.getInput('github-token', { required: true });

    // package.jsonを読み込み
    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    const oldVersion = packageJson.version;

    core.info(`Current version: ${oldVersion}`);

    // バージョンをバンプ
    execSync(`npm version ${bumpType} --no-git-tag-version`, {
      stdio: 'inherit',
    });

    // 新しいバージョンを取得
    const updatedPackageJson = JSON.parse(
      fs.readFileSync('package.json', 'utf8')
    );
    const newVersion = updatedPackageJson.version;

    core.info(`New version: ${newVersion}`);

    // GitHubにコミット
    const octokit = github.getOctokit(githubToken);
    const { owner, repo } = github.context.repo;

    const content = fs.readFileSync('package.json', 'utf8');
    const encodedContent = Buffer.from(content).toString('base64');

    // ファイルのSHAを取得
    const { data: fileData } = await octokit.rest.repos.getContent({
      owner,
      repo,
      path: 'package.json',
    });

    // ファイルを更新
    await octokit.rest.repos.createOrUpdateFileContents({
      owner,
      repo,
      path: 'package.json',
      message: `chore: bump version to ${newVersion}`,
      content: encodedContent,
      sha: Array.isArray(fileData) ? '' : fileData.sha,
      branch: github.context.ref.replace('refs/heads/', ''),
    });

    // 出力を設定
    core.setOutput('new-version', newVersion);
    core.setOutput('old-version', oldVersion);

    core.summary
      .addHeading('Version Bump Summary')
      .addTable([
        [
          { data: 'Old Version', header: true },
          { data: 'New Version', header: true },
          { data: 'Bump Type', header: true },
        ],
        [oldVersion, newVersion, bumpType],
      ])
      .write();
  } catch (error) {
    if (error instanceof Error) {
      core.setFailed(error.message);
    }
  }
}

run();
```

### Dockerアクション

```yaml
# action.yml
name: 'Security Scanner'
description: 'Scan for security vulnerabilities'

inputs:
  severity:
    description: 'Minimum severity level'
    required: false
    default: 'MEDIUM'

outputs:
  vulnerabilities-found:
    description: 'Number of vulnerabilities found'

runs:
  using: 'docker'
  image: 'Dockerfile'
  args:
    - ${{ inputs.severity }}
```

```dockerfile
# Dockerfile
FROM node:20-alpine

COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

RUN npm install -g npm-audit-html

ENTRYPOINT ["/entrypoint.sh"]
```

```bash
#!/bin/sh
# entrypoint.sh

SEVERITY=$1

echo "Running security scan with severity: $SEVERITY"

# npm auditを実行
npm audit --audit-level=$SEVERITY --json > audit-results.json

# 脆弱性の数をカウント
VULNERABILITIES=$(jq '.metadata.vulnerabilities.total' audit-results.json)

echo "vulnerabilities-found=$VULNERABILITIES" >> $GITHUB_OUTPUT

# HTMLレポートを生成
npm-audit-html --output audit-report.html

# アーティファクトとしてアップロード
echo "::notice::Security scan completed. Found $VULNERABILITIES vulnerabilities."

exit 0
```

### Compositeアクション

```yaml
# action.yml
name: 'Setup Project'
description: 'Setup Node.js, install dependencies, and configure cache'

inputs:
  node-version:
    description: 'Node.js version'
    required: false
    default: '20'

  package-manager:
    description: 'Package manager (npm, yarn, pnpm)'
    required: false
    default: 'npm'

runs:
  using: 'composite'

  steps:
    - name: Setup Node.js
      uses: actions/setup-node@v4
      with:
        node-version: ${{ inputs.node-version }}
        cache: ${{ inputs.package-manager }}

    - name: Install pnpm
      if: inputs.package-manager == 'pnpm'
      uses: pnpm/action-setup@v2
      with:
        version: 8

    - name: Install dependencies (npm)
      if: inputs.package-manager == 'npm'
      shell: bash
      run: npm ci

    - name: Install dependencies (yarn)
      if: inputs.package-manager == 'yarn'
      shell: bash
      run: yarn install --frozen-lockfile

    - name: Install dependencies (pnpm)
      if: inputs.package-manager == 'pnpm'
      shell: bash
      run: pnpm install --frozen-lockfile

    - name: Display versions
      shell: bash
      run: |
        echo "Node.js version: $(node --version)"
        echo "Package manager: ${{ inputs.package-manager }}"

        if [ "${{ inputs.package-manager }}" = "npm" ]; then
          echo "npm version: $(npm --version)"
        elif [ "${{ inputs.package-manager }}" = "yarn" ]; then
          echo "Yarn version: $(yarn --version)"
        elif [ "${{ inputs.package-manager }}" = "pnpm" ]; then
          echo "pnpm version: $(pnpm --version)"
        fi
```

## セキュリティベストプラクティス

### シークレット管理

```yaml
jobs:
  deploy:
    runs-on: ubuntu-latest
    environment: production

    steps:
      # 環境変数としてシークレットを使用
      - name: Deploy
        env:
          API_KEY: ${{ secrets.API_KEY }}
          DATABASE_URL: ${{ secrets.DATABASE_URL }}
        run: |
          # シークレットを直接echoしない
          echo "Deploying with credentials..."
          deploy.sh

      # マスクされた出力
      - name: Mask sensitive data
        run: |
          # 動的にシークレットをマスク
          echo "::add-mask::$MY_SECRET_VALUE"
          echo "The secret is: $MY_SECRET_VALUE"
```

### OIDCトークンによる認証

```yaml
jobs:
  deploy-to-aws:
    runs-on: ubuntu-latest
    permissions:
      id-token: write # OIDC トークン取得に必要
      contents: read

    steps:
      - uses: actions/checkout@v4

      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: arn:aws:iam::123456789012:role/GitHubActionsRole
          aws-region: us-east-1

      # シークレットキー不要でAWSにアクセス可能
      - name: Deploy to S3
        run: |
          aws s3 sync ./build s3://my-bucket/
```

### 依存関係の検証

```yaml
jobs:
  security-check:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      # 依存関係の脆弱性スキャン
      - name: Run Trivy vulnerability scanner
        uses: aquasecurity/trivy-action@master
        with:
          scan-type: 'fs'
          scan-ref: '.'
          format: 'sarif'
          output: 'trivy-results.sarif'

      - name: Upload results to GitHub Security
        uses: github/codeql-action/upload-sarif@v3
        with:
          sarif_file: 'trivy-results.sarif'

      # npm audit
      - name: Run npm audit
        run: |
          npm audit --audit-level=moderate
        continue-on-error: true

      # Dependabot alerts check
      - name: Check Dependabot alerts
        uses: actions/github-script@v7
        with:
          script: |
            const alerts = await github.rest.dependabot.listAlertsForRepo({
              owner: context.repo.owner,
              repo: context.repo.repo,
              state: 'open',
            });

            if (alerts.data.length > 0) {
              core.warning(`Found ${alerts.data.length} open Dependabot alerts`);
            }
```

### コード署名

```yaml
jobs:
  build-and-sign:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - name: Build artifact
        run: npm run build

      - name: Sign artifact
        env:
          SIGNING_KEY: ${{ secrets.SIGNING_KEY }}
        run: |
          echo "$SIGNING_KEY" | base64 -d > signing-key.pem
          openssl dgst -sha256 -sign signing-key.pem \
            -out build/signature.sig build/app.js
          rm signing-key.pem

      - name: Upload signed artifact
        uses: actions/upload-artifact@v4
        with:
          name: signed-build
          path: build/
```

## キャッシュ最適化

### 依存関係のキャッシュ

```yaml
jobs:
  build:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      # Node.js setup with automatic caching
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      # カスタムキャッシュ
      - name: Cache node modules
        uses: actions/cache@v4
        with:
          path: |
            ~/.npm
            node_modules
          key: ${{ runner.os }}-node-${{ hashFiles('**/package-lock.json') }}
          restore-keys: |
            ${{ runner.os }}-node-

      - name: Install dependencies
        run: npm ci
```

### ビルドキャッシュ

```yaml
jobs:
  build:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      # Next.jsビルドキャッシュ
      - name: Cache Next.js build
        uses: actions/cache@v4
        with:
          path: |
            ~/.npm
            ${{ github.workspace }}/.next/cache
          key: ${{ runner.os }}-nextjs-${{ hashFiles('**/package-lock.json') }}-${{ hashFiles('**/*.js', '**/*.jsx', '**/*.ts', '**/*.tsx') }}
          restore-keys: |
            ${{ runner.os }}-nextjs-${{ hashFiles('**/package-lock.json') }}-

      - name: Build
        run: npm run build
```

### Dockerレイヤーキャッシュ

```yaml
jobs:
  docker-build:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3

      - name: Cache Docker layers
        uses: actions/cache@v4
        with:
          path: /tmp/.buildx-cache
          key: ${{ runner.os }}-buildx-${{ github.sha }}
          restore-keys: |
            ${{ runner.os }}-buildx-

      - name: Build Docker image
        uses: docker/build-push-action@v5
        with:
          context: .
          push: false
          tags: myapp:latest
          cache-from: type=local,src=/tmp/.buildx-cache
          cache-to: type=local,dest=/tmp/.buildx-cache-new,mode=max

      # キャッシュの移動（古いキャッシュを削除）
      - name: Move cache
        run: |
          rm -rf /tmp/.buildx-cache
          mv /tmp/.buildx-cache-new /tmp/.buildx-cache
```

### 高度なキャッシュ戦略

```yaml
jobs:
  test:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      # 複数のキャッシュキーでフォールバック
      - name: Multi-level cache
        uses: actions/cache@v4
        with:
          path: |
            node_modules
            .cache
          key: v1-${{ runner.os }}-${{ hashFiles('**/package-lock.json') }}-${{ hashFiles('**/*.js') }}
          restore-keys: |
            v1-${{ runner.os }}-${{ hashFiles('**/package-lock.json') }}-
            v1-${{ runner.os }}-

      # キャッシュヒット時はスキップ
      - name: Install dependencies
        if: steps.cache.outputs.cache-hit != 'true'
        run: npm ci

      # 条件付きキャッシュ保存
      - name: Save cache
        if: success()
        uses: actions/cache/save@v4
        with:
          path: test-results/
          key: test-results-${{ github.sha }}
```

## 動的ワークフロー生成

### ジョブの動的生成

```yaml
jobs:
  prepare:
    runs-on: ubuntu-latest
    outputs:
      packages: ${{ steps.packages.outputs.list }}
    steps:
      - uses: actions/checkout@v4

      - name: Get changed packages
        id: packages
        run: |
          PACKAGES=$(node -e "
            const { readdirSync } = require('fs');
            const packages = readdirSync('packages', { withFileTypes: true })
              .filter(d => d.isDirectory())
              .map(d => d.name);
            console.log(JSON.stringify(packages));
          ")
          echo "list=$PACKAGES" >> $GITHUB_OUTPUT

  test:
    needs: prepare
    runs-on: ubuntu-latest
    strategy:
      matrix:
        package: ${{ fromJSON(needs.prepare.outputs.packages) }}

    steps:
      - uses: actions/checkout@v4
      - name: Test ${{ matrix.package }}
        run: npm test --workspace=packages/${{ matrix.package }}
```

### 条件付きジョブ実行

```yaml
jobs:
  changes:
    runs-on: ubuntu-latest
    outputs:
      frontend: ${{ steps.filter.outputs.frontend }}
      backend: ${{ steps.filter.outputs.backend }}
      docs: ${{ steps.filter.outputs.docs }}

    steps:
      - uses: actions/checkout@v4

      - uses: dorny/paths-filter@v3
        id: filter
        with:
          filters: |
            frontend:
              - 'frontend/**'
            backend:
              - 'backend/**'
            docs:
              - 'docs/**'

  test-frontend:
    needs: changes
    if: needs.changes.outputs.frontend == 'true'
    runs-on: ubuntu-latest
    steps:
      - run: echo "Testing frontend..."

  test-backend:
    needs: changes
    if: needs.changes.outputs.backend == 'true'
    runs-on: ubuntu-latest
    steps:
      - run: echo "Testing backend..."

  build-docs:
    needs: changes
    if: needs.changes.outputs.docs == 'true'
    runs-on: ubuntu-latest
    steps:
      - run: echo "Building docs..."
```

## デバッグとトラブルシューティング

### デバッグログの有効化

```yaml
jobs:
  debug-job:
    runs-on: ubuntu-latest

    steps:
      - name: Enable debug logging
        run: |
          echo "ACTIONS_STEP_DEBUG=true" >> $GITHUB_ENV
          echo "ACTIONS_RUNNER_DEBUG=true" >> $GITHUB_ENV

      - name: Debug information
        run: |
          echo "Runner OS: ${{ runner.os }}"
          echo "GitHub event: ${{ github.event_name }}"
          echo "Ref: ${{ github.ref }}"
          echo "SHA: ${{ github.sha }}"

      - name: Dump GitHub context
        env:
          GITHUB_CONTEXT: ${{ toJSON(github) }}
        run: echo "$GITHUB_CONTEXT"

      - name: Dump job context
        env:
          JOB_CONTEXT: ${{ toJSON(job) }}
        run: echo "$JOB_CONTEXT"
```

### SSH デバッグ

```yaml
jobs:
  debug:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      # エラー時にSSHアクセスを有効化
      - name: Setup tmate session
        if: failure()
        uses: mxschmitt/action-tmate@v3
        timeout-minutes: 15
```

### ステップサマリー

```yaml
jobs:
  build:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - name: Build and create summary
        run: |
          npm run build

          # ビルド結果をサマリーに追加
          echo "## Build Summary" >> $GITHUB_STEP_SUMMARY
          echo "" >> $GITHUB_STEP_SUMMARY
          echo "- Build time: $(date)" >> $GITHUB_STEP_SUMMARY
          echo "- Bundle size: $(du -h dist/bundle.js | cut -f1)" >> $GITHUB_STEP_SUMMARY
          echo "" >> $GITHUB_STEP_SUMMARY
          echo "### Files generated" >> $GITHUB_STEP_SUMMARY
          ls -lh dist/ >> $GITHUB_STEP_SUMMARY
```

## パフォーマンス最適化

### 並列実行の最適化

```yaml
jobs:
  # 依存関係のないジョブは並列実行
  lint:
    runs-on: ubuntu-latest
    steps:
      - run: npm run lint

  typecheck:
    runs-on: ubuntu-latest
    steps:
      - run: npm run typecheck

  test-unit:
    runs-on: ubuntu-latest
    steps:
      - run: npm run test:unit

  test-integration:
    runs-on: ubuntu-latest
    steps:
      - run: npm run test:integration

  # すべて成功したらビルド
  build:
    needs: [lint, typecheck, test-unit, test-integration]
    runs-on: ubuntu-latest
    steps:
      - run: npm run build
```

### アーティファクトの最適化

```yaml
jobs:
  build:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4
      - run: npm run build

      # 必要なファイルのみアップロード
      - uses: actions/upload-artifact@v4
        with:
          name: build
          path: |
            dist/
            !dist/**/*.map
          retention-days: 7 # 保存期間を短縮
          compression-level: 9 # 最大圧縮
```

## 実践的なワークフロー例

### モノレポCI/CD

```yaml
name: Monorepo CI/CD

on:
  push:
    branches: [main]
  pull_request:

jobs:
  changes:
    runs-on: ubuntu-latest
    outputs:
      packages: ${{ steps.filter.outputs.changes }}
    steps:
      - uses: actions/checkout@v4
      - uses: dorny/paths-filter@v3
        id: filter
        with:
          filters: |
            web:
              - 'packages/web/**'
            api:
              - 'packages/api/**'
            shared:
              - 'packages/shared/**'

  test:
    needs: changes
    if: needs.changes.outputs.packages != '[]'
    runs-on: ubuntu-latest
    strategy:
      matrix:
        package: ${{ fromJSON(needs.changes.outputs.packages) }}

    steps:
      - uses: actions/checkout@v4
      - uses: ./.github/actions/setup-project

      - name: Test ${{ matrix.package }}
        run: npm test --workspace=packages/${{ matrix.package }}

  deploy:
    needs: test
    if: github.event_name == 'push' && github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    strategy:
      matrix:
        package: ${{ fromJSON(needs.changes.outputs.packages) }}

    steps:
      - uses: actions/checkout@v4
      - uses: ./.github/actions/setup-project

      - name: Deploy ${{ matrix.package }}
        run: npm run deploy --workspace=packages/${{ matrix.package }}
```

## まとめ

GitHub Actions の上級テクニックをマスターすることで、効率的で保守性の高いCI/CDパイプラインを構築できます。

**重要ポイント**:

1. **マトリクスビルド**: 複数環境での並列テスト
2. **再利用可能ワークフロー**: DRY原則の適用
3. **カスタムアクション**: 共通処理の抽象化
4. **セキュリティ**: シークレット管理とOIDC認証
5. **キャッシュ**: ビルド時間の短縮
6. **最適化**: 並列実行とリソース効率化

これらのテクニックを活用して、プロジェクトに最適なCI/CDワークフローを構築してください。
---

## 関連記事

- [プログラミングスクール比較2026年版【現役エンジニアが選ぶ厳選8校】](/blog/2026-03-08-programming-school-comparison-2026)
- [エンジニア転職完全ガイド2026【未経験・経験者別ロードマップ】](/blog/2026-03-09-engineer-career-change-guide-2026)
