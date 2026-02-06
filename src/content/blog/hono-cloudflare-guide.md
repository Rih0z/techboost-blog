---
title: "Hono + Cloudflare Workers実践ガイド — エッジで動く超高速API"
description: "HonoとCloudflare Workersで構築する実践的なWebアプリケーション。D1/KV/R2連携、認証、ミドルウェア、デプロイまで徹底解説。"
pubDate: "Feb 05 2026"
tags: ["Hono", "Cloudflare Workers", "D1", "KV", "Edge Computing", "TypeScript"]
---

## Hono + Cloudflare Workersとは

Honoは超軽量・超高速なTypeScript Webフレームワークで、Cloudflare Workersでのパフォーマンスは圧倒的です。

### なぜHono + Cloudflare Workersなのか

- **超高速**: エッジで処理、レイテンシ10ms以下
- **スケーラブル**: 自動スケーリング、設定不要
- **低コスト**: 無料枠で月間10万リクエスト
- **型安全**: TypeScriptファーストで完全な型推論
- **グローバル**: 世界200拠点以上で配信

2026年現在、エッジコンピューティングの最有力スタックの一つです。

## プロジェクトセットアップ

### 新規プロジェクト作成

```bash
npm create hono@latest my-edge-app
cd my-edge-app

# テンプレート選択で "cloudflare-workers" を選ぶ
```

### 手動セットアップ

```bash
mkdir my-edge-app
cd my-edge-app
npm init -y
npm install hono
npm install -D wrangler
```

`wrangler.toml`を作成:

```toml
name = "my-edge-app"
main = "src/index.ts"
compatibility_date = "2026-02-05"

[observability]
enabled = true
```

### TypeScript設定

`tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2021",
    "module": "ESNext",
    "lib": ["ES2021"],
    "moduleResolution": "bundler",
    "types": ["@cloudflare/workers-types"],
    "jsx": "react-jsx",
    "jsxImportSource": "hono/jsx",
    "strict": true,
    "skipLibCheck": true
  }
}
```

インストール:

```bash
npm install -D @cloudflare/workers-types
```

## 基本的なAPI作成

### Hello World

`src/index.ts`:

```typescript
import { Hono } from 'hono'

const app = new Hono()

app.get('/', (c) => {
  return c.json({
    message: 'Hello from Cloudflare Workers!',
    timestamp: new Date().toISOString(),
    location: c.req.header('cf-ray')
  })
})

export default app
```

### ローカル開発

```bash
npm run dev
# または
npx wrangler dev
```

http://localhost:8787 でアクセス可能。

### デプロイ

```bash
npx wrangler deploy
```

デプロイ後、`https://my-edge-app.workers.dev`でアクセスできます。

## Cloudflare D1（SQLite）連携

### D1データベース作成

```bash
npx wrangler d1 create my-database
```

`wrangler.toml`に追加:

```toml
[[d1_databases]]
binding = "DB"
database_name = "my-database"
database_id = "xxx-xxx-xxx"  # 出力されたID
```

### テーブル作成

`schema.sql`:

```sql
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE posts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  content TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX idx_posts_user_id ON posts(user_id);
```

実行:

```bash
npx wrangler d1 execute my-database --file=./schema.sql
```

### Hono + D1実装

型定義:

```typescript
import { Hono } from 'hono'

type Bindings = {
  DB: D1Database
}

const app = new Hono<{ Bindings: Bindings }>()
```

CRUD操作:

