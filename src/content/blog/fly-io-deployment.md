---
title: "Fly.io デプロイメント実践ガイド - モダンアプリケーションの高速デプロイ"
description: "Fly.ioを使った効率的なアプリケーションデプロイ方法を解説。Docker、データベース、スケーリングまで実践的なノウハウを紹介します。"
pubDate: "2025-02-05"
tags: ["devops", "deployment", "flyio", "infrastructure"]
---

Fly.io は、グローバル分散型のアプリケーションプラットフォームで、シンプルなコマンド一つで世界中にアプリケーションをデプロイできます。この記事では、Fly.io の基本から実践的な使い方まで詳しく解説します。

## Fly.io とは

Fly.io は以下の特徴を持つPaaS（Platform as a Service）です:

- **エッジコンピューティング**: 世界中のデータセンターに分散デプロイ
- **低レイテンシ**: ユーザーに最も近い場所からレスポンス
- **Dockerネイティブ**: あらゆる言語・フレームワークに対応
- **シンプルなCLI**: 直感的なコマンドライン操作
- **無料枠あり**: 小規模プロジェクトは無料で始められる

## セットアップ

### 1. CLIのインストール

macOS/Linuxの場合:

```bash
curl -L https://fly.io/install.sh | sh
```

Windowsの場合（PowerShell）:

```powershell
iwr https://fly.io/install.ps1 -useb | iex
```

Homebrewを使用する場合:

```bash
brew install flyctl
```

### 2. アカウント作成とログイン

```bash
# サインアップ（ブラウザが開きます）
flyctl auth signup

# 既存アカウントでログイン
flyctl auth login
```

### 3. 認証情報の確認

```bash
# 現在のユーザー情報を表示
flyctl auth whoami

# トークンを表示（CI/CD用）
flyctl auth token
```

## 基本的なデプロイ

### Node.js アプリケーションの例

プロジェクト構造:

```
my-app/
├── package.json
├── index.js
└── Dockerfile (オプション)
```

シンプルなExpressアプリ (`index.js`):

```javascript
const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
  res.json({ message: 'Hello from Fly.io!' });
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});
```

### アプリケーションの初期化

```bash
# プロジェクトディレクトリで実行
flyctl launch

# 対話式で以下を設定:
# - アプリ名
# - リージョン
# - PostgreSQL/Redisの追加（必要に応じて）
```

このコマンドは `fly.toml` 設定ファイルを生成します:

```toml
app = "my-app"
primary_region = "nrt"  # 東京リージョン

[build]

[http_service]
  internal_port = 3000
  force_https = true
  auto_stop_machines = true
  auto_start_machines = true
  min_machines_running = 0

[[vm]]
  cpu_kind = "shared"
  cpus = 1
  memory_mb = 256
```

### デプロイ実行

```bash
# デプロイ
flyctl deploy

# ログを確認
flyctl logs

# アプリをブラウザで開く
flyctl open
```

## Dockerfile を使ったデプロイ

より細かい制御が必要な場合、カスタムDockerfileを作成:

```dockerfile
# Node.js アプリの例
FROM node:18-alpine AS base

# 依存関係のインストール
FROM base AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --only=production

# ビルドステージ
FROM base AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

# 本番ステージ
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nodejs

COPY --from=deps --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --from=build --chown=nodejs:nodejs /app/dist ./dist
COPY --from=build --chown=nodejs:nodejs /app/package.json ./

USER nodejs

EXPOSE 3000

CMD ["node", "dist/index.js"]
```

`fly.toml` でDockerfileを指定:

```toml
[build]
  dockerfile = "Dockerfile"
```

## データベースの設定

### PostgreSQL

```bash
# Postgresクラスターを作成
flyctl postgres create

# アプリにアタッチ
flyctl postgres attach --app my-app my-postgres-db

# 接続情報を確認
flyctl postgres connect -a my-postgres-db
```

環境変数 `DATABASE_URL` が自動的に設定されます:

```javascript
// Prisma の例
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL
    }
  }
});
```

### Redis

```bash
# Redisを作成
flyctl redis create

# 接続情報を取得
flyctl redis status redis-app-name
```

接続例:

```javascript
const Redis = require('ioredis');
const redis = new Redis(process.env.REDIS_URL);
```

## 環境変数の管理

### シークレットの設定

```bash
# 単一のシークレット
flyctl secrets set API_KEY=your-secret-key

# 複数のシークレット
flyctl secrets set \
  DATABASE_URL=postgres://... \
  API_KEY=secret123 \
  SESSION_SECRET=random-string

# .envファイルから一括設定
flyctl secrets import < .env.production

# シークレット一覧を表示（値は隠される）
flyctl secrets list

# シークレットを削除
flyctl secrets unset API_KEY
```

### 通常の環境変数

`fly.toml` で設定:

```toml
[env]
  NODE_ENV = "production"
  LOG_LEVEL = "info"
  PORT = "3000"
```

## スケーリング

### 垂直スケーリング（VM サイズ）

```bash
# VM サイズを変更
flyctl scale vm shared-cpu-2x --memory 1024

# 利用可能なVMサイズを確認
flyctl platform vm-sizes
```

### 水平スケーリング（インスタンス数）

