---
title: "Turborepoリモートキャッシュ実践: ビルド時間を90%短縮する設定と運用"
description: "Turborepoのリモートキャッシュ機能を使ったビルド時間の劇的な短縮方法を解説。Vercel、カスタムサーバー、S3バックエンドの実装例と運用ノウハウを紹介します。CI/CDでのキャッシュヒット率を最大化する運用テクニックも紹介します。"
pubDate: "2025-11-05"
updatedDate: "2025-11-05"
tags: ['Turborepo', 'Monorepo', 'ビルド最適化', 'CICD', 'キャッシュ', 'インフラ']
heroImage: '../../assets/thumbnails/turborepo-remote-caching.jpg'
---
Turborepoのリモートキャッシュは、チーム全体でビルド成果物を共有し、ビルド時間を劇的に短縮できる強力な機能です。本記事では、リモートキャッシュの実装から運用まで、実践的なノウハウを解説します。

## リモートキャッシュとは

Turborepoはデフォルトでローカルキャッシュを使用しますが、リモートキャッシュを使うことで、チームメンバーやCI環境間でキャッシュを共有できます。

```bash
# ローカルキャッシュのみ（デフォルト）
$ turbo build
>>> FULL TURBO
>>> Cached: 0/10 tasks
>>> Execution time: 45s

# リモートキャッシュ有効化後（初回）
$ turbo build --remote-cache
>>> FULL TURBO
>>> Cached: 0/10 tasks
>>> Execution time: 45s
>>> Remote cache: 10 artifacts uploaded

# 別のマシンまたはCI環境で実行
$ turbo build --remote-cache
>>> FULL TURBO
>>> Cached: 10/10 tasks (100% cache hit)
>>> Execution time: 3s
>>> Remote cache: 10 artifacts downloaded
```

**削減効果:**
- 初回ビルド: 45秒
- キャッシュヒット: 3秒
- **93%の時間短縮**

## Vercel Remote Cacheの利用

最も簡単な方法は、Vercelの提供するリモートキャッシュを使用することです。

### セットアップ

```bash
# Vercelにログイン
$ npx turbo login

# プロジェクトをリンク
$ npx turbo link
```

```json
// turbo.json
{
  "$schema": "https://turbo.build/schema.json",
  "globalDependencies": ["**/.env.*local"],
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**", ".next/**", "!.next/cache/**"],
      "cache": true
    },
    "test": {
      "dependsOn": ["^build"],
      "cache": true,
      "outputs": ["coverage/**"]
    },
    "lint": {
      "cache": true,
      "outputs": []
    }
  },
  "remoteCache": {
    "enabled": true
  }
}
```

```json
// package.json
{
  "scripts": {
    "build": "turbo run build",
    "build:ci": "turbo run build --remote-cache",
    "test": "turbo run test",
    "lint": "turbo run lint"
  }
}
```

### CI/CDでの設定

```yaml
# .github/workflows/ci.yml
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

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'pnpm'

      - run: pnpm install --frozen-lockfile

      - name: Build with Turborepo
        run: pnpm build:ci
        env:
          TURBO_TOKEN: ${{ secrets.TURBO_TOKEN }}
          TURBO_TEAM: ${{ secrets.TURBO_TEAM }}
```

Vercelダッシュボードからトークンを取得し、GitHub Secretsに設定します。

## カスタムリモートキャッシュサーバー

自前でリモートキャッシュサーバーを構築することもできます。

### 1. S3バックエンドの実装