```typescript
// ユーザー一覧取得
app.get('/api/users', async (c) => {
  const { results } = await c.env.DB.prepare(
    'SELECT id, name, email, created_at FROM users ORDER BY created_at DESC'
  ).all()

  return c.json(results)
})

// ユーザー詳細取得
app.get('/api/users/:id', async (c) => {
  const id = c.req.param('id')

  const user = await c.env.DB.prepare(
    'SELECT * FROM users WHERE id = ?'
  ).bind(id).first()

  if (!user) {
    return c.json({ error: 'User not found' }, 404)
  }

  return c.json(user)
})

// ユーザー作成
app.post('/api/users', async (c) => {
  const { name, email } = await c.req.json()

  try {
    const result = await c.env.DB.prepare(
      'INSERT INTO users (name, email) VALUES (?, ?)'
    ).bind(name, email).run()

    return c.json({
      id: result.meta.last_row_id,
      name,
      email
    }, 201)
  } catch (error) {
    return c.json({ error: 'Email already exists' }, 400)
  }
})

// ユーザー更新
app.put('/api/users/:id', async (c) => {
  const id = c.req.param('id')
  const { name, email } = await c.req.json()

  const result = await c.env.DB.prepare(
    'UPDATE users SET name = ?, email = ? WHERE id = ?'
  ).bind(name, email, id).run()

  if (result.meta.changes === 0) {
    return c.json({ error: 'User not found' }, 404)
  }

  return c.json({ success: true })
})

// ユーザー削除
app.delete('/api/users/:id', async (c) => {
  const id = c.req.param('id')

  const result = await c.env.DB.prepare(
    'DELETE FROM users WHERE id = ?'
  ).bind(id).run()

  if (result.meta.changes === 0) {
    return c.json({ error: 'User not found' }, 404)
  }

  return c.json({ success: true })
})
```

### トランザクション

```typescript
app.post('/api/posts', async (c) => {
  const { user_id, title, content } = await c.req.json()

  // トランザクション
  const results = await c.env.DB.batch([
    c.env.DB.prepare('SELECT id FROM users WHERE id = ?').bind(user_id),
    c.env.DB.prepare(
      'INSERT INTO posts (user_id, title, content) VALUES (?, ?, ?)'
    ).bind(user_id, title, content)
  ])

  if (!results[0].results.length) {
    return c.json({ error: 'User not found' }, 404)
  }

  return c.json({
    id: results[1].meta.last_row_id,
    title,
    content
  }, 201)
})
```

### JOIN クエリ

```typescript
app.get('/api/posts', async (c) => {
  const { results } = await c.env.DB.prepare(`
    SELECT
      posts.id,
      posts.title,
      posts.content,
      posts.created_at,
      users.name as author_name,
      users.email as author_email
    FROM posts
    JOIN users ON posts.user_id = users.id
    ORDER BY posts.created_at DESC
  `).all()

  return c.json(results)
})
```

## Cloudflare KV（Key-Value Store）連携

### KV Namespace作成

```bash
npx wrangler kv:namespace create CACHE
npx wrangler kv:namespace create CACHE --preview
```

`wrangler.toml`に追加:

```toml
[[kv_namespaces]]
binding = "CACHE"
id = "xxx"
preview_id = "yyy"
```

### Hono + KV実装

型定義:

```typescript
type Bindings = {
  DB: D1Database
  CACHE: KVNamespace
}

const app = new Hono<{ Bindings: Bindings }>()
```

基本操作:

```typescript
// キャッシュ取得
app.get('/api/cache/:key', async (c) => {
  const key = c.req.param('key')
  const value = await c.env.CACHE.get(key)

  if (!value) {
    return c.json({ error: 'Not found' }, 404)
  }

  return c.json({ key, value })
})

// キャッシュ保存
app.post('/api/cache', async (c) => {
  const { key, value, ttl } = await c.req.json()

  await c.env.CACHE.put(key, value, {
    expirationTtl: ttl || 3600  // 1時間
  })

  return c.json({ success: true })
})

// キャッシュ削除
app.delete('/api/cache/:key', async (c) => {
  const key = c.req.param('key')
  await c.env.CACHE.delete(key)

  return c.json({ success: true })
})
```

### キャッシュパターン

Cache-Aside:

```typescript
app.get('/api/users/:id', async (c) => {
  const id = c.req.param('id')
  const cacheKey = `user:${id}`

  // キャッシュチェック
  const cached = await c.env.CACHE.get(cacheKey, 'json')
  if (cached) {
    return c.json({ ...cached, cached: true })
  }

  // DB から取得
  const user = await c.env.DB.prepare(
    'SELECT * FROM users WHERE id = ?'
  ).bind(id).first()

  if (!user) {
    return c.json({ error: 'Not found' }, 404)
  }

  // キャッシュに保存（1時間）
  await c.env.CACHE.put(cacheKey, JSON.stringify(user), {
    expirationTtl: 3600
  })

  return c.json({ ...user, cached: false })
})
```

