---
title: 'Fly.ioでグローバルデプロイ - 2026年版実践ガイド'
description: 'エッジコンピューティング時代のデプロイプラットフォームFly.ioを徹底解説。無料枠から本番運用、スケーリング、マルチリージョン展開まで完全網羅。'
pubDate: 'Feb 05 2026'
tags: ['Fly.io', 'Deploy', 'Edge Computing', 'DevOps', 'Infrastructure']
---

Fly.ioは、世界中のエッジロケーションにアプリケーションをデプロイできる次世代プラットフォームです。2026年現在、Vercel/Netlifyの代替として、さらにはHerokuの後継として多くの開発者に選ばれています。本記事では、Fly.ioの魅力と実践的な使い方を徹底解説します。

## Fly.ioとは？

Fly.ioは、**DockerコンテナをグローバルなエッジロケーションにデプロイできるPaaS**です。

### 主な特徴

- **グローバルエッジ展開**: 世界35+リージョンに数秒でデプロイ
- **低レイテンシ**: ユーザーに最も近いリージョンで実行
- **フルスタック対応**: Node.js、Go、Python、Rails、Phoenixなど何でもOK
- **データベース内蔵**: PostgreSQL、Redis、Tigrisをワンコマンドで作成
- **無料枠が充実**: 個人開発や小規模アプリなら無料で運用可能
- **柔軟なスケーリング**: 自動スケールから手動調整まで

### 料金（2026年版）

**無料枠（Hobby Plan）**:
- 3つの共有CPUマシン（256MB RAM）
- 3GB永続ストレージ
- 160GB転送量/月
- PostgreSQL（1GB）

**有料プラン（Pay as you go）**:
- 使った分だけ課金
- 1 shared-cpu-1x: $0.0000008/秒（約$2/月）
- RAM: $0.0000003/MB/秒
- Storage: $0.15/GB/月
- Transfer: $0.02/GB

→ 小規模アプリなら月$5-10で運用可能

## セットアップ

### 1. アカウント作成とCLIインストール

```bash
# macOS
brew install flyctl

# Linux
curl -L https://fly.io/install.sh | sh

# Windows (PowerShell)
pwsh -Command "iwr https://fly.io/install.ps1 -useb | iex"

# インストール確認
fly version

# ログイン
fly auth login
```

ブラウザが開いてGitHubアカウントでログインできます。

### 2. クレジットカード登録

無料枠でも登録が必要（悪用防止）:

```bash
fly billing show
```

ブラウザで支払い方法を登録します。

## プロジェクトデプロイ（実践編）

### Node.js/Express アプリ

#### プロジェクト作成

```bash
mkdir my-app && cd my-app
npm init -y
npm install express
```

#### server.js

```javascript
const express = require('express')
const app = express()
const PORT = process.env.PORT || 3000

app.get('/', (req, res) => {
  res.json({
    message: 'Hello from Fly.io!',
    region: process.env.FLY_REGION,
    instance: process.env.FLY_ALLOC_ID,
  })
})

app.get('/health', (req, res) => {
  res.status(200).send('OK')
})

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})
```

#### Dockerfile

```dockerfile
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

EXPOSE 3000

CMD ["node", "server.js"]
```

#### デプロイ

```bash
# Fly.ioアプリ初期化
fly launch

# 対話式で設定
# App name: my-app（または自動生成）
# Region: nrt (東京) またはお好みのリージョン
# Postgres: N（後で追加可能）
# Redis: N
# Deploy now: Y

# デプロイ完了後、アクセス
fly open
```

### Next.js アプリ

```bash
npx create-next-app@latest my-nextjs-app
cd my-nextjs-app
```

#### fly.toml（自動生成後、調整）

```toml
app = "my-nextjs-app"
primary_region = "nrt"

[build]
  dockerfile = "Dockerfile"

[env]
  PORT = "3000"

[http_service]
  internal_port = 3000
  force_https = true
  auto_stop_machines = true
  auto_start_machines = true
  min_machines_running = 0  # コスト削減

[[http_service.checks]]
  grace_period = "10s"
  interval = "30s"
  method = "GET"
  timeout = "5s"
  path = "/api/health"
```

#### Dockerfile（Next.js最適化版）

```dockerfile
FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT 3000

CMD ["node", "server.js"]
```

#### next.config.js

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',  // Dockerデプロイ用
}

