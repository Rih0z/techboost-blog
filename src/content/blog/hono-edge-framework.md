---
title: "Honoで始めるエッジフレームワーク開発 - 超軽量で高速なWebアプリケーション"
description: "Cloudflare WorkersやDeno、Bun対応の超軽量Webフレームワーク「Hono」の実践ガイド。エッジコンピューティングで高速なAPIとWebアプリを構築する方法を解説します。"
pubDate: "2025-02-06"
---

# Honoで始めるエッジフレームワーク開発

HonoはCloudflare Workers、Deno、Bun、Node.jsなど、あらゆるJavaScriptランタイムで動作する超軽量Webフレームワークです。エッジコンピューティングに最適化されており、驚異的な速度とシンプルなAPIが特徴です。

## Honoとは

Honoは「炎」を意味する日本語から名付けられた、次世代のWebフレームワークです。主な特徴は以下の通りです。

- **超軽量**: バンドルサイズが約12KB
- **高速**: ミドルウェア処理が最適化され、Express.jsの約10倍高速
- **マルチランタイム対応**: Cloudflare Workers、Deno、Bun、Node.js、AWS Lambdaなど
- **TypeScript完全対応**: 型安全なAPI設計
- **豊富なミドルウェア**: JWT、CORS、圧縮、キャッシュなど

## セットアップ

### Cloudflare Workersでの基本セットアップ

```bash
npm create hono@latest my-hono-app
cd my-hono-app
npm install
npm run dev
```

プロジェクト作成時に以下のオプションを選択できます。

```
? Which template do you want to use?
  cloudflare-workers
  cloudflare-pages
  deno
  bun
  nodejs
  aws-lambda
```

### 最小限のアプリケーション

```typescript
import { Hono } from 'hono'

const app = new Hono()

app.get('/', (c) => {
  return c.text('Hello Hono!')
})

export default app
```

## ルーティング

### 基本的なルーティング

```typescript
import { Hono } from 'hono'

const app = new Hono()

// GET
app.get('/posts', (c) => c.json({ posts: [] }))

// POST
app.post('/posts', async (c) => {
  const body = await c.req.json()
  return c.json({ id: 1, ...body }, 201)
})

// PUT
app.put('/posts/:id', async (c) => {
  const id = c.req.param('id')
  const body = await c.req.json()
  return c.json({ id, ...body })
})

// DELETE
app.delete('/posts/:id', (c) => {
  const id = c.req.param('id')
  return c.json({ deleted: id })
})

export default app
```

### パスパラメータとクエリ

```typescript
// パスパラメータ
app.get('/users/:id', (c) => {
  const id = c.req.param('id')
  return c.json({ userId: id })
})

// 複数のパラメータ
app.get('/posts/:postId/comments/:commentId', (c) => {
  const { postId, commentId } = c.req.param()
  return c.json({ postId, commentId })
})

// クエリパラメータ
app.get('/search', (c) => {
  const query = c.req.query('q')
  const page = c.req.query('page') ?? '1'
  return c.json({ query, page })
})

// ワイルドカード
app.get('/files/*', (c) => {
  const path = c.req.param('*')
  return c.text(`File path: ${path}`)
})
```

### ルートグループ化

```typescript
const app = new Hono()

// APIルートのグループ化
const api = new Hono()

api.get('/users', (c) => c.json([]))
api.get('/posts', (c) => c.json([]))

app.route('/api/v1', api)

// さらにネスト
const admin = new Hono()
admin.get('/dashboard', (c) => c.text('Admin Dashboard'))
api.route('/admin', admin)

// 結果: /api/v1/admin/dashboard
```

## ミドルウェア

### ビルトインミドルウェア

```typescript
import { Hono } from 'hono'
import { logger } from 'hono/logger'
import { cors } from 'hono/cors'
import { compress } from 'hono/compress'
import { etag } from 'hono/etag'
import { cache } from 'hono/cache'

const app = new Hono()

// ロギング
app.use('*', logger())

// CORS設定
app.use('*', cors({
  origin: ['https://example.com', 'https://app.example.com'],
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true,
}))

// レスポンス圧縮
app.use('*', compress())

// ETag生成
app.use('*', etag())

// キャッシュ制御
app.get('/api/static-data',
  cache({
    cacheName: 'my-cache',
    cacheControl: 'max-age=3600',
  }),
  (c) => {
    return c.json({ data: 'cached response' })
  }
)
```

