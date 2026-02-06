---
title: "Hono Webフレームワーク実践ガイド - 超高速エッジランタイム対応の新世代フレームワーク"
description: "Cloudflare Workers、Deno、Bun対応の超軽量Webフレームワーク「Hono」の実践的な使い方を解説。ルーティング、ミドルウェア、バリデーション、認証まで網羅した完全ガイド。"
pubDate: "2025-02-05"
tags: ["hono", "cloudflare-workers", "edge-computing", "typescript", "web-framework"]
---

Honoは、Cloudflare Workers、Deno、Bunなどのエッジランタイムで動作する超軽量なWebフレームワークです。従来のNode.jsフレームワークとは異なり、エッジコンピューティングに最適化された設計で、高速なレスポンスと低いコールドスタート時間を実現します。

本記事では、Honoの基本から実践的な使い方まで、実際のコード例を交えて詳しく解説します。

## Honoの特徴

### 1. マルチランタイム対応

Honoは以下のランタイムで動作します:

- **Cloudflare Workers** - グローバルエッジネットワーク
- **Deno** - セキュアなTypeScriptランタイム
- **Bun** - 高速なJavaScriptランタイム
- **Node.js** - 従来のサーバー環境
- **AWS Lambda** - サーバーレス環境
- **Vercel** - フロントエンドプラットフォーム

### 2. 超軽量・高速

- バンドルサイズわずか **13KB**
- Express比で **10倍以上の速度**
- TypeScript完全対応

### 3. 豊富なミドルウェア

認証、CORS、ロギング、キャッシュなど、実用的なミドルウェアが標準で用意されています。

## セットアップ

### Cloudflare Workersでの環境構築

```bash
# プロジェクト作成
npm create hono@latest my-app

# テンプレート選択
? Which template do you want to use? cloudflare-workers

# ディレクトリ移動
cd my-app

# 依存関係インストール
npm install

# 開発サーバー起動
npm run dev
```

### Bunでの環境構築

```bash
# Bunでプロジェクト作成
bun create hono my-app

# ディレクトリ移動
cd my-app

# 開発サーバー起動
bun run dev
```

## 基本的なルーティング

### シンプルなAPI

```typescript
import { Hono } from 'hono'

const app = new Hono()

// GET リクエスト
app.get('/', (c) => {
  return c.text('Hello Hono!')
})

// JSON レスポンス
app.get('/api/users', (c) => {
  return c.json({
    users: [
      { id: 1, name: 'Alice' },
      { id: 2, name: 'Bob' }
    ]
  })
})

// パスパラメータ
app.get('/api/users/:id', (c) => {
  const id = c.req.param('id')
  return c.json({ id, name: 'Alice' })
})

// クエリパラメータ
app.get('/search', (c) => {
  const query = c.req.query('q')
  return c.json({ query, results: [] })
})

export default app
```

### RESTful API

```typescript
import { Hono } from 'hono'

const app = new Hono()

// リソースルーティング
app.get('/api/posts', (c) => c.json({ posts: [] }))
app.post('/api/posts', (c) => c.json({ message: 'Created' }, 201))
app.get('/api/posts/:id', (c) => c.json({ id: c.req.param('id') }))
app.put('/api/posts/:id', (c) => c.json({ message: 'Updated' }))
app.delete('/api/posts/:id', (c) => c.json({ message: 'Deleted' }))

export default app
```

## ミドルウェアの活用

### ビルトインミドルウェア

```typescript
import { Hono } from 'hono'
import { logger } from 'hono/logger'
import { cors } from 'hono/cors'
import { bearerAuth } from 'hono/bearer-auth'
import { cache } from 'hono/cache'

const app = new Hono()

// ロガー
app.use('*', logger())

// CORS設定
app.use('*', cors({
  origin: ['https://example.com'],
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}))

// 認証
app.use('/api/*', bearerAuth({
  token: process.env.API_TOKEN || 'secret-token'
}))

// キャッシュ
app.get('/api/public/*', cache({
  cacheName: 'my-cache',
  cacheControl: 'max-age=3600'
}))

export default app
```