Write-Through:

```typescript
app.put('/api/users/:id', async (c) => {
  const id = c.req.param('id')
  const { name, email } = await c.req.json()

  // DB更新
  const result = await c.env.DB.prepare(
    'UPDATE users SET name = ?, email = ? WHERE id = ?'
  ).bind(name, email, id).run()

  if (result.meta.changes === 0) {
    return c.json({ error: 'Not found' }, 404)
  }

  // キャッシュ削除（または更新）
  await c.env.CACHE.delete(`user:${id}`)

  return c.json({ success: true })
})
```

### セッション管理

```typescript
import { v4 as uuidv4 } from 'uuid'

app.post('/api/sessions', async (c) => {
  const { user_id } = await c.req.json()

  const sessionId = uuidv4()
  const sessionData = {
    user_id,
    created_at: new Date().toISOString()
  }

  // セッション保存（24時間）
  await c.env.CACHE.put(
    `session:${sessionId}`,
    JSON.stringify(sessionData),
    { expirationTtl: 86400 }
  )

  return c.json({ session_id: sessionId })
})

// セッション検証ミドルウェア
app.use('/api/protected/*', async (c, next) => {
  const sessionId = c.req.header('x-session-id')

  if (!sessionId) {
    return c.json({ error: 'Unauthorized' }, 401)
  }

  const session = await c.env.CACHE.get(`session:${sessionId}`, 'json')

  if (!session) {
    return c.json({ error: 'Session expired' }, 401)
  }

  c.set('session', session)
  await next()
})
```

## Cloudflare R2（Object Storage）連携

### R2 Bucket作成

```bash
npx wrangler r2 bucket create my-bucket
```

`wrangler.toml`:

```toml
[[r2_buckets]]
binding = "BUCKET"
bucket_name = "my-bucket"
```

### Hono + R2実装

型定義:

```typescript
type Bindings = {
  DB: D1Database
  CACHE: KVNamespace
  BUCKET: R2Bucket
}
```

ファイルアップロード:

```typescript
app.post('/api/upload', async (c) => {
  const formData = await c.req.formData()
  const file = formData.get('file') as File

  if (!file) {
    return c.json({ error: 'No file provided' }, 400)
  }

  const key = `uploads/${Date.now()}-${file.name}`

  await c.env.BUCKET.put(key, file.stream(), {
    httpMetadata: {
      contentType: file.type
    }
  })

  return c.json({
    key,
    url: `https://pub-xxx.r2.dev/${key}`
  })
})
```

ファイル取得:

```typescript
app.get('/api/files/:key', async (c) => {
  const key = c.req.param('key')

  const object = await c.env.BUCKET.get(key)

  if (!object) {
    return c.json({ error: 'Not found' }, 404)
  }

  return new Response(object.body, {
    headers: {
      'Content-Type': object.httpMetadata?.contentType || 'application/octet-stream',
      'Cache-Control': 'public, max-age=3600'
    }
  })
})
```

ファイル一覧:

```typescript
app.get('/api/files', async (c) => {
  const prefix = c.req.query('prefix') || ''
  const limit = Number(c.req.query('limit') || '100')

  const list = await c.env.BUCKET.list({ prefix, limit })

  return c.json({
    objects: list.objects.map(obj => ({
      key: obj.key,
      size: obj.size,
      uploaded: obj.uploaded
    })),
    truncated: list.truncated
  })
})
```

ファイル削除:

```typescript
app.delete('/api/files/:key', async (c) => {
  const key = c.req.param('key')

  await c.env.BUCKET.delete(key)

  return c.json({ success: true })
})
```

## 認証実装

### JWT認証

```typescript
import { jwt, sign } from 'hono/jwt'

const JWT_SECRET = 'your-secret-key'

