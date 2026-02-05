---
title: "Hono完全ガイド — 超高速TypeScript Webフレームワーク"
description: "Honoの基礎から実践まで。Express/Fastifyとの比較、ルーティング、ミドルウェア、マルチランタイム対応、RPC機能、OpenAPI連携を徹底解説。"
pubDate: "2026-02-05"
tags: ["Hono", "TypeScript", "Webフレームワーク", "Cloudflare Workers", "API"]
---

## Honoとは

Hono（ほの、炎の意）は、Cloudflare Workers向けに開発された超軽量・超高速なTypeScript Webフレームワークです。

### 特徴

- **超高速**: ルーティングがRegExp 1つで完結、オーバーヘッドがほぼゼロ
- **超軽量**: 14KB未満（gzip圧縮後）
- **マルチランタイム**: Cloudflare Workers / Deno / Bun / Node.js対応
- **型安全**: TypeScriptファーストで完全な型推論
- **Express風API**: 学習コストが低い

2026年現在、エッジランタイムでのAPI開発において最も人気のあるフレームワークの一つです。

## インストール

### Cloudflare Workersで始める

```bash
npm create hono@latest my-app
cd my-app
npm install
npm run dev
```

テンプレートを選択できます。

- cloudflare-workers
- deno
- bun
- nodejs

### 既存プロジェクトに追加

```bash
npm install hono
```

## Express/Fastifyとの比較

### Express

**特徴**
- Node.js標準的フレームワーク
- 巨大なエコシステム
- シンプルなAPI

**問題点**
- TypeScript対応が弱い
- パフォーマンスが低い
- モダンなランタイム（Bun/Deno）非対応

### Fastify

**特徴**
- 高速（Expressの約2倍）
- スキーマベース
- プラグインシステム

**問題点**
- Node.js専用
- エッジランタイム非対応

### Hono

**特徴**
- 超高速（Fastifyの数倍）
- マルチランタイム
- TypeScript完全対応
- エッジランタイム対応

**ベンチマーク（2026年2月）**

```
Hono:     270,000 req/sec
Fastify:   80,000 req/sec
Express:   45,000 req/sec
```

※ Cloudflare Workersでの測定値

## 基本的な使い方

### Hello World

```typescript
import { Hono } from 'hono'

const app = new Hono()

app.get('/', (c) => {
  return c.text('Hello Hono!')
})

export default app
```

`c`はコンテキストオブジェクトで、リクエスト・レスポンスにアクセスできます。

### レスポンスの種類

```typescript
// テキスト
app.get('/text', (c) => c.text('Hello'))

// JSON
app.get('/json', (c) => c.json({ message: 'Hello' }))

// HTML
app.get('/html', (c) => c.html('<h1>Hello</h1>'))

// リダイレクト
app.get('/redirect', (c) => c.redirect('/'))

// カスタムレスポンス
app.get('/custom', (c) => {
  return new Response('Custom', {
    status: 200,
    headers: { 'X-Custom': 'Header' }
  })
})
```

## ルーティング

### パスパラメータ

```typescript
app.get('/users/:id', (c) => {
  const id = c.req.param('id')
  return c.json({ id })
})
```

### クエリパラメータ

```typescript
app.get('/search', (c) => {
  const q = c.req.query('q')
  const page = c.req.query('page') ?? '1'
  return c.json({ q, page })
})
```

### リクエストボディ

```typescript
app.post('/users', async (c) => {
  const body = await c.req.json()
  return c.json(body)
})

// フォームデータ
app.post('/upload', async (c) => {
  const formData = await c.req.formData()
  const file = formData.get('file')
  return c.text('Uploaded')
})
```

### HTTPメソッド

```typescript
app.get('/users', (c) => c.json(users))
app.post('/users', (c) => c.json({ created: true }))
app.put('/users/:id', (c) => c.json({ updated: true }))
app.delete('/users/:id', (c) => c.json({ deleted: true }))
app.patch('/users/:id', (c) => c.json({ patched: true }))
```

### ルートグループ

```typescript
const app = new Hono()

const api = new Hono()

api.get('/users', (c) => c.json(users))
api.get('/posts', (c) => c.json(posts))

app.route('/api', api)

// /api/users, /api/posts
```

## ミドルウェア

### ビルトインミドルウェア

**CORS**

