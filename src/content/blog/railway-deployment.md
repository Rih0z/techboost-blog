---
title: "Railway デプロイメント入門ガイド - モダンなアプリケーション展開を始める"
description: "Railwayを使った簡単で強力なアプリケーションデプロイメントを徹底解説。GitHub連携、環境変数管理、PostgreSQL/Redis統合、カスタムドメイン設定など実践的な使い方を紹介。Railway・デプロイ・インフラに関する実践情報。"
pubDate: "2025-02-05"
tags: ["Railway", "デプロイ", "インフラ", "DevOps"]
---
Railwayは、モダンなアプリケーションを簡単にデプロイできるクラウドプラットフォームです。本記事では、Railwayの基本から実践的な使い方まで、包括的に解説します。

## Railwayとは

Railwayは、Herokuの代替として注目を集めているPaaS（Platform as a Service）です。GitHubリポジトリと連携し、自動デプロイやデータベース統合、環境変数管理などを提供します。

### 主な特徴

- **シンプルなデプロイ**: GitHubプッシュで自動デプロイ
- **豊富なテンプレート**: PostgreSQL, Redis, MongoDBなど即座に利用可能
- **スケーラブル**: 自動スケーリング対応
- **開発者フレンドリー**: 優れたUI/UX
- **トライアル**: 初回$5クレジット（30日間有効）、Hobbyプラン$5/月〜

## はじめてのデプロイ

### 1. アカウント作成とプロジェクト作成

Railway CLI をインストールします。

```bash
# Homebrewでインストール（Mac）
brew install railway

# npmでインストール（全プラットフォーム）
npm i -g @railway/cli

# ログイン
railway login
```

### 2. プロジェクトの初期化

```bash
# 新規プロジェクト作成
railway init

# 既存のGitHubリポジトリから
railway init --repo your-username/your-repo
```

### 3. 環境変数の設定

```bash
# 環境変数を設定
railway variables set DATABASE_URL=postgresql://...
railway variables set NODE_ENV=production

# .envファイルから一括設定
railway variables set --from-env
```

### 4. デプロイ実行

```bash
# デプロイ
railway up

# ログ確認
railway logs

# ステータス確認
railway status
```

## GitHubとの連携

### 自動デプロイの設定

Railwayダッシュボードから設定します。

```yaml
# railway.json（オプション設定ファイル）
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "NIXPACKS",
    "buildCommand": "npm run build"
  },
  "deploy": {
    "startCommand": "npm start",
    "healthcheckPath": "/health",
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
```

### ブランチデプロイ

```bash
# mainブランチは本番環境
# developブランチはステージング環境として別途デプロイ可能
```

ダッシュボードで各ブランチに対して異なる環境を設定できます。

## データベースの追加

### PostgreSQLの追加

```bash
# PostgreSQLプラグインを追加
railway add

# PostgreSQLを選択すると自動的に環境変数が設定される
# DATABASE_URL が自動的に利用可能に
```

アプリケーションコードでの使用例:

```typescript
// Next.js + Prisma の例
// prisma/schema.prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// データベース接続
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default prisma;
```

### Redisの追加

```bash
# Redisプラグインを追加
railway add

# REDIS_URL が自動的に設定される
```

使用例:

```javascript
// Node.js + ioredis
import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL);

// キャッシュの設定
await redis.set('key', 'value', 'EX', 3600);

// キャッシュの取得
const value = await redis.get('key');
```

## フレームワーク別デプロイ例

### Next.js

```javascript
// package.json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start"
  }
}

// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone', // Railway推奨
  experimental: {
    serverActions: true
  }
};

module.exports = nextConfig;
```

環境変数の設定:

```bash
railway variables set NEXT_PUBLIC_API_URL=https://api.yourapp.com
railway variables set DATABASE_URL=postgresql://...
```

### Express.js

```javascript
// server.js
import express from 'express';

const app = express();
const PORT = process.env.PORT || 3000;

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
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js"
  }
}
```

### Python (FastAPI)

```python
# main.py
from fastapi import FastAPI
import os

app = FastAPI()

@app.get("/health")
def health_check():
    return {"status": "ok"}

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
```

