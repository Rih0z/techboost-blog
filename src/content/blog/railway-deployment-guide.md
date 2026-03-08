---
title: "Railway.appでアプリを簡単デプロイ - モダンなPaaS完全ガイド"
description: "Railway.appを使った簡単なアプリケーションデプロイ方法を解説。GitHubとの連携、データベース設定、環境変数管理、カスタムドメイン設定まで実践的に紹介します。最新の技術動向を踏まえた実践的なガイドです。開発者必見の内容を網羅しています。"
pubDate: "2025-02-05"
tags: ['AI', '開発ツール', '開発効率化']
heroImage: '../../assets/thumbnails/railway-deployment-guide.jpg'
---

Railway.appは、開発者にとって最もシンプルで強力なPlatform as a Service（PaaS）の一つです。GitHubリポジトリと連携するだけで、Node.js、Python、Go、Rustなど様々な言語のアプリケーションを数分でデプロイできます。

この記事では、Railwayの基本的な使い方から、データベース設定、環境変数管理、本番運用まで、実践的なデプロイ方法を詳しく解説します。

## Railwayの特徴

### 1. ゼロコンフィグデプロイ

Dockerfileやビルド設定なしで、自動的にアプリケーションを検出してデプロイします。

### 2. GitHubとの統合

プッシュするだけで自動デプロイ。プルリクエストごとにプレビュー環境も作成されます。

### 3. 豊富なデータベーステンプレート

PostgreSQL、MySQL、MongoDB、Redisなどを数クリックで追加できます。

### 4. 開発者フレンドリーな料金

初回$5クレジット（30日間有効）のトライアルがあり、Hobbyプランは$5/月から利用可能です。

## アカウント作成とプロジェクトセットアップ

### 1. Railwayにサインアップ

```bash
# Railway CLIをインストール（オプション）
npm install -g @railway/cli

# または
brew install railway
```