```typescript
import { cors } from 'hono/cors'

app.use('/*', cors())

// カスタム設定
app.use('/api/*', cors({
  origin: 'https://example.com',
  allowMethods: ['GET', 'POST'],
  credentials: true,
}))
```

**JWT認証**

```typescript
import { jwt } from 'hono/jwt'

app.use('/admin/*', jwt({
  secret: 'my-secret-key',
}))

app.get('/admin/dashboard', (c) => {
  const payload = c.get('jwtPayload')
  return c.json(payload)
})
```

**ベーシック認証**

```typescript
import { basicAuth } from 'hono/basic-auth'

app.use('/admin/*', basicAuth({
  username: 'admin',
  password: 'secret',
}))
```

**ロガー**

```typescript
import { logger } from 'hono/logger'

app.use('*', logger())
```

**圧縮**

```typescript
import { compress } from 'hono/compress'

app.use('*', compress())
```

### カスタムミドルウェア

```typescript
app.use('*', async (c, next) => {
  console.log(`[${c.req.method}] ${c.req.url}`)
  await next()
  console.log(`Status: ${c.res.status}`)
})

// 認証ミドルウェア
app.use('/api/*', async (c, next) => {
  const token = c.req.header('Authorization')
  if (!token) {
    return c.json({ error: 'Unauthorized' }, 401)
  }
  await next()
})
```

## 型安全なAPI

Honoの強力な型推論により、完全に型安全なAPIを構築できます。

### Zodバリデーション

```typescript
import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'

const app = new Hono()

const userSchema = z.object({
  name: z.string().min(3),
  email: z.string().email(),
  age: z.number().min(0).max(120),
})

app.post('/users', zValidator('json', userSchema), (c) => {
  const user = c.req.valid('json')  // 型推論される
  // user.name, user.email, user.age が型安全
  return c.json({ success: true, user })
})
```

### パスパラメータの型

```typescript
const app = new Hono<{
  Variables: {
    user: { id: string; name: string }
  }
}>()

app.use('/users/:id', async (c, next) => {
  const id = c.req.param('id')
  const user = await getUser(id)
  c.set('user', user)
  await next()
})

app.get('/users/:id', (c) => {
  const user = c.get('user')  // 型が推論される
  return c.json(user)
})
```

## RPC機能（型安全API）

Honoの最も強力な機能の一つがRPC（Remote Procedure Call）です。クライアントとサーバーで型を共有できます。

### サーバー側

```typescript
// server.ts
import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'

const app = new Hono()

const route = app
  .get('/posts', (c) => {
    return c.json([
      { id: 1, title: 'Hello' },
      { id: 2, title: 'World' },
    ])
  })
  .post(
    '/posts',
    zValidator('json', z.object({ title: z.string() })),
    (c) => {
      const { title } = c.req.valid('json')
      return c.json({ id: 3, title }, 201)
    }
  )

export type AppType = typeof route

export default app
```

### クライアント側

```typescript
// client.ts
import { hc } from 'hono/client'
import type { AppType } from './server'

const client = hc<AppType>('http://localhost:8787')

// 完全に型安全
const res = await client.posts.$get()
const posts = await res.json()
// posts の型が推論される: { id: number; title: string }[]

// POSTも型安全
const res2 = await client.posts.$post({
  json: { title: 'New Post' }
})
```

型エラーがあればコンパイル時にキャッチできます。

## マルチランタイム対応

### Cloudflare Workers

```typescript
import { Hono } from 'hono'

const app = new Hono()

app.get('/', (c) => c.text('Hello from Cloudflare Workers!'))

export default app
```

`wrangler.toml`で設定してデプロイ。

```bash
npx wrangler publish
```

### Deno

```typescript
import { Hono } from 'https://deno.land/x/hono/mod.ts'

const app = new Hono()

app.get('/', (c) => c.text('Hello from Deno!'))

Deno.serve(app.fetch)
```

```bash
deno run --allow-net server.ts
```

### Bun

```typescript
import { Hono } from 'hono'

const app = new Hono()

app.get('/', (c) => c.text('Hello from Bun!'))

export default {
  port: 3000,
  fetch: app.fetch,
}
```

```bash
bun run server.ts
```

### Node.js

```typescript
import { Hono } from 'hono'
import { serve } from '@hono/node-server'

const app = new Hono()

app.get('/', (c) => c.text('Hello from Node.js!'))

serve(app)
```

```bash
node server.js
```

## OpenAPI/Swagger連携

Honoは`@hono/zod-openapi`を使ってOpenAPIドキュメントを自動生成できます。

