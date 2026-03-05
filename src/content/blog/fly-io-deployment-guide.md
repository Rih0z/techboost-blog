---
title: "Fly.ioでアプリをグローバルデプロイ - 完全実装ガイド"
description: "Fly.ioを使ったグローバルデプロイの完全ガイド。Node.js、Next.js、Dockerアプリケーションの展開、データベース接続、CI/CD、スケーリング戦略まで詳しく解説します。"
pubDate: "2025-02-05"
tags: ['インフラ']
---

Fly.ioは、アプリケーションを世界中のエッジに展開できる次世代のPaaSプラットフォームです。Dockerコンテナをベースに、低レイテンシーとグローバルスケールを実現します。

本記事では、Fly.ioの基礎から実践的なデプロイパターン、本番運用のベストプラクティスまで詳しく解説します。

## Fly.ioとは

Fly.ioは、**グローバルエッジにアプリケーションをデプロイするためのプラットフォーム**です。ユーザーに最も近いリージョンでアプリを実行し、低レイテンシーを実現します。

### 主な特徴

**グローバルエッジ**: 世界35以上のリージョンに展開
**Dockerベース**: 任意の言語・フレームワークに対応
**高速デプロイ**: 数秒でグローバル展開
**統合データベース**: Postgres、Redis、SQLiteを標準提供
**無料枠**: 月額$5相当のクレジット（小規模アプリなら無料）

### 料金体系

```
無料枠:
- 最大3台のシェアードVMインスタンス
- 3GB永続ストレージ
- 160GBアウトバウンド転送

有料プラン:
- Dedicated VM: $0.0000008/秒 (~$2.07/月)
- メモリ: $0.0000002/MB/秒
- ストレージ: $0.15/GB/月
```

## セットアップ

### Fly CLIのインストール

```bash
# macOS
brew install flyctl

# Linux
curl -L https://fly.io/install.sh | sh

# Windows (PowerShell)
iwr https://fly.io/install.ps1 -useb | iex

# インストール確認
flyctl version
```

### ログインと認証

```bash
# Fly.ioにログイン
flyctl auth login

# クレジットカード情報の登録（無料枠を使う場合も必要）
flyctl auth signup

# 認証状態の確認
flyctl auth whoami
```

## Node.js/Express アプリのデプロイ

### アプリケーションの準備

```typescript
// app.ts
import express from 'express';

const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
  res.json({
    message: 'Hello from Fly.io!',
    region: process.env.FLY_REGION,
    instance: process.env.FLY_ALLOC_ID,
  });
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
```

```json
// package.json
{
  "name": "fly-demo",
  "version": "1.0.0",
  "scripts": {
    "start": "node dist/app.js",
    "build": "tsc"
  },
  "dependencies": {
    "express": "^4.18.2"
  }
}
```

### Fly.ioプロジェクトの初期化

```bash
# プロジェクトディレクトリで実行
flyctl launch

# 対話形式で設定
# - アプリ名の選択
# - リージョンの選択（自動で最適なリージョンを提案）
# - PostgreSQLの追加（オプション）
```

自動生成される`fly.toml`をカスタマイズします。

```toml
# fly.toml
app = "my-fly-app"
primary_region = "nrt" # 東京リージョン

[build]
  [build.args]
    NODE_VERSION = "20"

[env]
  NODE_ENV = "production"

[http_service]
  internal_port = 3000
  force_https = true
  auto_stop_machines = true
  auto_start_machines = true
  min_machines_running = 0 # スリープ機能有効

  [[http_service.checks]]
    interval = "10s"
    timeout = "2s"
    grace_period = "5s"
    method = "GET"
    path = "/health"

[[vm]]
  cpu_kind = "shared"
  cpus = 1
  memory_mb = 256
```

### デプロイ

```bash
# アプリをデプロイ
flyctl deploy

# デプロイ状況の確認
flyctl status

# ログの確認
flyctl logs

# アプリを開く
flyctl open
```

