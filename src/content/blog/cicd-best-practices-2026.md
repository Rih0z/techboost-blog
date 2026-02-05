---
title: "CI/CDベストプラクティス2026 — GitHub Actions, GitLab CI, CircleCI"
description: "CI/CDパイプライン設計の最新ベストプラクティス。GitHub Actions, GitLab CI, CircleCIの比較、キャッシュ戦略、セキュリティ、デプロイ戦略まで徹底解説。"
pubDate: "2026-02-05"
tags: ["CI/CD", "GitHub Actions", "GitLab CI", "DevOps", "自動化"]
---

## CI/CDとは

CI/CD（Continuous Integration / Continuous Delivery）は、コードの変更を自動的にテスト・ビルド・デプロイするための仕組みです。

### CI（継続的インテグレーション）

コードをリポジトリにプッシュするたびに、自動的にテスト・ビルドを実行します。

- コードの品質を保つ
- バグを早期に発見
- チーム開発をスムーズに

### CD（継続的デリバリー/デプロイ）

テストが通ったコードを自動的に本番環境にデプロイします。

- デプロイの自動化
- リリースサイクルの短縮
- 人為的ミスの削減

## 各プラットフォーム比較

### GitHub Actions

**特徴**
- GitHub完全統合
- YAMLで設定
- マーケットプレイスが豊富
- 無料枠が大きい

**料金**
- Public: 無制限
- Private: 2,000分/月（無料）、追加$0.008/分

**メリット**
- GitHubとの統合が最強
- セットアップが簡単
- コミュニティが活発
- Actionマーケットプレイスが便利

**デメリット**
- 高度な機能は他サービスに劣る
- ログの保存期間が短い（90日）
- セルフホストランナーの管理が必要な場合も

**推奨する人**
- GitHubをメインで使っている
- 簡単にCI/CDを始めたい
- オープンソースプロジェクト

### GitLab CI

**特徴**
- GitLab完全統合
- .gitlab-ci.ymlで設定
- セルフホスト可能
- 強力なDevOps機能

**料金**
- Free: 400分/月
- Premium: $29/ユーザー/月
- Ultimate: $99/ユーザー/月

**メリット**
- GitLabとの統合が完璧
- セルフホストで完全制御可能
- 高度なCI/CD機能（親子パイプライン等）
- Auto DevOps（自動設定）

**デメリット**
- GitHubユーザーには敷居が高い
- 無料枠が少ない
- セルフホストは運用コストがかかる

**推奨する人**
- GitLabをメインで使っている
- セルフホストしたい
- エンタープライズ向け

### CircleCI

**特徴**
- GitHub/GitLab/Bitbucket対応
- config.ymlで設定
- 高速なビルド
- 強力なキャッシュ機能

**料金**
- Free: 6,000分/月（1コンテナ）
- Performance: $15/月〜
- Scale: カスタム

**メリット**
- ビルドが高速
- キャッシュ機能が優秀
- Orbsで再利用可能な設定
- Docker Layerキャッシュ

**デメリット**
- 設定が複雑
- 無料枠は1コンテナのみ
- 料金が高め

**推奨する人**
- 大規模プロジェクト
- ビルド速度を重視
- 複雑なパイプラインが必要

## CI/CDパイプライン設計

### 基本的なパイプライン

```
Code Push → Lint → Test → Build → Deploy
```

### 推奨パイプライン構造

```yaml
# GitHub Actionsの例
name: CI/CD Pipeline

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
      - name: Install dependencies
        run: npm ci
      - name: Lint
        run: npm run lint

  test:
    runs-on: ubuntu-latest
    needs: lint
    steps:
      - uses: actions/checkout@v4
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
      - name: Install dependencies
        run: npm ci
      - name: Test
        run: npm test
      - name: Upload coverage
        uses: codecov/codecov-action@v4

  build:
    runs-on: ubuntu-latest
    needs: test
    steps:
      - uses: actions/checkout@v4
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
      - name: Install dependencies
        run: npm ci
      - name: Build
        run: npm run build
      - name: Upload artifact
        uses: actions/upload-artifact@v4
        with:
          name: build
          path: dist/

  deploy:
    runs-on: ubuntu-latest
    needs: build
    if: github.ref == 'refs/heads/main'
    steps:
      - name: Download artifact
        uses: actions/download-artifact@v4
        with:
          name: build
      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
```

### マルチ環境デプロイ

```yaml
deploy-staging:
  runs-on: ubuntu-latest
  needs: build
  if: github.ref == 'refs/heads/develop'
  steps:
    - name: Deploy to Staging
      run: |
        echo "Deploying to staging..."

deploy-production:
  runs-on: ubuntu-latest
  needs: build
  if: github.ref == 'refs/heads/main'
  steps:
    - name: Deploy to Production
      run: |
        echo "Deploying to production..."
```

## キャッシュ戦略

キャッシュを活用すれば、ビルド時間を大幅に短縮できます。

### GitHub Actionsのキャッシュ

```yaml
- name: Cache dependencies
  uses: actions/cache@v4
  with:
    path: ~/.npm
    key: ${{ runner.os }}-node-${{ hashFiles('**/package-lock.json') }}
    restore-keys: |
      ${{ runner.os }}-node-
```

### Node.js依存関係のキャッシュ

```yaml
- name: Setup Node.js
  uses: actions/setup-node@v4
  with:
    node-version: '20'
    cache: 'npm'  # 自動でキャッシュ
```

### Dockerレイヤーキャッシュ

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