// ログイン
app.post('/api/login', async (c) => {
  const { email, password } = await c.req.json()

  const user = await c.env.DB.prepare(
    'SELECT * FROM users WHERE email = ?'
  ).bind(email).first()

  if (!user || user.password !== password) {
    return c.json({ error: 'Invalid credentials' }, 401)
  }

  const token = await sign(
    {
      sub: user.id,
      email: user.email,
      exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24  // 24時間
    },
    JWT_SECRET
  )

  return c.json({ token })
})

// 保護されたルート
app.use('/api/protected/*', jwt({ secret: JWT_SECRET }))

app.get('/api/protected/profile', async (c) => {
  const payload = c.get('jwtPayload')

  const user = await c.env.DB.prepare(
    'SELECT id, name, email FROM users WHERE id = ?'
  ).bind(payload.sub).first()

  return c.json(user)
})
```

### ベーシック認証

```typescript
import { basicAuth } from 'hono/basic-auth'

app.use('/admin/*', basicAuth({
  username: 'admin',
  password: 'secret',
  realm: 'Admin Area'
}))

app.get('/admin/dashboard', (c) => {
  return c.json({ message: 'Welcome to admin dashboard' })
})
```

### API Key認証

```typescript
app.use('/api/*', async (c, next) => {
  const apiKey = c.req.header('x-api-key')

  if (!apiKey) {
    return c.json({ error: 'API key required' }, 401)
  }

  const valid = await c.env.CACHE.get(`apikey:${apiKey}`)

  if (!valid) {
    return c.json({ error: 'Invalid API key' }, 401)
  }

  await next()
})
```

## ミドルウェア

### CORS設定

```typescript
import { cors } from 'hono/cors'

// シンプル
app.use('/*', cors())

// カスタム
app.use('/api/*', cors({
  origin: ['https://example.com', 'https://app.example.com'],
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  maxAge: 3600
}))
```

### レート制限

```typescript
app.use('/api/*', async (c, next) => {
  const ip = c.req.header('cf-connecting-ip') || 'unknown'
  const key = `ratelimit:${ip}`

  const count = await c.env.CACHE.get(key)

  if (count && Number(count) >= 100) {
    return c.json({ error: 'Rate limit exceeded' }, 429)
  }

  await c.env.CACHE.put(key, String(Number(count || 0) + 1), {
    expirationTtl: 60  // 1分
  })

  await next()
})
```

### ロギング

```typescript
import { logger } from 'hono/logger'

app.use('*', logger())

// カスタムロガー
app.use('*', async (c, next) => {
  const start = Date.now()
  await next()
  const duration = Date.now() - start

  console.log({
    method: c.req.method,
    path: c.req.path,
    status: c.res.status,
    duration,
    ip: c.req.header('cf-connecting-ip'),
    country: c.req.header('cf-ipcountry')
  })
})
```

### エラーハンドリング

```typescript
app.onError((err, c) => {
  console.error(err)

  if (err instanceof Error) {
    return c.json({
      error: err.message,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    }, 500)
  }

  return c.json({ error: 'Internal server error' }, 500)
})

app.notFound((c) => {
  return c.json({ error: 'Not found' }, 404)
})
```

## バリデーション

### Zod統合

```typescript
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'

const UserSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email(),
  age: z.number().min(0).max(150).optional()
})

app.post('/api/users', zValidator('json', UserSchema), async (c) => {
  const user = c.req.valid('json')

  const result = await c.env.DB.prepare(
    'INSERT INTO users (name, email) VALUES (?, ?)'
  ).bind(user.name, user.email).run()

  return c.json({
    id: result.meta.last_row_id,
    ...user
  }, 201)
})
```

### クエリパラメータバリデーション

```typescript
const SearchSchema = z.object({
  q: z.string().min(1),
  page: z.string().regex(/^\d+$/).transform(Number).default('1'),
  limit: z.string().regex(/^\d+$/).transform(Number).default('10')
})

app.get('/api/search', zValidator('query', SearchSchema), async (c) => {
  const { q, page, limit } = c.req.valid('query')
  const offset = (page - 1) * limit

  const { results } = await c.env.DB.prepare(`
    SELECT * FROM posts
    WHERE title LIKE ? OR content LIKE ?
    LIMIT ? OFFSET ?
  `).bind(`%${q}%`, `%${q}%`, limit, offset).all()

  return c.json(results)
})
```

## 実践例: ブログAPI

完全な実装例:

```typescript
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { jwt, sign } from 'hono/jwt'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'