### カスタムミドルウェア

```typescript
import { Hono } from 'hono'
import type { MiddlewareHandler } from 'hono'

const app = new Hono()

// リクエストタイム測定
const timing: MiddlewareHandler = async (c, next) => {
  const start = Date.now()
  await next()
  const end = Date.now()
  c.res.headers.set('X-Response-Time', `${end - start}ms`)
}

// エラーハンドリング
const errorHandler: MiddlewareHandler = async (c, next) => {
  try {
    await next()
  } catch (err) {
    console.error(err)
    return c.json({ error: 'Internal Server Error' }, 500)
  }
}

app.use('*', timing)
app.use('*', errorHandler)

export default app
```

## バリデーション

### Zodとの統合

```typescript
import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'

const app = new Hono()

// スキーマ定義
const userSchema = z.object({
  name: z.string().min(1).max(50),
  email: z.string().email(),
  age: z.number().min(0).max(150).optional()
})

// バリデーション適用
app.post('/api/users',
  zValidator('json', userSchema),
  async (c) => {
    const user = c.req.valid('json')
    // userは型安全
    return c.json({
      message: 'User created',
      user
    }, 201)
  }
)

// クエリパラメータのバリデーション
const searchSchema = z.object({
  q: z.string().min(1),
  page: z.string().regex(/^\d+$/).transform(Number).optional(),
  limit: z.string().regex(/^\d+$/).transform(Number).optional()
})

app.get('/api/search',
  zValidator('query', searchSchema),
  async (c) => {
    const { q, page = 1, limit = 10 } = c.req.valid('query')
    return c.json({ q, page, limit, results: [] })
  }
)

export default app
```

## JWT認証

```typescript
import { Hono } from 'hono'
import { jwt, sign } from 'hono/jwt'

const app = new Hono()

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key'

// ログインエンドポイント
app.post('/api/login', async (c) => {
  const { email, password } = await c.req.json()

  // 認証ロジック（実際はDBと照合）
  if (email === 'user@example.com' && password === 'password') {
    const payload = {
      sub: '1234567890',
      email,
      exp: Math.floor(Date.now() / 1000) + 60 * 60 // 1時間
    }

    const token = await sign(payload, JWT_SECRET)
    return c.json({ token })
  }

  return c.json({ error: 'Invalid credentials' }, 401)
})

// 保護されたルート
app.use('/api/protected/*', jwt({
  secret: JWT_SECRET
}))

app.get('/api/protected/profile', (c) => {
  const payload = c.get('jwtPayload')
  return c.json({
    message: 'Protected data',
    user: payload
  })
})

export default app
```

## データベース統合

### Cloudflare D1（SQLite）

```typescript
import { Hono } from 'hono'

type Bindings = {
  DB: D1Database
}

const app = new Hono<{ Bindings: Bindings }>()

// データ取得
app.get('/api/users', async (c) => {
  const { results } = await c.env.DB.prepare(
    'SELECT * FROM users'
  ).all()

  return c.json({ users: results })
})

// データ挿入
app.post('/api/users', async (c) => {
  const { name, email } = await c.req.json()

  const result = await c.env.DB.prepare(
    'INSERT INTO users (name, email) VALUES (?, ?)'
  ).bind(name, email).run()

  return c.json({
    id: result.meta.last_row_id,
    message: 'User created'
  }, 201)
})

export default app
```

### Cloudflare KV（キーバリューストア）