### カスタムミドルウェア

```typescript
// リクエスト時間計測
const timing = async (c, next) => {
  const start = Date.now()
  await next()
  const end = Date.now()
  c.res.headers.set('X-Response-Time', `${end - start}ms`)
}

app.use('*', timing)

// 認証ミドルウェア
const authMiddleware = async (c, next) => {
  const token = c.req.header('Authorization')

  if (!token) {
    return c.json({ error: 'Unauthorized' }, 401)
  }

  try {
    const user = await verifyToken(token)
    c.set('user', user)
    await next()
  } catch (error) {
    return c.json({ error: 'Invalid token' }, 401)
  }
}

app.use('/api/protected/*', authMiddleware)

app.get('/api/protected/profile', (c) => {
  const user = c.get('user')
  return c.json({ user })
})
```

### JWT認証

```typescript
import { Hono } from 'hono'
import { jwt } from 'hono/jwt'

const app = new Hono()

// JWT検証ミドルウェア
app.use('/api/protected/*', jwt({
  secret: 'your-secret-key',
}))

// ログインエンドポイント
app.post('/api/login', async (c) => {
  const { username, password } = await c.req.json()

  // 認証ロジック（省略）

  const payload = {
    sub: username,
    exp: Math.floor(Date.now() / 1000) + 60 * 60, // 1時間
  }

  const token = await sign(payload, 'your-secret-key')
  return c.json({ token })
})

// 保護されたエンドポイント
app.get('/api/protected/data', (c) => {
  const payload = c.get('jwtPayload')
  return c.json({
    message: 'Protected data',
    user: payload.sub
  })
})
```

## バリデーション

### Zodを使ったバリデーション

```typescript
import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'

const app = new Hono()

const postSchema = z.object({
  title: z.string().min(1).max(100),
  content: z.string().min(10),
  tags: z.array(z.string()).optional(),
  published: z.boolean().default(false),
})

app.post('/posts',
  zValidator('json', postSchema),
  async (c) => {
    const data = c.req.valid('json')

    // dataは型安全
    // { title: string, content: string, tags?: string[], published: boolean }

    return c.json({
      success: true,
      post: data
    }, 201)
  }
)

// クエリパラメータのバリデーション
const searchSchema = z.object({
  q: z.string().min(1),
  page: z.string().regex(/^\d+$/).transform(Number).optional(),
  limit: z.string().regex(/^\d+$/).transform(Number).optional(),
})

app.get('/search',
  zValidator('query', searchSchema),
  (c) => {
    const { q, page = 1, limit = 10 } = c.req.valid('query')
    return c.json({ q, page, limit })
  }
)
```

## データベース接続

### Cloudflare D1（SQLite）の利用

```typescript
import { Hono } from 'hono'

type Bindings = {
  DB: D1Database
}

const app = new Hono<{ Bindings: Bindings }>()

app.get('/users', async (c) => {
  const { results } = await c.env.DB.prepare(
    'SELECT * FROM users ORDER BY created_at DESC LIMIT ?'
  ).bind(10).all()

  return c.json({ users: results })
})

app.post('/users', async (c) => {
  const { name, email } = await c.req.json()

  const result = await c.env.DB.prepare(
    'INSERT INTO users (name, email) VALUES (?, ?)'
  ).bind(name, email).run()

  return c.json({
    id: result.meta.last_row_id,
    name,
    email
  }, 201)
})

app.get('/users/:id', async (c) => {
  const id = c.req.param('id')

  const user = await c.env.DB.prepare(
    'SELECT * FROM users WHERE id = ?'
  ).bind(id).first()

  if (!user) {
    return c.json({ error: 'User not found' }, 404)
  }

  return c.json({ user })
})
```

### Cloudflare KV（Key-Value Store）