```toml
# pyproject.toml
[tool.poetry]
name = "myapp"
version = "0.1.0"

[tool.poetry.dependencies]
python = "^3.11"
fastapi = "^0.109.0"
uvicorn = "^0.27.0"
```

### Astro

```javascript
// astro.config.mjs
import { defineConfig } from 'astro/config';
import node from '@astrojs/node';

export default defineConfig({
  output: 'server',
  adapter: node({
    mode: 'standalone'
  })
});
```

```json
// package.json
{
  "scripts": {
    "build": "astro build",
    "start": "node ./dist/server/entry.mjs"
  }
}
```

## カスタムドメインの設定

### ドメインの追加

```bash
# CLIから追加
railway domain

# カスタムドメインを指定
# ダッシュボードで設定することも可能
```

### DNS設定

Railwayが提供するCNAMEレコードをDNSプロバイダーに設定します。

```
# 例: Cloudflare, Google Domains, Namecheapなど
Type: CNAME
Name: www (またはサブドメイン)
Value: your-app.up.railway.app
```

### SSL証明書

Railwayは自動的にLet's EncryptのSSL証明書を発行・更新します。

```javascript
// 設定不要、自動的にHTTPSが有効化
// http:// へのアクセスは自動的にhttps:// へリダイレクト
```

## 環境変数の管理

### 環境ごとの変数管理

```bash
# production環境
railway variables set --environment production API_KEY=prod_key_123

# staging環境
railway variables set --environment staging API_KEY=staging_key_456

# 現在の環境の変数を確認
railway variables
```

### シークレットの安全な管理

```bash
# 機密情報の設定
railway variables set DATABASE_PASSWORD=$(openssl rand -base64 32)
railway variables set JWT_SECRET=$(openssl rand -base64 64)

# GitHub Actionsとの連携
railway variables set GITHUB_TOKEN=${{ secrets.GITHUB_TOKEN }}
```

### .envファイルとの同期

```bash
# ローカルの.envから同期
railway variables set --from-env

# Railwayから.envファイルを生成
railway variables > .env.railway
```

## モニタリングとログ

### リアルタイムログ

```bash
# ログをリアルタイム表示
railway logs --tail

# 特定のサービスのログ
railway logs --service web

# エラーログのみフィルタ
railway logs | grep ERROR
```

### メトリクスの確認

ダッシュボードで以下が確認できます:

- CPU使用率
- メモリ使用量
- ネットワークトラフィック
- リクエスト数
- レスポンスタイム

### アラート設定

```javascript
// アプリケーションレベルでのヘルスチェック
app.get('/health', async (req, res) => {
  try {
    // データベース接続確認
    await prisma.$queryRaw`SELECT 1`;

    // Redis接続確認
    await redis.ping();

    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime()
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      error: error.message
    });
  }
});
```

## スケーリング戦略

### 垂直スケーリング

Railwayのプランをアップグレードすることで、より多くのリソースを確保できます。

```bash
# リソース使用状況の確認
railway status

# メトリクスの確認
railway metrics
```

### 水平スケーリング（複数インスタンス）

```json
// railway.json
{
  "deploy": {
    "numReplicas": 3,
    "healthcheckPath": "/health",
    "healthcheckTimeout": 100
  }
}
```

### データベースのスケーリング

```bash
# PostgreSQLのリソースをアップグレード
# ダッシュボードから設定変更
```

## CI/CDパイプライン

### GitHub Actionsとの連携

```yaml
# .github/workflows/deploy.yml
name: Deploy to Railway

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Install Railway
        run: npm i -g @railway/cli

      - name: Deploy to Railway
        run: railway up
        env:
          RAILWAY_TOKEN: ${{ secrets.RAILWAY_TOKEN }}
```

### テストとデプロイの自動化

```yaml
# .github/workflows/ci-cd.yml
name: CI/CD Pipeline

on:
  push:
    branches: [main, develop]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'

      - name: Install dependencies
        run: npm ci

      - name: Run tests
        run: npm test

      - name: Run linter
        run: npm run lint

  deploy:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v3

      - name: Deploy to Railway
        run: |
          npm i -g @railway/cli
          railway up
        env:
          RAILWAY_TOKEN: ${{ secrets.RAILWAY_TOKEN }}
```

## コスト最適化