### GitLab CIのキャッシュ

```yaml
cache:
  key: ${CI_COMMIT_REF_SLUG}
  paths:
    - node_modules/
    - .npm/

before_script:
  - npm ci --cache .npm --prefer-offline
```

### CircleCIのキャッシュ

```yaml
- restore_cache:
    keys:
      - v1-dependencies-{{ checksum "package-lock.json" }}
      - v1-dependencies-

- run: npm install

- save_cache:
    paths:
      - node_modules
    key: v1-dependencies-{{ checksum "package-lock.json" }}
```

## セキュリティベストプラクティス

### シークレット管理

**GitHub Actions**

```yaml
- name: Deploy
  env:
    API_KEY: ${{ secrets.API_KEY }}
  run: |
    echo "Deploying with API key..."
```

シークレットはリポジトリの Settings > Secrets で管理します。

**環境変数の暗号化**

```bash
# GitHub CLI
gh secret set API_KEY
```

### SAST（静的アプリケーションセキュリティテスト）

**Semgrep**

```yaml
- name: Semgrep
  uses: returntocorp/semgrep-action@v1
  with:
    config: >-
      p/security-audit
      p/secrets
```

**CodeQL（GitHub）**

```yaml
- name: Initialize CodeQL
  uses: github/codeql-action/init@v3
  with:
    languages: javascript

- name: Autobuild
  uses: github/codeql-action/autobuild@v3

- name: Perform CodeQL Analysis
  uses: github/codeql-action/analyze@v3
```

### DAST（動的アプリケーションセキュリティテスト）

**OWASP ZAP**

```yaml
- name: ZAP Scan
  uses: zaproxy/action-baseline@v0.12.0
  with:
    target: 'https://staging.example.com'
```

### 依存関係の脆弱性スキャン

**Snyk**

```yaml
- name: Run Snyk
  uses: snyk/actions/node@master
  env:
    SNYK_TOKEN: ${{ secrets.SNYK_TOKEN }}
```

**Dependabot（GitHub）**

```yaml
# .github/dependabot.yml
version: 2
updates:
  - package-ecosystem: "npm"
    directory: "/"
    schedule:
      interval: "weekly"
```

### コンテナイメージスキャン

**Trivy**

```yaml
- name: Run Trivy scanner
  uses: aquasecurity/trivy-action@master
  with:
    image-ref: 'user/app:latest'
    format: 'sarif'
    output: 'trivy-results.sarif'
```

## デプロイ戦略

### Blue-Green Deployment

2つの環境（BlueとGreen）を用意し、一方を本番、もう一方を次バージョンとして切り替えます。

**メリット**
- ダウンタイムゼロ
- すぐにロールバック可能

**デメリット**
- 2倍のリソースが必要

**実装例（AWS ECS）**

```yaml
- name: Deploy to ECS
  uses: aws-actions/amazon-ecs-deploy-task-definition@v1
  with:
    task-definition: task-definition.json
    service: my-service
    cluster: my-cluster
    wait-for-service-stability: true
    deployment-configuration:
      deployment-type: blue-green
```

### Canary Deployment

新バージョンを少しずつリリースし、問題がなければ徐々に増やします。

**メリット**
- リスクが低い
- 段階的に検証できる

**デメリット**
- 複雑
- モニタリングが必須

**実装例（Kubernetes）**

```yaml
apiVersion: v1
kind: Service
metadata:
  name: my-app
spec:
  selector:
    app: my-app
  ports:
    - port: 80
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app-stable
spec:
  replicas: 9
  selector:
    matchLabels:
      app: my-app
      version: stable
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app-canary
spec:
  replicas: 1
  selector:
    matchLabels:
      app: my-app
      version: canary
```

### Rolling Deployment

少しずつインスタンスを新バージョンに入れ替えます。

**メリット**
- 追加リソース不要
- 段階的にデプロイ

**デメリット**
- 古いバージョンと新バージョンが混在

**実装例（Kubernetes）**

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
spec:
  replicas: 10
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxUnavailable: 1
      maxSurge: 1
```

## モノレポのCI/CD

モノレポ（複数プロジェクトを1つのリポジトリで管理）では、変更があったプロジェクトだけビルド・デプロイします。

### Turborepoを使った例

```yaml
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
        with:
          fetch-depth: 2

      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - run: npm ci

      # 変更があったプロジェクトだけビルド
      - name: Build
        run: npx turbo run build --filter='[HEAD^1]'

      # 変更があったプロジェクトだけテスト
      - name: Test
        run: npx turbo run test --filter='[HEAD^1]'
```

### パスベースのフィルタリング

```yaml
name: Deploy App1

on:
  push:
    paths:
      - 'apps/app1/**'
      - 'packages/**'
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Deploy App1
        run: |
          echo "Deploying App1..."
```

## まとめ

CI/CDは現代の開発に欠かせないインフラです。

### プラットフォームの選び方

- **GitHub**: GitHub Actions
- **GitLab**: GitLab CI
- **速度重視**: CircleCI

### パイプライン設計のポイント

- 並列化できるジョブは並列化
- キャッシュを活用
- 早くフィードバック（Lintを最初に）

### セキュリティ

- シークレットを安全に管理
- SAST/DASTを導入
- 依存関係をスキャン

### デプロイ戦略

- **ダウンタイムゼロ**: Blue-Green
- **リスク最小**: Canary
- **シンプル**: Rolling

CI/CDを適切に設定すれば、開発効率とコード品質が大幅に向上します。