```typescript
import { Hono } from 'hono'

type Bindings = {
  KV: KVNamespace
}

const app = new Hono<{ Bindings: Bindings }>()

// データ取得
app.get('/api/cache/:key', async (c) => {
  const key = c.req.param('key')
  const value = await c.env.KV.get(key)

  if (!value) {
    return c.json({ error: 'Not found' }, 404)
  }

  return c.json({ key, value })
})

// データ保存
app.put('/api/cache/:key', async (c) => {
  const key = c.req.param('key')
  const { value, ttl } = await c.req.json()

  await c.env.KV.put(key, value, { expirationTtl: ttl || 3600 })

  return c.json({ message: 'Cached' })
})

export default app
```

## ファイルアップロード

```typescript
import { Hono } from 'hono'

const app = new Hono()

app.post('/api/upload', async (c) => {
  const formData = await c.req.formData()
  const file = formData.get('file') as File

  if (!file) {
    return c.json({ error: 'No file provided' }, 400)
  }

  // ファイル情報
  const info = {
    name: file.name,
    type: file.type,
    size: file.size
  }

  // バッファ取得
  const buffer = await file.arrayBuffer()

  // Cloudflare R2にアップロード（例）
  // await c.env.R2.put(file.name, buffer)

  return c.json({
    message: 'File uploaded',
    file: info
  })
})

export default app
```

## テスト

```typescript
import { describe, it, expect } from 'vitest'
import app from './index'

describe('API Tests', () => {
  it('GET /', async () => {
    const res = await app.request('/')
    expect(res.status).toBe(200)
    expect(await res.text()).toBe('Hello Hono!')
  })

  it('GET /api/users', async () => {
    const res = await app.request('/api/users')
    expect(res.status).toBe(200)

    const json = await res.json()
    expect(json).toHaveProperty('users')
    expect(Array.isArray(json.users)).toBe(true)
  })

  it('POST /api/users - validation error', async () => {
    const res = await app.request('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: '' })
    })

    expect(res.status).toBe(400)
  })
})
```

## デプロイ

### Cloudflare Workersへのデプロイ

```bash
# ログイン
npx wrangler login

# デプロイ
npm run deploy
```

### wrangler.toml設定

```toml
name = "my-hono-app"
main = "src/index.ts"
compatibility_date = "2024-01-01"

# KV Namespace
[[kv_namespaces]]
binding = "KV"
id = "your-kv-id"

# D1 Database
[[d1_databases]]
binding = "DB"
database_name = "your-db-name"
database_id = "your-db-id"

# R2 Bucket
[[r2_buckets]]
binding = "R2"
bucket_name = "your-bucket-name"
```

## パフォーマンス最適化

### ストリーミングレスポンス

```typescript
app.get('/api/stream', (c) => {
  return c.streamText(async (stream) => {
    for (let i = 0; i < 10; i++) {
      await stream.write(`Chunk ${i}\n`)
      await stream.sleep(100)
    }
  })
})
```

### キャッシュ戦略

```typescript
import { cache } from 'hono/cache'

// エッジキャッシュ
app.get('/api/public/data',
  cache({
    cacheName: 'public-api',
    cacheControl: 'public, max-age=3600, s-maxage=86400'
  }),
  async (c) => {
    // 重い処理
    const data = await fetchExpensiveData()
    return c.json(data)
  }
)
```

## まとめ

Honoは、エッジコンピューティング時代の新しい選択肢として非常に有望なフレームワークです。主な利点:

- **超軽量で高速** - コールドスタートが速い
- **マルチランタイム対応** - プラットフォーム非依存
- **TypeScript完全対応** - 型安全な開発
- **豊富なミドルウェア** - 実用的な機能がすぐ使える
- **シンプルなAPI** - 学習コストが低い

Express、Fastify、Koaなどの従来フレームワークからの移行も容易で、エッジ環境でのAPI開発に最適です。

次世代のWebアプリケーション開発に、Honoをぜひ試してみてください。

## 参考リンク

- [Hono公式サイト](https://hono.dev/)
- [GitHubリポジトリ](https://github.com/honojs/hono)
- [Cloudflare Workers ドキュメント](https://developers.cloudflare.com/workers/)
- [Bun公式サイト](https://bun.sh/)