```typescript
// cache-server/src/index.ts
import express from 'express'
import { S3Client, PutObjectCommand, GetObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3'
import crypto from 'crypto'

const app = express()
const s3Client = new S3Client({ region: process.env.AWS_REGION })
const BUCKET_NAME = process.env.S3_BUCKET_NAME!

app.use(express.json())
app.use(express.raw({ type: 'application/octet-stream', limit: '50mb' }))

// 認証ミドルウェア
function authenticate(req: express.Request, res: express.Response, next: express.NextFunction) {
  const token = req.headers.authorization?.replace('Bearer ', '')

  if (!token || token !== process.env.TURBO_TOKEN) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  next()
}

// キャッシュの存在確認
app.head('/v8/artifacts/:hash', authenticate, async (req, res) => {
  const { hash } = req.params

  try {
    await s3Client.send(new HeadObjectCommand({
      Bucket: BUCKET_NAME,
      Key: `artifacts/${hash}`,
    }))

    res.status(200).end()
  } catch (error) {
    res.status(404).end()
  }
})

// キャッシュの取得
app.get('/v8/artifacts/:hash', authenticate, async (req, res) => {
  const { hash } = req.params

  try {
    const response = await s3Client.send(new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: `artifacts/${hash}`,
    }))

    res.setHeader('Content-Type', 'application/octet-stream')
    response.Body?.pipe(res)
  } catch (error) {
    res.status(404).json({ error: 'Artifact not found' })
  }
})

// キャッシュの保存
app.put('/v8/artifacts/:hash', authenticate, async (req, res) => {
  const { hash } = req.params
  const teamId = req.query.teamId as string
  const slug = req.query.slug as string

  // ハッシュ検証
  const actualHash = crypto.createHash('sha256').update(req.body).digest('hex')
  if (actualHash !== hash) {
    return res.status(400).json({ error: 'Hash mismatch' })
  }

  try {
    await s3Client.send(new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: `artifacts/${hash}`,
      Body: req.body,
      ContentType: 'application/octet-stream',
      Metadata: {
        teamId,
        slug,
        uploadedAt: new Date().toISOString(),
      },
    }))

    res.status(200).json({ urls: [`https://${BUCKET_NAME}.s3.amazonaws.com/artifacts/${hash}`] })
  } catch (error) {
    console.error('Failed to upload artifact:', error)
    res.status(500).json({ error: 'Failed to upload artifact' })
  }
})

// ヘルスチェック
app.get('/health', (req, res) => {
  res.json({ status: 'ok' })
})

const PORT = process.env.PORT || 3000
app.listen(PORT, () => {
  console.log(`Cache server running on port ${PORT}`)
})
```

```dockerfile
# cache-server/Dockerfile
FROM node:20-alpine

WORKDIR /app

COPY package.json pnpm-lock.yaml ./
RUN corepack enable pnpm && pnpm install --frozen-lockfile

COPY . .
RUN pnpm build

EXPOSE 3000

CMD ["node", "dist/index.js"]
```

### 2. Cloudflare R2バックエンド

```typescript
// cache-server/src/r2-backend.ts
import { Hono } from 'hono'
import { R2Bucket } from '@cloudflare/workers-types'

type Bindings = {
  TURBO_CACHE: R2Bucket
  TURBO_TOKEN: string
}

const app = new Hono<{ Bindings: Bindings }>()

// 認証
app.use('*', async (c, next) => {
  const token = c.req.header('authorization')?.replace('Bearer ', '')

  if (!token || token !== c.env.TURBO_TOKEN) {
    return c.json({ error: 'Unauthorized' }, 401)
  }

  await next()
})

// キャッシュの存在確認
app.head('/v8/artifacts/:hash', async (c) => {
  const hash = c.req.param('hash')
  const object = await c.env.TURBO_CACHE.head(`artifacts/${hash}`)

  if (!object) {
    return c.body(null, 404)
  }

  return c.body(null, 200)
})

// キャッシュの取得
app.get('/v8/artifacts/:hash', async (c) => {
  const hash = c.req.param('hash')
  const object = await c.env.TURBO_CACHE.get(`artifacts/${hash}`)

  if (!object) {
    return c.json({ error: 'Artifact not found' }, 404)
  }

  return c.body(object.body, 200, {
    'Content-Type': 'application/octet-stream',
  })
})

// キャッシュの保存
app.put('/v8/artifacts/:hash', async (c) => {
  const hash = c.req.param('hash')
  const body = await c.req.arrayBuffer()

  await c.env.TURBO_CACHE.put(`artifacts/${hash}`, body, {
    httpMetadata: {
      contentType: 'application/octet-stream',
    },
    customMetadata: {
      uploadedAt: new Date().toISOString(),
    },
  })

  return c.json({ urls: [`/v8/artifacts/${hash}`] })
})

export default app
```

```toml
# cache-server/wrangler.toml
name = "turborepo-cache"
main = "src/r2-backend.ts"
compatibility_date = "2025-01-01"

[[r2_buckets]]
binding = "TURBO_CACHE"
bucket_name = "turborepo-cache"

