---
title: "Bunで本番環境にデプロイする方法 — Docker・Fly.io・Render対応"
description: "Bun 1.2+を本番環境にデプロイする完全ガイド。Dockerマルチステージビルド、Fly.io・Render・Railwayへのデプロイ手順、パフォーマンスチューニングまで実践的に解説。最新の技術動向を踏まえた実践的なガイドです。開発者必見の内容を網羅しています。"
pubDate: "2026-02-05"
tags: ["Bun", "デプロイ", "Docker", "Fly.io", "Render", "本番環境"]
---
## Bunとは

Bunは、JavaScriptとTypeScriptのための超高速なオールインワンランタイムです。Node.js、npm、Webpack、Babelなどの役割を単一のツールで担い、圧倒的なパフォーマンスを実現しています。

2026年現在、Bun 1.2がリリースされ、本番環境での採用事例も増加しています。この記事では、Bunアプリケーションを本番環境にデプロイする方法を解説します。

### Bunの主な特徴

- Node.jsの約3倍高速な起動時間
- npm installの約20倍高速なパッケージインストール
- ネイティブTypeScriptサポート
- Web標準APIの完全実装
- ビルドインのテストランナー

## 本番環境への準備

### プロジェクト構造

```
my-app/
├── src/
│   ├── index.ts
│   └── routes/
├── public/
├── package.json
├── tsconfig.json
├── Dockerfile
└── .dockerignore
```

### package.jsonの設定

```json
{
  "name": "my-bun-app",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "bun --watch src/index.ts",
    "start": "bun src/index.ts",
    "build": "bun build src/index.ts --outdir ./dist --target bun",
    "test": "bun test"
  },
  "dependencies": {
    "@hono/node-server": "^1.0.0",
    "hono": "^4.0.0"
  },
  "devDependencies": {
    "@types/bun": "latest"
  }
}
```

### サンプルアプリケーション

```typescript
// src/index.ts
import { Hono } from 'hono';
import { serve } from '@hono/node-server';

const app = new Hono();

app.get('/', (c) => {
  return c.json({ message: 'Hello from Bun!' });
});

app.get('/health', (c) => {
  return c.json({ status: 'ok', timestamp: Date.now() });
});

const port = parseInt(process.env.PORT || '3000');

console.log(`Server is running on port ${port}`);

serve({
  fetch: app.fetch,
  port,
});
```

## Dockerでのデプロイ

### Dockerfileの作成

マルチステージビルドを使った最適化されたDockerfile:

```dockerfile
# ベースイメージ
FROM oven/bun:1.2-slim AS base
WORKDIR /app

# 依存関係のインストール
FROM base AS deps
COPY package.json bun.lockb ./
RUN bun install --frozen-lockfile --production

# 開発用依存関係のインストール
FROM base AS dev-deps
COPY package.json bun.lockb ./
RUN bun install --frozen-lockfile

# ビルド
FROM base AS builder
COPY --from=dev-deps /app/node_modules ./node_modules
COPY . .
RUN bun run build

# 本番環境
FROM base AS production
ENV NODE_ENV=production

# 必要なファイルのみコピー
COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./

# 非rootユーザーで実行
RUN addgroup --system --gid 1001 bunjs && \
    adduser --system --uid 1001 bunjs
USER bunjs

EXPOSE 3000

CMD ["bun", "run", "start"]
```

### .dockerignoreの設定

```
node_modules
npm-debug.log
.git
.gitignore
.env
.env.local
dist
build
*.md
.vscode
.idea
```

### Dockerイメージのビルドと実行

```bash
# イメージのビルド
docker build -t my-bun-app .

# ローカルで実行
docker run -p 3000:3000 my-bun-app

# 環境変数を指定して実行
docker run -p 3000:3000 -e PORT=3000 my-bun-app
```

## Fly.ioへのデプロイ

Fly.ioは、グローバルにアプリケーションをデプロイできるプラットフォームです。

### Fly.ioのセットアップ

```bash
# Fly.io CLIのインストール
curl -L https://fly.io/install.sh | sh

# ログイン
fly auth login

# アプリの作成
fly launch
```

### fly.tomlの設定

```toml
app = "my-bun-app"
primary_region = "nrt"  # 東京リージョン

[build]
  dockerfile = "Dockerfile"

[env]
  PORT = "3000"

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

### デプロイコマンド

```bash
# デプロイ
fly deploy

# ログの確認
fly logs

# アプリの状態確認
fly status

# スケーリング
fly scale count 2

# シークレットの設定
fly secrets set DATABASE_URL=postgresql://...
```

## Renderへのデプロイ

Renderは、Herokuの代替として人気のあるPaaSです。

### render.yamlの作成

```yaml
services:
  - type: web
    name: my-bun-app
    env: docker
    dockerfilePath: ./Dockerfile
    region: oregon
    plan: starter
    branch: main
    healthCheckPath: /health
    envVars:
      - key: PORT
        value: 3000
      - key: NODE_ENV
        value: production