```bash
# インスタンス数を設定
flyctl scale count 3

# リージョン別にスケール
flyctl scale count 2 --region nrt
flyctl scale count 1 --region sin
flyctl scale count 1 --region sjc
```

### オートスケーリング

`fly.toml` で設定:

```toml
[http_service]
  auto_stop_machines = true
  auto_start_machines = true
  min_machines_running = 1
  max_machines_running = 5

[[http_service.concurrency]]
  type = "requests"
  soft_limit = 200
  hard_limit = 250
```

## ボリューム（永続ストレージ）

```bash
# ボリュームを作成
flyctl volumes create my_data --size 10 --region nrt

# ボリューム一覧
flyctl volumes list

# ボリュームを削除
flyctl volumes delete vol_xxxxx
```

`fly.toml` でマウント:

```toml
[mounts]
  source = "my_data"
  destination = "/data"
```

アプリケーションから使用:

```javascript
const fs = require('fs');
const dataPath = '/data/app-data.json';

// データの読み書き
fs.writeFileSync(dataPath, JSON.stringify({ key: 'value' }));
const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
```

## ヘルスチェックとモニタリング

### ヘルスチェックの設定

`fly.toml`:

```toml
[[services.http_checks]]
  interval = "10s"
  grace_period = "5s"
  method = "GET"
  path = "/health"
  protocol = "http"
  timeout = "2s"
  tls_skip_verify = false

[[services.tcp_checks]]
  interval = "15s"
  timeout = "2s"
  grace_period = "5s"
```

### ログの確認

```bash
# リアルタイムログ
flyctl logs

# 過去のログを検索
flyctl logs --search "error"

# 特定のインスタンスのログ
flyctl logs --instance 01234567890abc
```

### メトリクスの確認

```bash
# アプリの状態を確認
flyctl status

# 詳細なメトリクス
flyctl status --all

# インスタンスのリソース使用状況
flyctl vm status
```

## カスタムドメイン

### ドメインの追加

```bash
# ドメインを追加
flyctl certs create example.com

# www サブドメイン
flyctl certs create www.example.com

# 証明書の状態を確認
flyctl certs check example.com
```

### DNSレコードの設定

A レコード:

```
Type: A
Name: @
Value: [Fly.ioが提供するIPアドレス]
```

CNAME レコード（サブドメイン）:

```
Type: CNAME
Name: www
Value: [your-app].fly.dev
```

## CI/CD 統合

### GitHub Actions の例

`.github/workflows/deploy.yml`:

```yaml
name: Deploy to Fly.io

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Fly.io
        uses: superfly/flyctl-actions/setup-flyctl@master

      - name: Deploy to Fly.io
        run: flyctl deploy --remote-only
        env:
          FLY_API_TOKEN: ${{ secrets.FLY_API_TOKEN }}
```

トークンの取得:

```bash
flyctl auth token
```

取得したトークンをGitHub Secretsに `FLY_API_TOKEN` として追加します。

## トラブルシューティング

### よくある問題と解決方法

#### 1. デプロイが失敗する

```bash
# 詳細なログを表示
flyctl deploy --verbose

# ローカルでDockerビルドをテスト
docker build -t test-app .
docker run -p 3000:3000 test-app
```

#### 2. アプリが起動しない

```bash
# インスタンスの状態を確認
flyctl status --all

# SSHでインスタンスに接続
flyctl ssh console

# 環境変数を確認
flyctl ssh console -C "env"
```

#### 3. データベース接続エラー

```bash
# Postgresの状態を確認
flyctl postgres db list -a my-postgres-db

# 接続テスト
flyctl postgres connect -a my-postgres-db
```

## ベストプラクティス

### 1. 環境別の設定

```bash
# ステージング環境
flyctl launch --name my-app-staging --region nrt

# 本番環境
flyctl launch --name my-app-production --region nrt
```

### 2. リソースの最適化

```toml
# 開発/ステージング
[[vm]]
  cpu_kind = "shared"
  cpus = 1
  memory_mb = 256

# 本番
[[vm]]
  cpu_kind = "performance"
  cpus = 2
  memory_mb = 1024
```

### 3. グレースフルシャットダウン

```javascript
const server = app.listen(PORT, '0.0.0.0');

process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
    // データベース接続をクローズ
    prisma.$disconnect();
  });
});
```

### 4. ヘルスチェックの実装

```javascript
app.get('/health', async (req, res) => {
  try {
    // データベース接続チェック
    await prisma.$queryRaw`SELECT 1`;
    res.status(200).json({
      status: 'healthy',
      uptime: process.uptime(),
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      error: error.message
    });
  }
});
```

## まとめ

Fly.io の主な利点:

1. **簡単なデプロイ**: 数コマンドで本番環境へ
2. **グローバル分散**: 世界中のユーザーに低レイテンシ
3. **柔軟性**: あらゆる言語・フレームワークに対応
4. **スケーラブル**: 簡単にスケールアップ・アウト
5. **コスト効率**: 無料枠から始められる

Fly.io は、モダンなアプリケーションをグローバルにデプロイするための優れた選択肢です。シンプルなCLI、柔軟な設定、強力なスケーリング機能により、開発者は本番環境へのデプロイを迅速かつ確実に行えます。