1. [Railway.app](https://railway.app/)にアクセス
2. "Start a New Project"をクリック
3. GitHubアカウントで認証

### 2. プロジェクト作成

Railway上で新規プロジェクトを作成する方法は3つあります：

1. **GitHubリポジトリから**（推奨）
2. テンプレートから
3. 空のプロジェクトから

## Next.jsアプリのデプロイ

### プロジェクトの準備

```bash
# Next.jsプロジェクト作成
npx create-next-app@latest my-railway-app
cd my-railway-app

# GitHubリポジトリにプッシュ
git init
git add .
git commit -m "Initial commit"
gh repo create my-railway-app --public --source=. --remote=origin
git push -u origin main
```

### package.jsonの設定

```json
{
  "name": "my-railway-app",
  "version": "0.1.0",
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint"
  },
  "engines": {
    "node": ">=18.0.0"
  }
}
```

### Railwayでのデプロイ

1. Railway ダッシュボードで "New Project"
2. "Deploy from GitHub repo"を選択
3. リポジトリを選択
4. 自動的にビルドとデプロイが開始される

### 環境変数の設定

```bash
# Railway CLIから設定
railway variables set NODE_ENV=production
railway variables set DATABASE_URL=postgresql://...

# または、ダッシュボードから設定
# Project → Variables
```

## Express.js APIのデプロイ

### プロジェクト構成

```javascript
// src/index.js
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.json({ message: 'Hello from Railway!' });
});

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
  });
});

app.listen(port, '0.0.0.0', () => {
  console.log(`Server running on port ${port}`);
});
```

### package.json

```json
{
  "name": "express-railway-api",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "start": "node src/index.js",
    "dev": "nodemon src/index.js"
  },
  "dependencies": {
    "express": "^4.18.2",
    "cors": "^2.8.5",
    "dotenv": "^16.3.1"
  },
  "devDependencies": {
    "nodemon": "^3.0.1"
  },
  "engines": {
    "node": ">=18.0.0"
  }
}
```

### Procfileの作成（オプション）

```
web: node src/index.js
```

## データベースの追加

### PostgreSQLの追加

1. Railwayダッシュボードで "New"
2. "Database" → "Add PostgreSQL"
3. 自動的に環境変数が設定される

### データベース接続

```javascript
// src/db.js
import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? {
    rejectUnauthorized: false
  } : false,
});

export async function query(text, params) {
  const start = Date.now();
  const res = await pool.query(text, params);
  const duration = Date.now() - start;
  console.log('Executed query', { text, duration, rows: res.rowCount });
  return res;
}

export default pool;
```

### マイグレーションの実行

```javascript
// scripts/migrate.js
import pool from '../src/db.js';

async function migrate() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        name VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS posts (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        title VARCHAR(255) NOT NULL,
        content TEXT,
        published BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    console.log('Migration completed successfully');
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

migrate();
```

package.jsonにスクリプト追加：

```json
{
  "scripts": {
    "migrate": "node scripts/migrate.js",
    "build": "npm run migrate"
  }
}
```

### Prismaの使用

```bash
npm install @prisma/client
npm install -D prisma
npx prisma init
```

```prisma
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
  name      String
  posts     Post[]
  createdAt DateTime @default(now()) @map("created_at")

  @@map("users")
}

model Post {
  id        Int      @id @default(autoincrement())
  title     String
  content   String?
  published Boolean  @default(false)
  author    User     @relation(fields: [authorId], references: [id])
  authorId  Int      @map("user_id")
  createdAt DateTime @default(now()) @map("created_at")

  @@map("posts")
}
```

```json
{
  "scripts": {
    "build": "prisma generate && prisma migrate deploy"
  }
}
```

## Redisの追加

### Redis接続設定

```javascript
// src/cache.js
import { createClient } from 'redis';

const client = createClient({
  url: process.env.REDIS_URL,
});

client.on('error', (err) => console.log('Redis Client Error', err));

await client.connect();

export async function get(key) {
  return await client.get(key);
}

export async function set(key, value, expireSeconds = 3600) {
  return await client.setEx(key, expireSeconds, value);
}

export async function del(key) {
  return await client.del(key);
}

export default client;
```

### キャッシュの使用例

```javascript
import express from 'express';
import { get, set } from './cache.js';
import pool from './db.js';

const app = express();

app.get('/api/users/:id', async (req, res) => {
  const { id } = req.params;
  const cacheKey = `user:${id}`;

  // キャッシュチェック
  const cached = await get(cacheKey);
  if (cached) {
    return res.json(JSON.parse(cached));
  }

  // データベースから取得
  const result = await pool.query(
    'SELECT * FROM users WHERE id = $1',
    [id]
  );

  if (result.rows.length === 0) {
    return res.status(404).json({ error: 'User not found' });
  }

  const user = result.rows[0];

  // キャッシュに保存（1時間）
  await set(cacheKey, JSON.stringify(user), 3600);

  res.json(user);
});
```

## 環境変数の管理

### 環境別の設定

```javascript
// config/index.js
export const config = {
  port: process.env.PORT || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
  database: {
    url: process.env.DATABASE_URL,
  },
  redis: {
    url: process.env.REDIS_URL,
  },
  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: '7d',
  },
  cors: {
    origin: process.env.CORS_ORIGIN || '*',
  },
};
```

### .env.exampleの作成

```bash
# .env.example
NODE_ENV=development
PORT=3000
DATABASE_URL=postgresql://user:password@localhost:5432/dbname
REDIS_URL=redis://localhost:6379
JWT_SECRET=your-secret-key
CORS_ORIGIN=http://localhost:3000
```

### Railwayでの環境変数設定

```bash
# Railway CLIで一括設定
railway variables set NODE_ENV=production
railway variables set JWT_SECRET=$(openssl rand -hex 32)
railway variables set CORS_ORIGIN=https://yourdomain.com

# または .env ファイルから読み込み
railway variables set < .env.production
```

## カスタムドメインの設定

### ドメインの追加

1. Railway ダッシュボードで Settings
2. "Domains" セクション
3. "Custom Domain" を追加

### DNS設定

```
# Aレコード
@    A    76.76.21.21

# CNAMEレコード
www  CNAME  your-app.up.railway.app
```

### SSL証明書

Railwayは自動的にLet's EncryptのSSL証明書を発行します。設定不要です。

## モニタリングとログ

### ログの確認

```bash
# Railway CLIでログ表示
railway logs

# リアルタイムログ
railway logs --follow
```

### メトリクスの監視

ダッシュボードで以下を確認できます：

- CPU使用率
- メモリ使用率
- ネットワーク転送量
- リクエスト数

### ヘルスチェックエンドポイント

```javascript
app.get('/health', async (req, res) => {
  try {
    // データベース接続確認
    await pool.query('SELECT 1');

    // Redis接続確認
    await client.ping();

    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      error: error.message,
    });
  }
});
```

## CI/CDの設定

### GitHub Actionsとの連携

```yaml
# .github/workflows/test.yml
name: Test

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest

    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: postgres
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run tests
        run: npm test
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/test
```

### 自動デプロイ

Railwayは自動的にmainブランチへのプッシュをデプロイします。プルリクエストごとにプレビュー環境も作成されます。

## パフォーマンス最適化

### ビルド最適化

```json
{
  "scripts": {
    "build": "npm run migrate && npm prune --production"
  }
}
```

### Node.jsの最適化

```javascript
// 本番環境での最適化
if (process.env.NODE_ENV === 'production') {
  app.enable('trust proxy');
  app.use(compression());

  // セキュリティヘッダー
  app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    next();
  });
}
```

### データベース接続プール

```javascript
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20, // 最大接続数
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});
```

## トラブルシューティング

### よくある問題

**1. ポートバインディングエラー**

```javascript
// ❌ 間違い
app.listen(3000);

// ✅ 正しい
const port = process.env.PORT || 3000;
app.listen(port, '0.0.0.0');
```

**2. データベース接続エラー**

```javascript
// SSL設定が必要
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});
```

**3. ビルド失敗**

```json
{
  "engines": {
    "node": ">=18.0.0",
    "npm": ">=9.0.0"
  }
}
```

## 料金とスケーリング

### トライアル

- 初回$5クレジット（30日間有効・1回限り）
- PostgreSQL/MySQL/Redis利用可能（クレジット内）

### 有料プラン

- Hobby: $5/月から
- Pro: $20/月から
- 自動スケーリング
- 優先サポート

## まとめ

Railway.appは、モダンなWebアプリケーションを簡単にデプロイできる強力なPaaSプラットフォームです。

**主な利点：**

- ゼロコンフィグデプロイ
- GitHubとのシームレスな統合
- 豊富なデータベーステンプレート
- 自動SSL証明書
- 開発者フレンドリーな料金

**適用シーン：**

- 個人プロジェクト
- スタートアップのMVP
- API開発
- マイクロサービス
- サイドプロジェクト

Railwayを使えば、インフラ管理に時間を取られることなく、アプリケーション開発に集中できます。