## Next.js アプリケーションのデプロイ

### Next.js プロジェクトの設定

```javascript
// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  experimental: {
    serverActions: true,
  },
};

module.exports = nextConfig;
```

### Dockerfileの作成

```dockerfile
# Dockerfile
FROM node:20-alpine AS base

# 依存関係のインストール
FROM base AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# ビルド
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# 本番環境イメージ
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
```

### fly.toml の設定

```toml
# fly.toml
app = "my-nextjs-app"
primary_region = "nrt"

[build]

[env]
  NODE_ENV = "production"

[http_service]
  internal_port = 3000
  force_https = true
  auto_stop_machines = true
  auto_start_machines = true
  min_machines_running = 0

  [[http_service.checks]]
    interval = "15s"
    timeout = "3s"
    grace_period = "10s"
    method = "GET"
    path = "/"

[[vm]]
  cpu_kind = "shared"
  cpus = 1
  memory_mb = 512
```

### 環境変数の設定

```bash
# 環境変数をセット
flyctl secrets set DATABASE_URL="postgresql://..." \
  NEXTAUTH_SECRET="your-secret" \
  NEXTAUTH_URL="https://my-nextjs-app.fly.dev"

# 環境変数の確認
flyctl secrets list
```

### デプロイ

```bash
flyctl deploy

# デプロイ後の確認
flyctl status
flyctl logs
```

## データベース統合

### Fly Postgresの作成

```bash
# Postgresクラスターの作成
flyctl postgres create

# 対話形式で設定
# - クラスター名
# - リージョン
# - VMサイズ
# - ボリュームサイズ

# 接続
flyctl postgres connect -a my-postgres-cluster
```

### アプリとPostgresの接続

```bash
# アプリにPostgresをアタッチ
flyctl postgres attach my-postgres-cluster -a my-app

# DATABASE_URL が自動的に環境変数にセットされる
```

### Prismaを使った接続例

```typescript
// prisma/schema.prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id        Int      @id @default(autoincrement())
  email     String   @unique
  name      String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

```typescript
// lib/db.ts
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
```

```typescript
// app/api/users/route.ts
import { prisma } from '@/lib/db';

export async function GET() {
  const users = await prisma.user.findMany();
  return Response.json(users);
}

export async function POST(request: Request) {
  const body = await request.json();
  const user = await prisma.user.create({
    data: {
      email: body.email,
      name: body.name,
    },
  });
  return Response.json(user, { status: 201 });
}
```

### マイグレーション

```bash
# ローカルで開発
npx prisma migrate dev --name init

# 本番環境でマイグレーション実行
flyctl ssh console -a my-app
npx prisma migrate deploy
```

## スケーリング戦略

### マルチリージョンデプロイ

```bash
# 複数のリージョンにデプロイ
flyctl regions add nrt  # 東京
flyctl regions add sjc  # サンフランシスコ
flyctl regions add ams  # アムステルダム

# リージョン一覧
flyctl regions list

# スケール設定
flyctl scale count 2 --region nrt  # 東京に2台
flyctl scale count 1 --region sjc  # サンフランシスコに1台
```

### オートスケーリング

```toml
# fly.toml
[http_service]
  internal_port = 3000
  force_https = true
  auto_stop_machines = true
  auto_start_machines = true
  min_machines_running = 1
  max_machines_running = 10

  [http_service.concurrency]
    type = "requests"
    hard_limit = 250
    soft_limit = 200
```

### メモリとCPUのスケーリング

```bash
# VMサイズの変更
flyctl scale vm shared-cpu-2x --memory 512

# 利用可能なVMサイズ一覧
flyctl platform vm-sizes

# 現在のスケール確認
flyctl scale show
```

## CI/CDパイプライン

### GitHub Actionsでの自動デプロイ

```yaml
# .github/workflows/deploy.yml
name: Deploy to Fly.io

on:
  push:
    branches: [main]