module.exports = nextConfig
```

#### デプロイ

```bash
fly launch
fly deploy
```

### Python/FastAPI アプリ

#### main.py

```python
from fastapi import FastAPI
import os

app = FastAPI()

@app.get("/")
async def root():
    return {
        "message": "Hello from Fly.io!",
        "region": os.getenv("FLY_REGION"),
        "instance": os.getenv("FLY_ALLOC_ID"),
    }

@app.get("/health")
async def health():
    return {"status": "ok"}
```

#### requirements.txt

```
fastapi==0.109.0
uvicorn[standard]==0.27.0
```

#### Dockerfile

```dockerfile
FROM python:3.12-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

#### fly.toml

```toml
app = "my-fastapi-app"
primary_region = "nrt"

[http_service]
  internal_port = 8000
  force_https = true
  auto_stop_machines = true
  auto_start_machines = true
```

```bash
fly launch
fly deploy
```

## データベース活用

### PostgreSQL

```bash
# Postgresクラスタ作成
fly postgres create --name my-db --region nrt

# アプリにアタッチ
fly postgres attach my-db --app my-app

# 接続情報を確認（自動で環境変数に設定される）
fly secrets list

# DATABASE_URL が設定される
# postgres://username:password@my-db.internal:5432/my_app
```

#### Node.jsでPostgresを使う

```bash
npm install pg
```

```javascript
const { Pool } = require('pg')

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
})

app.get('/users', async (req, res) => {
  const result = await pool.query('SELECT * FROM users')
  res.json(result.rows)
})
```

### Redis

```bash
# Upstashを使う（推奨）
fly redis create --name my-redis

# 接続情報が自動設定される（REDIS_URL）
```

#### Node.jsでRedisを使う

```bash
npm install ioredis
```

```javascript
const Redis = require('ioredis')
const redis = new Redis(process.env.REDIS_URL)

app.get('/cache/:key', async (req, res) => {
  const value = await redis.get(req.params.key)
  res.json({ value })
})

app.post('/cache/:key', async (req, res) => {
  await redis.set(req.params.key, req.body.value, 'EX', 3600)
  res.json({ success: true })
})
```

## マルチリージョン展開

### 1. リージョン追加

```bash
# 利用可能なリージョン確認
fly platform regions

# リージョン追加（例: 東京、シンガポール、サンフランシスコ）
fly regions add nrt sin sjc

# 現在のリージョン確認
fly regions list
```

### 2. マシン追加

```bash
# 各リージョンにマシンを追加
fly scale count 3  # 3つのリージョンに1台ずつ

# または手動で
fly machine clone <machine-id> --region sjc
```

### 3. リクエストルーティング

Fly.ioは自動的に最も近いリージョンにルーティングしてくれます。

```javascript
// どのリージョンで処理されたか確認
app.get('/info', (req, res) => {
  res.json({
    region: process.env.FLY_REGION,
    clientRegion: req.get('Fly-Client-IP'),
  })
})
```

## 環境変数とシークレット

### 環境変数設定

```bash
# シークレット設定（暗号化される）
fly secrets set API_KEY=your_secret_key
fly secrets set DATABASE_URL=postgres://...

# 通常の環境変数（fly.tomlで）
# fly.toml
[env]
  NODE_ENV = "production"
  LOG_LEVEL = "info"
```

### 環境別の設定

```bash
# ステージング環境
fly launch --name my-app-staging --region nrt
fly secrets set --app my-app-staging API_KEY=staging_key

# 本番環境
fly launch --name my-app-prod --region nrt
fly secrets set --app my-app-prod API_KEY=prod_key
```

## カスタムドメイン

```bash
# ドメイン追加
fly certs add example.com
fly certs add www.example.com

# DNS設定（表示される内容に従う）
# A record: example.com → <fly-ip>
# AAAA record: example.com → <fly-ipv6>
# CNAME: www.example.com → <app-name>.fly.dev

# 証明書確認
fly certs show example.com
```

SSL証明書は自動的にLet's Encryptで発行されます。

## スケーリング

### 垂直スケーリング（マシンサイズ変更）

```bash
# 利用可能なマシンタイプ確認
fly platform vm-sizes

# マシンサイズ変更
fly scale vm shared-cpu-2x --memory 512

# 例:
# shared-cpu-1x: 1 vCPU, 256MB RAM
# shared-cpu-2x: 2 vCPU, 512MB RAM
# performance-1x: 専有1 vCPU, 2GB RAM
```

