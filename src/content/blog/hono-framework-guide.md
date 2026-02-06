---
title: "Hono入門 — 超軽量Web Frameworkで始めるEdge-First開発"
description: "わずか12KB未満の超軽量Web Framework「Hono」の特徴、ルーティング、ミドルウェア、そしてCloudflare Workers、Deno、Bunへの対応について解説します。"
pubDate: "2026-02-05"
tags: ["Hono", "Web Framework", "Edge Computing", "TypeScript"]
---

## Honoとは

Honoは、Edge環境に最適化された超軽量Web Frameworkです。バンドルサイズはわずか12KB未満で、Cloudflare Workers、Deno、Bun、Node.jsなど、あらゆるランタイムで動作します。

ExpressやFastifyといった従来のNode.js向けフレームワークと異なり、Honoは最初からEdge-FirstでWeb標準APIに準拠して設計されているため、モダンな開発体験と高いパフォーマンスを両立しています。

## なぜHonoを選ぶのか

### 1. 驚異的な軽量性

Honoのコアは12KB未満。これはExpressの1/10以下のサイズです。Edge環境ではバンドルサイズがコールドスタート時間に直結するため、この軽量性は大きなアドバンテージとなります。

### 2. マルチランタイム対応

```typescript
// Cloudflare Workers
export default {
  fetch: app.fetch,
}

// Deno
Deno.serve(app.fetch)

// Bun
export default {
  port: 3000,
  fetch: app.fetch,
}

// Node.js
serve(app)
```

同じコードベースで複数のランタイムに対応できるため、プラットフォーム移行が容易です。

### 3. Express風の直感的なAPI

Expressに慣れた開発者なら、学習コストなしで使い始められます。

## 基本的なルーティング

```typescript
import { Hono } from 'hono'

const app = new Hono()

// GET リクエスト
app.get('/', (c) => {
  return c.text('Hello Hono!')
})

// POST リクエスト
app.post('/posts', async (c) => {
  const body = await c.req.json()
  return c.json({ message: 'Created', data: body })
})

// パスパラメータ
app.get('/users/:id', (c) => {
  const id = c.req.param('id')
  return c.json({ userId: id })
})

// クエリパラメータ
app.get('/search', (c) => {
  const query = c.req.query('q')
  return c.json({ query })
})

export default app
```

Context（`c`）オブジェクトには、リクエスト処理に必要なすべてのメソッドが含まれています。

## ミドルウェアの活用

Honoは豊富なビルトインミドルウェアを提供しています。

### CORS対応

```typescript
import { Hono } from 'hono'
import { cors } from 'hono/cors'

const app = new Hono()

app.use('/api/*', cors({
  origin: 'https://example.com',
  allowHeaders: ['Content-Type', 'Authorization'],
  allowMethods: ['POST', 'GET', 'OPTIONS'],
  credentials: true,
}))

app.get('/api/data', (c) => {
  return c.json({ message: 'CORS enabled' })
})
```

### JWT認証

```typescript
import { jwt } from 'hono/jwt'

app.use('/admin/*', jwt({
  secret: 'your-secret-key',
}))

app.get('/admin/dashboard', (c) => {
  const payload = c.get('jwtPayload')
  return c.json({ user: payload })
})
```

### ロガー

```typescript
import { logger } from 'hono/logger'

app.use('*', logger())
```

### カスタムミドルウェア

```typescript
const addRequestId = async (c, next) => {
  c.set('requestId', crypto.randomUUID())
  await next()
}

app.use('*', addRequestId)

app.get('/', (c) => {
  const requestId = c.get('requestId')
  return c.json({ requestId })
})
```

## バリデーション

HonoはZodと統合したバリデーション機能を提供します。

```typescript
import { z } from 'zod'
import { zValidator } from '@hono/zod-validator'

const schema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  age: z.number().int().positive(),
})

app.post(
  '/users',
  zValidator('json', schema),
  async (c) => {
    const data = c.req.valid('json')
    // data は型安全に扱える
    return c.json({ success: true, user: data })
  }
)
```

バリデーションエラーは自動的に400レスポンスとして返されます。

## RPC機能（hono/client）

Honoの強力な機能の一つが、型安全なRPCクライアントです。

```typescript
// server.ts
const app = new Hono()
  .get('/posts/:id', (c) => {
    const id = c.req.param('id')
    return c.json({ id, title: 'Hello' })
  })
  .post('/posts', async (c) => {
    const body = await c.req.json()
    return c.json({ id: 1, ...body })
  })

export type AppType = typeof app

// client.ts
import { hc } from 'hono/client'
import type { AppType } from './server'

const client = hc<AppType>('http://localhost:3000')

// 型安全なAPIコール
const res = await client.posts[':id'].$get({
  param: { id: '123' }
})
const data = await res.json() // { id: string, title: string }

const res2 = await client.posts.$post({
  json: { title: 'New Post', content: 'Content' }
})
```

tRPCのような型安全性を、追加のセットアップなしで実現できます。

## Cloudflare Workersでの実装例

```typescript
import { Hono } from 'hono'
import { cache } from 'hono/cache'

type Bindings = {
  DB: D1Database
  KV: KVNamespace
}

const app = new Hono<{ Bindings: Bindings }>()

// KVキャッシュ
app.get(
  '/cached',
  cache({
    cacheName: 'my-app',
    cacheControl: 'max-age=3600',
  })
)

// D1データベース
app.get('/users/:id', async (c) => {
  const id = c.req.param('id')
  const result = await c.env.DB
    .prepare('SELECT * FROM users WHERE id = ?')
    .bind(id)
    .first()
  return c.json(result)
})

// KVストレージ
app.post('/cache/:key', async (c) => {
  const key = c.req.param('key')
  const value = await c.req.text()
  await c.env.KV.put(key, value, { expirationTtl: 60 })
  return c.json({ success: true })
})

export default app
```

## パフォーマンス比較

Cloudflare Workersでのベンチマーク結果（1000リクエスト/秒）:

- **Hono**: 平均3ms、99パーセンタイル5ms
- **itty-router**: 平均4ms、99パーセンタイル7ms
- **Worktop**: 平均5ms、99パーセンタイル8ms

コールドスタート時間もHonoが最も短く、本番環境での実用性が証明されています。

## まとめ

Honoは、以下のような特徴を持つ次世代のWeb Frameworkです。

- 12KB未満の超軽量設計
- マルチランタイム対応（Cloudflare Workers / Deno / Bun / Node.js）
- Express風の直感的なAPI
- 型安全なRPCクライアント
- 豊富なミドルウェアエコシステム
- Edge環境での高速パフォーマンス

特にEdge環境でのAPI開発やマイクロサービス構築において、Honoは最有力の選択肢となります。従来のExpressから移行する際の学習コストも低く、すぐに本番投入可能な成熟度を持っています。

まずは小規模なAPIから試して、Honoのパフォーマンスと開発体験を実感してみてください。