jobs:
  deploy:
    name: Deploy app
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Fly CLI
        uses: superfly/flyctl-actions/setup-flyctl@master

      - name: Deploy to Fly.io
        run: flyctl deploy --remote-only
        env:
          FLY_API_TOKEN: ${{ secrets.FLY_API_TOKEN }}
```

### Fly API Tokenの取得

```bash
# トークンを生成
flyctl auth token

# GitHub Secretsに登録
# Settings > Secrets > New repository secret
# Name: FLY_API_TOKEN
# Value: <生成されたトークン>
```

### プレビュー環境の構築

```yaml
# .github/workflows/preview.yml
name: Preview Deployment

on:
  pull_request:
    types: [opened, synchronize, reopened]

jobs:
  preview:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: superfly/flyctl-actions/setup-flyctl@master

      - name: Deploy Preview
        run: |
          APP_NAME="my-app-pr-${{ github.event.pull_request.number }}"
          flyctl launch --no-deploy --name $APP_NAME --copy-config --yes
          flyctl deploy --app $APP_NAME
        env:
          FLY_API_TOKEN: ${{ secrets.FLY_API_TOKEN }}

      - name: Comment PR
        uses: actions/github-script@v7
        with:
          script: |
            const appName = `my-app-pr-${{ github.event.pull_request.number }}`;
            const url = `https://${appName}.fly.dev`;
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: `Preview deployed to: ${url}`
            });
```

## モニタリングとロギング

### ログの確認

```bash
# リアルタイムログ
flyctl logs

# 特定のインスタンスのログ
flyctl logs -i <instance-id>

# JSON形式で出力
flyctl logs --json
```

### メトリクスの確認

```bash
# ダッシュボードを開く
flyctl dashboard

# メトリクスの確認
flyctl metrics
```

### Grafana/Prometheusとの統合

```toml
# fly.toml
[metrics]
  port = 9091
  path = "/metrics"
```

```typescript
// metrics.ts
import express from 'express';
import promClient from 'prom-client';

const app = express();

// Prometheusメトリクスの設定
const register = new promClient.Registry();
promClient.collectDefaultMetrics({ register });

const httpRequestDuration = new promClient.Histogram({
  name: 'http_request_duration_ms',
  help: 'Duration of HTTP requests in ms',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.1, 5, 15, 50, 100, 500],
});

register.registerMetric(httpRequestDuration);

app.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});
```

## トラブルシューティング

### デプロイが失敗する場合

```bash
# 詳細なログを確認
flyctl logs

# ビルドログを確認
flyctl deploy --verbose

# SSHで接続してデバッグ
flyctl ssh console
```

### ヘルスチェックが失敗する場合

```toml
# fly.toml - タイムアウトを延長
[[http_service.checks]]
  interval = "30s"
  timeout = "5s"
  grace_period = "20s"
  method = "GET"
  path = "/health"
```

### メモリ不足エラー

```bash
# メモリを増やす
flyctl scale memory 512

# または fly.toml で設定
[[vm]]
  memory_mb = 512
```

## まとめ

Fly.ioは、グローバルエッジデプロイを簡単に実現できる強力なプラットフォームです。

### 主な利点

- **低レイテンシー**: ユーザーに最も近いリージョンで実行
- **簡単デプロイ**: Dockerベースで柔軟性が高い
- **統合データベース**: Postgres、Redisが標準提供
- **コスト効率**: 小規模アプリなら無料枠で十分

### デプロイのベストプラクティス

1. **ヘルスチェックの実装**: `/health`エンドポイントを用意
2. **環境変数の活用**: `flyctl secrets`でセキュアに管理
3. **マルチリージョン展開**: グローバルなユーザーベースに対応
4. **CI/CD統合**: GitHub Actionsで自動デプロイ
5. **モニタリング**: ログとメトリクスを定期的に確認

Fly.ioを活用することで、エンタープライズレベルのインフラを個人開発者でも簡単に構築できます。