### 水平スケーリング（マシン数変更）

```bash
# マシン数を増やす
fly scale count 5

# リージョンごとに指定
fly scale count 2 --region nrt
fly scale count 1 --region sjc
```

### オートスケール設定

```toml
# fly.toml
[http_service]
  auto_stop_machines = true
  auto_start_machines = true
  min_machines_running = 1  # 最低1台は稼働
  max_machines_running = 10 # 最大10台まで自動スケール
```

## モニタリング

### ログ確認

```bash
# リアルタイムログ
fly logs

# 過去のログ
fly logs --app my-app --lines 100
```

### メトリクス確認

```bash
# ダッシュボード
fly dashboard

# マシン一覧
fly status

# マシン詳細
fly machine list
```

### アラート設定（Grafana連携）

Fly.ioはPrometheusメトリクスを公開しているので、Grafanaでダッシュボード構築可能。

## CI/CD統合

### GitHub Actions

```yaml
# .github/workflows/deploy.yml
name: Deploy to Fly.io

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: superfly/flyctl-actions/setup-flyctl@master

      - name: Deploy to Fly.io
        run: flyctl deploy --remote-only
        env:
          FLY_API_TOKEN: ${{ secrets.FLY_API_TOKEN }}
```

#### FLY_API_TOKENの取得

```bash
fly tokens create deploy
# トークンをGitHub SecretsにFLY_API_TOKENとして登録
```

## ベストプラクティス

### 1. ヘルスチェック設定

```toml
[[http_service.checks]]
  grace_period = "10s"
  interval = "30s"
  method = "GET"
  timeout = "5s"
  path = "/health"
```

```javascript
app.get('/health', (req, res) => {
  // DB接続確認など
  res.status(200).send('OK')
})
```

### 2. graceful shutdown

```javascript
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, closing server gracefully')

  server.close(async () => {
    await pool.end()  // DB接続を閉じる
    await redis.quit()  // Redis接続を閉じる
    process.exit(0)
  })

  // 30秒でタイムアウト
  setTimeout(() => process.exit(1), 30000)
})
```

### 3. コスト最適化

```toml
# 未使用時は自動停止
[http_service]
  auto_stop_machines = true
  auto_start_machines = true
  min_machines_running = 0  # 完全に停止OK
```

トラフィックがあれば自動起動（数百ms）するので、低トラフィックアプリに最適。

### 4. リージョン戦略

```bash
# ターゲットユーザーに近いリージョンを選択
fly regions add nrt  # 日本ユーザー向け
fly regions add sin  # 東南アジア向け
fly regions add iad  # 北米東海岸向け
fly regions add fra  # ヨーロッパ向け
```

## トラブルシューティング

### デプロイ失敗

```bash
# 詳細ログ確認
fly logs --app my-app

# マシン状態確認
fly machine list

# 手動でマシン停止・再起動
fly machine stop <machine-id>
fly machine start <machine-id>
```

### データベース接続エラー

```bash
# Postgres接続テスト
fly postgres connect --app my-db

# 接続情報確認
fly secrets list
```

### パフォーマンス問題

```bash
# メトリクス確認
fly status

# マシンスペック確認
fly machine list

# スケールアップ
fly scale vm performance-1x --memory 2048
```

## まとめ

Fly.ioは以下の点で優れています:

**グローバル展開が簡単**:
- 世界中にワンコマンドでデプロイ
- 低レイテンシを実現
- マルチリージョン展開が標準機能

**柔軟性が高い**:
- Dockerベースで何でもデプロイ可能
- データベース・Redisも簡単に統合
- きめ細かいスケーリング制御

**コスパ抜群**:
- 充実した無料枠
- 使った分だけ課金
- 自動停止でコスト削減

**Fly.ioが向いているケース**:
- グローバルユーザー向けアプリ
- 低レイテンシが重要なサービス
- フルスタックアプリ（DB含む）
- HerokuやRenderからの移行

Vercel/Netlifyは静的サイト・SSRに特化していますが、Fly.ioはあらゆるワークロードに対応できます。2026年、エッジコンピューティング時代の本命プラットフォームです。

**参考リンク**:
- [Fly.io公式サイト](https://fly.io/)
- [Fly.io Docs](https://fly.io/docs/)
- [Fly.io GitHub](https://github.com/superfly)