```typescript
import { OpenAPIHono, createRoute } from '@hono/zod-openapi'
import { z } from 'zod'

const app = new OpenAPIHono()

const UserSchema = z.object({
  id: z.number(),
  name: z.string(),
  email: z.string().email(),
})

const route = createRoute({
  method: 'get',
  path: '/users/{id}',
  request: {
    params: z.object({
      id: z.string(),
    }),
  },
  responses: {
    200: {
      content: {
        'application/json': {
          schema: UserSchema,
        },
      },
      description: 'Get user by ID',
    },
  },
})

app.openapi(route, (c) => {
  const { id } = c.req.valid('param')
  return c.json({
    id: Number(id),
    name: 'John Doe',
    email: 'john@example.com',
  })
})

// OpenAPIドキュメントを取得
app.doc('/doc', {
  openapi: '3.0.0',
  info: {
    version: '1.0.0',
    title: 'My API',
  },
})

// Swagger UI
import { swaggerUI } from '@hono/swagger-ui'
app.get('/ui', swaggerUI({ url: '/doc' }))
```

`/ui`にアクセスすればSwagger UIが表示されます。

## 実践例: REST API

```typescript
import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { jwt } from 'hono/jwt'

const app = new Hono()

// ミドルウェア
app.use('*', logger())
app.use('*', cors())

// データベース（仮）
const posts = [
  { id: 1, title: 'First Post', author: 'Alice' },
  { id: 2, title: 'Second Post', author: 'Bob' },
]

// バリデーション
const PostSchema = z.object({
  title: z.string().min(1).max(100),
  author: z.string().min(1).max(50),
})

// 公開API
app.get('/api/posts', (c) => {
  return c.json(posts)
})

app.get('/api/posts/:id', (c) => {
  const id = Number(c.req.param('id'))
  const post = posts.find((p) => p.id === id)
  if (!post) {
    return c.json({ error: 'Not found' }, 404)
  }
  return c.json(post)
})

// 認証が必要なAPI
app.use('/api/posts', jwt({ secret: 'my-secret' }))

app.post('/api/posts', zValidator('json', PostSchema), (c) => {
  const data = c.req.valid('json')
  const newPost = { id: posts.length + 1, ...data }
  posts.push(newPost)
  return c.json(newPost, 201)
})

app.put('/api/posts/:id', zValidator('json', PostSchema), (c) => {
  const id = Number(c.req.param('id'))
  const data = c.req.valid('json')
  const index = posts.findIndex((p) => p.id === id)
  if (index === -1) {
    return c.json({ error: 'Not found' }, 404)
  }
  posts[index] = { id, ...data }
  return c.json(posts[index])
})

app.delete('/api/posts/:id', (c) => {
  const id = Number(c.req.param('id'))
  const index = posts.findIndex((p) => p.id === id)
  if (index === -1) {
    return c.json({ error: 'Not found' }, 404)
  }
  posts.splice(index, 1)
  return c.json({ success: true })
})

export default app
```

## Cloudflare WorkersでのDB接続

Cloudflare Workers上でHonoを使う場合、D1（SQLite）やKV、R2などを使えます。

```typescript
import { Hono } from 'hono'

type Bindings = {
  DB: D1Database
  KV: KVNamespace
}

const app = new Hono<{ Bindings: Bindings }>()

app.get('/users', async (c) => {
  const { results } = await c.env.DB.prepare('SELECT * FROM users').all()
  return c.json(results)
})

app.get('/cache/:key', async (c) => {
  const key = c.req.param('key')
  const value = await c.env.KV.get(key)
  return c.text(value ?? 'Not found')
})

export default app
```

## まとめ

Honoは2026年現在、最も注目されているTypeScript Webフレームワークの一つです。

### Honoを選ぶべき理由

- **超高速**: ベンチマークでトップクラス
- **マルチランタイム**: どこでも動く
- **型安全**: TypeScript完全対応
- **学習コストが低い**: Express風のシンプルなAPI
- **エッジランタイム対応**: Cloudflare Workersで最高のパフォーマンス

### ユースケース

- Cloudflare Workersでの高速API
- エッジでのSSR（Hono + JSX）
- 軽量なマイクロサービス
- BunやDenoでのAPI開発
- 型安全なフルスタックアプリ（RPC機能）

ExpressやFastifyから移行する価値は十分にあります。ぜひ試してみてください。