```

### Renderでの設定手順

1. Renderダッシュボードで「New Web Service」を選択
2. GitHubリポジトリを接続
3. 以下を設定:
   - Environment: Docker
   - Branch: main
   - Dockerfile Path: ./Dockerfile
4. Deploy

### Renderの無料プランの注意点

無料プランでは、15分間リクエストがないとスリープ状態になります。ウォームアップ用のヘルスチェックを設定することで対策できます。

```typescript
// ヘルスチェックエンドポイント
app.get('/health', (c) => {
  return c.json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: Date.now(),
  });
});
```

## Railwayへのデプロイ

Railwayは、シンプルで使いやすいデプロイプラットフォームです。

### デプロイ手順

1. [Railway](https://railway.app)にサインアップ
2. GitHubリポジトリを接続
3. 自動的にDockerfileを検出してデプロイ

### railway.jsonの作成（オプション）

```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "DOCKERFILE",
    "dockerfilePath": "Dockerfile"
  },
  "deploy": {
    "startCommand": "bun run start",
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
```

## 環境変数の管理

### .envファイル

```bash
# .env
PORT=3000
NODE_ENV=production
DATABASE_URL=postgresql://user:pass@host:5432/db
REDIS_URL=redis://localhost:6379
API_KEY=your-secret-key
```

### Bunでの環境変数の読み込み

```typescript
// src/config.ts
export const config = {
  port: parseInt(process.env.PORT || '3000'),
  nodeEnv: process.env.NODE_ENV || 'development',
  databaseUrl: process.env.DATABASE_URL!,
  redisUrl: process.env.REDIS_URL,
  apiKey: process.env.API_KEY!,
};

// バリデーション
if (!config.databaseUrl) {
  throw new Error('DATABASE_URL is required');
}
```

## パフォーマンスチューニング

### 1. メモリ最適化

Bunは自動的にメモリを最適化しますが、環境変数で調整可能です。

```dockerfile
ENV BUN_JSC_forceRAMSize=1073741824  # 1GB
ENV BUN_JSC_useJIT=1
```

### 2. HTTP/2の有効化

```typescript
import { serve } from 'bun';

serve({
  port: 3000,
  fetch(req) {
    return new Response('Hello World!');
  },
  // HTTP/2を有効化
  tls: {
    cert: Bun.file('./cert.pem'),
    key: Bun.file('./key.pem'),
  },
});
```

### 3. 静的ファイルの最適化

```typescript
import { Hono } from 'hono';
import { serveStatic } from 'hono/bun';

const app = new Hono();

// 静的ファイルの配信
app.use('/static/*', serveStatic({ root: './public' }));

// キャッシュヘッダーの設定
app.use('/static/*', async (c, next) => {
  await next();
  c.header('Cache-Control', 'public, max-age=31536000, immutable');
});
```

### 4. データベース接続プール

```typescript
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,  // 最大接続数
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// 接続の再利用
export async function query(text: string, params?: any[]) {
  const client = await pool.connect();
  try {
    return await client.query(text, params);
  } finally {
    client.release();
  }
}
```

## モニタリングとロギング

### 構造化ログ

```typescript
// src/logger.ts
import { type Context } from 'hono';

export function logger(c: Context, message: string, meta?: any) {
  const log = {
    timestamp: new Date().toISOString(),
    level: 'info',
    message,
    path: c.req.path,
    method: c.req.method,
    ...meta,
  };

  console.log(JSON.stringify(log));
}
```

### エラートラッキング

```typescript
app.onError((err, c) => {
  console.error({
    timestamp: new Date().toISOString(),
    level: 'error',
    error: err.message,
    stack: err.stack,
    path: c.req.path,
    method: c.req.method,
  });

  return c.json({ error: 'Internal Server Error' }, 500);
});
```

## CI/CDパイプライン

### GitHub Actionsの設定

```yaml
# .github/workflows/deploy.yml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: oven-sh/setup-bun@v1
        with:
          bun-version: 1.2

      - name: Install dependencies
        run: bun install

      - name: Run tests
        run: bun test

      - name: Build Docker image
        run: docker build -t my-app .

      - name: Deploy to Fly.io
        uses: superfly/flyctl-actions@1.5
        with:
          args: deploy
        env:
          FLY_API_TOKEN: ${{ secrets.FLY_API_TOKEN }}
```

## まとめ

Bunは本番環境でも十分に使える成熟したランタイムになっています。特に以下の点で優れています。

- 高速な起動時間とパフォーマンス
- シンプルなデプロイプロセス
- Node.jsとの互換性
- 小さなDockerイメージサイズ

まずは小規模なプロジェクトで試し、パフォーマンスとデプロイの簡単さを実感してみることをお勧めします。