type Bindings = {
  DB: D1Database
  CACHE: KVNamespace
  BUCKET: R2Bucket
}

const app = new Hono<{ Bindings: Bindings }>()

// ミドルウェア
app.use('*', logger())
app.use('*', cors())

const JWT_SECRET = 'your-secret-key'

// スキーマ
const RegisterSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8)
})

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string()
})

const PostSchema = z.object({
  title: z.string().min(1).max(200),
  content: z.string().min(1),
  published: z.boolean().default(false)
})

// 認証
app.post('/api/register', zValidator('json', RegisterSchema), async (c) => {
  const { name, email, password } = c.req.valid('json')

  const result = await c.env.DB.prepare(
    'INSERT INTO users (name, email, password) VALUES (?, ?, ?)'
  ).bind(name, email, password).run()

  return c.json({ id: result.meta.last_row_id }, 201)
})

app.post('/api/login', zValidator('json', LoginSchema), async (c) => {
  const { email, password } = c.req.valid('json')

  const user = await c.env.DB.prepare(
    'SELECT * FROM users WHERE email = ? AND password = ?'
  ).bind(email, password).first()

  if (!user) {
    return c.json({ error: 'Invalid credentials' }, 401)
  }

  const token = await sign(
    { sub: user.id, exp: Math.floor(Date.now() / 1000) + 86400 },
    JWT_SECRET
  )

  return c.json({ token })
})

// 公開API
app.get('/api/posts', async (c) => {
  const cacheKey = 'posts:public'

  // キャッシュチェック
  const cached = await c.env.CACHE.get(cacheKey, 'json')
  if (cached) {
    return c.json(cached)
  }

  const { results } = await c.env.DB.prepare(`
    SELECT
      posts.id,
      posts.title,
      posts.content,
      posts.created_at,
      users.name as author
    FROM posts
    JOIN users ON posts.user_id = users.id
    WHERE posts.published = 1
    ORDER BY posts.created_at DESC
  `).all()

  // キャッシュ保存（5分）
  await c.env.CACHE.put(cacheKey, JSON.stringify(results), {
    expirationTtl: 300
  })

  return c.json(results)
})

app.get('/api/posts/:id', async (c) => {
  const id = c.req.param('id')

  const post = await c.env.DB.prepare(`
    SELECT
      posts.*,
      users.name as author
    FROM posts
    JOIN users ON posts.user_id = users.id
    WHERE posts.id = ? AND posts.published = 1
  `).bind(id).first()

  if (!post) {
    return c.json({ error: 'Not found' }, 404)
  }

  return c.json(post)
})

// 保護されたAPI
app.use('/api/posts', jwt({ secret: JWT_SECRET }))

app.post('/api/posts', zValidator('json', PostSchema), async (c) => {
  const payload = c.get('jwtPayload')
  const { title, content, published } = c.req.valid('json')

  const result = await c.env.DB.prepare(
    'INSERT INTO posts (user_id, title, content, published) VALUES (?, ?, ?, ?)'
  ).bind(payload.sub, title, content, published ? 1 : 0).run()

  // キャッシュクリア
  await c.env.CACHE.delete('posts:public')

  return c.json({ id: result.meta.last_row_id }, 201)
})

export default app
```

## まとめ

Hono + Cloudflare Workersは2026年現在、最もコスパの高いWebアプリケーションスタックの一つです。

### メリット

- **超高速**: エッジでのレスポンスタイム10ms以下
- **スケーラブル**: 自動スケーリング、設定不要
- **低コスト**: 無料枠で十分な規模をカバー
- **開発体験**: TypeScript完全対応、型安全
- **グローバル**: 世界中で低レイテンシ

### ユースケース

- REST API / GraphQL API
- 認証サーバー
- リバースプロキシ
- 画像リサイズ・最適化
- エッジSSR
- Webhookハンドラー

無料枠内で本番運用できるため、個人開発からスタートアップまで幅広く使えます。