```typescript
type Bindings = {
  KV: KVNamespace
}

const app = new Hono<{ Bindings: Bindings }>()

// キャッシュとしてKVを使用
app.get('/api/expensive-data', async (c) => {
  const cacheKey = 'expensive-data-v1'

  // キャッシュから取得
  const cached = await c.env.KV.get(cacheKey, 'json')
  if (cached) {
    return c.json(cached)
  }

  // データ生成（重い処理）
  const data = await generateExpensiveData()

  // KVに保存（TTL: 1時間）
  await c.env.KV.put(cacheKey, JSON.stringify(data), {
    expirationTtl: 3600,
  })

  return c.json(data)
})

// セッション管理
app.post('/api/session', async (c) => {
  const sessionId = crypto.randomUUID()
  const sessionData = { userId: 123, createdAt: Date.now() }

  await c.env.KV.put(`session:${sessionId}`, JSON.stringify(sessionData), {
    expirationTtl: 86400, // 24時間
  })

  return c.json({ sessionId })
})
```

## RPCモード（型安全なクライアント通信）

Honoの強力な機能の一つが、型安全なRPCクライアントです。

### サーバー側

```typescript
// server.ts
import { Hono } from 'hono'

const app = new Hono()

const routes = app
  .get('/api/posts', (c) => {
    return c.json([
      { id: 1, title: 'Post 1' },
      { id: 2, title: 'Post 2' },
    ])
  })
  .post('/api/posts', async (c) => {
    const { title, content } = await c.req.json()
    return c.json({ id: 3, title, content }, 201)
  })

export type AppType = typeof routes
export default app
```

### クライアント側

```typescript
// client.ts
import { hc } from 'hono/client'
import type { AppType } from './server'

const client = hc<AppType>('http://localhost:8787')

// 完全に型安全
const res = await client.api.posts.$get()
const posts = await res.json()
// posts: { id: number, title: string }[]

// POSTリクエストも型安全
const createRes = await client.api.posts.$post({
  json: {
    title: 'New Post',
    content: 'Content here',
  }
})
const newPost = await createRes.json()
```

## エラーハンドリング

```typescript
import { Hono } from 'hono'
import { HTTPException } from 'hono/http-exception'

const app = new Hono()

// カスタムエラーレスポンス
app.onError((err, c) => {
  if (err instanceof HTTPException) {
    return c.json({
      error: err.message,
      status: err.status,
    }, err.status)
  }

  console.error(err)

  return c.json({
    error: 'Internal Server Error',
  }, 500)
})

// HTTPExceptionの使用
app.get('/users/:id', async (c) => {
  const id = c.req.param('id')
  const user = await findUser(id)

  if (!user) {
    throw new HTTPException(404, {
      message: `User ${id} not found`
    })
  }

  return c.json({ user })
})

// 404ハンドラ
app.notFound((c) => {
  return c.json({
    error: 'Not Found',
    path: c.req.path,
  }, 404)
})
```

## テスト

```typescript
import { describe, it, expect } from 'vitest'
import app from './app'

describe('Hono App', () => {
  it('should return hello message', async () => {
    const res = await app.request('/')
    expect(res.status).toBe(200)

    const text = await res.text()
    expect(text).toBe('Hello Hono!')
  })

  it('should create a post', async () => {
    const res = await app.request('/posts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title: 'Test Post',
        content: 'Test Content',
      }),
    })

    expect(res.status).toBe(201)

    const data = await res.json()
    expect(data).toHaveProperty('id')
    expect(data.title).toBe('Test Post')
  })

  it('should handle errors', async () => {
    const res = await app.request('/not-found')
    expect(res.status).toBe(404)
  })
})
```

## デプロイ

### Cloudflare Workersへのデプロイ

```bash
# wrangler.tomlの設定
# name = "my-hono-app"
# main = "src/index.ts"
# compatibility_date = "2024-01-01"

npm run deploy
```

### Vercel Edge Functionsへのデプロイ

```typescript
// api/index.ts
import { Hono } from 'hono'
import { handle } from 'hono/vercel'

const app = new Hono().basePath('/api')

app.get('/hello', (c) => c.text('Hello from Vercel!'))

export const GET = handle(app)
export const POST = handle(app)
```

## まとめ

Honoは次世代のエッジコンピューティングに最適化された、超軽量で高速なWebフレームワークです。主な利点は以下の通りです。

- マルチランタイム対応で柔軟なデプロイ先
- 型安全なRPCモードで開発体験が向上
- 豊富なミドルウェアエコシステム
- Express.jsライクなシンプルなAPI

エッジコンピューティングの普及により、Honoのようなフレームワークは今後ますます重要になっていきます。ぜひ次のプロジェクトで試してみてください。