### 無料枠の活用

```bash
# 現在の使用状況を確認
railway usage

# 月額コストの見積もり
railway pricing
```

### スリープ機能の活用

```json
// railway.json
{
  "deploy": {
    "sleepAfterMinutesOfInactivity": 30
  }
}
```

### リソース最適化

```javascript
// メモリリークの防止
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, closing server...');
  await server.close();
  await prisma.$disconnect();
  await redis.quit();
  process.exit(0);
});

// メモリ使用量のモニタリング
setInterval(() => {
  const used = process.memoryUsage();
  console.log('Memory usage:', {
    rss: `${Math.round(used.rss / 1024 / 1024)}MB`,
    heapTotal: `${Math.round(used.heapTotal / 1024 / 1024)}MB`,
    heapUsed: `${Math.round(used.heapUsed / 1024 / 1024)}MB`
  });
}, 60000);
```

## トラブルシューティング

### よくあるエラーと対処法

#### ビルドエラー

```bash
# ビルドログを確認
railway logs --deployment

# ローカルで再現
railway run npm run build

# Nixpacksの設定を確認
railway run nixpacks plan
```

#### 接続エラー

```javascript
// データベース接続のリトライ処理
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL
    }
  },
  log: ['error', 'warn'],
});

// 接続テスト
prisma.$connect()
  .then(() => console.log('Database connected'))
  .catch(err => console.error('Database connection error:', err));
```

#### メモリ不足

```json
// package.json - Node.jsのメモリ上限を増やす
{
  "scripts": {
    "start": "node --max-old-space-size=2048 server.js"
  }
}
```

### デバッグテクニック

```bash
# リモート環境でコマンド実行
railway run bash

# 環境変数の確認
railway run env

# データベースに接続
railway connect postgres
```

## ベストプラクティス

### 1. 環境変数の分離

```javascript
// config/index.js
const config = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3000'),
  database: {
    url: process.env.DATABASE_URL,
    poolSize: parseInt(process.env.DB_POOL_SIZE || '10')
  },
  redis: {
    url: process.env.REDIS_URL
  },
  api: {
    baseUrl: process.env.API_BASE_URL
  }
};

export default config;
```

### 2. ヘルスチェックの実装

```javascript
app.get('/health', async (req, res) => {
  const health = {
    uptime: process.uptime(),
    timestamp: Date.now(),
    status: 'ok',
    checks: {}
  };

  try {
    await prisma.$queryRaw`SELECT 1`;
    health.checks.database = 'ok';
  } catch (error) {
    health.checks.database = 'error';
    health.status = 'degraded';
  }

  const statusCode = health.status === 'ok' ? 200 : 503;
  res.status(statusCode).json(health);
});
```

### 3. グレースフルシャットダウン

```javascript
let isShuttingDown = false;

process.on('SIGTERM', async () => {
  if (isShuttingDown) return;
  isShuttingDown = true;

  console.log('Received SIGTERM, starting graceful shutdown...');

  // 新規リクエストを拒否
  server.close(async () => {
    console.log('HTTP server closed');

    // DB接続を閉じる
    await prisma.$disconnect();
    console.log('Database disconnected');

    // Redis接続を閉じる
    await redis.quit();
    console.log('Redis disconnected');

    process.exit(0);
  });

  // 30秒以内に終了しなければ強制終了
  setTimeout(() => {
    console.error('Forced shutdown after timeout');
    process.exit(1);
  }, 30000);
});
```

### 4. セキュリティ対策

```javascript
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

app.use(helmet());

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分
  max: 100, // 最大100リクエスト
  message: 'Too many requests from this IP'
});

app.use('/api/', limiter);

// CORSの設定
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
  credentials: true
}));
```

## まとめ

Railwayは、モダンなアプリケーションを簡単にデプロイできる強力なプラットフォームです。GitHub連携による自動デプロイ、豊富なデータベーステンプレート、使いやすいCLI、そして優れた開発者体験により、個人開発から本格的なプロダクションまで幅広く対応できます。

本記事で紹介した設定やベストプラクティスを活用することで、信頼性が高く、スケーラブルなアプリケーションをRailway上で運用できます。まずは無料枠から始めて、Railwayの便利さを体験してみてください。