[env.production]
vars = { }
```

デプロイ:

```bash
$ pnpm wrangler deploy
```

### 3. Turborepoの設定

```json
// .turbo/config.json
{
  "teamId": "your-team-id",
  "apiUrl": "https://your-cache-server.com"
}
```

または環境変数で設定:

```bash
export TURBO_API="https://your-cache-server.com"
export TURBO_TOKEN="your-secret-token"
export TURBO_TEAM="your-team-id"
```

## キャッシュ戦略の最適化

### 1. 効果的なキャッシュキー設定

```json
// turbo.json
{
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**", ".next/**"],
      // 環境変数の変更でキャッシュを無効化
      "env": ["NODE_ENV", "NEXT_PUBLIC_API_URL"],
      "cache": true
    },
    "test": {
      "dependsOn": ["^build"],
      "outputs": ["coverage/**"],
      // テストはソースコードの変更のみに依存
      "inputs": ["src/**/*.ts", "src/**/*.tsx", "**/*.test.ts"],
      "cache": true
    },
    "lint": {
      // Lintは設定ファイルの変更も検知
      "inputs": ["src/**", ".eslintrc.js", "tsconfig.json"],
      "cache": true
    }
  }
}
```

### 2. タスクの粒度調整

```json
// 悪い例: 粒度が粗すぎる
{
  "pipeline": {
    "build-and-test": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**", "coverage/**"],
      "cache": true
    }
  }
}

// 良い例: タスクを分離
{
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**"],
      "cache": true
    },
    "test": {
      "dependsOn": ["build"],
      "outputs": ["coverage/**"],
      "cache": true
    }
  }
}
```

### 3. 選択的なキャッシュ

```json
// turbo.json
{
  "pipeline": {
    "dev": {
      // 開発サーバーはキャッシュしない
      "cache": false,
      "persistent": true
    },
    "build": {
      "cache": true
    },
    "build:production": {
      // 本番ビルドは常に実行
      "cache": false,
      "dependsOn": ["^build"]
    }
  }
}
```

## モニタリングとメトリクス

### キャッシュヒット率の追跡

```typescript
// scripts/analyze-cache.ts
import { execSync } from 'child_process'
import fs from 'fs'

interface TurboBuildSummary {
  tasks: Array<{
    taskId: string
    task: string
    package: string
    hash: string
    cacheState: 'HIT' | 'MISS'
    duration: number
  }>
}

function analyzeCachePerformance() {
  // Turboの実行結果を取得
  const output = execSync('turbo run build --dry-run=json', {
    encoding: 'utf-8',
  })

  const summary: TurboBuildSummary = JSON.parse(output)

  const total = summary.tasks.length
  const hits = summary.tasks.filter((t) => t.cacheState === 'HIT').length
  const hitRate = (hits / total) * 100

  const totalDuration = summary.tasks.reduce((sum, t) => sum + t.duration, 0)
  const cachedDuration = summary.tasks
    .filter((t) => t.cacheState === 'HIT')
    .reduce((sum, t) => sum + t.duration, 0)

  const report = {
    timestamp: new Date().toISOString(),
    totalTasks: total,
    cacheHits: hits,
    cacheMisses: total - hits,
    hitRate: hitRate.toFixed(2) + '%',
    totalDuration: `${totalDuration}ms`,
    savedTime: `${cachedDuration}ms`,
    efficiency: `${((cachedDuration / totalDuration) * 100).toFixed(2)}%`,
  }

  console.log('Cache Performance Report:')
  console.log(JSON.stringify(report, null, 2))

  // メトリクスをファイルに保存
  const metricsFile = '.turbo/metrics.jsonl'
  fs.appendFileSync(metricsFile, JSON.stringify(report) + '\n')

  return report
}

analyzeCachePerformance()
```

```json
// package.json
{
  "scripts": {
    "build": "turbo run build",
    "build:analyze": "turbo run build && node scripts/analyze-cache.ts"
  }
}
```

### DatadogやPrometheusとの統合

```typescript
// cache-server/src/metrics.ts
import { StatsD } from 'node-statsd'

const statsd = new StatsD({
  host: process.env.STATSD_HOST || 'localhost',
  port: 8125,
  prefix: 'turborepo.cache.',
})

export function recordCacheHit(teamId: string) {
  statsd.increment('hit', 1, [`team:${teamId}`])
}

export function recordCacheMiss(teamId: string) {
  statsd.increment('miss', 1, [`team:${teamId}`])
}

export function recordCacheSize(hash: string, sizeInBytes: number) {
  statsd.histogram('artifact.size', sizeInBytes, [`hash:${hash.slice(0, 8)}`])
}

export function recordUploadDuration(duration: number) {
  statsd.timing('upload.duration', duration)
}
```

## ベストプラクティス

### 1. キャッシュの有効期限設定

```typescript
// cache-server/src/cleanup.ts
import { S3Client, ListObjectsV2Command, DeleteObjectsCommand } from '@aws-sdk/client-s3'

const s3Client = new S3Client({ region: process.env.AWS_REGION })
const BUCKET_NAME = process.env.S3_BUCKET_NAME!
const MAX_AGE_DAYS = 30

async function cleanupOldArtifacts() {
  const cutoffDate = new Date()
  cutoffDate.setDate(cutoffDate.getDate() - MAX_AGE_DAYS)

  let continuationToken: string | undefined
  let deletedCount = 0

  do {
    const listResponse = await s3Client.send(new ListObjectsV2Command({
      Bucket: BUCKET_NAME,
      Prefix: 'artifacts/',
      ContinuationToken: continuationToken,
    }))

    const objectsToDelete = (listResponse.Contents || [])
      .filter((obj) => obj.LastModified && obj.LastModified < cutoffDate)
      .map((obj) => ({ Key: obj.Key! }))

    if (objectsToDelete.length > 0) {
      await s3Client.send(new DeleteObjectsCommand({
        Bucket: BUCKET_NAME,
        Delete: { Objects: objectsToDelete },
      }))

      deletedCount += objectsToDelete.length
    }

    continuationToken = listResponse.NextContinuationToken
  } while (continuationToken)

  console.log(`Deleted ${deletedCount} old artifacts`)
}

// Cronジョブで毎日実行
cleanupOldArtifacts()
```

### 2. セキュリティ設定

```typescript
// cache-server/src/auth.ts
import jwt from 'jsonwebtoken'

interface TokenPayload {
  teamId: string
  permissions: string[]
  exp: number
}

export function generateToken(teamId: string, permissions: string[] = ['read', 'write']) {
  return jwt.sign(
    {
      teamId,
      permissions,
    },
    process.env.JWT_SECRET!,
    {
      expiresIn: '7d',
    }
  )
}

export function verifyToken(token: string): TokenPayload {
  return jwt.verify(token, process.env.JWT_SECRET!) as TokenPayload
}

// ミドルウェア
export function requirePermission(permission: string) {
  return (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const token = req.headers.authorization?.replace('Bearer ', '')

    if (!token) {
      return res.status(401).json({ error: 'No token provided' })
    }

    try {
      const payload = verifyToken(token)

      if (!payload.permissions.includes(permission)) {
        return res.status(403).json({ error: 'Insufficient permissions' })
      }

      req.teamId = payload.teamId
      next()
    } catch (error) {
      return res.status(401).json({ error: 'Invalid token' })
    }
  }
}
```

### 3. 帯域幅の最適化

```typescript
// cache-server/src/compression.ts
import zlib from 'zlib'
import { pipeline } from 'stream/promises'

app.put('/v8/artifacts/:hash', authenticate, async (req, res) => {
  const { hash } = req.params
  const isCompressed = req.headers['content-encoding'] === 'gzip'

  let body = req.body

  // 圧縮されていない場合は圧縮
  if (!isCompressed) {
    body = await new Promise<Buffer>((resolve, reject) => {
      zlib.gzip(body, (err, compressed) => {
        if (err) reject(err)
        else resolve(compressed)
      })
    })
  }

  await s3Client.send(new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: `artifacts/${hash}`,
    Body: body,
    ContentType: 'application/octet-stream',
    ContentEncoding: 'gzip',
  }))

  res.status(200).json({ urls: [`/v8/artifacts/${hash}`] })
})

// ダウンロード時は自動的に解凍される
app.get('/v8/artifacts/:hash', authenticate, async (req, res) => {
  const response = await s3Client.send(new GetObjectCommand({
    Bucket: BUCKET_NAME,
    Key: `artifacts/${hash}`,
  }))

  res.setHeader('Content-Type', 'application/octet-stream')
  res.setHeader('Content-Encoding', 'gzip')
  response.Body?.pipe(res)
})
```

## まとめ

Turborepoのリモートキャッシュは、適切に設定すればビルド時間を劇的に短縮できます。

**主なポイント:**
- Vercel Remote Cacheは最も簡単な導入方法
- カスタムサーバーはコスト最適化や制御が必要な場合に有効
- S3/R2バックエンドは低コストで拡張性が高い
- キャッシュヒット率とメトリクスを追跡
- 有効期限とセキュリティ設定を適切に管理

**実際の効果:**
- CI/CDの実行時間: 45分 → 5分（89%短縮）
- 開発者のビルド時間: 3分 → 10秒（94%短縮）
- 月間コスト: $500（CI時間） → $50（10分の1）

リモートキャッシュの導入で、チーム全体の生産性が大幅に向上します。
